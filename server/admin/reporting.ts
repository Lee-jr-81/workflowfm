/**
 * Slice 7: Admin reporting.
 * Metrics, breakdowns, CSV export.
 */

import { createAuthClient } from '@/server/db/auth-client';
import { requireAdmin } from '@/server/admin/guard';

export interface ReportingMetrics {
  openCount: number;
  agingBands: { band: string; count: number }[];
  medianTimeToTakeHours: number | null;
  medianTimeToCompleteHours: number | null;
  createdByMonth: { month: string; count: number }[];
  completedByMonth: { month: string; count: number }[];
  byDepartment: { name: string; count: number }[];
  byLocation: { name: string; count: number }[];
  byCategory: { name: string; count: number }[];
}

interface JobRow {
  id: string;
  status: string;
  created_at: string;
  taken_at: string | null;
  completed_at: string | null;
  department_name: string;
  location_name: string | null;
  category_name: string | null;
}

function median(arr: number[]): number | null {
  if (arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export async function getReportingMetrics(
  orgSlug: string
): Promise<ReportingMetrics | null> {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return null;

  const supabase = await createAuthClient();

  const { data: jobs, error } = await supabase
    .from('jobs')
    .select(
      `
      id, status, created_at, taken_at, completed_at,
      departments!inner(name),
      locations(name),
      categories(name)
    `
    )
    .eq('org_id', admin.orgId);

  if (error) return null;

  const rows = (jobs ?? []) as {
    id: string;
    status: string;
    created_at: string;
    taken_at: string | null;
    completed_at: string | null;
    departments?: { name: string }[] | null;
    locations?: { name: string }[] | null;
    categories?: { name: string }[] | null;
  }[];

  const jobRows: JobRow[] = rows.map((r) => ({
    id: r.id,
    status: r.status,
    created_at: r.created_at,
    taken_at: r.taken_at,
    completed_at: r.completed_at,
    department_name: r.departments?.[0]?.name ?? '',
    location_name: r.locations?.[0]?.name ?? null,
    category_name: r.categories?.[0]?.name ?? null,
  }));

  const open = jobRows.filter((j) => j.status === 'new' || j.status === 'taken');
  const openCount = open.length;

  const now = Date.now();
  const msPerDay = 86400000;
  const bandCounts = { '0–7': 0, '8–14': 0, '15–30': 0, '30+': 0 };
  for (const j of open) {
    const days = (now - new Date(j.created_at).getTime()) / msPerDay;
    if (days <= 7) bandCounts['0–7']++;
    else if (days <= 14) bandCounts['8–14']++;
    else if (days <= 30) bandCounts['15–30']++;
    else bandCounts['30+']++;
  }

  const agingBands = [
    { band: '0–7 days', count: bandCounts['0–7'] },
    { band: '8–14 days', count: bandCounts['8–14'] },
    { band: '15–30 days', count: bandCounts['15–30'] },
    { band: '30+ days', count: bandCounts['30+'] },
  ];

  const timesToTake = jobRows
    .filter((j) => j.taken_at)
    .map((j) => (new Date(j.taken_at!).getTime() - new Date(j.created_at).getTime()) / 1000);
  const medianTimeToTakeHours = median(timesToTake);

  const timesToComplete = jobRows
    .filter((j) => j.completed_at)
    .map((j) => (new Date(j.completed_at!).getTime() - new Date(j.created_at).getTime()) / 1000);
  const medianTimeToCompleteHours = median(timesToComplete);

  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const createdByMonthMap = new Map<string, number>();
  const completedByMonthMap = new Map<string, number>();
  for (const j of jobRows) {
    const k = monthKey(new Date(j.created_at));
    createdByMonthMap.set(k, (createdByMonthMap.get(k) ?? 0) + 1);
    if (j.completed_at) {
      const kc = monthKey(new Date(j.completed_at));
      completedByMonthMap.set(kc, (completedByMonthMap.get(kc) ?? 0) + 1);
    }
  }

  const allMonths = new Set([
    ...createdByMonthMap.keys(),
    ...completedByMonthMap.keys(),
  ]);
  const sortedMonths = [...allMonths].sort().slice(-12);
  const createdByMonth = sortedMonths.map((m) => ({
    month: m,
    count: createdByMonthMap.get(m) ?? 0,
  }));
  const completedByMonth = sortedMonths.map((m) => ({
    month: m,
    count: completedByMonthMap.get(m) ?? 0,
  }));

  const deptMap = new Map<string, number>();
  const locMap = new Map<string, number>();
  const catMap = new Map<string, number>();
  for (const j of jobRows) {
    deptMap.set(j.department_name, (deptMap.get(j.department_name) ?? 0) + 1);
    const loc = j.location_name ?? '(none)';
    locMap.set(loc, (locMap.get(loc) ?? 0) + 1);
    const cat = j.category_name ?? '(none)';
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1);
  }

  const byDepartment = [...deptMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const byLocation = [...locMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
  const byCategory = [...catMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  return {
    openCount,
    agingBands,
    medianTimeToTakeHours: medianTimeToTakeHours != null ? medianTimeToTakeHours / 3600 : null,
    medianTimeToCompleteHours: medianTimeToCompleteHours != null ? medianTimeToCompleteHours / 3600 : null,
    createdByMonth,
    completedByMonth,
    byDepartment,
    byLocation,
    byCategory,
  };
}

export interface ExportJobRow {
  id: string;
  title: string;
  status: string;
  job_type: string;
  department: string;
  location: string;
  category: string;
  created_at: string;
  taken_at: string;
  completed_at: string;
}

export async function getJobsForExport(
  orgSlug: string,
  filters: { from?: string; to?: string; status?: string }
): Promise<ExportJobRow[] | null> {
  const admin = await requireAdmin(orgSlug);
  if (!admin) return null;

  const supabase = await createAuthClient();

  let q = supabase
    .from('jobs')
    .select(
      `
      id, title, status, job_type, created_at, taken_at, completed_at,
      departments!inner(name),
      locations(name),
      categories(name)
    `
    )
    .eq('org_id', admin.orgId)
    .order('created_at', { ascending: false });

  if (filters.from) {
    q = q.gte('created_at', filters.from);
  }
  if (filters.to) {
    q = q.lte('created_at', filters.to);
  }
  if (filters.status) {
    q = q.eq('status', filters.status);
  }

  const { data, error } = await q;

  if (error) return null;

  type Row = {
    id: string;
    title: string;
    status: string;
    job_type: string;
    created_at: string;
    taken_at: string | null;
    completed_at: string | null;
    departments?: { name: string }[] | null;
    locations?: { name: string }[] | null;
    categories?: { name: string }[] | null;
  };

  return (data ?? []).map((r: Row) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    job_type: r.job_type,
    department: r.departments?.[0]?.name ?? '',
    location: r.locations?.[0]?.name ?? '',
    category: r.categories?.[0]?.name ?? '',
    created_at: r.created_at,
    taken_at: r.taken_at ?? '',
    completed_at: r.completed_at ?? '',
  }));
}

export function jobsToCsv(rows: ExportJobRow[]): string {
  const headers = [
    'id',
    'title',
    'status',
    'job_type',
    'department',
    'location',
    'category',
    'created_at',
    'taken_at',
    'completed_at',
  ];
  const escape = (v: string) =>
    v.includes(',') || v.includes('"') || v.includes('\n')
      ? `"${v.replace(/"/g, '""')}"`
      : v;
  const lines = [headers.join(',')];
  for (const r of rows) {
    lines.push(
      [
        r.id,
        r.title,
        r.status,
        r.job_type,
        r.department,
        r.location,
        r.category,
        r.created_at,
        r.taken_at,
        r.completed_at,
      ]
        .map(String)
        .map(escape)
        .join(',')
    );
  }
  return lines.join('\n');
}
