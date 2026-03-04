'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Handles invite/magic-link flows where Supabase redirects with session in the URL hash.
 * The server never receives the hash, so this must run client-side.
 * Used by: inviteUserByEmail (and any flow that returns tokens in #access_token=...&refresh_token=...)
 */
export default function AuthConfirmPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const run = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      if (!hash) {
        setStatus('error');
        router.replace(`/${orgSlug}/sign-in?error=missing_session`);
        return;
      }

      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

      if (!accessToken || !refreshToken) {
        setStatus('error');
        router.replace(`/${orgSlug}/sign-in?error=missing_session`);
        return;
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });

      if (error) {
        setStatus('error');
        router.replace(`/${orgSlug}/sign-in?error=${encodeURIComponent(error.message)}`);
        return;
      }

      setStatus('success');
      router.replace(`/${orgSlug}/engineer`);
    };

    run();
  }, [orgSlug, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <p className="text-muted-foreground">{status === 'loading' ? 'Signing you in...' : status === 'error' ? 'Redirecting...' : 'Redirecting...'}</p>
    </div>
  );
}
