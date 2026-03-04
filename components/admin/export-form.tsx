'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ExportForm({ orgSlug }: { orgSlug: string }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [status, setStatus] = useState('');

  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  if (status) params.set('status', status);
  const href = `/api/${orgSlug}/admin/reporting/export${params.toString() ? `?${params}` : ''}`;

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div>
        <Label htmlFor="from" className="text-xs">From</Label>
        <Input
          id="from"
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-36"
        />
      </div>
      <div>
        <Label htmlFor="to" className="text-xs">To</Label>
        <Input
          id="to"
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-36"
        />
      </div>
      <div>
        <Label htmlFor="status" className="text-xs">Status</Label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="flex h-9 w-36 rounded-md border border-input bg-background px-3 py-1 text-sm"
        >
          <option value="">All</option>
          <option value="new">New</option>
          <option value="taken">Taken</option>
          <option value="completed">Completed</option>
        </select>
      </div>
      <Button asChild variant="outline" size="sm">
        <a href={href} download>
          Export CSV
        </a>
      </Button>
    </div>
  );
}
