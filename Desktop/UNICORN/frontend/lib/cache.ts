/**
 * TTL-based localStorage cache
 * Prevents stale data from being shown to users
 */

interface CacheEntry<T> {
  data: T
  ts: number
}

export function getCached<T>(key: string, ttlMinutes = 5): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry<T>
    // Verify entry has expected shape
    if (!entry || typeof entry.ts !== "number") return null
    // Verifică TTL
    if (Date.now() - entry.ts > ttlMinutes * 60 * 1000) {
      localStorage.removeItem(key)
      return null
    }
    return entry.data
  } catch {
    return null
  }
}

export function setCached(key: string, data: unknown): void {
  try {
    const entry: CacheEntry<unknown> = { data, ts: Date.now() }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // localStorage poate fi plin sau disabled
  }
}

export function invalidateCache(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {}
}

export function invalidateAllCache(): void {
  const keysToRemove = [
    "user_data",
    "subscription_cache",
    "diagnostic_result",
    "diagnostic_result_full",
    "diagnostic_result_partial",
    "scan_data",
  ]
  keysToRemove.forEach(invalidateCache)
  if (typeof sessionStorage !== "undefined") {
    keysToRemove.forEach((k) => {
      try {
        sessionStorage.removeItem(k)
      } catch {
        /* ignore */
      }
    })
  }
}

/** localStorage key for profile blob (wrapped with TTL via setCached). */
export const USER_DATA_KEY = "user_data"

/**
 * Read profile: TTL cache first, then legacy flat JSON in localStorage, then sessionStorage (migrated to cache).
 */
export function getUserData<T extends Record<string, unknown> = Record<string, unknown>>(
  ttlMinutes = 10
): T | null {
  const hit = getCached<T>(USER_DATA_KEY, ttlMinutes)
  if (hit) return hit

  try {
    const raw = localStorage.getItem(USER_DATA_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as Record<string, unknown>
    if (!o || typeof o !== "object") return null
    const ttlMs = ttlMinutes * 60 * 1000
    // Orphan wrapped entry (e.g. race) — same shape as CacheEntry
    if ("data" in o && typeof o.ts === "number") {
      const inner = o.data
      if (Date.now() - o.ts > ttlMs) {
        localStorage.removeItem(USER_DATA_KEY)
        return null
      }
      if (inner && typeof inner === "object" && !Array.isArray(inner)) {
        return inner as T
      }
      return null
    }
    // Legacy flat profile
    if ("email" in o || "user_id" in o || "company_id" in o) {
      setCached(USER_DATA_KEY, o)
      return o as T
    }
  } catch {
    return null
  }

  try {
    const rawS = sessionStorage.getItem(USER_DATA_KEY)
    if (!rawS) return null
    const o = JSON.parse(rawS) as T
    if (o && typeof o === "object") {
      setCached(USER_DATA_KEY, o)
      return o
    }
  } catch {
    return null
  }
  return null
}

/** Persist profile with TTL in localStorage and flat copy in sessionStorage (interop). */
export function setUserData(data: unknown): void {
  setCached(USER_DATA_KEY, data)
  try {
    sessionStorage.setItem(
      USER_DATA_KEY,
      typeof data === "string" ? data : JSON.stringify(data)
    )
  } catch {
    /* ignore */
  }
}
