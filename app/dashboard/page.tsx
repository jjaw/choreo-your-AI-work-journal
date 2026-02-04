"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
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
  const [totalReflections, setTotalReflections] = useState(0)
  const [longTermInsights, setLongTermInsights] = useState<string[]>([])
  const [insightStatus, setInsightStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const lastInsightSummaryAtRef = useRef<string | null>(null)
  const insightRequestRef = useRef(false)

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

    const drainCounts = summaries
      .flatMap((item) => item.drains ?? [])
      .reduce<Record<string, number>>((acc, drain) => {
        const key = drain.toLowerCase()
        acc[key] = (acc[key] ?? 0) + 1
        return acc
      }, {})
    const topDrain = Object.entries(drainCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"

    return {
      totalTasks: categoryTotals.total,
      topCategory,
      topDrain,
      categoryTotals,
    }
  }, [summaries, tasksBySummary])

  const categoryMax = Math.max(
    longTermStats.categoryTotals.creating,
    longTermStats.categoryTotals.collaborating,
    longTermStats.categoryTotals.communicating,
    longTermStats.categoryTotals.organizing,
    1
  )

  const energySeries = useMemo(() => {
    const mapValue = (level: string | null) => {
      if (level === "high") return 3
      if (level === "medium") return 2
      if (level === "low") return 1
      return 0
    }
    return summaries
      .slice(0, 7)
      .map((item) => mapValue(item.energy_level ?? "unknown"))
      .reverse()
  }, [summaries])

  const avgEnergy = useMemo(() => {
    if (!energySeries.length) return { label: "Unknown", message: "Add more reflections to see your energy trend." }
    const avg = energySeries.reduce((sum, value) => sum + value, 0 as number) / energySeries.length
    if (avg >= 2.4) return { label: "High", message: "Strong energy lately. Keep up the momentum." }
    if (avg >= 1.6) return { label: "Medium", message: "Steady energy. Protect your focus blocks." }
    return { label: "Low", message: "Low energy trend. Consider lighter loads or recovery time." }
  }, [energySeries])

  const runInsights = useCallback(async () => {
    if (!llmInsightsReady) return
    const latest = summaries[0]
    if (!latest) return
    if (insightRequestRef.current) return
    if (lastInsightSummaryAtRef.current === latest.created_at && insightStatus === "ready") return
    setInsightStatus("loading")
    insightRequestRef.current = true
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
      lastInsightSummaryAtRef.current = latest.created_at
    } catch {
      setInsightStatus("error")
    } finally {
      insightRequestRef.current = false
    }
  }, [llmInsightsReady, summaries, tasksBySummary, insightStatus])

  useEffect(() => {
    runInsights()
  }, [runInsights])

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

      const { count: totalCount } = await supabase
        .from("daily_summaries")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)

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
        setTotalReflections(totalCount ?? summariesData.length)
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
                      <div className="text-xs uppercase text-slate-500">Total Reflections</div>
                      <div className="text-lg font-semibold text-slate-900">{totalReflections}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-xs uppercase text-slate-500">Top Category</div>
                      <div className="text-sm text-slate-700 capitalize">{longTermStats.topCategory}</div>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                      <div className="text-xs uppercase text-slate-500">Top Drain Theme</div>
                      <div className="text-sm text-slate-700 capitalize">{longTermStats.topDrain}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Trend charts below are calculated from your most recent 7 reflections (rolling window).
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
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-slate-500">
                        <span>Insights unavailable right now.</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-200 text-slate-600"
                          onClick={runInsights}
                          disabled={insightStatus === "loading"}
                        >
                          Retry insights
                        </Button>
                      </div>
                    )}
                    {llmInsightsReady && insightStatus === "ready" && (
                      <ul className="mt-2 list-disc list-inside space-y-1">
                        {longTermInsights.map((insight) => (
                          <li key={insight}>{insight}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase text-slate-500">Category Trend (Last 7)</div>
                      <span className="relative group">
                        <span
                          className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-[11px] text-slate-500"
                          aria-label="Category legend"
                        >
                          i
                        </span>
                        <span className="pointer-events-none absolute right-0 top-8 z-10 w-56 rounded-md border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600 opacity-0 shadow-md transition-opacity group-hover:opacity-100">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-blue-400" />
                            <span>creating = deliverables</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-amber-400" />
                            <span>collaborating = meetings</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-slate-400" />
                            <span>communicating = messages</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full border border-slate-300 bg-emerald-400" />
                            <span>organizing = admin</span>
                          </div>
                        </span>
                      </span>
                    </div>
                    <div className="mt-3 space-y-2">
                      {(
                        [
                          ["creating", longTermStats.categoryTotals.creating, "bg-blue-300/60"],
                          ["collaborating", longTermStats.categoryTotals.collaborating, "bg-amber-300/60"],
                          ["communicating", longTermStats.categoryTotals.communicating, "bg-slate-300"],
                          ["organizing", longTermStats.categoryTotals.organizing, "bg-emerald-300/60"],
                        ] as const
                      ).map(([label, count, color]) => (
                        <div key={label} className="flex items-center gap-3">
                          <div className="w-28 text-xs text-slate-600 capitalize">{label}</div>
                          <div className="flex-1">
                            <div className="h-2 rounded-full bg-slate-100">
                              <div
                                className={`h-2 rounded-full ${color}`}
                                style={{ width: `${Math.round((count / categoryMax) * 100)}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-6 text-xs text-slate-500 text-right">{count}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="text-xs uppercase text-slate-500">Energy Trend (Last 7)</div>
                      <div className="text-[11px] text-slate-500">Avg energy: {avgEnergy.label}</div>
                    </div>
                    <div className="mt-3 grid gap-3 lg:grid-cols-[auto_1fr_200px]">
                      <div className="flex flex-col justify-between text-[10px] text-slate-400">
                        <span>High</span>
                        <span>Med</span>
                        <span>Low</span>
                      </div>
                      <div className="flex items-end gap-2">
                        {energySeries.map((value, index) => (
                          <div key={`energy-${index}`} className="flex flex-col items-center gap-1">
                            <div
                              className={`w-3 rounded-md ${
                                value === 3 ? "bg-success-400" : value === 2 ? "bg-warning-300" : "bg-slate-300"
                              }`}
                              style={{ height: `${value * 12 + 6}px` }}
                            />
                            <span className="text-[10px] text-slate-400">{index + 1}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center">
                        <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-500">
                          <div className="text-[10px] uppercase text-slate-400">Coming soon</div>
                          Energy insights will highlight drivers once more data is available.
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{avgEnergy.message}</p>
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
