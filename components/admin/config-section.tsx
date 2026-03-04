'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  createDepartment,
  toggleDepartment,
  createLocation,
  toggleLocation,
  createCategory,
  toggleCategory,
} from '@/server/admin/config';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type ListItem = { id: string; name: string; active: boolean };
type Section = 'departments' | 'locations' | 'categories';

export function ConfigSection({
  title,
  section,
  items,
  orgSlug,
}: {
  title: string;
  section: Section;
  items: ListItem[];
  orgSlug: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newName, setNewName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const create =
    section === 'departments'
      ? createDepartment
      : section === 'locations'
        ? createLocation
        : createCategory;
  const toggle =
    section === 'departments'
      ? toggleDepartment
      : section === 'locations'
        ? toggleLocation
        : toggleCategory;

  const handleCreate = () => {
    if (!newName.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await create(orgSlug, newName.trim());
      if (result.success) {
        setNewName('');
        router.refresh();
      } else {
        setError(result.error === 'duplicate' ? 'Already exists' : 'Failed');
      }
    });
  };

  const handleToggle = (id: string, active: boolean) => {
    startTransition(async () => {
      const result = await toggle(orgSlug, id, active);
      if (result.success) router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`Add ${title.toLowerCase().replace(/s$/, '')}...`}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <Button onClick={handleCreate} disabled={!newName.trim() || isPending}>
            Add
          </Button>
        </div>
        {error && <p className="text-sm text-amber-600">{error}</p>}
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between rounded border px-3 py-2"
            >
              <span className={item.active ? '' : 'text-muted-foreground line-through'}>
                {item.name}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleToggle(item.id, !item.active)}
                disabled={isPending}
              >
                {item.active ? 'Disable' : 'Enable'}
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
