/**
 * Reusable guard for engineer/admin actions.
 * Resolves org from orgSlug, validates active membership and role.
 */

import { getAuthSession } from '@/server/auth/session';

export interface EngineerGuardContext {
  orgId: string;
  userId: string;
  role: 'admin' | 'engineer';
}

export async function getEngineerContext(
  orgSlug: string
): Promise<EngineerGuardContext | null> {
  const session = await getAuthSession(orgSlug);
  if (!session) return null;

  return {
    orgId: session.orgId,
    userId: session.user.id,
    role: session.role,
  };
}
