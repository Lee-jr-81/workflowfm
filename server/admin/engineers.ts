/**
 * Admin: list engineers, invite engineers via magic link.
 */

'use server';

import { createAuthClient } from '@/server/db/auth-client';
import { getServiceRoleClient } from '@/server/db/client';
import { requireAdmin } from '@/server/admin/guard';

export interface OrgMemberRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  company: string | null;
  role: 'admin' | 'engineer';
  active: boolean;
  created_at: string;
}

export async function listEngineers(orgSlug: string): Promise<OrgMemberRow[] | null> {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return null;

  const supabase = await createAuthClient();
  const { data, error } = await supabase.rpc('get_org_members_with_emails', {
    p_org_id: admin.orgId,
  });

  if (error) return null;
  return (data ?? []) as OrgMemberRow[];
}

type InviteResult =
  | { success: true; kind: 'invited' | 'added_existing' }
  | { success: false; error: 'unauthorized' | 'invalid_email' | 'already_member' | 'invite_failed' };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function inviteEngineer(
  orgSlug: string,
  email: string,
  name?: string | null,
  company?: string | null
): Promise<InviteResult> {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const trimmed = email.trim().toLowerCase();
  if (!trimmed || !EMAIL_REGEX.test(trimmed)) {
    return { success: false, error: 'invalid_email' };
  }

  const supabase = await createAuthClient();
  const adminClient = getServiceRoleClient();

  // Check if already a member
  const { data: isMember } = await adminClient.rpc('is_org_member_by_email', {
    p_org_id: admin.orgId,
    p_email: trimmed,
  });
  if (isMember) return { success: false, error: 'already_member' };

  // Check if user already exists
  const { data: existingUserId } = await adminClient.rpc('get_user_id_by_email', {
    p_email: trimmed,
  });

  if (existingUserId) {
    // Optionally update user metadata (name, company)
    const userData: Record<string, unknown> = {};
    if (name?.trim()) userData.full_name = name.trim();
    if (company?.trim()) userData.company = company.trim();
    if (Object.keys(userData).length > 0) {
      await adminClient.auth.admin.updateUserById(existingUserId, { user_metadata: userData });
    }
    // Add existing user to org_members (admin session can insert via RLS)
    const { error: insertErr } = await supabase.from('org_members').insert({
      org_id: admin.orgId,
      user_id: existingUserId,
      role: 'engineer',
      active: true,
    });
    if (insertErr) return { success: false, error: 'invite_failed' };
    return { success: true, kind: 'added_existing' };
  }

  // New user: insert pending_invites, then invite (creates user -> trigger adds to org_members)
  const { error: insertErr } = await adminClient
    .from('pending_invites')
    .insert({ email: trimmed, org_id: admin.orgId, role: 'engineer' });

  if (insertErr) return { success: false, error: 'invite_failed' };

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const redirectTo = `${baseUrl}/${orgSlug}/auth/confirm`;

  const userData: Record<string, unknown> = { org_slug: orgSlug };
  if (name?.trim()) userData.full_name = name.trim();
  if (company?.trim()) userData.company = company.trim();

  const { error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(trimmed, {
    redirectTo,
    data: userData,
  });

  if (inviteErr) {
    // Rollback pending_invites
    await adminClient.from('pending_invites').delete().eq('email', trimmed).eq('org_id', admin.orgId);
    return { success: false, error: 'invite_failed' };
  }

  return { success: true, kind: 'invited' };
}

export async function removeEngineer(
  orgSlug: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const supabase = await createAuthClient();
  const { error } = await supabase
    .from('org_members')
    .delete()
    .eq('org_id', admin.orgId)
    .eq('user_id', userId)
    .eq('role', 'engineer');

  if (error) return { success: false, error: 'failed' };
  return { success: true };
}
