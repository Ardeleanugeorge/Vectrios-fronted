import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Must match backend `VECTRIOS_AUTH_COOKIE_NAME` (see creatoros-backend auth.py).
 * Set the same name in frontend .env if you override the default.
 */
const AUTH_COOKIE_NAME = process.env.VECTRIOS_AUTH_COOKIE_NAME || "vectrios_auth"

function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/dashboard")) return true
  if (pathname.startsWith("/upgrade")) return true
  if (pathname.startsWith("/account/confirm-email-change")) return false
  if (pathname.startsWith("/account")) return true
  return false
}

function isStripeCheckoutReturn(request: NextRequest): boolean {
  const { pathname, searchParams } = request.nextUrl
  if (!pathname.startsWith("/dashboard")) return false
  if (searchParams.get("checkout_success") !== "1") return false
  const sid = searchParams.get("session_id")?.trim() || ""
  // Stripe Checkout Session IDs always start with cs_ (live) or cs_test_ (test).
  if (!sid.startsWith("cs_")) return false
  return true
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value?.trim()
  if (token) {
    return NextResponse.next()
  }

  // Stripe redirects here from stripe.com before the browser may attach a newly issued
  // cross-subdomain cookie on the first request. Allow the dashboard shell to load; the
  // page calls /billing/confirm-checkout with credentials (shared Domain=.vectrios.com cookie on API).
  if (isStripeCheckoutReturn(request)) {
    return NextResponse.next()
  }

  const login = new URL("/login", request.url)
  const pathWithSearch = pathname + (request.nextUrl.search || "")
  login.searchParams.set("next", pathWithSearch)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ["/dashboard/:path*", "/upgrade/:path*", "/account/:path*"],
}
