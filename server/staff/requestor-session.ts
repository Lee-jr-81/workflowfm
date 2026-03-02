import { getServiceRoleClient } from "@/server/db/client";
import bcrypt from "bcryptjs";

export interface VerifyAccessCodeResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

export async function verifyAccessCode(
  orgId: string,
  code: string,
): Promise<VerifyAccessCodeResult> {
  const supabase = getServiceRoleClient();

  const { data: accessConfig, error: configError } = await supabase
    .from("org_staff_access")
    .select("access_code_hash, is_enabled")
    .eq("org_id", orgId)
    .single();

  if (configError || !accessConfig) {
    return { success: false, error: "Staff portal not configured" };
  }

  if (!accessConfig.is_enabled) {
    return { success: false, error: "Staff portal is disabled" };
  }

  if (!accessConfig.access_code_hash) {
    return { success: false, error: "Access code not set" };
  }

  const isValid = await bcrypt.compare(code, accessConfig.access_code_hash);

  if (!isValid) {
    return { success: false, error: "Invalid access code" };
  }

  const { data: session, error: sessionError } = await supabase
    .from("requestor_sessions")
    .insert({
      org_id: orgId,
    })
    .select("id")
    .single();

  if (sessionError || !session) {
    return { success: false, error: "Failed to create session" };
  }

  return { success: true, sessionId: session.id };
}

export async function validateRequestorSession(
  sessionId: string,
  orgId: string,
): Promise<boolean> {
  const supabase = getServiceRoleClient();

  const { data, error } = await supabase
    .from("requestor_sessions")
    .select("id, org_id, revoked_at")
    .eq("id", sessionId)
    .eq("org_id", orgId)
    .single();

  if (error || !data || data.revoked_at) {
    return false;
  }

  await supabase
    .from("requestor_sessions")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("id", sessionId);

  return true;
}
