import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getAuthSession } from '@/server/auth/session';
import { getJobDetail } from '@/server/engineer/jobs';
import { getJobPhotos } from '@/server/engineer/jobs-updates';
import { JobStatusBadge } from '@/components/engineer/job-status-badge';
import { TakeJobButton } from '@/components/engineer/take-job-button';
import { JobUpdatesSection } from '@/components/engineer/job-updates-section';
import { CompleteJobButton } from '@/components/engineer/complete-job-button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

function formatDate(s: string) {
  return new Date(s).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; jobId: string }>;
}) {
  const { orgSlug, jobId } = await params;
  const session = await getAuthSession(orgSlug);

  if (!session) {
    redirect(`/${orgSlug}/sign-in`);
  }

  const [job, photos] = await Promise.all([
    getJobDetail(jobId, session.orgId),
    getJobPhotos(orgSlug, jobId).catch(() => []),
  ]);
  if (!job) notFound();

  return (
    <div className="container max-w-3xl mx-auto p-4 py-6">
      <Button variant="ghost" size="sm" asChild className="mb-4">
        <Link href={`/${orgSlug}/engineer`}>
          <ArrowLeft className="h-4 w-4" />
          Back to queue
        </Link>
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <CardTitle className="text-xl">{job.title}</CardTitle>
            <JobStatusBadge status={job.status} workStatus={job.work_status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {job.department.name}
            {job.location && ` · ${job.location.name}`}
          </p>
        </CardHeader>
        {job.description && (
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{job.description}</p>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Type</span>
            <span className="capitalize">{job.job_type}</span>
          </div>
          {job.requestor_name && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Requestor</span>
              <span>{job.requestor_name}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Created</span>
            <span>{formatDate(job.created_at)}</span>
          </div>
          {job.taken_at && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taken</span>
              <span>{formatDate(job.taken_at)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {job.status === 'new' && (
        <div className="mt-6">
          <TakeJobButton jobId={job.id} orgSlug={orgSlug} />
        </div>
      )}

      {job.status === 'taken' && (
        <div className="mt-6 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Work updates</h2>
            <JobUpdatesSection
              jobId={job.id}
              orgSlug={orgSlug}
              workStatus={job.work_status ?? null}
              workStatusNote={job.work_status_note ?? null}
              photos={photos}
            />
          </div>
          <div>
            <CompleteJobButton jobId={job.id} orgSlug={orgSlug} />
          </div>
        </div>
      )}
    </div>
  );
}
