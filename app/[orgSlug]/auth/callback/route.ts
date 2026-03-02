/**
 * Auth callback route handler. Handles PKCE flow: Supabase redirects with ?code=xxx.
 * Server-side exchange so the code_verifier cookie (set during sign-in) is available.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') || '';
  const pathname = request.nextUrl.pathname;
  const orgSlug = pathname.split('/')[1];

  if (!code) {
    return NextResponse.redirect(new URL(`/${orgSlug}/sign-in?error=missing_code`, request.url));
  }

  const destination = redirectTo || `/${orgSlug}/engineer`;
  const response = NextResponse.redirect(new URL(destination, request.url));

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

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL(`/${orgSlug}/sign-in?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  return response;
}
