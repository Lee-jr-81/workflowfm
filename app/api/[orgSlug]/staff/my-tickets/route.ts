import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/server/org/resolve-org';
import { validateRequestorSession } from '@/server/staff/requestor-session';
import { getMyTickets } from '@/server/staff/jobs';

export async function GET(
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

    const tickets = await getMyTickets(org.id, sessionId);

    return NextResponse.json({ tickets });
  } catch (error: unknown) {
    if (error instanceof Error && (error.cause as { status?: number })?.status === 404) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    console.error('Error fetching tickets:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
