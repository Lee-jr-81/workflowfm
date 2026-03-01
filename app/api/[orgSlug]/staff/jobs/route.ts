import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/server/org/resolve-org';
import { validateRequestorSession } from '@/server/staff/requestor-session';
import { createJobFromRequestor, createJobSchema } from '@/server/staff/jobs';
import { z } from 'zod';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;
    const org = await resolveOrg(orgSlug);

    const sessionId = request.cookies.get('req_sess')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 401 });
    }

    const isValid = await validateRequestorSession(sessionId, org.id);

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const body = await request.json();
    const input = createJobSchema.parse(body);

    const { jobId } = await createJobFromRequestor(org.id, sessionId, input);

    return NextResponse.json({ jobId }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0].message },
        { status: 400 }
      );
    }

    if (error instanceof Error && (error.cause as { status?: number })?.status === 404) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.error('Error creating job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
