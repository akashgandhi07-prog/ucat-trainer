'use client'

import { useState } from 'react'
import { DBWeeklyReflection, DBPlanWeek, DifficultyRating } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, parseDate } from '@/lib/utils'

interface ReflectViewProps {
  planId: string
  reflections: DBWeeklyReflection[]
  planWeeks: Pick<DBPlanWeek, 'week_number' | 'week_start' | 'is_locked'>[]
}

const DIFFICULTY_OPTIONS: { value: DifficultyRating; label: string; emoji: string; color: string }[] = [
  { value: 1, label: 'Too hard', emoji: '😓', color: 'border-red-300 bg-red-50 text-red-700' },
  { value: 2, label: 'About right', emoji: '😊', color: 'border-green-300 bg-green-50 text-green-700' },
  { value: 3, label: 'Too easy', emoji: '🚀', color: 'border-blue-300 bg-blue-50 text-blue-700' },
]

export function ReflectView({ planId, reflections: initialReflections, planWeeks }: ReflectViewProps) {
  const [reflections, setReflections] = useState(initialReflections)
  const [activeWeek, setActiveWeek] = useState<number | null>(null)
  const [text, setText] = useState('')
  const [difficulty, setDifficulty] = useState<DifficultyRating>(2)
  const [loading, setLoading] = useState(false)

  const reflectionsByWeek = new Map(reflections.map(r => [r.week_number, r]))

  async function handleSubmit(weekNumber: number) {
    setLoading(true)
    const res = await fetch('/api/reflections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId, weekNumber, reflectionText: text, difficultyRating: difficulty }),
    })
    const data = await res.json()
    if (data.reflection) {
      setReflections(prev => {
        const next = prev.filter(r => r.week_number !== weekNumber)
        return [...next, data.reflection].sort((a, b) => a.week_number - b.week_number)
      })
      setActiveWeek(null)
      setText('')
      setDifficulty(2)
    }
    setLoading(false)
  }

  function startReflection(weekNumber: number) {
    const existing = reflectionsByWeek.get(weekNumber)
    setText(existing?.reflection_text ?? '')
    setDifficulty((existing?.difficulty_rating ?? 2) as DifficultyRating)
    setActiveWeek(weekNumber)
  }

  return (
    <div className="p-6 md:p-10 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Weekly Reflections</h1>
        <p className="text-slate-500 mt-1">Review how each week went. Your rating adjusts the intensity of future weeks.</p>
      </div>

      <div className="space-y-4">
        {planWeeks.map(week => {
          const existing = reflectionsByWeek.get(week.week_number)
          const isEditing = activeWeek === week.week_number
          const d = parseDate(week.week_start)

          return (
            <Card key={week.week_number} className={isEditing ? 'border-blue-300 shadow-sm' : ''}>
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Week {week.week_number}</CardTitle>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {formatDate(d)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {existing && (
                      <span className={`text-xs font-medium rounded-full px-2.5 py-1 border ${
                        DIFFICULTY_OPTIONS.find(o => o.value === existing.difficulty_rating)?.color
                      }`}>
                        {DIFFICULTY_OPTIONS.find(o => o.value === existing.difficulty_rating)?.emoji}{' '}
                        {DIFFICULTY_OPTIONS.find(o => o.value === existing.difficulty_rating)?.label}
                      </span>
                    )}
                    {!isEditing && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startReflection(week.week_number)}
                      >
                        {existing ? 'Edit' : 'Add reflection'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              {existing && !isEditing && (
                <CardContent className="pt-0 pb-4">
                  <p className="text-sm text-slate-600 italic">"{existing.reflection_text}"</p>
                </CardContent>
              )}

              {isEditing && (
                <CardContent className="pt-0 space-y-4">
                  {/* Difficulty rating */}
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">How did this week feel?</p>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDifficulty(opt.value)}
                          className={`rounded-lg border-2 py-3 text-center transition-all ${
                            difficulty === opt.value ? opt.color + ' border-opacity-100' : 'border-slate-200 text-slate-600'
                          }`}
                        >
                          <div className="text-xl mb-1">{opt.emoji}</div>
                          <div className="text-xs font-medium">{opt.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Reflection text */}
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700">Your reflection</label>
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="What went well? What was challenging? What will you focus on next week?"
                      rows={4}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleSubmit(week.week_number)}
                      loading={loading}
                      disabled={!text.trim()}
                    >
                      Save reflection
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setActiveWeek(null); setText(''); setDifficulty(2) }}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
