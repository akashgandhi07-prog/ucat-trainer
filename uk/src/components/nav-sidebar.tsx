'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { DBUser } from '@/types'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface NavSidebarProps {
  user: DBUser
  planSlug?: string
}

const navItems = [
  { href: '/dashboard', label: 'Today', icon: '☀️' },
  { href: '/dashboard/plan', label: 'My Plan', icon: '📅' },
  { href: '/dashboard/scores', label: 'Mock Scores', icon: '📊' },
  { href: '/dashboard/reflect', label: 'Reflections', icon: '✍️' },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
]

export function NavSidebar({ user, planSlug }: NavSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <aside className="w-60 min-h-screen bg-white border-r border-slate-200 flex flex-col shrink-0">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-slate-100">
        <Link href="/dashboard" className="inline-flex items-center gap-2">
          <div className="flex gap-0.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-sm">TheUKCATPeople</span>
        </Link>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            )}
          >
            <span className="text-base leading-none">{icon}</span>
            {label}
          </Link>
        ))}

        <Link
          href="/ucat"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
            pathname.startsWith('/ucat')
              ? 'bg-blue-50 text-blue-700'
              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
          )}
        >
          <span className="text-base leading-none">🎯</span>
          Skills drills
        </Link>

        {planSlug && (
          <a
            href={`/plan/${planSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
          >
            <span className="text-base leading-none">🔗</span>
            Share link
          </a>
        )}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
            {(user.full_name || user.email || '?')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-900 truncate">{user.full_name || 'Student'}</p>
            <p className="text-xs text-slate-500 truncate">{user.email ?? ''}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full text-left flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors mt-1"
        >
          <span>↩</span> Sign out
        </button>
      </div>
    </aside>
  )
}
