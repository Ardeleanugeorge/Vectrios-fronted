import { NextRequest, NextResponse } from "next/server"

/**
 * Must match backend `AUTH_COOKIE_NAME` / middleware `VECTRIOS_AUTH_COOKIE_NAME`.
 */
const AUTH_COOKIE_NAME = process.env.VECTRIOS_AUTH_COOKIE_NAME || "vectrios_auth"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

/**
 * Host-only cookie on localhost / preview; shared subdomain cookie in prod so
 * e.g. www.vectrios.com (scan) and app.vectrios.com (dashboard) see the same session.
 */
function resolveAuthCookieDomain(request: NextRequest): string | undefined {
  const fromEnv = process.env.VECTRIOS_AUTH_COOKIE_DOMAIN?.trim()
  if (fromEnv) return fromEnv

  const host = (request.headers.get("host") || "").split(":")[0].toLowerCase()
  if (!host || host === "localhost" || host.endsWith(".vercel.app")) {
    return undefined
  }
  if (host === "vectrios.com" || host.endsWith(".vectrios.com")) {
    return ".vectrios.com"
  }
  return undefined
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token = body?.token
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }

    const secure = process.env.NODE_ENV === "production"
    const sameSite = secure ? ("none" as const) : ("lax" as const)
    const domain = resolveAuthCookieDomain(request)

    const response = NextResponse.json({ status: "ok" })
    response.cookies.set(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure,
      sameSite,
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      ...(domain ? { domain } : {}),
    })
    return response
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}
