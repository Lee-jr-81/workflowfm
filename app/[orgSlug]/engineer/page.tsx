import { redirect } from 'next/navigation';
import { getAuthSession } from '@/server/auth/session';
import { getUnassignedJobs, getMyJobs } from '@/server/engineer/jobs';
import { JobCard } from '@/components/engineer/job-card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

export default async function EngineerPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { orgSlug } = await params;
  const { error } = await searchParams;
  const session = await getAuthSession(orgSlug);

  if (!session) {
    redirect(`/${orgSlug}/sign-in`);
  }

  const [unassigned, myJobs] = await Promise.all([
    getUnassignedJobs(session.orgId),
    getMyJobs(session.orgId, session.user.id),
  ]);

  return (
    <div className="container max-w-4xl mx-auto p-4 py-6">
      {error === 'already_taken' && (
        <div className="mb-4 rounded-md bg-amber-100 px-4 py-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
          That job was taken by someone else.
        </div>
      )}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Job queue</h1>
        <p className="text-sm text-muted-foreground">
          {unassigned.length} unassigned · {myJobs.length} in progress
        </p>
      </div>

      <Tabs defaultValue="unassigned" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2">
          <TabsTrigger value="unassigned">Unassigned ({unassigned.length})</TabsTrigger>
          <TabsTrigger value="my-jobs">My jobs ({myJobs.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="unassigned" className="space-y-4">
          {unassigned.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No unassigned jobs.</p>
            </Card>
          ) : (
            unassigned.map((job) => (
              <JobCard key={job.id} job={job} orgSlug={orgSlug} />
            ))
          )}
        </TabsContent>

        <TabsContent value="my-jobs" className="space-y-4">
          {myJobs.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="text-muted-foreground">No jobs in progress.</p>
            </Card>
          ) : (
            myJobs.map((job) => (
              <JobCard key={job.id} job={job} orgSlug={orgSlug} />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
