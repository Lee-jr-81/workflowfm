'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  setWorkStatus,
  createPhotoUploadUrl,
  recordPhotoAdded,
} from '@/server/engineer/jobs-updates';
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

export function JobUpdatesSection({
  jobId,
  orgSlug,
  workStatus,
  workStatusNote,
}: {
  jobId: string;
  orgSlug: string;
  workStatus: 'active' | 'on_hold' | null;
  workStatusNote: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [holdModalOpen, setHoldModalOpen] = useState(false);
  const [holdNote, setHoldNote] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [localWorkStatus, setLocalWorkStatus] = useState<'active' | 'on_hold' | null>(workStatus);
  const [photoUploading, setPhotoUploading] = useState(false);

  const refresh = () => {
    router.refresh();
  };

  const handleSetWorkStatus = (newStatus: 'active' | 'on_hold', note?: string) => {
    setMessage(null);
    startTransition(async () => {
      const result = await setWorkStatus(orgSlug, jobId, newStatus, note);
      if (result.success) {
        setLocalWorkStatus(newStatus);
        setHoldModalOpen(false);
        setHoldNote('');
        refresh();
      } else {
        setMessage(result.reason === 'note_required' ? 'Reason is required for on hold' : 'Could not update');
      }
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const mime = file.type;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
      setMessage('Invalid file type');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('File too large (max 5MB)');
      return;
    }
    setPhotoUploading(true);
    setMessage(null);
    const urlResult = await createPhotoUploadUrl(orgSlug, jobId, mime);
    if (!urlResult.success) {
      setMessage('Could not get upload URL');
      setPhotoUploading(false);
      e.target.value = '';
      return;
    }
    const res = await fetch(urlResult.uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': mime },
    });
    if (!res.ok) {
      setMessage('Upload failed');
      setPhotoUploading(false);
      e.target.value = '';
      return;
    }
    const recordResult = await recordPhotoAdded(orgSlug, jobId, urlResult.path, mime, file.size);
    if (recordResult.success) {
      refresh();
    } else {
      setMessage('Could not record photo');
    }
    setPhotoUploading(false);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      {/* Work status toggle */}
      <div className="flex flex-wrap items-center gap-3">
        {localWorkStatus === 'on_hold' && workStatusNote && (
          <span className="text-sm text-muted-foreground">{workStatusNote}</span>
        )}
        <div>
          {localWorkStatus === 'active' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setHoldModalOpen(true)}
                disabled={isPending}
              >
                Put on hold
              </Button>
              <Dialog open={holdModalOpen} onOpenChange={setHoldModalOpen}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Put job on hold</DialogTitle>
                    <DialogDescription>Provide a reason (required).</DialogDescription>
                  </DialogHeader>
                  <Textarea
                    placeholder="Reason for putting on hold..."
                    value={holdNote}
                    onChange={(e) => setHoldNote(e.target.value)}
                    rows={3}
                    maxLength={500}
                  />
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setHoldModalOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => handleSetWorkStatus('on_hold', holdNote)}
                      disabled={!holdNote.trim() || isPending}
                    >
                      Put on hold
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSetWorkStatus('active')}
              disabled={isPending}
            >
              Mark active
            </Button>
          )}
        </div>
      </div>

      {message && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{message}</p>
      )}

      {/* Photo upload */}
      <div>
        <label className="text-sm font-medium mb-2 block">Photos</label>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild disabled={photoUploading}>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={handlePhotoUpload}
                disabled={photoUploading}
              />
              {photoUploading ? 'Uploading...' : 'Add photo'}
            </label>
          </Button>
        </div>
      </div>
    </div>
  );
}
