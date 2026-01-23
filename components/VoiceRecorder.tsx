"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const MAX_DURATION_SECONDS = 180

export type RecordingPayload = {
  audioBlob: Blob
  durationSeconds: number
  fileSizeBytes: number
  recordedAt: string
}

type RecorderState = "idle" | "recording" | "review"

type VoiceRecorderProps = {
  maxDurationSeconds?: number
  onSubmit?: (payload: RecordingPayload) => Promise<void> | void
}

export function VoiceRecorder({ maxDurationSeconds = MAX_DURATION_SECONDS, onSubmit }: VoiceRecorderProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [submissionComplete, setSubmissionComplete] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  const cleanupStream = useCallback(() => {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop())
    mediaStreamRef.current = null
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    analyserRef.current = null
    audioContextRef.current?.close()
    audioContextRef.current = null
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    cleanupStream()
    setRecorderState("review")
  }, [cleanupStream])

  const startVisualizer = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const setupCanvas = () => {
      const dpr = window.devicePixelRatio || 1
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }

    setupCanvas()

    const analyser = analyserRef.current
    const bufferLength = analyser.fftSize
    const dataArray = new Uint8Array(bufferLength)
    const delayFrames = Math.max(1, Math.round(0.5 * 60))
    const delayedFrames: Uint8Array[] = []
    const smoothedFrame = new Float32Array(bufferLength)
    const amplitudeMultiplier = 5
    let phase = 0

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current) return
      analyser.getByteTimeDomainData(dataArray)

      const frameCopy = new Uint8Array(dataArray)
      delayedFrames.push(frameCopy)
      if (delayedFrames.length > delayFrames) {
        delayedFrames.shift()
      }
      const targetFrame = delayedFrames.length === delayFrames ? delayedFrames[0] : frameCopy

      for (let i = 0; i < bufferLength; i++) {
        const target = (targetFrame[i] - 128) / 128
        smoothedFrame[i] = smoothedFrame[i] + (target - smoothedFrame[i]) * 0.15
      }

      phase = (phase + 0.35) % bufferLength

      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = "#f8fafc"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const sliceWidth = canvas.width / (bufferLength - 1)
      const smoothFactor = 0.9
      let lastX = 0
      let lastY = canvas.height / 2
      ctx.lineWidth = 3
      ctx.strokeStyle = "#2563eb"
      ctx.fillStyle = "rgba(37, 99, 235, 0.15)"

      ctx.beginPath()
      ctx.moveTo(0, canvas.height / 2)

      const gainBoost = 3
      for (let i = 0; i < bufferLength; i++) {
        const shiftedIndex = (i + phase) % bufferLength
        const lower = Math.floor(shiftedIndex)
        const upper = (lower + 1) % bufferLength
        const mix = shiftedIndex - lower
        let normalized =
          smoothedFrame[lower] * (1 - mix) + smoothedFrame[upper] * mix
        normalized = Math.max(-1, Math.min(1, normalized * gainBoost))
        const y =
          canvas.height / 2 + normalized * (canvas.height / 2) * amplitudeMultiplier
        const x = i * sliceWidth
        const cpx = lastX + (x - lastX) * smoothFactor
        const cpy = lastY + (y - lastY) * smoothFactor
        ctx.quadraticCurveTo(lastX, lastY, cpx, cpy)
        lastX = x
        lastY = y
      }

      ctx.quadraticCurveTo(lastX, lastY, canvas.width, canvas.height / 2)
      ctx.lineTo(canvas.width, canvas.height / 2)
      ctx.lineTo(0, canvas.height / 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
  }, [])

  const startRecording = async () => {
    setError(null)
    setSubmitMessage(null)
    setAudioBlob(null)
    setElapsedSeconds(0)
    setRecorderState("recording")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = recorder
      mediaStreamRef.current = stream
      audioChunksRef.current = []

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      recorder.onstop = () => {
        if (audioChunksRef.current.length === 0) return
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType })
        setAudioBlob(blob)
      }

      const audioContext = new AudioContext()
      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }

      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      const source = audioContext.createMediaStreamSource(stream)
      const gainNode = audioContext.createGain()
      gainNode.gain.value = 0
      source.connect(analyser)
      analyser.connect(gainNode)
      gainNode.connect(audioContext.destination)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      startVisualizer()

      recorder.start()
    } catch (err) {
      console.error(err)
      setError("Unable to access microphone. Check permissions and try again.")
      setRecorderState("idle")
      cleanupStream()
    }
  }

  useEffect(() => {
    if (recorderState !== "recording") return
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1
        if (next >= maxDurationSeconds) {
          stopRecording()
          return maxDurationSeconds
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [recorderState, maxDurationSeconds, stopRecording])

  const handleManualStop = () => {
    if (recorderState === "recording") {
      stopRecording()
    }
  }

  const resetRecorder = ({ clearMessage }: { clearMessage: boolean }) => {
    cleanupStream()
    setRecorderState("idle")
    setElapsedSeconds(0)
    setAudioBlob(null)
    setError(null)
    setSubmissionComplete(false)
    if (clearMessage) {
      setSubmitMessage(null)
    }
  }

  const handleSubmit = async () => {
    if (!audioBlob) return
    setIsSubmitting(true)
    setSubmitMessage(null)
    setError(null)
    try {
      const payload: RecordingPayload = {
        audioBlob,
        durationSeconds: elapsedSeconds,
        fileSizeBytes: audioBlob.size,
        recordedAt: new Date().toISOString(),
      }

      if (onSubmit) {
        await onSubmit(payload)
        setSubmissionComplete(true)
        setSubmitMessage("Recording processed successfully.")
        return
      }

      const formData = new FormData()
      formData.append("audio", audioBlob, `recording.${audioBlob.type === "audio/mpeg" ? "mp3" : "webm"}`)
      formData.append("durationSeconds", String(elapsedSeconds))
      formData.append("recordedAt", payload.recordedAt)

      const response = await fetch("/api/upload-audio", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const { error: responseError } = await response.json().catch(() => ({}))
        throw new Error(responseError ?? "Failed to upload recording")
      }

      setSubmissionComplete(true)
      setSubmitMessage("Recording uploaded successfully. Ready for transcription.")
    } catch (submissionError) {
      console.error("Failed to submit reflection", submissionError)
      setError(submissionError instanceof Error ? submissionError.message : "Failed to submit recording.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const progress = useMemo(() => (elapsedSeconds / maxDurationSeconds) * 100, [elapsedSeconds, maxDurationSeconds])
  const playbackUrl = useMemo(() => {
    if (!audioBlob) return null
    return URL.createObjectURL(audioBlob)
  }, [audioBlob])

  useEffect(() => {
    return () => {
      if (playbackUrl) {
        URL.revokeObjectURL(playbackUrl)
      }
    }
  }, [playbackUrl])

  const formatTime = (totalSeconds: number) => {
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
  }

  const statusConfig = useMemo(() => {
    switch (recorderState) {
      case "recording":
        return {
          title: "Recording in progress",
          description: "Speak freely. Tap Stop when you finish your reflection.",
          accent: "bg-brand-100 border-brand-200 text-brand-700",
        }
      case "review":
        return {
          title: "Review your reflection",
          description: "Listen back, then Submit or Re-record if you want another take.",
          accent: "bg-slate-100 border-slate-200 text-slate-700",
        }
      default:
        return {
          title: "Ready to record",
          description: "You have up to 3 minutes. Press Start when you’re ready.",
          accent: "bg-slate-100 border-slate-200 text-slate-600",
        }
    }
  }, [recorderState])

  return (
    <Card className="card-base">
      <CardHeader>
        <CardTitle className="text-slate-900">Daily Reflection</CardTitle>
        <CardDescription className="text-slate-600">Record a 3-minute voice reflection about your workday</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Recording Progress</span>
            <span>
              {formatTime(elapsedSeconds)} / {formatTime(maxDurationSeconds)}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className={`p-4 border rounded-lg text-sm ${statusConfig.accent}`} aria-live="polite">
          <p className="font-medium">{statusConfig.title}</p>
          <p>{statusConfig.description}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          {recorderState === "idle" && (
            <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white" onClick={startRecording}>
              Start Recording
            </Button>
          )}
          {recorderState === "recording" && (
            <div className="flex items-center gap-3">
              <Button size="lg" className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6" onClick={handleManualStop}>
                Stop Recording
              </Button>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-brand-700" aria-live="assertive">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                Recording…
              </div>
            </div>
          )}
          {recorderState === "review" && (
            <>
            <Button
              size="lg"
              variant="outline"
              onClick={() => resetRecorder({ clearMessage: true })}
              disabled={submissionComplete}
            >
              Re-record
            </Button>
            <Button
              size="lg"
              className="bg-brand-600 hover:bg-brand-700 text-white"
              disabled={!audioBlob || isSubmitting || submissionComplete}
              onClick={handleSubmit}
            >
              {isSubmitting ? "Submitting..." : "Submit Reflection"}
            </Button>
          </>
        )}
        </div>

        <div className="relative h-24 bg-slate-100 rounded-lg overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
          {recorderState !== "recording" && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
              {recorderState === "idle" ? "Waveform appears while recording" : "Recording captured"}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {submitMessage && <p className="text-sm text-green-600">{submitMessage}</p>}
        {submissionComplete && <p className="text-xs text-slate-500">Audio submitted for today.</p>}

        {audioBlob && recorderState === "review" && (
          <div className="space-y-3 text-sm text-slate-600">
            <audio controls src={playbackUrl ?? undefined} className="w-full" />
            <div className="flex flex-col gap-1 text-xs text-slate-500">
              <span>Duration: {formatTime(elapsedSeconds)}</span>
              <span>File size: {(audioBlob.size / 1024 / 1024).toFixed(2)} MB</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
