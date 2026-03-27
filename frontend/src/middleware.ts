import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Always allow the auth/callback route and the login route
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth/callback')
  ) {
    return supabaseResponse
  }

  // If no user is found, redirect to login
  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Domain Check Rule: Block any email not from Mendonca Galvao
  const email = user.email || ''
  if (!email.endsWith('@mendoncagalvao.com.br')) {
    // If invalid domain, sign them out manually (or let Supabase handle if server action)
    // We redirect to login and append an error message
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('error', 'Acesso negado. Utilize um e-mail com domínio @mendoncagalvao.com.br.')
    
    // Clear cookies on redirect so they don't get stuck in a loop
    supabaseResponse = NextResponse.redirect(url)
    
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
