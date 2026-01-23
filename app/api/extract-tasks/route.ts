import { NextResponse } from "next/server"

import { generateContent } from "@/lib/gemini"

type TaskItem = {
  task_text: string
  category: "creating" | "collaborating" | "communicating" | "organizing"
  confidence: "low" | "medium" | "high"
}

type TaskPayload = {
  tasks: TaskItem[]
}

const emptyTasks: TaskPayload = { tasks: [] }

function safeParseTasks(raw: string): TaskPayload {
  const trimmed = raw.trim()
  const jsonText = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  try {
    const parsed = JSON.parse(jsonText) as Partial<TaskPayload>
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) return emptyTasks
    const tasks: TaskItem[] = parsed.tasks
      .filter((task): task is TaskItem => !!task && typeof task.task_text === "string")
      .map((task) => ({
        task_text: task.task_text.trim(),
        category:
          task.category === "collaborating" ||
          task.category === "communicating" ||
          task.category === "organizing"
            ? task.category
            : "creating",
        confidence: task.confidence === "high" || task.confidence === "medium" ? task.confidence : "low",
      }))
      .filter((task) => task.task_text.length > 0)

    return { tasks }
  } catch {
    return emptyTasks
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const transcript = String(formData.get("transcript") ?? "").trim()

    if (!transcript) {
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 })
    }

    const prompt = [
      "Extract completed tasks from the transcript.",
      "Return strict JSON only with this shape:",
      '{ "tasks": [ { "task_text": string, "category": "creating|collaborating|communicating|organizing", "confidence": "low|medium|high" } ] }',
      "Only include completed tasks, not future plans or ideas.",
      "Use the four categories exactly.",
      `Transcript:\n${transcript}`,
    ].join(" ")

    const result = await generateContent({ contents: prompt })
    const raw = result.text?.trim() ?? ""
    const tasks = safeParseTasks(raw)

    return NextResponse.json({
      tasks,
      raw,
      modelUsed: process.env.GEMINI_MODEL ?? null,
    })
  } catch (error) {
    console.error("[extract-tasks] Unexpected error", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
