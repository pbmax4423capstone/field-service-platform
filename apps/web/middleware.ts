import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const publicPaths = ['/login', '/signup', '/pay']
  const isPublicPath = publicPaths.some((p) => pathname.startsWith(p))

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If env vars missing, allow public paths and redirect everything else to login
    if (!supabaseUrl || !supabaseAnonKey) {
      if (!isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      return NextResponse.next({ request })
    }

    let supabaseResponse = NextResponse.next({ request })

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user && !isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    return supabaseResponse
  } catch {
    // If anything fails (Supabase unreachable, bad credentials, etc.)
    // redirect to login for protected routes, otherwise pass through
    if (!isPublicPath) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
