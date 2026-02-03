const fs = require("fs")
const path = require("path")
const { GoogleGenAI } = require("@google/genai")
const { Opik } = require("opik")
const { summaryPrompts, taskPrompts } = require("./experiment-prompts")

const args = process.argv.slice(2)
const argValue = (flag, fallback) => {
  const index = args.indexOf(flag)
  if (index === -1) return fallback
  return args[index + 1] ?? fallback
}

const limit = Number(argValue("--limit", "30"))
const mode = argValue("--mode", "both")
const sleepMs = Number(argValue("--sleep-ms", "250"))
const datasetPath = argValue("--dataset", path.join(__dirname, "..", "dataset", "eval_dataset.json"))

const modelName = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite"
const apiKey = process.env.GEMINI_API_KEY

if (!apiKey) {
  console.error("Missing GEMINI_API_KEY in environment.")
  process.exit(1)
}

const dataset = JSON.parse(fs.readFileSync(datasetPath, "utf8"))
const samples = dataset.samples.slice(0, limit)

const client = new GoogleGenAI({ apiKey })
const opikClient = process.env.OPIK_API_KEY ? new Opik() : null

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const normalize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const similarity = (a, b) => {
  const aTokens = new Set(normalize(a).split(" ").filter(Boolean))
  const bTokens = new Set(normalize(b).split(" ").filter(Boolean))
  if (!aTokens.size || !bTokens.size) return 0
  let overlap = 0
  aTokens.forEach((token) => {
    if (bTokens.has(token)) overlap += 1
  })
  return overlap / Math.max(aTokens.size, bTokens.size)
}

const extractJson = (text) => {
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null
  try {
    return JSON.parse(match[0])
  } catch (error) {
    return null
  }
}

const scoreArray = (predicted, expected) => {
  if (!Array.isArray(expected) || expected.length === 0) return 0
  const hits = expected.filter((item) =>
    Array.isArray(predicted) && predicted.some((pred) => similarity(pred, item) >= 0.6)
  )
  return hits.length / expected.length
}

const scoreTasks = (predictedTasks, expectedTasks) => {
  const expected = Array.isArray(expectedTasks) ? expectedTasks : []
  const predicted = Array.isArray(predictedTasks) ? predictedTasks : []
  if (!expected.length) return { recall: 0, precision: 0, f1: 0, category_accuracy: 0 }

  let matched = 0
  let correctCategory = 0

  expected.forEach((expectedTask) => {
    const match = predicted.find((pred) => similarity(pred.task_text, expectedTask.task_text) >= 0.6)
    if (match) {
      matched += 1
      if (match.category === expectedTask.category) {
        correctCategory += 1
      }
    }
  })

  const recall = matched / expected.length
  const precision = predicted.length ? matched / predicted.length : 0
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall)
  const category_accuracy = matched ? correctCategory / matched : 0

  return { recall, precision, f1, category_accuracy }
}

const runSummaryPrompt = async (sampleId, transcript, promptVersion) => {
  const prompt = summaryPrompts[promptVersion](transcript)
  const response = await client.models.generateContent({ model: modelName, contents: prompt })
  const rawText = response.text || ""
  const parsed = extractJson(rawText)
  return { rawText, parsed, promptVersion }
}

const runTaskPrompt = async (sampleId, transcript, promptVersion) => {
  const prompt = taskPrompts[promptVersion](transcript)
  const response = await client.models.generateContent({ model: modelName, contents: prompt })
  const rawText = response.text || ""
  const parsed = extractJson(rawText)
  return { rawText, parsed, promptVersion }
}

const logTrace = async ({ name, input, output, metadata }) => {
  if (!opikClient) return
  const trace = opikClient.trace({ name, input, output, metadata })
  trace.end()
}

const aggregate = (values) => {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

const results = {
  summary: {},
  tasks: {},
}

const run = async () => {
  for (const sample of samples) {
    if (mode === "summary" || mode === "both") {
      for (const promptVersion of Object.keys(summaryPrompts)) {
        const summaryResult = await runSummaryPrompt(sample.id, sample.transcript, promptVersion)
        const predicted = summaryResult.parsed
        const summaryScores = {
          wins: scoreArray(predicted?.wins, sample.ground_truth.wins),
          drains: scoreArray(predicted?.drains, sample.ground_truth.drains),
          future_focus: scoreArray(predicted?.future_focus, sample.ground_truth.future_focus),
        }
        const score = aggregate(Object.values(summaryScores))
        results.summary[promptVersion] = results.summary[promptVersion] || []
        results.summary[promptVersion].push(score)

        await logTrace({
          name: "summary_experiment",
          input: {
            sample_id: sample.id,
            prompt_version: promptVersion,
            transcript: sample.transcript,
          },
          output: {
            prediction: predicted,
            scores: { ...summaryScores, overall: score },
          },
          metadata: {
            model: modelName,
            experiment: "summary",
          },
        })
        await sleep(sleepMs)
      }
    }

    if (mode === "tasks" || mode === "both") {
      for (const promptVersion of Object.keys(taskPrompts)) {
        const taskResult = await runTaskPrompt(sample.id, sample.transcript, promptVersion)
        const predictedTasks = taskResult.parsed?.tasks ?? []
        const taskScores = scoreTasks(predictedTasks, sample.ground_truth.tasks)
        results.tasks[promptVersion] = results.tasks[promptVersion] || []
        results.tasks[promptVersion].push(taskScores.f1)

        await logTrace({
          name: "task_experiment",
          input: {
            sample_id: sample.id,
            prompt_version: promptVersion,
            transcript: sample.transcript,
          },
          output: {
            prediction: predictedTasks,
            scores: taskScores,
          },
          metadata: {
            model: modelName,
            experiment: "tasks",
          },
        })
        await sleep(sleepMs)
      }
    }
  }

  console.log("Summary scores:")
  const summaryAverages = {}
  Object.entries(results.summary).forEach(([version, scores]) => {
    const avg = aggregate(scores)
    summaryAverages[version] = avg
    console.log(`  ${version}: ${(avg * 100).toFixed(1)}%`)
  })

  console.log("Task scores (F1):")
  const taskAverages = {}
  Object.entries(results.tasks).forEach(([version, scores]) => {
    const avg = aggregate(scores)
    taskAverages[version] = avg
    console.log(`  ${version}: ${(avg * 100).toFixed(1)}%`)
  })

  const summaryPath = path.join(__dirname, "..", "dataset", "experiment_results.json")
  const summaryPayload = {
    created_at: new Date().toISOString(),
    dataset_version: dataset.version,
    dataset_size: samples.length,
    mode,
    model: modelName,
    summary: {
      averages: summaryAverages,
      raw_scores: results.summary,
    },
    tasks: {
      averages: taskAverages,
      raw_scores: results.tasks,
    },
  }
  fs.writeFileSync(summaryPath, JSON.stringify(summaryPayload, null, 2))
  console.log(`Saved results to ${summaryPath}`)

  if (opikClient) {
    await opikClient.flush()
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
