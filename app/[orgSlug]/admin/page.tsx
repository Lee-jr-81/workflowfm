import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getConfig } from '@/server/admin/config';
import { ConfigSection } from '@/components/admin/config-section';
import { StaffPortalSection } from '@/components/admin/staff-portal-section';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default async function AdminConfigPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const config = await getConfig(orgSlug);

  if (!config) {
    redirect(`/${orgSlug}/engineer`);
  }

  return (
    <div className="container max-w-2xl mx-auto p-4 py-6">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href={`/${orgSlug}/engineer`}>
          <ArrowLeft className="h-4 w-4" />
          Back to queue
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-6">Configuration</h1>

      <div className="space-y-6">
        <ConfigSection
          title="Departments"
          section="departments"
          items={config.departments.map((d) => ({ id: d.id, name: d.name, active: d.active }))}
          orgSlug={orgSlug}
        />

        <ConfigSection
          title="Locations"
          section="locations"
          items={config.locations.map((l) => ({ id: l.id, name: l.name, active: l.active }))}
          orgSlug={orgSlug}
        />

        <ConfigSection
          title="Categories"
          section="categories"
          items={config.categories.map((c) => ({ id: c.id, name: c.name, active: c.active }))}
          orgSlug={orgSlug}
        />

        <StaffPortalSection
          orgSlug={orgSlug}
          isEnabled={config.staffAccess.is_enabled}
          rotatedAt={config.staffAccess.rotated_at}
          currentCode={config.staffAccess.current_code}
        />
      </div>
    </div>
  );
}
