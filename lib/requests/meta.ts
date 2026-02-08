export type RequestMeta = {
  ip: string | null
  userAgent: string | null
  referer: string | null
  origin: string | null
}

export const getRequestMeta = (request: Request): RequestMeta => {
  const forwardedFor = request.headers.get("x-forwarded-for")
  const ip = forwardedFor?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip")
  return {
    ip: ip || null,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    origin: request.headers.get("origin"),
  }
}
