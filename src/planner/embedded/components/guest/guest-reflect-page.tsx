'use client'

import { GuestSignInCta } from '@/components/guest/guest-sign-in-cta'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function GuestReflectPage() {
  return (
    <div className="p-6 max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Weekly reflections</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-4">
          <p>
            You can use your study plan and mock tracker as a guest. Sign in with a free account when you want
            reflections and plan adjustments saved to the cloud.
          </p>
          <GuestSignInCta className="!mx-0" />
        </CardContent>
      </Card>
    </div>
  )
}
