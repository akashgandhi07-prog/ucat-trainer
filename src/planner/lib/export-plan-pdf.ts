import { jsPDF } from 'jspdf'
import type { DBPlan, DBPlanDay, SessionType, SessionWithCompletion } from '../embedded/types'
import {
  addDays,
  creditedMinutesTowardPlan,
  isSameMonth,
  parseDate,
  SESSION_LABELS,
  startOfMonth,
  startOfWeek,
  toISODate,
} from '../embedded/lib/utils'

const PDF_SHORT: Partial<Record<SessionType, string>> = {
  vr_practice: 'VR',
  dm_practice: 'DM',
  qr_practice: 'QR',
  sjt_practice: 'SJT',
  full_mock: 'Mock',
  mini_mock: 'Mini',
  reflection: 'Reflect',
}

const DOW_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const PAGE_W = 297
const PAGE_H = 210
const MARGIN = 10
const HEADER_H = 18
const LEGEND_H = 8
const GRID_TOP = MARGIN + HEADER_H
const GRID_BOTTOM = PAGE_H - MARGIN - LEGEND_H
const GRID_H = GRID_BOTTOM - GRID_TOP
const COL_W = (PAGE_W - MARGIN * 2) / 7
const ROW_H = GRID_H / 6

export interface ExportPlanPdfInput {
  plan: DBPlan
  planDays: DBPlanDay[]
  sessions: SessionWithCompletion[]
  todayDate: string
}

function buildGrid(month: Date): { date: Date; dateStr: string; inMonth: boolean }[] {
  const first = startOfMonth(month)
  const gridStart = startOfWeek(first, 1)
  const cells = []
  for (let i = 0; i < 42; i++) {
    const date = addDays(gridStart, i)
    cells.push({ date, dateStr: toISODate(date), inMonth: isSameMonth(date, month) })
  }
  return cells
}

