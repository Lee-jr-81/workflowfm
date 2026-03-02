/**
 * Engineer job queries. Uses RLS-enabled auth client.
 */

import { createAuthClient } from '@/server/db/auth-client';

export interface JobListItem {
  id: string;
  title: string;
  description: string | null;
  status: 'new' | 'taken' | 'completed';
  job_type: 'reactive' | 'install';
  created_at: string;
  taken_at: string | null;
  department: { name: string };
  location: { name: string } | null;
  category: { name: string } | null;
}

export async function getUnassignedJobs(orgId: string): Promise<JobListItem[]> {
  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id, title, description, status, job_type, created_at, taken_at,
      departments!inner(name),
      locations(name),
      categories(name)
    `)
    .eq('org_id', orgId)
    .eq('status', 'new')
    .order('created_at', { ascending: false });

  if (error) throw new Error('Failed to fetch jobs', { cause: error });

  type Row = {
    id: string;
    title: string;
    description: string | null;
    status: 'new' | 'taken' | 'completed';
    job_type: 'reactive' | 'install';
    created_at: string;
    taken_at: string | null;
    departments?: { name: string }[] | null;
    locations?: { name: string }[] | null;
    categories?: { name: string }[] | null;
  };

  return (data || []).map((item: Row) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    job_type: item.job_type,
    created_at: item.created_at,
    taken_at: item.taken_at,
    department: { name: item.departments?.[0]?.name ?? '' },
    location: item.locations?.[0] ? { name: item.locations[0].name } : null,
    category: item.categories?.[0] ? { name: item.categories[0].name } : null,
  }));
}

export async function getMyJobs(orgId: string, userId: string): Promise<JobListItem[]> {
  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id, title, description, status, job_type, created_at, taken_at,
      departments!inner(name),
      locations(name),
      categories(name)
    `)
    .eq('org_id', orgId)
    .eq('assigned_to_user_id', userId)
    .eq('status', 'taken')
    .order('taken_at', { ascending: false });

  if (error) throw new Error('Failed to fetch jobs', { cause: error });

  type Row = {
    id: string;
    title: string;
    description: string | null;
    status: 'new' | 'taken' | 'completed';
    job_type: 'reactive' | 'install';
    created_at: string;
    taken_at: string | null;
    departments?: { name: string }[] | null;
    locations?: { name: string }[] | null;
    categories?: { name: string }[] | null;
  };

  return (data || []).map((item: Row) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    job_type: item.job_type,
    created_at: item.created_at,
    taken_at: item.taken_at,
    department: { name: item.departments?.[0]?.name ?? '' },
    location: item.locations?.[0] ? { name: item.locations[0].name } : null,
    category: item.categories?.[0] ? { name: item.categories[0].name } : null,
  }));
}

export interface JobDetail extends JobListItem {
  requestor_name: string | null;
  assigned_to_user_id: string | null;
  completed_at: string | null;
}

export async function getJobDetail(jobId: string, orgId: string): Promise<JobDetail | null> {
  const supabase = await createAuthClient();

  const { data, error } = await supabase
    .from('jobs')
    .select(`
      id, title, description, status, job_type, created_at, taken_at, completed_at,
      requestor_name, assigned_to_user_id,
      departments!inner(name),
      locations(name),
      categories(name)
    `)
    .eq('id', jobId)
    .eq('org_id', orgId)
    .single();

  if (error || !data) return null;

  type Row = {
    id: string;
    title: string;
    description: string | null;
    status: 'new' | 'taken' | 'completed';
    job_type: 'reactive' | 'install';
    created_at: string;
    taken_at: string | null;
    completed_at: string | null;
    requestor_name: string | null;
    assigned_to_user_id: string | null;
    departments?: { name: string }[] | null;
    locations?: { name: string }[] | null;
    categories?: { name: string }[] | null;
  };

  const item = data as Row;
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    status: item.status,
    job_type: item.job_type,
    created_at: item.created_at,
    taken_at: item.taken_at,
    completed_at: item.completed_at,
    requestor_name: item.requestor_name,
    assigned_to_user_id: item.assigned_to_user_id,
    department: { name: item.departments?.[0]?.name ?? '' },
    location: item.locations?.[0] ? { name: item.locations[0].name } : null,
    category: item.categories?.[0] ? { name: item.categories[0].name } : null,
  };
}
