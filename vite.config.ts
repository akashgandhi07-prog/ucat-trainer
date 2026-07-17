import path from 'node:path'
import fs from 'node:fs/promises'
import type { ServerResponse } from 'node:http'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const goldStandardsDir = path.join(rootDir, 'question-lab/gold-standards')
const outputSpecsDir = path.join(rootDir, 'question-lab/output-specs')
const questionLabMasterPlanPath = path.join(rootDir, 'docs/QUESTION_LAB_MASTER_PLAN.md')

const plannerEmbedded = path.resolve(rootDir, 'src/planner/embedded')
const plannerShim = path.resolve(rootDir, 'src/planner/shim')
const plannerLib = path.resolve(rootDir, 'src/planner/lib')

function sendJson(res: ServerResponse, status: number, data: unknown) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(data))
}

function isMarkdownFilename(filename: string): boolean {
  return /^[a-z0-9-]+\.md$/.test(filename)
}

function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .split('-')
    .map((word) =>
      word === 'dm' || word === 'qr' || word === 'vr' || word === 'sjt'
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(' ')
}

type MarkdownDirConfig = {
  urlPrefix: string
  dir: string
  redirectPath?: string
}

function registerMarkdownDirMiddleware(
  configs: MarkdownDirConfig[],
): (req: import('node:http').IncomingMessage, res: ServerResponse, next: () => void) => Promise<void> {
  return async (req, res, next) => {
    const matched = configs.find((c) => req.url?.startsWith(c.urlPrefix))
    if (!matched) {
      next()
      return
    }

    const url = new URL(req.url!, 'http://localhost')
    const parts = url.pathname.split('/').filter(Boolean)
    const filename = parts[2]

    try {
      await fs.mkdir(matched.dir, { recursive: true })

      if (!filename && req.method === 'GET') {
        const acceptHeader = req.headers.accept ?? ''
        if (acceptHeader.includes('text/html') && matched.redirectPath) {
          res.statusCode = 302
          res.setHeader('Location', matched.redirectPath)
          res.end()
          return
        }

        const entries = await fs.readdir(matched.dir, { withFileTypes: true })
        const files = entries
          .filter((entry) => entry.isFile() && isMarkdownFilename(entry.name))
          .map((entry) => ({
            filename: entry.name,
            slug: entry.name.replace(/\.md$/, ''),
            title: titleFromFilename(entry.name),
          }))
          .sort((a, b) => a.filename.localeCompare(b.filename))

        sendJson(res, 200, { files })
        return
      }

      if (!filename || !isMarkdownFilename(filename)) {
        sendJson(res, 400, { error: 'Invalid markdown filename.' })
        return
      }

      const filePath = path.join(matched.dir, filename)
      if (!filePath.startsWith(matched.dir)) {
        sendJson(res, 400, { error: 'Invalid file path.' })
        return
      }

      if (req.method === 'GET') {
        const content = await fs.readFile(filePath, 'utf8')
        sendJson(res, 200, { filename, content })
        return
      }

      if (req.method === 'PUT') {
        let body = ''
        req.setEncoding('utf8')
        req.on('data', (chunk) => {
          body += chunk
        })
        req.on('end', async () => {
          try {
            await fs.writeFile(filePath, body, 'utf8')
            sendJson(res, 200, { filename, saved: true })
          } catch (error) {
            sendJson(res, 500, {
              error: error instanceof Error ? error.message : 'Unable to save file.',
            })
          }
        })
        return
      }

      sendJson(res, 405, { error: 'Method not allowed.' })
    } catch (error) {
      sendJson(res, 500, {
        error: error instanceof Error ? error.message : 'Unable to load markdown files.',
      })
    }
  }
}

function questionLabEditorPlugin(): Plugin {
  const markdownDirs: MarkdownDirConfig[] = [
    {
      urlPrefix: '/__question-lab/gold-standards',
      dir: goldStandardsDir,
      redirectPath: '/admin/question-lab/gold-standards',
    },
    {
      urlPrefix: '/__question-lab/output-specs',
      dir: outputSpecsDir,
      redirectPath: '/admin/question-lab/output-specs',
    },
  ]

  return {
    name: 'question-lab-editor',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/__question-lab/master-plan' && req.method === 'GET') {
          try {
            const content = await fs.readFile(questionLabMasterPlanPath, 'utf8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'text/markdown;charset=utf-8')
            res.end(content)
          } catch (error) {
            sendJson(res, 500, {
              error: error instanceof Error ? error.message : 'Unable to load master plan.',
            })
          }
          return
        }

        await registerMarkdownDirMiddleware(markdownDirs)(req, res, next)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  return {
    plugins: [questionLabEditorPlugin(), react(), tailwindcss()],
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
        '@/lib/ucatExamWindow': path.resolve(rootDir, 'src/lib/ucatExamWindow.ts'),
        '@': plannerEmbedded,
      },
    },
    server: {
      fs: { allow: [rootDir] },
      // Honour an assigned port (e.g. from tooling that sets PORT) instead of always 5173.
      port: Number(process.env.PORT) || 5173,
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
