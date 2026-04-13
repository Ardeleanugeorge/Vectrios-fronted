/**
 * Central API fetch wrapper
 * - Adaugă credentials: "include" pentru httpOnly cookies
 * - Fallback Authorization header din localStorage (compatibilitate sesiuni existente)
 * - Toate request-urile către API_URL trec prin această funcție
 */

import { API_URL } from "@/lib/config"

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    typeof window !== "undefined"
      ? sessionStorage.getItem("auth_token") ||
        localStorage.getItem("auth_token")
      : null

  const headers = new Headers(options.headers)

  // Setează Content-Type dacă nu e deja setat și avem body
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  // Fallback Authorization header pentru sesiuni existente fără cookie
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include", // trimite httpOnly cookie automat
  })
}

/**
 * Helper pentru logout — șterge cookie server-side și curăță storage
 */
export async function apiLogout(): Promise<void> {
  try {
    await apiFetch("/auth/logout", { method: "POST" })
  } catch {
    // best effort
  }
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("auth_token")
    localStorage.removeItem("auth_token")
  }
}
