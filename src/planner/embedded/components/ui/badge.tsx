import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'
import { SessionType } from '@/types'
import { SECTION_COLORS, SESSION_LABELS } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline'
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
        variant === 'outline' && 'border',
        className
      )}
      {...props}
    />
  )
}

interface SessionPillProps {
  type: SessionType
  durationMinutes?: number
  completed?: boolean
  className?: string
}

export function SessionPill({ type, durationMinutes, completed, className }: SessionPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all',
        SECTION_COLORS[type],
        completed && 'opacity-40 line-through',
        className
      )}
    >
      {SESSION_LABELS[type]}
      {durationMinutes && (
        <span className="opacity-70">{durationMinutes}m</span>
      )}
    </span>
  )
}
