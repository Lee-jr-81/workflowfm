import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getReportingMetrics } from '@/server/admin/reporting';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExportForm } from '@/components/admin/export-form';
import { ArrowLeft } from 'lucide-react';

function formatHours(h: number | null): string {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

function formatMonth(m: string): string {
  const [y, mm] = m.split('-');
  const d = new Date(parseInt(y, 10), parseInt(mm, 10) - 1);
  return d.toLocaleString('default', { month: 'short', year: '2-digit' });
}

export default async function AdminReportingPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const metrics = await getReportingMetrics(orgSlug);

  if (!metrics) {
    redirect(`/${orgSlug}/engineer`);
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 py-6">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href={`/${orgSlug}/admin`}>
          <ArrowLeft className="h-4 w-4" />
          Back to config
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-6">Reporting</h1>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Open jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{metrics.openCount}</p>
            <p className="text-xs text-muted-foreground">new + taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Median time to take</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHours(metrics.medianTimeToTakeHours)}</p>
            <p className="text-xs text-muted-foreground">created → taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Median time to complete</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatHours(metrics.medianTimeToCompleteHours)}</p>
            <p className="text-xs text-muted-foreground">created → completed</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Backlog aging</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.agingBands.map((b) => (
                <li key={b.band} className="flex justify-between text-sm">
                  <span>{b.band}</span>
                  <span className="font-medium">{b.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Created vs completed (monthly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {metrics.createdByMonth.slice().reverse().map(({ month, count }) => (
                <div key={month} className="flex justify-between text-sm">
                  <span>{formatMonth(month)}</span>
                  <span>
                    <span className="text-muted-foreground">{count} created</span>
                    {' · '}
                    <span>
                      {(metrics.completedByMonth.find((c) => c.month === month)?.count ?? 0)} completed
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By department</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.byDepartment.map((d) => (
                <li key={d.name} className="flex justify-between text-sm">
                  <span>{d.name}</span>
                  <span className="font-medium">{d.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By location</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.byLocation.map((l) => (
                <li key={l.name} className="flex justify-between text-sm">
                  <span>{l.name}</span>
                  <span className="font-medium">{l.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By category</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {metrics.byCategory.map((c) => (
                <li key={c.name} className="flex justify-between text-sm">
                  <span>{c.name}</span>
                  <span className="font-medium">{c.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">CSV export</CardTitle>
        </CardHeader>
        <CardContent>
          <ExportForm orgSlug={orgSlug} />
        </CardContent>
      </Card>
    </div>
  );
}
