'use client'

import { cn } from '@/lib/utils'

interface SliderProps {
  label: string
  value: number
  min?: number
  max?: number
  step?: number
  onChange: (value: number) => void
  lowLabel?: string
  highLabel?: string
  className?: string
}

export function Slider({
  label,
  value,
  min = 1,
  max = 5,
  step = 1,
  onChange,
  lowLabel = 'Low',
  highLabel = 'High',
  className,
}: SliderProps) {
  const pct = ((value - min) / (max - min)) * 100

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-700">{label}</label>
        <span className={cn('text-sm font-bold tabular-nums w-6 text-center', {
          'text-red-600': value <= 2,
          'text-amber-600': value === 3,
          'text-green-600': value >= 4,
        })}>
          {value}
        </span>
      </div>
      <div className="relative pt-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-200 accent-blue-600"
          style={{
            background: `linear-gradient(to right, #2563eb ${pct}%, #e2e8f0 ${pct}%)`,
          }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  )
}
