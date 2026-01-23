import { NextResponse } from "next/server"

import { buildInlineAudioPart, generateContent } from "@/lib/gemini"

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ["audio/webm", "audio/webm;codecs=opus", "audio/mpeg", "audio/ogg", "audio/wav"]

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get("audio") as File | null

    if (!audioFile) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 })
    }

    if (!ALLOWED_MIME_TYPES.includes(audioFile.type)) {
      return NextResponse.json({ error: "Unsupported audio format" }, { status: 415 })
    }

    if (audioFile.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "Audio file is too large" }, { status: 413 })
    }

    const arrayBuffer = await audioFile.arrayBuffer()
    const base64Audio = Buffer.from(arrayBuffer).toString("base64")
    const audioPart = buildInlineAudioPart(base64Audio, audioFile.type)

    const result = await generateContent({
      contents: [
        "Transcribe this audio accurately. Return only the transcript text.",
        audioPart,
      ],
    })
    const transcript = result.text?.trim() ?? ""

    return NextResponse.json({
      transcript,
      modelUsed: process.env.GEMINI_MODEL ?? null,
      wordCount: transcript ? transcript.split(/\s+/).length : 0,
    })
  } catch (error) {
    console.error("[transcribe] Unexpected error", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
