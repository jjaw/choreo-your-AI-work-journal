import { NextResponse } from "next/server"
import { randomUUID } from "crypto"

import { supabaseAdmin } from "@/lib/supabase/admin"

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB safety limit
const ALLOWED_MIME_TYPES = ["audio/webm", "audio/webm;codecs=opus", "audio/mpeg", "audio/ogg"]

const audioBucket = process.env.SUPABASE_AUDIO_BUCKET ?? "voice-recordings"

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

    const extension = audioFile.type === "audio/mpeg" ? "mp3" : audioFile.type === "audio/ogg" ? "ogg" : "webm"
    const filename = `recordings/${new Date().toISOString()}-${randomUUID()}.${extension}`
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from(audioBucket)
      .upload(filename, buffer, {
        contentType: audioFile.type,
        upsert: false,
      })

    if (uploadError) {
      console.error("[upload-audio] Supabase upload failed:", uploadError)
      return NextResponse.json({ error: "Failed to upload audio" }, { status: 500 })
    }

    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin.storage
      .from(audioBucket)
      .createSignedUrl(filename, 60 * 10) // 10 minutes; consumers can fetch immediately

    if (signedUrlError) {
      console.error("[upload-audio] Failed to create signed URL:", signedUrlError)
      return NextResponse.json({ error: "Failed to process audio" }, { status: 500 })
    }

    return NextResponse.json({
      path: filename,
      signedUrl: signedUrlData?.signedUrl ?? null,
    })
  } catch (error) {
    console.error("[upload-audio] Unexpected error", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
