/**
 * Middleware: token refresh on every request + protect /[orgSlug]/engineer routes.
 * Running Supabase auth for all routes keeps the session refreshed so it persists.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if it exists (keeps cookies up to date)
  const { data: { user } } = await supabase.auth.getUser();

  // Protect engineer routes: redirect unauthenticated to sign-in
  const engineerMatch = pathname.match(/^\/[^/]+\/engineer(\/|$)/);
  if (engineerMatch && !user) {
    const orgSlug = pathname.split('/')[1];
    const signIn = new URL(`/${orgSlug}/sign-in`, request.url);
    signIn.searchParams.set('redirect', pathname);
    return NextResponse.redirect(signIn);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
