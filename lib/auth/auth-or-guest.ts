import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"
import { enforceGuestLimit } from "@/lib/requests/guest-limit"
import { getRequestMeta } from "@/lib/requests/meta"

export const authOrGuest = async (request: Request, route: string) => {
  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.replace("Bearer ", "")
  if (token) {
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !userData?.user) {
      return { response: NextResponse.json({ error: "Invalid auth token" }, { status: 401 }) }
    }
    return { user: userData.user, response: null }
  }

  const meta = getRequestMeta(request)
  const gate = await enforceGuestLimit(meta.ip, route)
  return { response: gate.response }
}
