/**
 * Sets the HttpOnly auth cookie on the Next.js host (e.g. app.vectrios.com) so
 * middleware can see it; the backend API lives on another origin and cannot set this cookie for the app.
 */
export async function setAppAuthCookieFromToken(token: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/set-cookie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      credentials: "same-origin",
    })
    return res.ok
  } catch {
    return false
  }
}
