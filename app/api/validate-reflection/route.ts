import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"

type ValidationPayload = {
  summary_id: string
  voice_note_id: string
  summary: {
    wins: string[]
    drains: string[]
    future_focus: string[]
  }
  tasks: Array<{
    id: string
    task_text: string
    human_accepted: boolean
  }>
}

const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ValidationPayload
    const { summary_id, voice_note_id, summary, tasks } = payload

    if (!summary_id || !voice_note_id) {
      return NextResponse.json({ error: "Missing summary identifiers" }, { status: 400 })
    }

    const authHeader = request.headers.get("authorization") ?? ""
    const token = authHeader.replace("Bearer ", "")
    if (!token) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 })
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return NextResponse.json({ error: "Invalid auth token" }, { status: 401 })
    }
    const userId = userData.user.id

    const { data: currentSummary, error: summaryFetchError } = await supabaseAdmin
      .from("daily_summaries")
      .select("wins, drains, future_focus, original_wins, original_drains, original_future_focus")
      .eq("id", summary_id)
      .eq("user_id", userId)
      .single()

    if (summaryFetchError || !currentSummary) {
      return NextResponse.json({ error: "Summary not found" }, { status: 404 })
    }

    const winsEdited = !arraysEqual(summary.wins, currentSummary.original_wins ?? [])
    const drainsEdited = !arraysEqual(summary.drains, currentSummary.original_drains ?? [])
    const focusEdited = !arraysEqual(summary.future_focus, currentSummary.original_future_focus ?? [])

    const { error: summaryUpdateError } = await supabaseAdmin
      .from("daily_summaries")
      .update({
        wins: summary.wins,
        drains: summary.drains,
        future_focus: summary.future_focus,
        wins_edited: winsEdited,
        drains_edited: drainsEdited,
        future_focus_edited: focusEdited,
      })
      .eq("id", summary_id)
      .eq("user_id", userId)

    if (summaryUpdateError) {
      console.error("[validate-reflection] summary update failed", summaryUpdateError)
      return NextResponse.json({ error: "Failed to update summary" }, { status: 500 })
    }

    if (tasks?.length) {
      for (const task of tasks) {
        const { data: currentTask, error: taskFetchError } = await supabaseAdmin
          .from("tasks")
          .select("task_text")
          .eq("id", task.id)
          .eq("user_id", userId)
          .single()

        if (taskFetchError || !currentTask) continue

        const humanEdited = currentTask.task_text !== task.task_text

        const { error: taskUpdateError } = await supabaseAdmin
          .from("tasks")
          .update({
            task_text: task.task_text,
            human_validated: true,
            human_accepted: task.human_accepted,
            human_edited: humanEdited,
          })
          .eq("id", task.id)
          .eq("user_id", userId)

        if (taskUpdateError) {
          console.error("[validate-reflection] task update failed", taskUpdateError)
        }
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[validate-reflection] Unexpected error", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
