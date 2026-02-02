import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"

type SaveReflectionPayload = {
  transcript: string
  summary: {
    wins: string[]
    drains: string[]
    future_focus: string[]
    emotional_tone: string
    energy_level: string
    emotion_confidence: "low" | "medium" | "high"
  }
  tasks: Array<{
    task_text: string
    category: "creating" | "collaborating" | "communicating" | "organizing"
    confidence: "low" | "medium" | "high"
  }>
  recorded_at: string
  duration_seconds: number
  audio_file_size_mb?: number
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as SaveReflectionPayload
    const {
      transcript,
      summary,
      tasks,
      recorded_at,
      duration_seconds,
      audio_file_size_mb,
    } = payload

    if (!transcript || !summary || !recorded_at) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
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

    const { data: voiceNote, error: voiceNoteError } = await supabaseAdmin
      .from("voice_notes")
      .insert({
        user_id: userId,
        recorded_at,
        duration_seconds,
        audio_file_size_mb: audio_file_size_mb ?? null,
        local_day: new Date(recorded_at).toISOString().slice(0, 10),
      })
      .select("id")
      .single()

    if (voiceNoteError) {
      console.error("[save-reflection] voice_notes insert failed", voiceNoteError)
      return NextResponse.json({ error: "Failed to save voice note" }, { status: 500 })
    }

    const { data: transcription, error: transcriptionError } = await supabaseAdmin
      .from("transcriptions")
      .insert({
        voice_note_id: voiceNote.id,
        user_id: userId,
        transcription_text: transcript,
        word_count: transcript.split(/\s+/).length,
      })
      .select("id")
      .single()

    if (transcriptionError) {
      console.error("[save-reflection] transcriptions insert failed", transcriptionError)
      return NextResponse.json({ error: "Failed to save transcription" }, { status: 500 })
    }

    const { data: summaryRow, error: summaryError } = await supabaseAdmin.from("daily_summaries").insert({
      voice_note_id: voiceNote.id,
      user_id: userId,
      wins: summary.wins,
      drains: summary.drains,
      future_focus: summary.future_focus,
      emotional_tone: summary.emotional_tone,
      energy_level: summary.energy_level,
      emotion_confidence: summary.emotion_confidence,
      original_wins: summary.wins,
      original_drains: summary.drains,
      original_future_focus: summary.future_focus,
    }).select("id").single()

    if (summaryError) {
      console.error("[save-reflection] daily_summaries insert failed", summaryError)
      return NextResponse.json({ error: "Failed to save summary" }, { status: 500 })
    }

    let taskRows: Array<{ id: string; task_text: string }> = []
    if (tasks?.length) {
      const { data: insertedTasks, error: taskError } = await supabaseAdmin.from("tasks").insert(
        tasks.map((task) => ({
          transcription_id: transcription.id,
          user_id: userId,
          task_text: task.task_text,
          category: task.category,
          confidence: task.confidence,
          ai_extracted: true,
          original_ai_text: task.task_text,
        }))
      ).select("id, task_text")

      if (taskError) {
        console.error("[save-reflection] tasks insert failed", taskError)
        return NextResponse.json({ error: "Failed to save tasks" }, { status: 500 })
      }
      taskRows = insertedTasks ?? []
    }

    return NextResponse.json({
      voice_note_id: voiceNote.id,
      transcription_id: transcription.id,
      summary_id: summaryRow?.id ?? null,
      tasks: taskRows,
    })
  } catch (error) {
    console.error("[save-reflection] Unexpected error", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
