import { redirect } from 'next/navigation';
import { getAuthSession } from '@/server/auth/session';
import { Button } from '@/components/ui/button';
import { LogOut, Wrench } from 'lucide-react';
import Link from 'next/link';

export default async function EngineerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const session = await getAuthSession(orgSlug);

  if (!session) {
    redirect(`/${orgSlug}/sign-in`);
  }

  async function signOut() {
    'use server';
    const { createServerClient } = await import('@supabase/ssr');
    const { cookies } = await import('next/headers');
    const { redirect: rd } = await import('next/navigation');

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll: (cookiesToSet) => {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in Server Actions
            }
          },
        },
      }
    );
    await supabase.auth.signOut();
    rd(`/${orgSlug}/sign-in`);
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={`/${orgSlug}/engineer`} className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            <span className="font-semibold">WorkflowFM</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {session.user.email}
            </span>
            <form action={signOut}>
              <Button variant="ghost" size="sm" type="submit">
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
