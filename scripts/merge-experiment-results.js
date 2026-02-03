const fs = require("fs")
const path = require("path")
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") })

const datasetDir = path.join(__dirname, "..", "dataset")

const findLatest = (prefix) => {
  const files = fs
    .readdirSync(datasetDir)
    .filter((file) => file.startsWith(prefix) && file.endsWith(".json"))
    .sort()
  return files.length ? files[files.length - 1] : null
}

const summaryFile = process.argv[2] ?? findLatest("experiment_results_")
const tasksFile = process.argv[3] ?? summaryFile

if (!summaryFile || !tasksFile) {
  console.error("Missing experiment results files. Run experiments first.")
  process.exit(1)
}

const summaryPath = path.join(datasetDir, summaryFile)
const tasksPath = path.join(datasetDir, tasksFile)

if (!fs.existsSync(summaryPath) || !fs.existsSync(tasksPath)) {
  console.error("One or more result files not found.")
  process.exit(1)
}

const summaryData = JSON.parse(fs.readFileSync(summaryPath, "utf8"))
const tasksData = JSON.parse(fs.readFileSync(tasksPath, "utf8"))

const merged = {
  created_at: new Date().toISOString(),
  dataset_version: summaryData.dataset_version || tasksData.dataset_version,
  dataset_size: summaryData.dataset_size || tasksData.dataset_size,
  model: summaryData.model || tasksData.model,
  mode: "combined",
  summary: summaryData.summary,
  tasks: tasksData.tasks,
  sources: {
    summary: summaryFile,
    tasks: tasksFile,
  },
}

const outName = `experiment_results_combined_${new Date().toISOString().replace(/[:.]/g, "-")}.json`
const outPath = path.join(datasetDir, outName)
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2))
console.log(`Wrote ${outPath}`)
