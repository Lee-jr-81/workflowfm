import Link from 'next/link';
import { JobStatusBadge } from './job-status-badge';
import type { JobListItem } from '@/server/engineer/jobs';

function timeAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const mins = Math.floor((now.getTime() - d.getTime()) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export function JobCard({
  job,
  orgSlug,
}: {
  job: JobListItem;
  orgSlug: string;
}) {
  return (
    <Link
      href={`/${orgSlug}/engineer/jobs/${job.id}`}
      className="block rounded-lg border bg-card p-4 shadow-sm transition-colors hover:bg-accent/50"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium">{job.title}</h3>
        <JobStatusBadge status={job.status} workStatus={job.work_status} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {job.department.name}
        {job.location && ` · ${job.location.name}`}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{timeAgo(job.created_at)}</p>
    </Link>
  );
}
