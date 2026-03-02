/**
 * Auth session: get user and validate org membership.
 * org_id is always derived server-side from orgSlug + membership.
 */

import { createAuthClient } from '@/server/db/auth-client';
import { User } from '@supabase/supabase-js';

export interface AuthSession {
  user: User;
  orgId: string;
  role: 'admin' | 'engineer';
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createAuthClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function validateOrgMembership(
  user: User,
  orgSlug: string
): Promise<{ orgId: string; role: 'admin' | 'engineer' } | null> {
  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from('orgs')
    .select('id, org_members!inner(role, active)')
    .eq('slug', orgSlug)
    .eq('org_members.user_id', user.id)
    .eq('org_members.active', true)
    .single();

  if (error || !data) return null;

  const membership = (data.org_members as unknown as Array<{ role: 'admin' | 'engineer' }>)[0];
  return { orgId: data.id, role: membership.role };
}

export async function getAuthSession(orgSlug: string): Promise<AuthSession | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const membership = await validateOrgMembership(user, orgSlug);
  if (!membership) return null;

  return { user, orgId: membership.orgId, role: membership.role };
}
