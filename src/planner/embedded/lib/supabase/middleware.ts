import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()
  const pathname = url.pathname

  /** Trainer shell embed: strip planner chrome, serve inner route only */
  if (pathname.startsWith('/embed')) {
    const inner = pathname.slice('/embed'.length) || '/dashboard'
    url.pathname = inner.startsWith('/') ? inner : `/${inner}`
    const embedResponse = NextResponse.rewrite(url)
    embedResponse.cookies.set('trainer_embed', '1', {
      path: '/',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24,
    })
    return embedResponse
  }

  /**
   * Unauthenticated users may hit these paths without a session cookie.
   * Includes `/ucat` for trainer marketing and public drills once mounted here (matrix regression 1-2).
   */
  const isPublicPath = (p: string) =>
    p === '/' ||
    p.startsWith('/auth') ||
    p.startsWith('/onboarding') ||
    p.startsWith('/dashboard') ||
    p.startsWith('/plan/') ||
    p.startsWith('/join/') ||
    p.startsWith('/ucat') ||
    p.startsWith('/ucat-')

  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  if (!user && !isPublicPath(pathname)) {
    url.pathname = '/auth/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
