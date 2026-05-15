import { NavLink } from 'react-router-dom'
import { cn } from '../lib/cn'

const items = [
  { to: '/study-plan/today', label: 'Today' },
  { to: '/study-plan/plan', label: 'My plan' },
  { to: '/mock-scores', label: 'Mock scores' },
  { to: '/study-plan/reflect', label: 'Reflections' },
]

function linkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
  )
}

export default function PlannerSubNav() {
  return (
    <nav
      className="sticky top-0 z-20 flex flex-wrap gap-1 px-4 sm:px-6 pt-3 pb-2 border-b border-border bg-card/95 backdrop-blur-sm shrink-0"
      aria-label="Study plan sections"
    >
      {items.map(({ to, label }) => (
        <NavLink key={to} to={to} className={linkClass}>
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
