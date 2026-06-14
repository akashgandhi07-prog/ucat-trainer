import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import App from './App.tsx'

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
    <HelmetProvider>
      <App />
    </HelmetProvider>
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
