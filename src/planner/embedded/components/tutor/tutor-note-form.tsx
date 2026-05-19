'use client'

import { useState } from 'react'
import { DBPlanWeek } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate, parseDate } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const NOTE_MAX_LEN = 6000

interface TutorNoteFormProps {
  planWeeks: DBPlanWeek[]
  planId: string
}

export function TutorNoteForm({ planWeeks, planId }: TutorNoteFormProps) {
  const [notes, setNotes] = useState<Record<number, string>>(
    Object.fromEntries(planWeeks.map(w => [w.week_number, w.tutor_note ?? '']))
  )
  const [saving, setSaving] = useState<number | null>(null)
  const [activeWeek, setActiveWeek] = useState<number | null>(null)
  const [errorByWeek, setErrorByWeek] = useState<Record<number, string>>({})

  async function saveNote(weekNumber: number) {
    const text = notes[weekNumber] ?? ''
    if (text.length > NOTE_MAX_LEN) {
      setErrorByWeek(e => ({
        ...e,
        [weekNumber]: `Notes must be at most ${NOTE_MAX_LEN} characters.`,
      }))
      return
    }

    setSaving(weekNumber)
    setErrorByWeek(e => ({ ...e, [weekNumber]: '' }))
    const sb = createClient()
    const { error } = await sb
      .from('plan_weeks')
      .update({ tutor_note: text.trim() || null })
      .eq('plan_id', planId)
      .eq('week_number', weekNumber)

    setSaving(null)

    if (error) {
      setErrorByWeek(e => ({
        ...e,
        [weekNumber]: error.message || 'Could not save note. Check your connection and try again.',
      }))
      return
    }

    setActiveWeek(null)
  }

  return (
    <div className="px-6 md:px-10 py-8 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Tutor Notes</h2>
      <div className="space-y-3">
        {planWeeks.map(week => {
          const isEditing = activeWeek === week.week_number
          return (
            <Card key={week.week_number}>
              <CardHeader className="py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">
                    Week {week.week_number} - {formatDate(parseDate(week.week_start))}
                  </CardTitle>
                  {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setActiveWeek(week.week_number)}>
                      {notes[week.week_number] ? 'Edit note' : 'Add note'}
                    </Button>
                  )}
                </div>
              </CardHeader>
              {!isEditing && notes[week.week_number] && (
                <CardContent className="pt-0 pb-4">
                  <p className="text-sm text-slate-600">📝 {notes[week.week_number]}</p>
                </CardContent>
              )}
              {isEditing && (
                <CardContent className="pt-0 pb-4 space-y-3">
                  <textarea
                    value={notes[week.week_number] ?? ''}
                    onChange={e => setNotes(n => ({ ...n, [week.week_number]: e.target.value }))}
                    placeholder="Add a note for this week; visible to the student"
                    rows={3}
                    className="w-full rounded-lg border border-border bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <div className="flex justify-between text-xs text-slate-400">
                    <span>{(notes[week.week_number] ?? '').length} / {NOTE_MAX_LEN}</span>
                  </div>
                  {errorByWeek[week.week_number] && (
                    <p className="text-xs text-red-600">{errorByWeek[week.week_number]}</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => saveNote(week.week_number)}
                      loading={saving === week.week_number}
                    >
                      Save
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setActiveWeek(null)
                      setErrorByWeek(e => {
                        const next = { ...e }
                        delete next[week.week_number]
                        return next
                      })
                    }}>
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
