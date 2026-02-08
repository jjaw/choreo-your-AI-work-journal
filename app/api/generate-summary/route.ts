import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth/require-auth"
import { buildInlineAudioPart, generateContent, getGeminiModelName } from "@/lib/gemini"
import { getRequestMeta } from "@/lib/requests/meta"
import type { PartUnion } from "@google/genai"

const REQUIRE_AUTH = process.env.NODE_ENV === "production"
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const MIN_FILE_SIZE_BYTES = 10 * 1024
const ALLOWED_MIME_TYPES = ["audio/webm", "audio/webm;codecs=opus", "audio/mpeg", "audio/ogg", "audio/wav"]

type SummaryPayload = {
  wins: string[]
  drains: string[]
  future_focus: string[]
  emotional_tone: string
  energy_level: string
  emotion_confidence: "low" | "medium" | "high"
}

const emptySummary: SummaryPayload = {
  wins: [],
  drains: [],
  future_focus: [],
  emotional_tone: "unknown",
  energy_level: "unknown",
  emotion_confidence: "low",
}

function safeParseSummary(raw: string): SummaryPayload {
  const trimmed = raw.trim()
  const jsonText = trimmed.replace(/^```json\s*/i, "").replace(/```$/i, "").trim()
  try {
    const parsed = JSON.parse(jsonText) as Partial<SummaryPayload>
    return {
      wins: Array.isArray(parsed.wins) ? parsed.wins.filter(Boolean) : [],
      drains: Array.isArray(parsed.drains) ? parsed.drains.filter(Boolean) : [],
      future_focus: Array.isArray(parsed.future_focus) ? parsed.future_focus.filter(Boolean) : [],
      emotional_tone: typeof parsed.emotional_tone === "string" ? parsed.emotional_tone : "unknown",
      energy_level: typeof parsed.energy_level === "string" ? parsed.energy_level : "unknown",
      emotion_confidence:
        parsed.emotion_confidence === "high" || parsed.emotion_confidence === "medium"
          ? parsed.emotion_confidence
          : "low",
    }
  } catch {
    return emptySummary
  }
}

export async function POST(request: Request) {
  try {
    if (REQUIRE_AUTH) {
      const auth = await requireAuth(request)
      if (auth.response) {
        const meta = getRequestMeta(request)
        console.warn("[generate-summary] blocked unauthenticated request", meta)
        return auth.response
      }
    }

    const formData = await request.formData()
    const transcript = String(formData.get("transcript") ?? "").trim()
    const audioFile = formData.get("audio") as File | null

    if (!transcript) {
      return NextResponse.json({ error: "Missing transcript" }, { status: 400 })
    }

    const contentParts: PartUnion[] = [
      [
        "You are summarizing a user's workday reflection.",
        "Use the transcript text and, if present, the audio tone to infer emotional tone and energy level.",
        "Return strict JSON only with these keys:",
        "wins (array of strings), drains (array of strings), future_focus (array of strings),",
        "emotional_tone (string), energy_level (string), emotion_confidence (low|medium|high).",
        "Rules:",
        "- Wins and drains must be concrete events or outcomes.",
        "- Future focus must be next-step intentions.",
        "wins: 2-4 items, drains: 1-3 items, future_focus: 1-3 items.",
      ].join(" "),
      `Transcript:\n${transcript}`,
    ]

    if (audioFile) {
      if (!ALLOWED_MIME_TYPES.includes(audioFile.type)) {
        return NextResponse.json({ error: "Unsupported audio format" }, { status: 415 })
      }
      if (audioFile.size < MIN_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: "Audio file is too short" }, { status: 400 })
      }
      if (audioFile.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: "Audio file is too large" }, { status: 413 })
      }
      const arrayBuffer = await audioFile.arrayBuffer()
      const base64Audio = Buffer.from(arrayBuffer).toString("base64")
      contentParts.push(buildInlineAudioPart(base64Audio, audioFile.type))
    }

    const result = await generateContent({
      contents: contentParts,
      model: getGeminiModelName(),
      tracing: {
        generationName: "summary_generation",
        tags: ["summary"],
        metadata: {
          route: "generate-summary",
          transcriptLength: transcript.length,
          hasAudio: Boolean(audioFile),
          audioMimeType: audioFile?.type ?? null,
          audioSizeBytes: audioFile?.size ?? null,
        },
      },
    })
    const raw = result.text?.trim() ?? ""
    const summary = safeParseSummary(raw)

    return NextResponse.json({
      summary,
      raw,
      modelUsed: process.env.GEMINI_MODEL ?? null,
    })
  } catch (error) {
    console.error("[generate-summary] Unexpected error", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
