/**
 * Slice 5: Complete job (TAKEN -> COMPLETED).
 * Requires resolution text. Auto-includes photos from job_events.
 */

'use server';

import { z } from 'zod';
import { createAuthClient } from '@/server/db/auth-client';

const schema = z.object({
  orgSlug: z.string().min(1),
  jobId: z.string().uuid(),
  resolutionText: z.string().min(1).max(5000),
});

export type CompleteJobResult =
  | { success: true }
  | { success: false; reason: 'not_found' | 'forbidden' | 'already_completed' | 'resolution_required' | 'resolution_too_long' };

export async function completeJob(
  orgSlug: string,
  jobId: string,
  resolutionText: string
): Promise<CompleteJobResult> {
  const trimmed = resolutionText.trim();
  if (!trimmed) return { success: false, reason: 'resolution_required' };
  if (trimmed.length > 5000) return { success: false, reason: 'resolution_too_long' };

  const parsed = schema.safeParse({ orgSlug, jobId, resolutionText: trimmed });
  if (!parsed.success) return { success: false, reason: 'not_found' };

  const supabase = await createAuthClient();
  const { data, error } = await supabase.rpc('complete_job', {
    p_job_id: parsed.data.jobId,
    p_resolution_text: trimmed,
  });

  if (error) return { success: false, reason: 'not_found' };

  const result = data as { ok: boolean; reason?: string };
  if (!result.ok) {
    type FailureReason = Extract<CompleteJobResult, { success: false }>['reason'];
    const r = result.reason;
    const reason: FailureReason =
      r === 'forbidden' || r === 'already_completed' || r === 'resolution_required' || r === 'resolution_too_long'
        ? r
        : 'not_found';
    return { success: false, reason };
  }

  return { success: true };
}
