"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

const MAX_DURATION_SECONDS = 30

type RecorderState = "idle" | "recording" | "review"

const VISUALIZATIONS = [
  { id: "classic", label: "Classic Wave", description: "Single-line oscilloscope look" },
  { id: "equalizer", label: "Equalizer Bars", description: "Frequency buckets as bars" },
  { id: "dual", label: "Dual Waveform", description: "Mirrored waveform with fill" },
  { id: "pulse", label: "Pulsing Blob", description: "Amplitude-driven radial pulse" },
  { id: "particles", label: "Particle Burst", description: "Energy mapped to floating particles" },
  { id: "radial", label: "Radial Spectrum", description: "Circular equalizer donut" },
  { id: "spectrogram", label: "Spectrogram", description: "Scrolling frequency heatmap" },
  { id: "ribbon", label: "Bezier Ribbon", description: "Flowing ribbon waveform" },
  { id: "waterfall", label: "Waterfall Columns", description: "Stacked amplitude shelves" },
]

export function VisualizerShowcase() {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle")
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRefs = useRef<(HTMLCanvasElement | null)[]>([])

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

  useEffect(() => {
    return () => {
      cleanupStream()
    }
  }, [cleanupStream])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop()
    }
    cleanupStream()
    setRecorderState("review")
  }, [cleanupStream])

  const resizeCanvas = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    const dpr = window.devicePixelRatio || 1
    const { width, height } = canvas.getBoundingClientRect()
    const displayWidth = Math.floor(width * dpr)
    const displayHeight = Math.floor(height * dpr)
    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth
      canvas.height = displayHeight
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.scale(dpr, dpr)
    }
  }

  const startVisualizer = () => {
    if (!analyserRef.current) return
    const analyser = analyserRef.current
    const timeDomainData = new Uint8Array(analyser.fftSize)
    const freqData = new Uint8Array(analyser.frequencyBinCount)

    const draw = () => {
      if (!analyserRef.current) return
      analyser.getByteTimeDomainData(timeDomainData)
      analyser.getByteFrequencyData(freqData)

      canvasRefs.current.forEach((canvas, index) => {
        if (!canvas) return
        const ctx = canvas.getContext("2d")
        if (!ctx) return
        resizeCanvas(canvas, ctx)
        switch (VISUALIZATIONS[index]?.id) {
          case "equalizer":
            drawEqualizer(ctx, freqData)
            break
          case "dual":
            drawDualWave(ctx, timeDomainData)
            break
          case "pulse":
            drawPulse(ctx, timeDomainData)
            break
          case "particles":
            drawParticleBurst(ctx, freqData, timeDomainData)
            break
          case "radial":
            drawRadialSpectrum(ctx, freqData)
            break
          case "spectrogram":
            drawSpectrogram(ctx, freqData)
            break
          case "ribbon":
            drawRibbon(ctx, timeDomainData)
            break
          case "waterfall":
            drawWaterfall(ctx, timeDomainData)
            break
          default:
            drawClassicWave(ctx, timeDomainData)
        }
      })

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()
  }

  const drawClassicWave = (ctx: CanvasRenderingContext2D, data: Uint8Array) => {
    const { width, height } = ctx.canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, width, height)
    const sliceWidth = width / data.length
    ctx.lineWidth = 2
    ctx.strokeStyle = "#2563eb"
    ctx.beginPath()
    let x = 0
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0
      const y = (v * height) / 2
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.lineTo(width, height / 2)
    ctx.stroke()
  }

  const drawEqualizer = (ctx: CanvasRenderingContext2D, freqData: Uint8Array) => {
    const { width, height } = ctx.canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#0f172a"
    ctx.globalAlpha = 0.35
    ctx.fillRect(0, 0, width, height)
    ctx.globalAlpha = 1
    const barCount = 40
    const step = Math.floor(freqData.length / barCount)
    const barWidth = width / barCount
    for (let i = 0; i < barCount; i++) {
      const value = freqData[i * step] / 255
      const barHeight = value * height
      const hue = 220 - value * 120
      ctx.fillStyle = `hsl(${hue}, 85%, 65%)`
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight)
    }
  }

  const drawDualWave = (ctx: CanvasRenderingContext2D, data: Uint8Array) => {
    const { width, height } = ctx.canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, width, height)
    const sliceWidth = width / data.length
    ctx.beginPath()
    ctx.lineWidth = 1.5
    ctx.fillStyle = "rgba(99, 102, 241, 0.25)"
    ctx.strokeStyle = "#6366f1"
    let x = 0
    ctx.moveTo(0, height / 2)
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0
      const y = (v * height) / 2
      ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.lineTo(width, height / 2)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    x = 0
    ctx.moveTo(0, height / 2)
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0
      const y = height - (v * height) / 2
      ctx.lineTo(x, y)
      x += sliceWidth
    }
    ctx.lineTo(width, height / 2)
    ctx.stroke()
  }

  const drawPulse = (ctx: CanvasRenderingContext2D, data: Uint8Array) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = "rgba(248, 250, 252, 0.35)"
    ctx.fillRect(0, 0, width, height)
    const amplitude = data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length
    const radius = Math.max(20, (amplitude / 128) * Math.min(width, height) * 0.4)
    const centerX = width / 2
    const centerY = height / 2
    const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.2, centerX, centerY, radius)
    gradient.addColorStop(0, "rgba(59, 130, 246, 0.8)")
    gradient.addColorStop(1, "rgba(59, 130, 246, 0.1)")
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fill()
  }

  const startRecording = async () => {
    setError(null)
    setElapsedSeconds(0)
    setRecorderState("recording")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      mediaRecorderRef.current = recorder
      mediaStreamRef.current = stream

      const audioContext = new AudioContext()
      if (audioContext.state === "suspended") {
        await audioContext.resume()
      }
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      const source = audioContext.createMediaStreamSource(stream)
      const gain = audioContext.createGain()
      gain.gain.value = 0
      source.connect(analyser)
      analyser.connect(gain)
      gain.connect(audioContext.destination)

      audioContextRef.current = audioContext
      analyserRef.current = analyser
      startVisualizer()

      recorder.onstop = () => {
        setRecorderState("review")
      }

      recorder.start()
    } catch (err) {
      console.error(err)
      setError("Unable to access microphone. Please allow permissions.")
      setRecorderState("idle")
      cleanupStream()
    }
  }

  useEffect(() => {
    if (recorderState !== "recording") return
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1
        if (next >= MAX_DURATION_SECONDS) {
          stopRecording()
          return MAX_DURATION_SECONDS
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [recorderState, stopRecording])

  const progress = useMemo(() => (elapsedSeconds / MAX_DURATION_SECONDS) * 100, [elapsedSeconds])

  return (
    <Card className="card-base">
      <CardHeader>
        <CardTitle className="text-lg">Visualizer Playground</CardTitle>
        <CardDescription>Record once and compare four visualization styles in parallel.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Test Recording Progress</span>
            <span>
              {elapsedSeconds}s / {MAX_DURATION_SECONDS}s
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex flex-wrap gap-3">
          {recorderState === "idle" && (
            <Button onClick={startRecording} className="bg-brand-600 hover:bg-brand-700 text-white">
              Start Test Recording
            </Button>
          )}
          {recorderState === "recording" && (
            <Button onClick={stopRecording} className="bg-red-600 hover:bg-red-700 text-white">
              Stop Test Recording
            </Button>
          )}
          {recorderState === "review" && (
            <Button
              variant="outline"
              onClick={() => {
                cleanupStream()
                setRecorderState("idle")
                setElapsedSeconds(0)
                setError(null)
              }}
            >
              Reset
            </Button>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {VISUALIZATIONS.map((viz, index) => (
            <div key={viz.id} className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{viz.label}</p>
                <p className="text-xs text-slate-500">{viz.description}</p>
              </div>
              <div className="relative h-32 bg-slate-100 rounded-md overflow-hidden">
                <canvas ref={(el) => { canvasRefs.current[index] = el }} className="absolute inset-0 w-full h-full" />
                {recorderState === "idle" && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                    Start recording to preview
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
  const drawParticleBurst = (ctx: CanvasRenderingContext2D, freqData: Uint8Array, data: Uint8Array) => {
    const { width, height } = ctx.canvas
    ctx.fillStyle = "rgba(15, 23, 42, 0.2)"
    ctx.fillRect(0, 0, width, height)
    const amplitude = data.reduce((sum, value) => sum + Math.abs(value - 128), 0) / data.length
    const count = Math.floor(20 + (amplitude / 128) * 40)
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const radius = (freqData[i % freqData.length] / 255) * (Math.min(width, height) / 2)
      const x = width / 2 + Math.cos(angle) * radius
      const y = height / 2 + Math.sin(angle) * radius
      ctx.fillStyle = `hsla(${200 + (i % 60)}, 80%, 60%, 0.6)`
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  const drawRadialSpectrum = (ctx: CanvasRenderingContext2D, freqData: Uint8Array) => {
    const { width, height } = ctx.canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, width, height)
    const centerX = width / 2
    const centerY = height / 2
    const radius = Math.min(centerX, centerY) * 0.5
    const barCount = 80
    const step = Math.floor(freqData.length / barCount)
    for (let i = 0; i < barCount; i++) {
      const value = freqData[i * step] / 255
      const barLength = radius + value * radius
      const angle = (i / barCount) * Math.PI * 2
      ctx.strokeStyle = `hsl(${220 - value * 120}, 80%, 65%)`
      ctx.beginPath()
      ctx.moveTo(centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
      ctx.lineTo(centerX + Math.cos(angle) * barLength, centerY + Math.sin(angle) * barLength)
      ctx.stroke()
    }
  }

  const drawSpectrogram = (ctx: CanvasRenderingContext2D, freqData: Uint8Array) => {
    const { width, height } = ctx.canvas
    if (width < 2) return
    const imageData = ctx.getImageData(1, 0, width - 1, height)
    ctx.putImageData(imageData, 0, 0)
    for (let y = 0; y < height; y++) {
      const index = Math.floor((y / height) * freqData.length)
      const intensity = freqData[index] / 255
      ctx.fillStyle = `hsl(${260 - intensity * 140}, 90%, ${35 + intensity * 45}%)`
      ctx.fillRect(width - 1, height - y, 1, 1)
    }
  }

  const drawRibbon = (ctx: CanvasRenderingContext2D, data: Uint8Array) => {
    const { width, height } = ctx.canvas
    ctx.clearRect(0, 0, width, height)
    ctx.fillStyle = "#f8fafc"
    ctx.fillRect(0, 0, width, height)
    const sliceWidth = width / data.length
    ctx.beginPath()
    ctx.moveTo(0, height / 2)
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0
      const y = (v * height) / 2
      ctx.lineTo(i * sliceWidth, y)
    }
    ctx.lineTo(width, height / 2)
    ctx.lineWidth = 4
    ctx.strokeStyle = "#10b981"
    ctx.stroke()
    ctx.fillStyle = "rgba(16, 185, 129, 0.2)"
    ctx.fill()
  }

  const drawWaterfall = (ctx: CanvasRenderingContext2D, data: Uint8Array) => {
    const { width, height } = ctx.canvas
    if (height < 3) return
    const imageData = ctx.getImageData(0, 0, width, height - 2)
    ctx.putImageData(imageData, 0, 2)
    ctx.fillStyle = "rgba(15, 23, 42, 0.25)"
    ctx.fillRect(0, 0, width, 2)
    const sliceWidth = width / data.length
    ctx.fillStyle = "#38bdf8"
    for (let i = 0; i < data.length; i++) {
      const value = data[i] / 255
      const y = value * 2
      ctx.fillRect(i * sliceWidth, 0, sliceWidth, 2 + y)
    }
  }
