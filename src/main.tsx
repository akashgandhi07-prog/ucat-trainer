import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Catch-all for errors that escape React's ErrorBoundary (async rejections,
// listener callbacks). Without this they fail silently - no log, no user signal.
// Ignore benign AbortErrors from cancelled in-flight fetches.
window.addEventListener('unhandledrejection', (e) => {
  const reason = e.reason as { name?: string } | undefined
  if (reason?.name === 'AbortError' || reason?.name === 'TimeoutError') return
  console.error('[unhandledrejection]', e.reason)
})
window.addEventListener('error', (e) => {
  console.error('[window.error]', e.message)
})

// After a deploy, a cached page can request chunk hashes that no longer exist.
// Vite fires this when a preloaded module 404s; reload once to pull fresh assets.
// The sessionStorage guard prevents a reload loop if the asset is genuinely gone.
window.addEventListener('vite:preloadError', () => {
  try {
    if (sessionStorage.getItem('vite_preload_reloaded') === '1') return
    sessionStorage.setItem('vite_preload_reloaded', '1')
  } catch {
    /* ignore */
  }
  window.location.reload()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// A clean load means any earlier chunk-failure reload worked, so clear the guards
// to re-arm self-healing for a future deploy within this same tab session.
window.setTimeout(() => {
  try {
    sessionStorage.removeItem('vite_preload_reloaded')
    for (const k of Object.keys(sessionStorage)) {
      if (k.startsWith('chunk_reload_')) sessionStorage.removeItem(k)
    }
  } catch {
    /* ignore */
  }
}, 4000)
