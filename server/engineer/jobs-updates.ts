/**
 * Slice 4: Work status, work updates, photos (TAKEN jobs only).
 * Server actions. All org scoping derived server-side.
 */

'use server';

import { z } from 'zod';
import { createAuthClient } from '@/server/db/auth-client';
import { getServiceRoleClient } from '@/server/db/client';
import { getEngineerContext } from '@/server/engineer/guard';
import { randomUUID } from 'crypto';

const BUCKET = 'job-photos';
const UPLOAD_URL_TTL = 300; // 5 min
const DOWNLOAD_URL_TTL = 3600; // 1 hr
const WORK_UPDATE_MAX = 2000;
const WORK_STATUS_NOTE_MAX = 500;

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// --- Helpers ---

async function canUpdateJob(
  orgSlug: string,
  jobId: string
): Promise<{ ok: true; orgId: string } | { ok: false; reason: string }> {
  const ctx = await getEngineerContext(orgSlug);
  if (!ctx) return { ok: false, reason: 'unauthorized' };

  const supabase = await createAuthClient();
  const { data: job, error } = await supabase
    .from('jobs')
    .select('id, org_id, status, assigned_to_user_id')
    .eq('id', jobId)
    .eq('org_id', ctx.orgId)
    .single();

  if (error || !job) return { ok: false, reason: 'not_found' };
  if (job.status !== 'taken') return { ok: false, reason: 'invalid_state' };

  if (ctx.role === 'engineer' && job.assigned_to_user_id !== ctx.userId) {
    return { ok: false, reason: 'forbidden' };
  }

  return { ok: true, orgId: ctx.orgId };
}

// --- Actions ---

export type SetWorkStatusResult =
  | { success: true }
  | { success: false; reason: string };

export async function setWorkStatus(
  orgSlug: string,
  jobId: string,
  newStatus: 'active' | 'on_hold',
  note?: string
): Promise<SetWorkStatusResult> {
  const check = await canUpdateJob(orgSlug, jobId);
  if (!check.ok) return { success: false, reason: check.reason };

  if (newStatus === 'on_hold') {
    const trimmed = (note ?? '').trim();
    if (!trimmed) return { success: false, reason: 'note_required' };
    if (trimmed.length > WORK_STATUS_NOTE_MAX) {
      return { success: false, reason: 'note_too_long' };
    }
  }

  const parsed = z.object({
    orgSlug: z.string().min(1),
    jobId: z.string().uuid(),
    newStatus: z.enum(['active', 'on_hold']),
  }).safeParse({ orgSlug, jobId, newStatus });
  if (!parsed.success) return { success: false, reason: 'not_found' };

  const supabase = await createAuthClient();
  const { data: job } = await supabase
    .from('jobs')
    .select('work_status')
    .eq('id', jobId)
    .single();

  const previousStatus = (job?.work_status ?? 'active') as 'active' | 'on_hold';

  const { error: updateError } = await supabase
    .from('jobs')
    .update({
      work_status: newStatus,
      work_status_note: newStatus === 'on_hold' ? (note ?? '').trim() : null,
    })
    .eq('id', jobId)
    .eq('org_id', check.orgId);

  if (updateError) return { success: false, reason: 'error' };

  const { data } = await supabase.auth.getUser();
  const actorId = data?.user?.id ?? null;

  const payload = {
    previous_status: previousStatus,
    new_status: newStatus,
    note: newStatus === 'on_hold' ? (note ?? '').trim() : undefined,
  };

  const { error: eventError } = await supabase.from('job_events').insert({
    org_id: check.orgId,
    job_id: jobId,
    event_type: 'work_status_changed',
    actor_type: 'user',
    actor_user_id: actorId,
    payload,
  });

  if (eventError) return { success: false, reason: 'error' };
  return { success: true };
}

export type AddWorkUpdateResult =
  | { success: true }
  | { success: false; reason: string };

export async function addWorkUpdate(
  orgSlug: string,
  jobId: string,
  text: string
): Promise<AddWorkUpdateResult> {
  const check = await canUpdateJob(orgSlug, jobId);
  if (!check.ok) return { success: false, reason: check.reason };

  const trimmed = text.trim();
  if (!trimmed) return { success: false, reason: 'text_required' };
  if (trimmed.length > WORK_UPDATE_MAX) return { success: false, reason: 'text_too_long' };

  const parsed = z.object({
    orgSlug: z.string().min(1),
    jobId: z.string().uuid(),
    text: z.string().min(1).max(WORK_UPDATE_MAX),
  }).safeParse({ orgSlug, jobId, text: trimmed });
  if (!parsed.success) return { success: false, reason: 'invalid_input' };

  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  const actorId = data?.user?.id ?? null;

  const { error } = await supabase.from('job_events').insert({
    org_id: check.orgId,
    job_id: jobId,
    event_type: 'work_update',
    actor_type: 'user',
    actor_user_id: actorId,
    payload: { text: trimmed },
  });

  if (error) return { success: false, reason: 'error' };
  return { success: true };
}

