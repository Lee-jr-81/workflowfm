/**
 * Server-side auth verification (invite + magic link). token_hash in query params only.
 * Requires custom Supabase email templates - see docs/auth-invite-template.md
 *
 * Security: token_hash is one-time use, verified server-side. Session in httpOnly
 * cookies. Tokens never in URL hash.
 */

import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const VALID_TYPES = ['invite', 'magiclink'] as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const pathname = request.nextUrl.pathname;
  const orgSlug = pathname.split('/')[1];

  if (!token_hash || !type || !VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
    return NextResponse.redirect(new URL(`/${orgSlug}/sign-in?error=invalid_verification`, request.url));
  }

  let destination = `/${orgSlug}/engineer`;
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

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as 'invite' | 'magiclink',
  });

  if (error) {
    return NextResponse.redirect(
      new URL(`/${orgSlug}/sign-in?error=${encodeURIComponent(error.message)}`, request.url)
    );
  }

  // Redirect to admin or engineer based on role
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data } = await supabase
      .from('orgs')
      .select('id, org_members!inner(role, active)')
      .eq('slug', orgSlug)
      .eq('org_members.user_id', user.id)
      .eq('org_members.active', true)
      .single();
    const membership = data?.org_members as unknown as Array<{ role: 'admin' | 'engineer' }> | undefined;
    if (membership?.[0]?.role === 'admin') {
      destination = `/${orgSlug}/admin`;
      response.headers.set('Location', new URL(destination, request.url).toString());
    }
  }

  return response;
}
