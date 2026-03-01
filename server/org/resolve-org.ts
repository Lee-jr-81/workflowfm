import { getServiceRoleClient } from '@/server/db/client';

export interface Org {
  id: string;
  slug: string;
  name: string;
}

export async function resolveOrg(orgSlug: string): Promise<Org> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from('orgs')
    .select('id, slug, name')
    .eq('slug', orgSlug)
    .single();

  if (error || !data) {
    throw new Error('Organization not found', { cause: { status: 404 } });
  }

  return data;
}