function monthLabel(date: Date): string {
  return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

function eachMonthInRange(start: Date, end: Date): Date[] {
  const months: Date[] = []
  let d = new Date(start.getFullYear(), start.getMonth(), 1)
  const endM = new Date(end.getFullYear(), end.getMonth(), 1)
  while (d <= endM) {
    months.push(new Date(d))
    d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
  }
  return months
}

function formatMinutes(total: number): string {
  if (total <= 0) return '0m'
  const h = Math.floor(total / 60)
  const m = total % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function planDateRange(
  sessions: SessionWithCompletion[],
  examDate: string,
  todayDate: string,
): { start: Date; end: Date } {
  let earliest = todayDate
  for (const s of sessions) {
    if (s.session_type === 'rest') continue
    if (s.day_date < earliest) earliest = s.day_date
  }
  return { start: parseDate(earliest), end: parseDate(examDate) }
}

interface DaySummary {
  plannedMinutes: number
  doneMinutes: number
  lines: string[]
}

function summarizeDay(
  daySessions: SessionWithCompletion[],
  isPastOrToday: boolean,
): DaySummary {
  const active = daySessions
    .filter(s => s.session_type !== 'rest')
    .sort((a, b) => a.position - b.position)

  let plannedMinutes = 0
  let doneMinutes = 0
  const lines: string[] = []

  for (const s of active) {
    plannedMinutes += s.duration_minutes
    const credited = creditedMinutesTowardPlan(
      s.completed,
      s.duration_minutes,
      s.completed_minutes,
    )
    doneMinutes += credited

    const label =
      s.session_type === 'mini_mock' && s.notes?.trim()
        ? s.notes.trim().replace(/\s+Mock$/i, '')
        : PDF_SHORT[s.session_type] ?? s.session_type
    if (isPastOrToday && s.completed) {
      const logged = s.completed_minutes ?? s.duration_minutes
      if (logged >= s.duration_minutes) {
        lines.push(`${label} ${s.duration_minutes}m ✓`)
      } else if (logged > 0) {
        lines.push(`${label} ${logged}/${s.duration_minutes}m`)
      } else {
        lines.push(`${label} ${s.duration_minutes}m ✓`)
      }
    } else {
      lines.push(`${label} ${s.duration_minutes}m`)
    }
  }

  return { plannedMinutes, doneMinutes, lines }
}

function drawMonthPage(
  doc: jsPDF,
  month: Date,
  input: ExportPlanPdfInput,
  daysByDate: Map<string, DBPlanDay>,
  sessionsByDate: Map<string, SessionWithCompletion[]>,
): void {
  const { plan, todayDate } = input
  const examDate = plan.exam_date
  const grid = buildGrid(month)

  doc.setFillColor(248, 250, 252)
  doc.rect(0, 0, PAGE_W, PAGE_H, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(15, 23, 42)
  doc.text(monthLabel(month), MARGIN, MARGIN + 5)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(100, 116, 139)
  const examStr = parseDate(examDate).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const examLine = plan.exam_time
    ? `UCAT exam: ${examStr} at ${plan.exam_time}`
    : `UCAT exam: ${examStr}`
  doc.text(examLine, MARGIN, MARGIN + 11)
  doc.text('The UK CAT People · Study plan', PAGE_W - MARGIN, MARGIN + 5, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(71, 85, 105)
  for (let c = 0; c < 7; c++) {
    const x = MARGIN + c * COL_W + COL_W / 2
    doc.text(DOW_HEADERS[c], x, GRID_TOP - 2, { align: 'center' })
  }

  for (let i = 0; i < 42; i++) {
    const cell = grid[i]
    const col = i % 7
    const row = Math.floor(i / 7)
    const x = MARGIN + col * COL_W
    const y = GRID_TOP + row * ROW_H
    const pad = 1.2

    if (!cell.inMonth) continue

    const dayRecord = daysByDate.get(cell.dateStr)
    const daySessions = sessionsByDate.get(cell.dateStr) ?? []
    const isToday = cell.dateStr === todayDate
    const isExamDay = cell.dateStr === examDate
    const isPlanStart = cell.dateStr === todayDate
    const isPastOrToday = cell.dateStr <= todayDate
    const isRest = dayRecord?.is_rest ?? false
    const isUnavailable = dayRecord?.availability === 'unavailable'

    doc.setDrawColor(226, 232, 240)
    doc.setFillColor(255, 255, 255)
    if (isToday) doc.setFillColor(239, 246, 255)
    else if (isExamDay) doc.setFillColor(255, 251, 235)
    else if (isRest) doc.setFillColor(250, 250, 249)
    doc.rect(x + 0.3, y + 0.3, COL_W - 0.6, ROW_H - 0.6, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    if (isToday) doc.setTextColor(37, 99, 235)
    else if (isExamDay) doc.setTextColor(217, 119, 6)
    else doc.setTextColor(51, 65, 85)
    doc.text(String(cell.date.getDate()), x + pad, y + pad + 3)

    let textY = y + pad + 7
    const maxW = COL_W - pad * 2
    const lineH = 3.4
    const maxLines = Math.floor((ROW_H - pad * 2 - 9) / lineH)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6)

    if (isExamDay) {
      doc.setTextColor(217, 119, 6)
      doc.setFont('helvetica', 'bold')
      doc.text('EXAM', x + pad + 6, y + pad + 3)
      doc.setFont('helvetica', 'normal')
    } else if (isPlanStart && !isToday) {
      doc.setTextColor(22, 163, 74)
      doc.setFont('helvetica', 'bold')
      doc.text('START', x + pad + 6, y + pad + 3)
      doc.setFont('helvetica', 'normal')
    }

    if (isUnavailable) {
      doc.setTextColor(148, 163, 184)
      doc.text('Busy', x + pad, textY)
    } else if (isRest && daySessions.filter(s => s.session_type !== 'rest').length === 0) {
      doc.setTextColor(168, 162, 158)
      doc.text('Rest', x + pad, textY)
    } else {
      const { plannedMinutes, doneMinutes, lines } = summarizeDay(daySessions, isPastOrToday)
      doc.setTextColor(51, 65, 85)

      let shown = 0
      for (const line of lines) {
        if (shown >= maxLines - 1) break
        const wrapped = doc.splitTextToSize(line, maxW) as string[]
        for (const w of wrapped.slice(0, 1)) {
          if (shown >= maxLines - 1) break
          doc.text(w, x + pad, textY)
          textY += lineH
          shown++
        }
      }
      if (lines.length > shown) {
        doc.setTextColor(148, 163, 184)
        doc.text(`+${lines.length - shown} more`, x + pad, textY)
        textY += lineH
      }

      const summaryY = y + ROW_H - pad - 2
      doc.setFontSize(5.5)
      if (plannedMinutes > 0) {
        if (isPastOrToday) {
          if (doneMinutes > 0) doc.setTextColor(22, 163, 74)
          else doc.setTextColor(148, 163, 184)
          const donePart =
            doneMinutes > 0
              ? `Done ${formatMinutes(doneMinutes)}`
              : isPastOrToday && cell.dateStr < todayDate
                ? 'Not logged'
                : ''
          const planPart = `Plan ${formatMinutes(plannedMinutes)}`
          const summary = donePart ? `${planPart} · ${donePart}` : planPart
          doc.text(summary, x + pad, summaryY, { maxWidth: maxW })
        } else {
          doc.setTextColor(100, 116, 139)
          doc.text(`Plan ${formatMinutes(plannedMinutes)}`, x + pad, summaryY, { maxWidth: maxW })
        }
      }
    }
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6)
  doc.setTextColor(100, 116, 139)
  const legend =
    'VR · DM · QR · SJT · Mock · Mini · Reflect · ✓ = completed · Past days show planned vs logged minutes'
  doc.text(legend, MARGIN, PAGE_H - MARGIN - 2)
}

export function exportPlanToPdf(input: ExportPlanPdfInput): void {
  const { plan, planDays, sessions } = input
  const daysByDate = new Map<string, DBPlanDay>()
  for (const d of planDays) daysByDate.set(d.day_date, d)

  const sessionsByDate = new Map<string, SessionWithCompletion[]>()
  for (const s of sessions) {
    const list = sessionsByDate.get(s.day_date) ?? []
    list.push(s)
    sessionsByDate.set(s.day_date, list)
  }
  for (const [, list] of sessionsByDate) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  }

  const { start, end } = planDateRange(sessions, plan.exam_date, input.todayDate)
  let months = eachMonthInRange(start, end)
  if (months.length === 0) {
    const anchor = start <= end ? start : parseDate(plan.exam_date)
    months = [new Date(anchor.getFullYear(), anchor.getMonth(), 1)]
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  months.forEach((month, idx) => {
    if (idx > 0) doc.addPage()
    drawMonthPage(doc, month, input, daysByDate, sessionsByDate)
  })

  const slug = plan.slug || 'plan'
  const stamp = input.todayDate.replace(/-/g, '')
  doc.save(`ucat-study-plan-${slug}-${stamp}.pdf`)
}

export function sessionLabel(type: SessionType): string {
  return SESSION_LABELS[type]
}
