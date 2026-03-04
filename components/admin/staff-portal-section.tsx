'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { setStaffPortalEnabled, rotateAccessCode } from '@/server/admin/config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StaffPortalSection({
  orgSlug,
  isEnabled,
  rotatedAt,
  currentCode,
}: {
  orgSlug: string;
  isEnabled: boolean;
  rotatedAt: string | null;
  currentCode: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleToggle = (enabled: boolean) => {
    startTransition(async () => {
      const result = await setStaffPortalEnabled(orgSlug, enabled);
      if (result.success) router.refresh();
    });
  };

  const handleRotate = () => {
    startTransition(async () => {
      const result = await rotateAccessCode(orgSlug);
      if (result.success) router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Staff request portal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Portal is {isEnabled ? 'enabled' : 'disabled'}</span>
          <Button
            variant={isEnabled ? 'outline' : 'default'}
            onClick={() => handleToggle(!isEnabled)}
            disabled={isPending}
          >
            {isEnabled ? 'Disable' : 'Enable'}
          </Button>
        </div>
        {isEnabled && (
          <>
            <div>
              <Button variant="outline" onClick={handleRotate} disabled={isPending}>
                {isPending ? 'Rotating...' : 'Rotate access code'}
              </Button>
              {rotatedAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Last rotated: {new Date(rotatedAt).toLocaleString()}
                </p>
              )}
            </div>
            <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Latest code: <code className="font-mono">{currentCode ?? '—'}</code>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
