/**
 * Take job: NEW -> TAKEN
 * Server action. Client sends only jobId; server derives org and user.
 */

'use server';

import { z } from 'zod';
import { createAuthClient } from '@/server/db/auth-client';
import { getAuthSession } from '@/server/auth/session';

const takeJobSchema = z.object({
  orgSlug: z.string().min(1),
  jobId: z.string().uuid(),
});

export type TakeJobResult =
  | { success: true }
  | { success: false; reason: 'already_taken' | 'not_found' | 'unauthorized' };

export async function takeJob(
  orgSlug: string,
  jobId: string
): Promise<TakeJobResult> {
  const parsed = takeJobSchema.safeParse({ orgSlug, jobId });
  if (!parsed.success) {
    return { success: false, reason: 'not_found' };
  }

  const session = await getAuthSession(orgSlug);
  if (!session) {
    return { success: false, reason: 'unauthorized' };
  }

  const supabase = await createAuthClient();

  const { data, error } = await supabase.rpc('take_job', {
    p_job_id: parsed.data.jobId,
  });

  if (error) {
    return { success: false, reason: 'not_found' };
  }

  const result = data as { ok: boolean; reason?: string };
  if (!result.ok) {
    const reason = result.reason === 'already_taken' ? 'already_taken' : 'not_found';
    return { success: false, reason };
  }

  return { success: true };
}
