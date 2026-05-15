/**
 * Build the Skills trainer URL for the embed iframe. Only http(s) bases are allowed.
 * Browser paths under `/ucat` map to the trainer root `/` so `/ucat` is a hub on the planner host.
 */
export function safeHttpTrainerBase(raw: unknown): string | null {
  const t = typeof raw === 'string' ? raw.trim() : ''
  if (!t) return null
  try {
    const u = new URL(t)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    u.pathname = u.pathname.replace(/\/+$/, '')
    return u.origin + (u.pathname === '' ? '' : u.pathname)
  } catch {
    return null
  }
}

/** `pathWithQuery` is the browser path on the planner host (e.g. `/ucat-verbal-reasoning-practice`). */
export function trainerIframeSrc(base: string, pathWithQuery: string): string {
  const origin = base.replace(/\/+$/, '')
  const qIndex = pathWithQuery.indexOf('?')
  const pathnameOnly = qIndex === -1 ? pathWithQuery : pathWithQuery.slice(0, qIndex)
  const search = qIndex === -1 ? '' : pathWithQuery.slice(qIndex)
  let p = pathnameOnly
  if (p === '/ucat' || p === '/ucat/') p = '/'
  if (!p.startsWith('/')) p = `/${p}`
  return `${origin}${p}${search}`
}
