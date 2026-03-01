import { NextRequest, NextResponse } from 'next/server';
import { resolveOrg } from '@/server/org/resolve-org';
import { verifyAccessCode } from '@/server/staff/requestor-session';
import { checkRateLimit } from '@/server/staff/rate-limiter';
import { z } from 'zod';

const verifySchema = z.object({
  code: z.string().length(6, 'Access code must be 6 digits'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  try {
    const { orgSlug } = await params;

    const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `pin-verify:${orgSlug}:${clientIp}`;

    const rateLimit = checkRateLimit(rateLimitKey);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const org = await resolveOrg(orgSlug);

    const body = await request.json();
    const { code } = verifySchema.parse(body);

    const result = await verifyAccessCode(org.id, code);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    const response = NextResponse.json({ ok: true });

    response.cookies.set('req_sess', result.sessionId!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
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

    console.error('Error verifying access code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
