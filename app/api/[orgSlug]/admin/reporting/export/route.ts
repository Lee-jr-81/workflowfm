import { NextRequest } from 'next/server';
import { getJobsForExport, jobsToCsv } from '@/server/admin/reporting';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> }
) {
  const { orgSlug } = await params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get('from') ?? undefined;
  const to = searchParams.get('to') ?? undefined;
  const status = searchParams.get('status') ?? undefined;

  const rows = await getJobsForExport(orgSlug, { from, to, status });
  if (!rows) {
    return new Response('Unauthorized', { status: 403 });
  }

  const csv = jobsToCsv(rows);
  const filename = `jobs-export-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
