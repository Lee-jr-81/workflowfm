/**
 * Slice 6: Admin configuration.
 * Departments, locations, categories, staff portal (access code).
 */

'use server';

import bcrypt from 'bcryptjs';
import { createAuthClient } from '@/server/db/auth-client';
import { requireAdmin } from '@/server/admin/guard';

const NAME_MAX = 100;

// --- Read ---

export interface ConfigDepartments {
  id: string;
  name: string;
  active: boolean;
  sort_order: number;
}

export interface ConfigLocations {
  id: string;
  name: string;
  active: boolean;
}

export interface ConfigCategories {
  id: string;
  name: string;
  active: boolean;
}

export interface ConfigStaffAccess {
  is_enabled: boolean;
  rotated_at: string | null;
  current_code: string | null;
}

export async function getConfig(orgSlug: string) {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return null;

  const supabase = await createAuthClient();

  const [deptsRes, locsRes, catsRes, accessRes] = await Promise.all([
    supabase.from('departments').select('id, name, active, sort_order').eq('org_id', admin.orgId).order('sort_order'),
    supabase.from('locations').select('id, name, active').eq('org_id', admin.orgId).order('name'),
    supabase.from('categories').select('id, name, active').eq('org_id', admin.orgId).order('name'),
    supabase.from('org_staff_access').select('is_enabled, rotated_at, access_code_plaintext').eq('org_id', admin.orgId).single(),
  ]);

  return {
    departments: (deptsRes.data ?? []) as ConfigDepartments[],
    locations: (locsRes.data ?? []) as ConfigLocations[],
    categories: (catsRes.data ?? []) as ConfigCategories[],
    staffAccess: accessRes.data
      ? ({
          is_enabled: accessRes.data.is_enabled,
          rotated_at: accessRes.data.rotated_at,
          current_code: accessRes.data.access_code_plaintext ?? null,
        } as ConfigStaffAccess)
      : { is_enabled: false, rotated_at: null, current_code: null },
  };
}

// --- Departments ---

export async function createDepartment(orgSlug: string, name: string) {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const trimmed = name.trim().slice(0, NAME_MAX);
  if (!trimmed) return { success: false, error: 'name_required' };

  const supabase = await createAuthClient();
  const { data: max } = await supabase
    .from('departments')
    .select('sort_order')
    .eq('org_id', admin.orgId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();

  const sortOrder = (max?.sort_order ?? -1) + 1;

  const { error } = await supabase
    .from('departments')
    .insert({ org_id: admin.orgId, name: trimmed, sort_order: sortOrder });

  if (error) return { success: false, error: error.code === '23505' ? 'duplicate' : 'error' };
  return { success: true };
}

export async function toggleDepartment(orgSlug: string, id: string, active: boolean) {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const supabase = await createAuthClient();
  const { error } = await supabase
    .from('departments')
    .update({ active })
    .eq('id', id)
    .eq('org_id', admin.orgId);

  if (error) return { success: false, error: 'error' };
  return { success: true };
}

// --- Locations ---

export async function createLocation(orgSlug: string, name: string) {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const trimmed = name.trim().slice(0, NAME_MAX);
  if (!trimmed) return { success: false, error: 'name_required' };

  const supabase = await createAuthClient();
  const { error } = await supabase.from('locations').insert({ org_id: admin.orgId, name: trimmed });

  if (error) return { success: false, error: error.code === '23505' ? 'duplicate' : 'error' };
  return { success: true };
}

export async function toggleLocation(orgSlug: string, id: string, active: boolean) {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const supabase = await createAuthClient();
  const { error } = await supabase
    .from('locations')
    .update({ active })
    .eq('id', id)
    .eq('org_id', admin.orgId);

  if (error) return { success: false, error: 'error' };
  return { success: true };
}

// --- Categories ---

export async function createCategory(orgSlug: string, name: string) {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const trimmed = name.trim().slice(0, NAME_MAX);
  if (!trimmed) return { success: false, error: 'name_required' };

  const supabase = await createAuthClient();
  const { error } = await supabase.from('categories').insert({ org_id: admin.orgId, name: trimmed });

  if (error) return { success: false, error: error.code === '23505' ? 'duplicate' : 'error' };
  return { success: true };
}

export async function toggleCategory(orgSlug: string, id: string, active: boolean) {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const supabase = await createAuthClient();
  const { error } = await supabase
    .from('categories')
    .update({ active })
    .eq('id', id)
    .eq('org_id', admin.orgId);

  if (error) return { success: false, error: 'error' };
  return { success: true };
}

// --- Staff portal ---

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function setStaffPortalEnabled(orgSlug: string, enabled: boolean) {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const supabase = await createAuthClient();

  const { data: existing } = await supabase
    .from('org_staff_access')
    .select('org_id')
    .eq('org_id', admin.orgId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('org_staff_access')
      .update({ is_enabled: enabled })
      .eq('org_id', admin.orgId);
    if (error) return { success: false, error: 'error' };
  } else {
    const { error } = await supabase.from('org_staff_access').insert({
      org_id: admin.orgId,
      is_enabled: enabled,
      access_code_hash: null,
      rotated_at: null,
    });
    if (error) return { success: false, error: 'error' };
  }

  return { success: true };
}

export async function rotateAccessCode(orgSlug: string): Promise<
  | { success: true; newCode: string }
  | { success: false; error: string }
> {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return { success: false, error: 'unauthorized' };

  const newCode = randomCode();
  const hash = await bcrypt.hash(newCode, 10);

  const supabase = await createAuthClient();

  const { data: existing } = await supabase
    .from('org_staff_access')
    .select('org_id')
    .eq('org_id', admin.orgId)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('org_staff_access')
      .update({
        access_code_hash: hash,
        access_code_plaintext: newCode,
        rotated_at: new Date().toISOString(),
      })
      .eq('org_id', admin.orgId);
    if (error) return { success: false, error: 'error' };
  } else {
    const { error } = await supabase.from('org_staff_access').insert({
      org_id: admin.orgId,
      is_enabled: true,
      access_code_hash: hash,
      access_code_plaintext: newCode,
      rotated_at: new Date().toISOString(),
    });
    if (error) return { success: false, error: 'error' };
  }

  return { success: true, newCode };
}
