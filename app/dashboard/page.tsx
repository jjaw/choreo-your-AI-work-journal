"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type SummaryRow = {
  id: string
  voice_note_id: string
  wins: string[]
  drains: string[]
  future_focus: string[]
  emotional_tone: string | null
  energy_level: string | null
  emotion_confidence: string | null
  created_at: string
}

type TaskRow = {
  id: string
  task_text: string
  category: "creating" | "collaborating" | "communicating" | "organizing"
  human_accepted: boolean | null
  human_validated: boolean | null
  created_at: string
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<SummaryRow | null>(null)
  const [tasks, setTasks] = useState<TaskRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)
      setError(null)
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) {
        if (mounted) {
          setLoading(false)
          setError("Please sign in to view your dashboard.")
        }
        return
      }

      const { data: voiceNotes } = await supabase
        .from("voice_notes")
        .select("id, recorded_at")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(1)

      const latestVoice = voiceNotes?.[0]
      if (!latestVoice) {
        if (mounted) {
          setLoading(false)
          setSummary(null)
          setTasks([])
        }
        return
      }

      const { data: summaries, error: summaryError } = await supabase
        .from("daily_summaries")
        .select(
          "id, voice_note_id, wins, drains, future_focus, emotional_tone, energy_level, emotion_confidence, created_at"
        )
        .eq("voice_note_id", latestVoice.id)
        .order("created_at", { ascending: false })
        .limit(1)

      if (summaryError) {
        if (mounted) {
          setLoading(false)
          setError("Failed to load summary.")
        }
        return
      }

      const latestSummary = summaries?.[0] ?? null

      const { data: transcriptions } = await supabase
        .from("transcriptions")
        .select("id, voice_note_id, created_at")
        .eq("voice_note_id", latestVoice.id)
        .order("created_at", { ascending: false })
        .limit(1)

      const transcriptionId = transcriptions?.[0]?.id

      const { data: tasksData } = transcriptionId
        ? await supabase
            .from("tasks")
            .select("id, task_text, category, human_accepted, human_validated, created_at")
            .eq("transcription_id", transcriptionId)
            .order("created_at", { ascending: true })
        : { data: [] }

      if (mounted) {
        setSummary(latestSummary)
        setTasks(tasksData ?? [])
        setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  return (
    <main className="page-layout">
      <div className="max-w-2xl w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Daily Dashboard</h1>
            <p className="text-sm text-slate-500">Latest reflection summary and completed actions.</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/">Back to recording</Link>
          </Button>
        </div>

        {loading && <p className="text-sm text-slate-500">Loading your latest reflection…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}

        {!loading && !error && !summary && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle>No reflections yet</CardTitle>
              <CardDescription>Record your first reflection to see insights here.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/">Record now</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {!loading && !error && summary && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Latest Summary</CardTitle>
              <CardDescription className="text-slate-500">
                Saved {new Date(summary.created_at).toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div>
                <h3 className="font-semibold text-slate-900">Wins</h3>
                <ul className="list-disc list-inside text-slate-600">
                  {summary.wins?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Energy Drains</h3>
                <ul className="list-disc list-inside text-slate-600">
                  {summary.drains?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Future Focus</h3>
                <ul className="list-disc list-inside text-slate-600">
                  {summary.future_focus?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="text-xs text-slate-500">
                Emotion: {summary.emotional_tone ?? "—"} | Energy: {summary.energy_level ?? "—"} | Confidence:{" "}
                {summary.emotion_confidence ?? "—"}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && summary && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Completed Actions</CardTitle>
              <CardDescription className="text-slate-500">Actions extracted from your latest reflection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasks.length === 0 && <p className="text-sm text-slate-500">No tasks found for this reflection.</p>}
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      task.category === "creating"
                        ? "bg-brand-100 text-brand-700"
                        : task.category === "collaborating"
                          ? "bg-warning-50 text-warning-700"
                          : task.category === "communicating"
                            ? "bg-slate-200 text-slate-700"
                            : "bg-success-50 text-success-700"
                    }`}
                  >
                    {task.category}
                  </span>
                  <span className="text-sm text-slate-700">{task.task_text}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
