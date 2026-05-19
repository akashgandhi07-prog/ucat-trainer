'use client'

import Link from '@/lib/app-link'

export function GuestSignInCta({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${className}`}
    >
      <div className="text-left">
        <p className="text-sm font-semibold text-amber-900">Browsing as a guest</p>
        <p className="text-xs text-amber-800 mt-0.5">
          Everything is free. Create a free account only when you want progress saved across devices.
        </p>
      </div>
      <Link
        href="/auth/login?next=/dashboard"
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
      >
        Sign in to save
      </Link>
    </div>
  )
}
