// ─── In-Memory Fixed-Window Rate Limiter ──────────────────────────────────────
// Single-VPS only — state is process-local. Works correctly with PM2 single
// instance. Do NOT use in a multi-process or multi-server deployment.
//
// In development (NODE_ENV !== "production"), all checks are bypassed so
// local testing is never blocked.

interface WindowState {
  count: number
  windowStart: number
}

const store = new Map<string, WindowState>()

// Prune stale entries hourly to prevent unbounded memory growth.
setInterval(
  () => {
    const cutoff = Date.now() - 60 * 60 * 1000
    for (const [key, state] of store) {
      if (state.windowStart < cutoff) store.delete(key)
    }
  },
  60 * 60 * 1000
)

/**
 * Returns true if the key has exceeded its rate limit.
 *
 * @param key       Unique bucket identifier (e.g. "login:192.168.1.1")
 * @param limit     Max requests allowed within the window
 * @param windowMs  Window duration in milliseconds
 */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  if (process.env.NODE_ENV !== "production") return false

  const now = Date.now()
  const state = store.get(key)

  // First request or window has expired — start a fresh window
  if (!state || now - state.windowStart >= windowMs) {
    store.set(key, { count: 1, windowStart: now })
    return false
  }

  if (state.count >= limit) return true

  state.count++
  return false
}
