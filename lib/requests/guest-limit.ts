import crypto from "crypto"
import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"

const hashIp = (value: string) =>
  crypto.createHash("sha256").update(value).digest("hex")

export const enforceGuestLimit = async (ip: string | null, route: string) => {
  if (!ip) {
    return {
      response: NextResponse.json({ error: "Missing client IP" }, { status: 400 }),
    }
  }

  const ipHash = hashIp(ip)
  const day = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabaseAdmin
    .from("guest_rate_limits")
    .select("count")
    .eq("ip_hash", ipHash)
    .eq("day", day)
    .eq("route", route)
    .maybeSingle()

  if (error) {
    console.error("[guest-limit] lookup failed", error)
    return {
      response: NextResponse.json({ error: "Guest limit check failed" }, { status: 500 }),
    }
  }

  const currentCount = data?.count ?? 0
  if (currentCount >= 1) {
    return {
      response: NextResponse.json(
        { error: "Guest limit reached. Please sign in to continue." },
        { status: 429 }
      ),
    }
  }

  const { error: upsertError } = await supabaseAdmin.from("guest_rate_limits").upsert(
    {
      ip_hash: ipHash,
      day,
      route,
      count: currentCount + 1,
    },
    {
      onConflict: "ip_hash,day,route",
    }
  )

  if (upsertError) {
    console.error("[guest-limit] upsert failed", upsertError)
    return {
      response: NextResponse.json({ error: "Guest limit check failed" }, { status: 500 }),
    }
  }

  return { response: null }
}