export type CreatePhotoUploadUrlResult =
  | { success: true; uploadUrl: string; path: string }
  | { success: false; reason: string };

export async function createPhotoUploadUrl(
  orgSlug: string,
  jobId: string,
  mimeType: string
): Promise<CreatePhotoUploadUrlResult> {
  const check = await canUpdateJob(orgSlug, jobId);
  if (!check.ok) return { success: false, reason: check.reason };

  if (!ALLOWED_MIME.includes(mimeType as (typeof ALLOWED_MIME)[number])) {
    return { success: false, reason: 'invalid_mime' };
  }

  const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/png' ? 'png' : 'webp';
  const path = `org/${check.orgId}/jobs/${jobId}/${randomUUID()}.${ext}`;

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path, { upsert: false });

  if (error) return { success: false, reason: 'error' };
  if (!data?.signedUrl) return { success: false, reason: 'error' };

  return {
    success: true,
    uploadUrl: data.signedUrl,
    path,
  };
}

export type RecordPhotoAddedResult =
  | { success: true }
  | { success: false; reason: string };

export async function recordPhotoAdded(
  orgSlug: string,
  jobId: string,
  path: string,
  mimeType: string,
  size: number
): Promise<RecordPhotoAddedResult> {
  const check = await canUpdateJob(orgSlug, jobId);
  if (!check.ok) return { success: false, reason: check.reason };

  if (size > MAX_FILE_SIZE) return { success: false, reason: 'file_too_large' };
  if (!path.startsWith(`org/${check.orgId}/jobs/${jobId}/`)) {
    return { success: false, reason: 'invalid_path' };
  }

  const supabase = await createAuthClient();
  const { data } = await supabase.auth.getUser();
  const actorId = data?.user?.id ?? null;

  const { error } = await supabase.from('job_events').insert({
    org_id: check.orgId,
    job_id: jobId,
    event_type: 'photo_added',
    actor_type: 'user',
    actor_user_id: actorId,
    payload: { path, mime: mimeType, size },
  });

  if (error) return { success: false, reason: 'error' };
  return { success: true };
}

export interface TimelineEvent {
  id: string;
  event_type: string;
  created_at: string;
  payload: Record<string, unknown> | null;
  signedUrl?: string;
}

export interface JobTimeline {
  job: { id: string; work_status: 'active' | 'on_hold' | null; work_status_note: string | null };
  events: TimelineEvent[];
}

export async function listJobTimeline(
  orgSlug: string,
  jobId: string
): Promise<JobTimeline | null> {
  const ctx = await getEngineerContext(orgSlug);
  if (!ctx) return null;

  const supabase = await createAuthClient();
  const { data: job, error: jobErr } = await supabase
    .from('jobs')
    .select('id, work_status, work_status_note')
    .eq('id', jobId)
    .eq('org_id', ctx.orgId)
    .single();

  if (jobErr || !job) return null;

  const { data: events, error: evErr } = await supabase
    .from('job_events')
    .select('id, event_type, created_at, payload')
    .eq('job_id', jobId)
    .eq('org_id', ctx.orgId)
    .order('created_at', { ascending: true });

  if (evErr) return null;

  const photoPaths = (events ?? [])
    .filter((e) => e.event_type === 'photo_added' && e.payload && typeof e.payload === 'object' && 'path' in e.payload)
    .map((e) => (e.payload as { path: string }).path);

  let signedUrls: Record<string, string> = {};
  if (photoPaths.length > 0) {
    const sr = getServiceRoleClient();
    const results = await Promise.all(
      photoPaths.map(async (p) => {
        const { data } = await sr.storage.from(BUCKET).createSignedUrl(p, DOWNLOAD_URL_TTL);
        return { path: p, url: data?.signedUrl };
      })
    );
    signedUrls = Object.fromEntries(results.filter((r) => r.url).map((r) => [r.path, r.url!]));
  }

  const timelineEvents: TimelineEvent[] = (events ?? []).map((e) => ({
    id: e.id,
    event_type: e.event_type,
    created_at: e.created_at,
    payload: e.payload as Record<string, unknown> | null,
    signedUrl: e.event_type === 'photo_added' && e.payload && typeof e.payload === 'object' && 'path' in e.payload
      ? signedUrls[(e.payload as { path: string }).path]
      : undefined,
  }));

  return {
    job: {
      id: job.id,
      work_status: job.work_status as 'active' | 'on_hold' | null,
      work_status_note: job.work_status_note,
    },
    events: timelineEvents,
  };
}
