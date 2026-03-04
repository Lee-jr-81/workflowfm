'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { completeJob } from '@/server/engineer/jobs-complete';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function CompleteJobButton({
  jobId,
  orgSlug,
}: {
  jobId: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [resolutionText, setResolutionText] = useState('');
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleOpen = () => {
    setResolutionText('');
    setMessage(null);
    setOpen(true);
  };

  const handleComplete = () => {
    if (!resolutionText.trim()) {
      setMessage('Resolution is required');
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await completeJob(orgSlug, jobId, resolutionText);
      if (result.success) {
        setOpen(false);
        window.location.href = `/${orgSlug}/engineer?success=completed`;
      } else if (result.reason === 'already_completed') {
        setMessage('This job is already completed.');
        router.refresh();
      } else {
        setMessage('Could not complete job');
      }
    });
  };

  return (
    <>
      <Button onClick={handleOpen} className="w-full sm:w-auto">
        Mark completed
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete job</DialogTitle>
            <DialogDescription>
              Enter resolution text. Photos uploaded to this job will be included automatically.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="What was done? (required)"
            value={resolutionText}
            onChange={(e) => setResolutionText(e.target.value)}
            rows={4}
            maxLength={5000}
            className="resize-none"
          />
          {message && (
            <p className="text-sm text-amber-600 dark:text-amber-400">{message}</p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button
              onClick={handleComplete}
              disabled={!resolutionText.trim() || isPending}
            >
              {isPending ? 'Closing...' : 'Close job'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
