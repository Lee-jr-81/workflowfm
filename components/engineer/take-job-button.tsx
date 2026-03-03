'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { takeJob } from '@/server/engineer/take-job';
import { Button } from '@/components/ui/button';

export function TakeJobButton({
  jobId,
  orgSlug,
}: {
  jobId: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleTake = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await takeJob(orgSlug, jobId);
      if (result.success) {
        router.refresh();
        router.push(`/${orgSlug}/engineer`);
      } else if (result.reason === 'already_taken') {
        router.push(`/${orgSlug}/engineer?error=already_taken`);
      } else {
        setMessage('Could not take job');
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-2">
      {message && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{message}</p>
      )}
      <Button
        onClick={handleTake}
        disabled={isPending}
        className="w-full sm:w-auto"
      >
        {isPending ? 'Taking...' : 'Take job'}
      </Button>
    </div>
  );
}
