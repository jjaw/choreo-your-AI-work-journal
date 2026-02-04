"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { VoiceRecorder, type RecordingPayload } from "@/components/VoiceRecorder"
import { supabase } from "@/lib/supabase/client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

type SummaryPayload = {
  wins: string[]
  drains: string[]
  future_focus: string[]
  emotional_tone: string
  energy_level: string
  emotion_confidence: "low" | "medium" | "high"
}

type TaskItem = {
  task_text: string
  category: "creating" | "collaborating" | "communicating" | "organizing"
  confidence: "low" | "medium" | "high"
}

export default function Home() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryPayload | null>(null)
  const [tasks, setTasks] = useState<TaskItem[]>([])
  const [error, setError] = useState<string | null>(null)
  const [guestCount, setGuestCount] = useState<number>(0)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [lastPayload, setLastPayload] = useState<RecordingPayload | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [summaryId, setSummaryId] = useState<string | null>(null)
  const [voiceNoteId, setVoiceNoteId] = useState<string | null>(null)
  const [validationSummary, setValidationSummary] = useState<SummaryPayload | null>(null)
  const [validationTasks, setValidationTasks] = useState<Array<TaskItem & { id: string; human_accepted: boolean }>>([])
  const [isSavingValidation, setIsSavingValidation] = useState(false)
  const [validationSaved, setValidationSaved] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isAuthenticated = Boolean(userEmail)
  const isGuestLimitReached = !isAuthenticated && guestCount >= 1
  const recorderLimitSeconds = useMemo(() => (isAuthenticated ? 180 : 45), [isAuthenticated])

  useEffect(() => {
    const storedCount = Number(window.localStorage.getItem("guestRecordingCount") ?? "0")
    setGuestCount(Number.isFinite(storedCount) ? storedCount : 0)
    setHasHydrated(true)
  }, [])

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!isMounted) return
      setUserEmail(data.user?.email ?? null)
    }
    loadUser()
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null)
    })
    return () => {
      isMounted = false
      authListener.subscription.unsubscribe()
    }
  }, [])

  const incrementGuestCount = () => {
    if (isAuthenticated) return
    const nextCount = guestCount + 1
    setGuestCount(nextCount)
    window.localStorage.setItem("guestRecordingCount", String(nextCount))
  }

  const handleSubmit = async (payload: RecordingPayload) => {
    if (isGuestLimitReached) {
      setError("Guest limit reached. Please sign up to continue.")
      return
    }

    setIsProcessing(true)
    setUploadStatus(null)
    setTranscript(null)
    setSummary(null)
    setTasks([])
    setError(null)
    setLastPayload(payload)

    try {
      setUploadStatus("Processing AI results...")

      const transcribeData = new FormData()
      transcribeData.append("audio", payload.audioBlob, `recording.webm`)
      const transcribeResponse = await fetch("/api/transcribe", {
        method: "POST",
        body: transcribeData,
      })
      if (!transcribeResponse.ok) {
        const { error: transcribeError } = await transcribeResponse.json().catch(() => ({}))
        throw new Error(transcribeError ?? "Failed to transcribe audio")
      }
      const transcribeJson = await transcribeResponse.json()
      const transcriptText = String(transcribeJson.transcript ?? "").trim()
      setTranscript(transcriptText)

      const summaryData = new FormData()
      summaryData.append("transcript", transcriptText)
      summaryData.append("audio", payload.audioBlob, `recording.webm`)
      const summaryResponse = await fetch("/api/generate-summary", {
        method: "POST",
        body: summaryData,
      })
      if (!summaryResponse.ok) {
        const { error: summaryError } = await summaryResponse.json().catch(() => ({}))
        throw new Error(summaryError ?? "Failed to generate summary")
      }
      const summaryJson = await summaryResponse.json()
      setSummary(summaryJson.summary ?? null)

      const tasksData = new FormData()
      tasksData.append("transcript", transcriptText)
      const tasksResponse = await fetch("/api/extract-tasks", {
        method: "POST",
        body: tasksData,
      })
      if (!tasksResponse.ok) {
        const { error: tasksError } = await tasksResponse.json().catch(() => ({}))
        throw new Error(tasksError ?? "Failed to extract tasks")
      }
      const tasksJson = await tasksResponse.json()
      const extractedTasks = tasksJson.tasks?.tasks ?? []
      setTasks(extractedTasks)

      const authToken = (await supabase.auth.getSession()).data.session?.access_token
      if (authToken) {
        const saveResponse = await fetch("/api/save-reflection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            transcript: transcriptText,
            summary: summaryJson.summary,
            tasks: extractedTasks,
            recorded_at: payload.recordedAt,
            duration_seconds: payload.durationSeconds,
            audio_file_size_mb: Number((payload.fileSizeBytes / 1024 / 1024).toFixed(2)),
          }),
        })

        if (!saveResponse.ok) {
          const { error: saveError } = await saveResponse.json().catch(() => ({}))
          throw new Error(saveError ?? "Failed to save reflection")
        }
        const saveJson = await saveResponse.json()
        setSummaryId(saveJson.summary_id ?? null)
        setVoiceNoteId(saveJson.voice_note_id ?? null)
        setValidationSummary(summaryJson.summary ?? null)
        setValidationTasks(
          extractedTasks.map((task: TaskItem, index: number) => ({
            ...task,
            id: saveJson.tasks?.[index]?.id ?? `${index}`,
            human_accepted: true,
          }))
        )
        setValidationSaved(false)
        setUploadStatus("Processing complete and saved.")
      } else {
        setUploadStatus("Processing complete (guest mode).")
      }
      incrementGuestCount()
    } catch (submitError) {
      console.error("Processing failed", submitError)
      setError(submitError instanceof Error ? submitError.message : "Something went wrong.")
      setUploadStatus(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRetry = async () => {
    if (!lastPayload || isProcessing) return
    await handleSubmit(lastPayload)
  }

  const handleValidationSave = async () => {
    if (!validationSummary || !summaryId || !voiceNoteId) return
    const authToken = (await supabase.auth.getSession()).data.session?.access_token
    if (!authToken) return
    setIsSavingValidation(true)
    try {
      const response = await fetch("/api/validate-reflection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          summary_id: summaryId,
          voice_note_id: voiceNoteId,
          summary: validationSummary,
          tasks: validationTasks.map((task) => ({
            id: task.id,
            task_text: task.task_text,
            human_accepted: task.human_accepted,
          })),
        }),
      })
      if (!response.ok) {
        const { error: validationError } = await response.json().catch(() => ({}))
        throw new Error(validationError ?? "Failed to save validation")
      }
      setValidationSaved(true)
      setToastMessage("Validation saved.")
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current)
      }
      toastTimerRef.current = setTimeout(() => {
        setToastMessage(null)
      }, 2500)
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "Failed to save validation.")
    } finally {
      setIsSavingValidation(false)
    }
  }

  return (
    <main className="page-layout">
      {toastMessage && (
        <div className="fixed right-6 top-6 z-50 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-lg">
          {toastMessage}
        </div>
      )}
      <div className="max-w-2xl w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            {isAuthenticated ? `Signed in as ${userEmail}` : "Guest mode: 1 recording, 45 seconds"}
          </div>
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                asChild
              >
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50"
                onClick={() => supabase.auth.signOut()}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button size="sm" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                Sign up or log in
              </Button>
            </Link>
          )}
        </div>
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-slate-900">
            Choreo
          </h1>
          <p className="text-xl text-slate-600">
            Your 3-Minute AI Work Journal
          </p>
          <p className="text-sm text-slate-500">
            Speak for 3 minutes. Get wins, drains, tasks, and patterns.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Privacy-first</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Audio not stored</span>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1">Daily insights</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg" className="bg-brand-600 hover:bg-brand-700 text-white">
              <a href="#record">Start recording</a>
            </Button>
            {!isAuthenticated && (
              <Link href="/login">
                <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                  Sign up free
                </Button>
              </Link>
            )}
            {isAuthenticated && (
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                  View dashboard
                </Button>
              </Link>
            )}
          </div>
        </div>

        {hasHydrated && !isGuestLimitReached && (
          <div id="record">
            <VoiceRecorder onSubmit={handleSubmit} maxDurationSeconds={recorderLimitSeconds} disabled={isProcessing} />
          </div>
        )}

        {hasHydrated && isGuestLimitReached && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Guest limit reached</CardTitle>
              <CardDescription className="text-slate-600">
                You’ve used your guest recording. Sign up to keep journaling.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Link href="/login">
                <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white">
                  Sign up free
                </Button>
              </Link>
            </CardFooter>
          </Card>
        )}

        {(isProcessing || uploadStatus || error) && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Processing status</CardTitle>
              <CardDescription className="text-slate-600">
                {isProcessing ? "Working through the AI pipeline..." : "Latest update"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-slate-700">
              {uploadStatus && <p>{uploadStatus}</p>}
              {isAuthenticated && uploadStatus === "Processing complete and saved." && (
                <p className="text-xs text-slate-500">Saved to your journal.</p>
              )}
              {!isAuthenticated && uploadStatus === "Processing complete (guest mode)." && (
                <p className="text-xs text-slate-500">Sign up to save this reflection and unlock daily insights.</p>
              )}
              {error && <p className="text-red-600">{error}</p>}
              {error && lastPayload && (
                <div className="space-y-1">
                  <Button variant="outline" className="mt-2 border-slate-300" onClick={handleRetry}>
                    Retry AI
                  </Button>
                  <p className="text-xs text-slate-500">Retries use the same recording.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {(transcript || summary || tasks.length > 0) && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Latest AI Output</CardTitle>
              <CardDescription className="text-slate-600">
                Review what the system extracted from your reflection.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-slate-700">
              {transcript && (
                <div className="space-y-2">
                  <h3 className="font-semibold text-slate-900">Transcript</h3>
                  <p className="text-slate-600">{transcript}</p>
                </div>
              )}

              {summary && (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-slate-900">Wins</h3>
                    <ul className="list-disc list-inside text-slate-600">
                      {summary.wins.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Energy Drains</h3>
                    <ul className="list-disc list-inside text-slate-600">
                      {summary.drains.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Future Focus</h3>
                    <ul className="list-disc list-inside text-slate-600">
                      {summary.future_focus.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-xs text-slate-500">
                    Emotion: {summary.emotional_tone} | Energy: {summary.energy_level} | emotion_confidence:{" "}
                    {summary.emotion_confidence}
                  </div>
                </div>
              )}

              {tasks.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">Completed Actions</h3>
                      <p className="text-xs text-slate-500">Actions the AI extracted from your reflection.</p>
                    </div>
                    <span
                      className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-xs text-slate-500"
                      title="Categories: creating (making deliverables), collaborating (meetings), communicating (messages), organizing (admin/planning)."
                      aria-label="Category legend"
                    >
                      ?
                    </span>
                  </div>
                  <ul className="space-y-2 text-slate-600">
                    {tasks.map((task, index) => (
                      <li
                        key={`${task.task_text}-${index}`}
                        className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2"
                      >
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
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {isAuthenticated && validationSummary && (
          <Card className="card-base">
            <CardHeader>
              <CardTitle className="text-lg text-slate-900">Validate your reflection</CardTitle>
              <CardDescription className="text-slate-600">Quick edits help improve future summaries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 text-sm text-slate-700">
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Wins</h3>
                {validationSummary.wins.map((item, index) => (
                  <input
                    key={`wins-${index}`}
                    value={item}
                    onChange={(event) => {
                      const next = [...validationSummary.wins]
                      next[index] = event.target.value
                      setValidationSummary({ ...validationSummary, wins: next })
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                ))}
                <Button
                  variant="outline"
                  onClick={() => setValidationSummary({ ...validationSummary, wins: [...validationSummary.wins, ""] })}
                >
                  Add win
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Energy Drains</h3>
                {validationSummary.drains.map((item, index) => (
                  <input
                    key={`drains-${index}`}
                    value={item}
                    onChange={(event) => {
                      const next = [...validationSummary.drains]
                      next[index] = event.target.value
                      setValidationSummary({ ...validationSummary, drains: next })
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                ))}
                <Button
                  variant="outline"
                  onClick={() => setValidationSummary({ ...validationSummary, drains: [...validationSummary.drains, ""] })}
                >
                  Add drain
                </Button>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Future Focus</h3>
                {validationSummary.future_focus.map((item, index) => (
                  <input
                    key={`focus-${index}`}
                    value={item}
                    onChange={(event) => {
                      const next = [...validationSummary.future_focus]
                      next[index] = event.target.value
                      setValidationSummary({ ...validationSummary, future_focus: next })
                    }}
                    className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                ))}
                <Button
                  variant="outline"
                  onClick={() =>
                    setValidationSummary({ ...validationSummary, future_focus: [...validationSummary.future_focus, ""] })
                  }
                >
                  Add focus
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">Completed Actions</h3>
                    <p className="text-xs text-slate-500">Defaults accepted. Edit only if something looks off.</p>
                  </div>
                  <span
                    className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 text-xs text-slate-500"
                    title="Categories: creating (making deliverables), collaborating (meetings), communicating (messages), organizing (admin/planning)."
                    aria-label="Category legend"
                  >
                    ?
                  </span>
                </div>
                {validationTasks.map((task, index) => (
                  <div key={`task-${task.id}-${index}`} className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
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
                      <label className="flex items-center gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          checked={task.human_accepted}
                          onChange={(event) => {
                            const next = [...validationTasks]
                            next[index] = { ...task, human_accepted: event.target.checked }
                            setValidationTasks(next)
                          }}
                        />
                        Accept
                      </label>
                    </div>
                    <input
                      value={task.task_text}
                      onChange={(event) => {
                        const next = [...validationTasks]
                        next[index] = { ...task, task_text: event.target.value }
                        setValidationTasks(next)
                      }}
                      className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button
                className="bg-brand-600 hover:bg-brand-700 text-white"
                disabled={isSavingValidation || validationSaved}
                onClick={handleValidationSave}
              >
                {validationSaved ? "Saved" : isSavingValidation ? "Saving..." : "Confirm & Save"}
              </Button>
              {validationSaved && <p className="ml-3 text-xs text-slate-500">Saved feedback.</p>}
            </CardFooter>
          </Card>
        )}

        {/* Features */}
        <Card className="card-base">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">How it works</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-2">
                <div className="text-3xl">🎤</div>
                <p className="text-sm font-medium text-slate-900">Record</p>
                <p className="text-xs text-slate-500">3-min voice reflection</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">🤖</div>
                <p className="text-sm font-medium text-slate-900">AI Process</p>
                <p className="text-xs text-slate-500">Generate summary + tasks</p>
              </div>
              <div className="space-y-2">
                <div className="text-3xl">📊</div>
                <p className="text-sm font-medium text-slate-900">Insights</p>
                <p className="text-xs text-slate-500">Track patterns</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Example Summary - Using semantic colors */}
        <Card className="card-base">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Example Summary</CardTitle>
            <CardDescription className="text-slate-600">What your AI-generated summary looks like</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Wins - Using success colors */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm">Wins</h3>
              <div className="space-y-1 text-sm text-slate-700 bg-success-50 border border-success-200 rounded-lg p-3">
                <p>• Finished OAuth integration</p>
                <p>• Resolved critical API bug</p>
                <p>• Deployed to staging</p>
              </div>
            </div>

            {/* Energy Drains - Using warning colors */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm">Energy Drains</h3>
              <div className="space-y-1 text-sm text-slate-700 bg-warning-50 border border-warning-200 rounded-lg p-3">
                <p>• Too many context switches</p>
                <p>• Urgent code review interruption</p>
              </div>
            </div>

            {/* Future Focus - Using brand colors */}
            <div className="space-y-2">
              <h3 className="font-semibold text-slate-900 text-sm">Future Focus</h3>
              <div className="space-y-1 text-sm text-slate-700 bg-brand-100 border border-brand-200 rounded-lg p-3">
                <p>• Start analytics dashboard</p>
                <p>• Deploy OAuth to production</p>
              </div>
            </div>

            {/* Tasks */}
            <div className="pt-4 border-t border-slate-200">
              <h3 className="font-semibold mb-3 text-slate-900 text-sm">Extracted Tasks (8)</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  OAuth integration
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  Fixed API bug
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  Deployed to staging
                </span>
                <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs">
                  + 5 more
                </span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-slate-500 text-center w-full">
              🔒 Privacy-first: Audio deleted after transcription
            </p>
          </CardFooter>
        </Card>

        {/* CTA */}
        {!isAuthenticated && (
          <div className="text-center">
            <Link href="/login">
              <Button size="lg" variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50">
                Sign Up Free
              </Button>
            </Link>
          </div>
        )}
      </div>
    </main>
  )
}
