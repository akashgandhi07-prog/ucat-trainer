'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginClient({ invite: inviteProp }: { invite?: string }) {
  const invite = inviteProp ?? ''

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'student' | 'tutor'>('student')

  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const sb = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin
    const otpRole: 'student' | 'tutor' = invite ? 'student' : role
    const inviteQuery =
      invite.length > 0 ? `?invite_token=${encodeURIComponent(invite)}` : ''
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${appUrl}/auth/callback${inviteQuery}`,
        data: { role: otpRole },
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-purple-500" />
            </div>
            TheUKCATPeople
          </div>
          <p className="text-sm text-slate-500">Free study plan and mock tracking for the UCAT</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{sent ? 'Check your email' : 'Sign in'}</CardTitle>
            <CardDescription>
              {sent
                ? `We've sent a magic link to ${email}`
                : invite
                  ? 'Enter your email. We\'ll send a link so your tutor sees your revision plan.'
                  : 'Enter your email to receive a sign-in link'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center space-y-4 py-4">
                <div className="text-5xl">📬</div>
                <p className="text-sm text-slate-600">
                  Click the link in your email to sign in. The link expires in 1 hour.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSent(false); setEmail('') }}
                >
                  Use a different email
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                />

                {!invite && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">I am a…</p>
                    <div className="grid grid-cols-2 gap-3">
                      {(['student', 'tutor'] as const).map(r => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRole(r)}
                          className={`rounded-lg border-2 p-3 text-sm font-medium transition-all ${
                            role === r
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-slate-200 text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {r === 'student' ? '🎓 Student' : '👩‍🏫 Tutor'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
                )}

                <Button type="submit" className="w-full" loading={loading}>
                  Send magic link
                </Button>

                <p className="text-center text-xs text-slate-400">
                  Free to use. No password required. We&apos;ll email you a secure link.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
