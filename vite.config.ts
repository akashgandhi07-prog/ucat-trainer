import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))

const plannerEmbedded = path.resolve(rootDir, 'src/planner/embedded')
const plannerShim = path.resolve(rootDir, 'src/planner/shim')
const plannerLib = path.resolve(rootDir, 'src/planner/lib')

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  return {
    plugins: [react(), tailwindcss()],
    optimizeDeps: {
      include: ['react', 'react-dom', 'clsx', 'tailwind-merge', 'date-fns'],
    },
    resolve: {
      alias: {
        '@/lib/app-navigation': path.resolve(plannerShim, 'app-navigation.tsx'),
        '@/lib/app-link': path.resolve(plannerShim, 'app-link.tsx'),
        '@/lib/supabase/client': path.resolve(plannerShim, 'supabase-client.ts'),
        '@/lib/create-plan-from-onboarding': path.resolve(
          plannerLib,
          'create-plan-from-onboarding.ts',
        ),
        '@/lib/planner-client': path.resolve(plannerLib, 'planner-client.ts'),
        '@/lib/export-plan-pdf': path.resolve(plannerLib, 'export-plan-pdf.ts'),
        '@/components/guest/guest-sign-in-cta': path.resolve(
          plannerShim,
          'guest-sign-in-cta.tsx',
        ),
        '@': plannerEmbedded,
      },
    },
    server: {
      fs: { allow: [rootDir] },
    },
    define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL ?? ''),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY ?? ''),
      'process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
        env.VITE_SUPABASE_ANON_KEY ?? '',
      ),
    },
  }
})
