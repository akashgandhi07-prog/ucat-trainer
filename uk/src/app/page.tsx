import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ensureProfileForUser } from '@/lib/ensure-profile'
import { redirect } from 'next/navigation'

export default async function HomePage() {
  // If logged in, redirect to appropriate dashboard
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()

  if (user) {
    await ensureProfileForUser(sb, user)
    const { data: profile } = await sb
      .from('profiles')
      .select('planner_role')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.planner_role === 'tutor') redirect('/tutor')
    else redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Nav */}
      <nav className="flex items-center justify-between max-w-5xl mx-auto px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <div className="w-3 h-3 rounded-full bg-purple-500" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight text-lg">UCAT Planner</span>
        </div>
        <Link
          href="/auth/login"
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          Get started
        </Link>
      </nav>

      {/* Hero */}
      <main className="max-w-5xl mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 border border-blue-200 px-3 py-1.5 text-sm text-blue-700 font-medium mb-6">
            Built for UK medical school applicants
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight tracking-tight text-balance mb-6">
            Your personalised<br />UCAT revision plan
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed mb-10 max-w-xl">
            Adaptive, phase-based timetables that adjust to your mock scores, schedule, and confidence, built with your tutor.
          </p>
          <div className="flex gap-4 flex-wrap">
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 text-white px-6 py-3.5 text-base font-semibold hover:bg-blue-700 transition-colors shadow-sm"
            >
              Start free →
            </Link>
            <Link
              href="/auth/login?role=tutor"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 text-slate-700 px-6 py-3.5 text-base font-semibold hover:bg-slate-50 transition-colors"
            >
              I'm a tutor
            </Link>
          </div>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-20">
          {[
            { color: 'bg-blue-500', label: 'Verbal Reasoning', desc: 'Section-specific sessions weighted by your confidence score' },
            { color: 'bg-green-500', label: 'Decision Making', desc: 'Progressive mocks from mini to full as your exam approaches' },
            { color: 'bg-amber-500', label: 'Quantitative Reasoning', desc: 'Automatic plan adjustment after each mock and weekly reflection' },
            { color: 'bg-purple-500', label: 'Situational Judgement', desc: 'Tutor visibility, notes, and override controls throughout' },
          ].map(f => (
            <div key={f.label} className="rounded-xl bg-white border border-slate-200 p-5 shadow-sm">
              <div className={`w-3 h-3 rounded-full ${f.color} mb-3`} />
              <p className="font-semibold text-slate-900 text-sm mb-1.5">{f.label}</p>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Phase explanation */}
        <div className="mt-16 rounded-2xl bg-white border border-slate-200 p-8 shadow-sm">
          <h2 className="text-2xl font-bold text-slate-900 mb-6">How the plan adapts</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { phase: 'Foundations', weeks: '8+ weeks out', desc: 'Untimed section practice, building understanding', color: 'bg-slate-100 text-slate-700' },
              { phase: 'Timed Practice', weeks: '6+ weeks out', desc: 'Full-speed section practice, first timed mocks', color: 'bg-blue-50 text-blue-700' },
              { phase: 'Mini Mocks', weeks: '6 weeks out', desc: '2-section back-to-back mocks, 3× per week', color: 'bg-pink-50 text-pink-700' },
              { phase: 'Full Mocks', weeks: '5 weeks out', desc: '4 full mocks per week, reflection after each', color: 'bg-red-50 text-red-700' },
              { phase: 'Final Week', weeks: 'Last 7 days', desc: 'Mock every day, light review, mandatory rest', color: 'bg-amber-50 text-amber-700' },
            ].map(p => (
              <div key={p.phase} className={`rounded-xl ${p.color} px-4 py-4`}>
                <p className="font-semibold text-sm">{p.phase}</p>
                <p className="text-xs opacity-70 mt-0.5 mb-2">{p.weeks}</p>
                <p className="text-xs leading-relaxed opacity-80">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
