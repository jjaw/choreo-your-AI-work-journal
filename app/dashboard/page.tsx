"use client"

import { useEffect, useMemo, useState } from "react"
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
  transcription_id: string
}

export default function DashboardPage() {
  const [summaries, setSummaries] = useState<SummaryRow[]>([])
  const [tasksBySummary, setTasksBySummary] = useState<Record<string, TaskRow[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null)
  const [longTermInsights, setLongTermInsights] = useState<string[]>([])
  const [insightStatus, setInsightStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")

  const selectedSummary = useMemo(
    () => summaries.find((item) => item.id === selectedSummaryId) ?? summaries[0] ?? null,
    [summaries, selectedSummaryId]
  )

  const selectedTasks = useMemo(() => {
    if (!selectedSummary) return []
    return tasksBySummary[selectedSummary.id] ?? []
  }, [selectedSummary, tasksBySummary])

  const taskStats = useMemo(() => {
    const counts = selectedTasks.reduce(
      (acc, task) => {
        acc.total += 1
        acc[task.category] += 1
        return acc
      },
      {
        total: 0,
        creating: 0,
        collaborating: 0,
        communicating: 0,
        organizing: 0,
      }
    )
    return counts
  }, [selectedTasks])

  const insightsReady = summaries.length >= 3
  const llmInsightsReady = summaries.length >= 5
  const longTermStats = useMemo(() => {
    const allTasks = Object.values(tasksBySummary).flat()
    const categoryTotals = allTasks.reduce(
      (acc, task) => {
        acc.total += 1
        acc[task.category] += 1
        return acc
      },
      {
        total: 0,
        creating: 0,
        collaborating: 0,
        communicating: 0,
        organizing: 0,
      }
    )
    const topCategory = (Object.entries(categoryTotals)
      .filter(([key]) => key !== "total")
      .sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0] ?? "creating") as TaskRow["category"]

    const energyCounts = summaries.reduce<Record<string, number>>((acc, item) => {
      const level = item.energy_level ?? "unknown"
      acc[level] = (acc[level] ?? 0) + 1
      return acc
    }, {})
    const topEnergy = Object.entries(energyCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown"

    return {
      totalTasks: categoryTotals.total,
      topCategory,
      topEnergy,
    }
  }, [summaries, tasksBySummary])

  useEffect(() => {
    const runInsights = async () => {
      if (!llmInsightsReady) return
      if (insightStatus === "loading") return
      const latest = summaries[0]
      if (!latest) return
      setInsightStatus("loading")
      try {
        const counts = {
          creating: 0,
          collaborating: 0,
          communicating: 0,
          organizing: 0,
        }
        Object.values(tasksBySummary).flat().forEach((task) => {
          counts[task.category] += 1
        })
        const session = await supabase.auth.getSession()
        const token = session.data.session?.access_token
        if (!token) {
          setInsightStatus("error")
          return
        }
        const response = await fetch("/api/generate-insights", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            summaries: summaries.map((item) => ({
              created_at: item.created_at,
              wins: item.wins,
              drains: item.drains,
              future_focus: item.future_focus,
              energy_level: item.energy_level,
              emotional_tone: item.emotional_tone,
            })),
            taskCounts: counts,
            latestSummaryAt: latest.created_at,
          }),
        })
        if (!response.ok) {
          throw new Error("Failed to generate insights")
        }
        const data = await response.json()
        setLongTermInsights(Array.isArray(data.insights) ? data.insights : [])
        setInsightStatus("ready")
      } catch {
        setInsightStatus("error")
      }
    }
    runInsights()
  }, [llmInsightsReady, summaries, tasksBySummary, insightStatus])

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

      const { data: summariesData, error: summariesError } = await supabase
        .from("daily_summaries")
        .select(
          "id, voice_note_id, wins, drains, future_focus, emotional_tone, energy_level, emotion_confidence, created_at"
        )
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(7)

      if (summariesError) {
        if (mounted) {
          setLoading(false)
          setError("Failed to load summaries.")
        }
        return
      }

      if (!summariesData || summariesData.length === 0) {
        if (mounted) {
          setLoading(false)
          setSummaries([])
          setTasksBySummary({})
        }
        return
      }

      const voiceNoteIds = summariesData.map((item) => item.voice_note_id)

      const { data: transcriptions } = await supabase
        .from("transcriptions")
        .select("id, voice_note_id, created_at")
        .in("voice_note_id", voiceNoteIds)
        .order("created_at", { ascending: false })
        .limit(voiceNoteIds.length)

      const transcriptionMap = (transcriptions ?? []).reduce<Record<string, string>>((acc, row) => {
        if (!acc[row.voice_note_id]) {
          acc[row.voice_note_id] = row.id
        }
        return acc
      }, {})

      const transcriptionIds = Object.values(transcriptionMap)
      const summaryIdByTranscription = Object.entries(transcriptionMap).reduce<Record<string, string>>(
        (acc, [voiceNoteId, transcriptionId]) => {
          const summary = summariesData.find((item) => item.voice_note_id === voiceNoteId)
          if (summary) acc[transcriptionId] = summary.id
          return acc
        },
        {}
      )

      const { data: tasksData } = transcriptionIds.length
        ? await supabase
            .from("tasks")
            .select("id, task_text, category, human_accepted, human_validated, created_at, transcription_id")
            .in("transcription_id", transcriptionIds)
            .order("created_at", { ascending: true })
        : { data: [] }

      const tasksByVoiceNote = (tasksData ?? []).reduce<Record<string, TaskRow[]>>((acc, task) => {
        const summaryId = summaryIdByTranscription[task.transcription_id]
        if (!summaryId) return acc
        acc[summaryId] = acc[summaryId] ? [...acc[summaryId], task] : [task]
        return acc
      }, {})

      if (mounted) {
        setSummaries(summariesData)
        setTasksBySummary(tasksByVoiceNote)
        setLoading(false)
        setSelectedSummaryId((prev) => prev ?? summariesData[0]?.id ?? null)
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

        {!loading && !error && summaries.length === 0 && (
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

        {!loading && !error && summaries.length > 0 && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Long-Term Insights</CardTitle>
              <CardDescription className="text-slate-500">
                Your high-level patterns across recent reflections.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!insightsReady ? (
                <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Insights unlock after 3+ reflections. Keep going to see trends.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-xs uppercase text-slate-500">Reflections</div>
                      <div className="text-lg font-semibold text-slate-900">{summaries.length}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-xs uppercase text-slate-500">Top Category</div>
                      <div className="text-sm text-slate-700">{longTermStats.topCategory}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-xs uppercase text-slate-500">Most Common Energy</div>
                      <div className="text-sm text-slate-700">{longTermStats.topEnergy}</div>
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <div className="text-xs uppercase text-slate-500">AI Insight</div>
                    {!llmInsightsReady && (
                      <p className="mt-2 text-slate-500">AI insights unlock after 5+ reflections.</p>
                    )}
                    {llmInsightsReady && insightStatus === "loading" && (
                      <p className="mt-2 text-slate-500">Generating insights…</p>
                    )}
                    {llmInsightsReady && insightStatus === "error" && (
                      <p className="mt-2 text-slate-500">Insights unavailable right now.</p>
                    )}
                    {llmInsightsReady && insightStatus === "ready" && (
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {longTermInsights.map((insight) => (
                          <li key={insight}>{insight}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {!loading && !error && selectedSummary && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">
                {new Date(selectedSummary.created_at).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </CardTitle>
              <CardDescription className="text-slate-500">
                Saved at {new Date(selectedSummary.created_at).toLocaleTimeString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-700">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs uppercase text-slate-500">Tasks</div>
                  <div className="text-lg font-semibold text-slate-900">{taskStats.total}</div>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs uppercase text-slate-500">Category Mix</div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-brand-700">
                      {taskStats.creating} creating
                    </span>
                    <span className="rounded-full bg-warning-50 px-2 py-0.5 text-warning-700">
                      {taskStats.collaborating} collaborating
                    </span>
                    <span className="rounded-full bg-slate-200 px-2 py-0.5 text-slate-700">
                      {taskStats.communicating} communicating
                    </span>
                    <span className="rounded-full bg-success-50 px-2 py-0.5 text-success-700">
                      {taskStats.organizing} organizing
                    </span>
                  </div>
                </div>
                <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="text-xs uppercase text-slate-500">Recorded</div>
                  <div className="text-sm text-slate-700">
                    {new Date(selectedSummary.created_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Wins</h3>
                <ul className="list-disc list-inside text-slate-600">
                  {selectedSummary.wins?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Energy Drains</h3>
                <ul className="list-disc list-inside text-slate-600">
                  {selectedSummary.drains?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Future Focus</h3>
                <ul className="list-disc list-inside text-slate-600">
                  {selectedSummary.future_focus?.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="text-xs text-slate-500">
                Emotion: {selectedSummary.emotional_tone ?? "—"} | Energy: {selectedSummary.energy_level ?? "—"} |
                Confidence: {selectedSummary.emotion_confidence ?? "—"}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && selectedSummary && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Completed Actions</CardTitle>
              <CardDescription className="text-slate-500">Actions extracted from your latest reflection.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedTasks.length === 0 && <p className="text-sm text-slate-500">No tasks found for this reflection.</p>}
              {selectedTasks.map((task) => (
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

        {!loading && !error && summaries.length > 0 && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Recent Reflections</CardTitle>
              <CardDescription className="text-slate-500">Switch between the last 7 reflections.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {summaries.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedSummaryId(item.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                    item.id === selectedSummary?.id
                      ? "border-brand-200 bg-brand-50 text-slate-900"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div className="font-medium text-slate-900">
                    {new Date(item.created_at).toLocaleDateString()} • {item.wins?.[0] ?? "Reflection"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {item.wins?.length ?? 0} wins · {item.drains?.length ?? 0} drains ·{" "}
                    {item.future_focus?.length ?? 0} focus
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
