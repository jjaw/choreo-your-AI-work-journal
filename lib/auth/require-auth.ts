import { NextResponse } from "next/server"

import { supabaseAdmin } from "@/lib/supabase/admin"

export const requireAuth = async (request: Request) => {
  const authHeader = request.headers.get("authorization") ?? ""
  const token = authHeader.replace("Bearer ", "")
  if (!token) {
    return { response: NextResponse.json({ error: "Missing auth token" }, { status: 401 }) }
  }

  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) {
    return { response: NextResponse.json({ error: "Invalid auth token" }, { status: 401 }) }
  }

  return { user: userData.user }
}
