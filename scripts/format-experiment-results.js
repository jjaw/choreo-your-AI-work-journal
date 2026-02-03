const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") })

const inputPath = path.join(__dirname, "..", "dataset", "experiment_results.json")

if (!fs.existsSync(inputPath)) {
  console.error("Missing dataset/experiment_results.json. Run experiments first.")
  process.exit(1)
}

const results = JSON.parse(fs.readFileSync(inputPath, "utf8"))

const formatRow = (label, value) => `${label.padEnd(28)} ${String(value).padStart(6)}`
const formatPercent = (value) => `${(value * 100).toFixed(1)}%`

const summaryLines = [
  "Summary Experiment Results",
  "--------------------------",
  ...Object.entries(results.summary?.averages ?? {}).map(([version, avg]) =>
    formatRow(version, formatPercent(avg))
  ),
  "",
  "Task Experiment Results (F1)",
  "----------------------------",
  ...Object.entries(results.tasks?.averages ?? {}).map(([version, avg]) =>
    formatRow(version, formatPercent(avg))
  ),
]

const markdownTable = (title, rows) => {
  if (!rows.length) return ""
  return [
    `### ${title}`,
    "",
    "| Prompt Version | Avg Score |",
    "| --- | --- |",
    ...rows.map(([version, avg]) => `| ${version} | ${formatPercent(avg)} |`),
    "",
  ].join("\n")
}

const summaryTable = markdownTable("Summary Experiment Results", Object.entries(results.summary?.averages ?? {}))
const taskTable = markdownTable("Task Experiment Results (F1)", Object.entries(results.tasks?.averages ?? {}))

const markdownOutput = [
  `# Experiment Results (${results.created_at})`,
  "",
  `- Dataset: ${results.dataset_version} (${results.dataset_size} samples)`,
  `- Model: ${results.model}`,
  `- Mode: ${results.mode}`,
  "",
  summaryTable,
  taskTable,
].filter(Boolean)

const textOutput = summaryLines.join("\n")

const markdownPath = path.join(__dirname, "..", "dataset", "experiment_results.md")
const textPath = path.join(__dirname, "..", "dataset", "experiment_results.txt")

fs.writeFileSync(markdownPath, markdownOutput.join("\n"))
fs.writeFileSync(textPath, textOutput)

console.log(`Wrote ${markdownPath}`)
console.log(`Wrote ${textPath}`)
