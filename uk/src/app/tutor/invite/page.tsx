'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function TutorInvitePage() {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function generateLink() {
    setLoading(true)
    setError(null)
    setCopied(false)
    try {
      const res = await fetch('/api/tutor/invite-link', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not create invite link')
      setInviteUrl(data.inviteUrl as string)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setInviteUrl(null)
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    if (!inviteUrl) return
    try {
      await navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-10 space-y-6">
      <div>
        <Link href="/tutor" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
          ← Back to overview
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 mt-4">Invite a student</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Create a one-time link your student opens to sign in with email and set up their timetable. Each generate creates a fresh token.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shareable link</CardTitle>
          <CardDescription>
            Send this URL privately to your student. Do not post it publicly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button type="button" onClick={generateLink} disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Generating…' : inviteUrl ? 'Generate new link' : 'Generate invite link'}
          </Button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          {inviteUrl && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Link</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <code className="flex-1 text-xs bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 break-all">
                  {inviteUrl}
                </code>
                <Button type="button" variant="outline" onClick={copy} className="shrink-0">
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
