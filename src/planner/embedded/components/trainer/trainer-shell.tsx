'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { safeHttpTrainerBase, trainerIframeSrc } from '@/lib/trainer-embed-url'

interface TrainerShellProps {
  /** Path and optional query as seen on the planner host (e.g. `/ucat-rapid-recall-trainer`). */
  pathWithQuery: string
}

export function TrainerShell({ pathWithQuery }: TrainerShellProps) {
  const base = useMemo(
    () => safeHttpTrainerBase(process.env.NEXT_PUBLIC_TRAINER_URL),
    []
  )

  const iframeSrc = base ? trainerIframeSrc(base, pathWithQuery) : null

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-white px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="text-sm font-semibold text-slate-900 hover:text-foreground truncate"
          >
            TheUKCATPeople
          </Link>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide hidden sm:inline">
            Free skills drills
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {iframeSrc ? (
            <a
              href={iframeSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:text-foreground whitespace-nowrap"
            >
              Open trainer site
            </a>
          ) : null}
          <Link
            href="/dashboard"
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 whitespace-nowrap"
          >
            Study plan
          </Link>
        </div>
      </header>

      {!base ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
          <p className="text-sm font-medium text-slate-800">Trainer embed is not configured</p>
          <p className="max-w-md text-sm text-slate-600">
            Set <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">NEXT_PUBLIC_TRAINER_URL</code> to
            the public origin of the Vite trainer (for example{' '}
            <code className="rounded bg-slate-200 px-1 py-0.5 text-xs">https://skills.example.com</code>
            ).
          </p>
        </div>
      ) : iframeSrc ? (
        <iframe
          title="UCAT skills trainer"
          src={iframeSrc}
          className="w-full flex-1 min-h-[calc(100dvh-52px)] border-0 bg-white"
          allow="clipboard-write"
        />
      ) : null}
    </div>
  )
}
