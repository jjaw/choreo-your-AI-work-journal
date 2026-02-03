import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { getGeminiModelName, generateContent } from "@/lib/gemini"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY ?? ""
)

type SummaryInput = {
  created_at: string
  wins: string[]
  drains: string[]
  future_focus: string[]
  energy_level?: string | null
  emotional_tone?: string | null
}

type TaskCounts = {
  creating: number
  collaborating: number
  communicating: number
  organizing: number
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()

const topItems = (items: string[], limit = 3) => {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    const key = normalize(item)
    if (!key) return acc
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key]) => key)
}

const pickEnergy = (summaries: SummaryInput[]) => {
  const counts = summaries.reduce<Record<string, number>>((acc, item) => {
    const key = item.energy_level ?? "unknown"
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "unknown"
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader) {
      return NextResponse.json({ error: "Missing auth token" }, { status: 401 })
    }
    const token = authHeader.replace("Bearer ", "")
    const { data: authData } = await supabaseAdmin.auth.getUser(token)
    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await request.json()
    const summaries = (payload.summaries ?? []) as SummaryInput[]
    const taskCounts = payload.taskCounts as TaskCounts
    const latestSummaryAt = payload.latestSummaryAt as string | undefined

    if (!summaries.length || !latestSummaryAt) {
      return NextResponse.json({ error: "Missing summary data" }, { status: 400 })
    }

    const { data: cached } = await supabaseAdmin
      .from("long_term_insights")
      .select("insights, latest_summary_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)

    const last = cached?.[0]
    if (last?.latest_summary_at === latestSummaryAt) {
      const lastCreated = new Date(last.created_at).getTime()
      if (Date.now() - lastCreated < ONE_DAY_MS) {
        return NextResponse.json({ insights: last.insights, cached: true })
      }
    }

    const drains = topItems(summaries.flatMap((item) => item.drains ?? []))
    const wins = topItems(summaries.flatMap((item) => item.wins ?? []))
    const focus = topItems(summaries.flatMap((item) => item.future_focus ?? []))
    const energy = pickEnergy(summaries)

    const prompt = [
      "You are generating concise long-term insights for a work journal.",
      "Use ONLY the provided data. Do not invent details or give generic advice.",
      "Return JSON: { \"insights\": [string, ...] } with 2-3 bullets, each <= 14 words.",
      "Each bullet must reference a concrete pattern from the data (energy, tasks, wins, drains, focus).",
      "",
      `Reflection count: ${summaries.length}`,
      `Top wins: ${wins.join("; ") || "none"}`,
      `Top drains: ${drains.join("; ") || "none"}`,
      `Top focus: ${focus.join("; ") || "none"}`,
      `Energy trend: ${energy}`,
      `Task categories: creating ${taskCounts.creating}, collaborating ${taskCounts.collaborating}, communicating ${taskCounts.communicating}, organizing ${taskCounts.organizing}`,
    ].join("\n")

    const result = await generateContent({
      model: getGeminiModelName(),
      contents: prompt,
    })
    const raw = result.text?.trim() ?? ""
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    const insights = Array.isArray(parsed?.insights) ? parsed.insights.filter(Boolean) : []

    if (!insights.length) {
      return NextResponse.json({ error: "No insights generated" }, { status: 500 })
    }

    await supabaseAdmin.from("long_term_insights").insert({
      user_id: userId,
      latest_summary_at: latestSummaryAt,
      insights,
    })

    return NextResponse.json({ insights, cached: false })
  } catch (error) {
    console.error("[generate-insights] Unexpected error", error)
    return NextResponse.json({ error: "Unexpected error" }, { status: 500 })
  }
}
