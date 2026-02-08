import { NextResponse } from "next/server"

import { authOrGuest } from "@/lib/auth/auth-or-guest"
import { generateContent, getGeminiModelName } from "@/lib/gemini"
import { getRequestMeta } from "@/lib/requests/meta"

const REQUIRE_AUTH = process.env.NODE_ENV === "production"

type TaskItem = {
  task_text: string
  category: "creating" | "collaborating" | "communicating" | "organizing"
  confidence: "low" | "medium" | "high"
}

type TaskPayload = {
  tasks: TaskItem[]
}

const emptyTasks: TaskPayload = { tasks: [] }

const normalizeCategory = (value: unknown): TaskItem["category"] => {
  switch (value) {
    case "collaborating":
    case "communicating":
    case "organizing":
    case "creating":
      return value
    default:
      return "creating"
  }
}

const normalizeConfidence = (value: unknown): TaskItem["confidence"] => {
  switch (value) {
    case "high":
    case "medium":
    case "low":
      return value
    default:
      return "low"
  }
}

function safeParseTasks(raw: string): TaskPayload {
  const trimmed = raw.trim()
  const jsonText = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  try {
    const parsed = JSON.parse(jsonText) as Partial<TaskPayload>
    if (!parsed.tasks || !Array.isArray(parsed.tasks)) return emptyTasks
    const rawTasks = parsed.tasks as Array<Partial<TaskItem>>
    const tasks: TaskItem[] = rawTasks
      .filter((task): task is TaskItem => !!task && typeof task.task_text === "string")
      .map((task) => ({
        task_text: task.task_text.trim(),
        category: normalizeCategory(task.category),
        confidence: normalizeConfidence(task.confidence),
      }))
      .filter((task) => task.task_text.length > 0)

    return { tasks }
  } catch {
    return emptyTasks
  }
}

export async function POST(request: Request) {
  try {
    if (REQUIRE_AUTH) {
      const auth = await authOrGuest(request, "extract-tasks")
      if (auth.response) {
        const meta = getRequestMeta(request)
        console.warn("[extract-tasks] blocked request", meta)
        return auth.response
      }
    }

    const formData = await request.formData()
    const transcript = String(formData.get("transcript") ?? "").trim()

    if (!transcript) {
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 })
    }

    const prompt = [
      "Extract completed actions from this reflection.",
      "Return strict JSON only with this shape:",
      '{ "tasks": [ { "task_text": string, "category": "creating|collaborating|communicating|organizing", "confidence": "low|medium|high" } ] }',
      "Rules:",
      "- Include actions that were clearly done today.",
      "- If a task was started but not finished, skip it.",
      "- Be specific and concise.",
      "Examples:",
      'Input: "I fixed the login bug and ran a demo with sales. I also replied to a few emails."',
      'Output: {"tasks":[{"task_text":"Fix login bug","category":"creating","confidence":"high"},{"task_text":"Run demo with sales","category":"collaborating","confidence":"high"},{"task_text":"Reply to emails","category":"communicating","confidence":"medium"}]}',
      'Input: "I updated the sprint plan, had standup, and drafted the FAQ."',
      'Output: {"tasks":[{"task_text":"Update sprint plan","category":"organizing","confidence":"high"},{"task_text":"Daily standup meeting","category":"collaborating","confidence":"high"},{"task_text":"Draft FAQ","category":"creating","confidence":"high"}]}',
      `Transcript:\n${transcript}`,
    ].join(" ")

    const result = await generateContent({
      contents: prompt,
      model: getGeminiModelName(),
      tracing: {
        generationName: "task_extraction",
        tags: ["tasks"],
        metadata: {
          route: "extract-tasks",
          transcriptLength: transcript.length,
        },
      },
    })
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
