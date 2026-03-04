'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { inviteEngineer, removeEngineer } from '@/server/admin/engineers';
import type { OrgMemberRow } from '@/server/admin/engineers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Trash2 } from 'lucide-react';

export function EngineersSection({
  orgSlug,
  engineers,
}: {
  orgSlug: string;
  engineers: OrgMemberRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<OrgMemberRow | null>(null);
  const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());

  const handleInvite = () => {
    if (!email.trim()) return;
    setMessage(null);
    startTransition(async () => {
      const result = await inviteEngineer(orgSlug, email.trim(), name.trim() || null, company.trim() || null);
      if (result.success) {
        setName('');
        setCompany('');
        setEmail('');
        if (result.kind === 'invited') {
          setMessage({ type: 'success', text: 'Invite sent. They will receive an email with a magic link.' });
        } else {
          setMessage({ type: 'success', text: 'Added. They can sign in at the engineer sign-in page.' });
        }
        router.refresh();
      } else {
        const errText =
          result.error === 'already_member'
            ? 'Already a member'
            : result.error === 'invalid_email'
              ? 'Invalid email'
              : 'Failed to invite';
        setMessage({ type: 'error', text: errText });
      }
    });
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    const userId = removeTarget.user_id;
    startTransition(async () => {
      const result = await removeEngineer(orgSlug, userId);
      if (result.success) {
        setRemoveTarget(null);
        setRemovedIds((prev) => new Set([...prev, userId]));
        router.refresh();
      }
    });
  };

  const visibleEngineers = engineers.filter((m) => !removedIds.has(m.user_id));

  const displayName = (m: OrgMemberRow) =>
    m.full_name?.trim() || m.email || '(no name)';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invite engineer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-name">Name</Label>
            <Input
              id="invite-name"
              placeholder="Engineer name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-company">Company</Label>
            <Input
              id="invite-company"
              placeholder="Company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="engineer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
            />
          </div>
          <Button onClick={handleInvite} disabled={!email.trim() || isPending}>
            {isPending ? 'Sending...' : 'Send invite'}
          </Button>
          {message && (
            <p
              className={`text-sm ${message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-destructive'}`}
            >
              {message.text}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Engineers</CardTitle>
        </CardHeader>
        <CardContent>
          {visibleEngineers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No engineers yet. Invite one above.</p>
          ) : (
            <ul className="space-y-2">
              {visibleEngineers.map((m) => (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between gap-4 rounded border px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{displayName(m)}</p>
                    {m.company?.trim() && (
                      <p className="text-sm text-muted-foreground">{m.company.trim()}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setRemoveTarget(m)}
                    disabled={isPending}
                    className="shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Remove ${displayName(m)}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove engineer</DialogTitle>
            <DialogDescription>
              Remove {removeTarget ? displayName(removeTarget) : 'this engineer'} from the organization? They will no longer be able to access jobs or sign in.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRemove} disabled={isPending}>
              {isPending ? 'Removing...' : 'Remove'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
