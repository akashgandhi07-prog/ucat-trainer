'use client'

import Link from '@/lib/app-link'
import { usePathname } from '@/lib/app-navigation'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'Today', icon: '☀️' },
  { href: '/dashboard/plan', label: 'My Plan', icon: '📅' },
  { href: '/dashboard/scores', label: 'Mock Scores', icon: '📊' },
  { href: '/dashboard/reflect', label: 'Reflections', icon: '✍️' },
]

export function GuestNavSidebar({ planSlug }: { planSlug: string }) {
  const pathname = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-border flex flex-col shrink-0">
      <div className="px-5 py-5 border-b border-slate-100">
        <Link href="/dashboard" className="inline-flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-sm">TheUKCATPeople</span>
        </Link>
        <p className="text-[10px] font-medium text-emerald-700 mt-1.5">Free · no subscription</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                ? 'bg-secondary text-foreground'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </Link>
        ))}
        <Link
          href={process.env.NEXT_PUBLIC_TRAINER_URL ?? '/'}
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
        >
          <span className="text-base leading-none">🎯</span>
          Skills drills
        </Link>
        {planSlug ? (
          <Link
            href={`/plan/${planSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <span className="text-base leading-none">🔗</span>
            Share plan
          </Link>
        ) : null}
      </nav>

      <div className="px-3 py-4 border-t border-slate-100 space-y-2">
        <Link
          href="/auth/login?next=/dashboard"
          className="flex w-full items-center justify-center rounded-lg bg-primary px-3 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
        >
          Sign in to save
        </Link>
        <p className="text-[10px] text-muted-foreground text-center px-1">Guest mode: progress on this device only</p>
      </div>
    </aside>
  )
}
