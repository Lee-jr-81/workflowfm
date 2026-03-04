/**
 * Admin guard: require admin role in org.
 */

import { getAuthSession } from '@/server/auth/session';

export async function requireAdmin(orgSlug: string) {
  const session = await getAuthSession(orgSlug);
  if (!session || session.role !== 'admin') return null;
  return { orgId: session.orgId, userId: session.user.id };
}
