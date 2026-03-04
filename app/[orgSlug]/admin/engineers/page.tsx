import { redirect } from 'next/navigation';
import Link from 'next/link';
import { listEngineers } from '@/server/admin/engineers';
import { EngineersSection } from '@/components/admin/engineers-section';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/server/admin/guard';

export default async function AdminEngineersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const admin = await requireAdmin(orgSlug);

  if (!admin) {
    redirect(`/${orgSlug}/engineer`);
  }

  const members = await listEngineers(orgSlug);
  const engineers = (members ?? []).filter((m) => m.role === 'engineer');

  return (
    <div className="container max-w-2xl mx-auto p-4 py-6">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href={`/${orgSlug}/admin`}>
          <ArrowLeft className="h-4 w-4" />
          Back to config
        </Link>
      </Button>

      <h1 className="text-2xl font-bold mb-6">Engineers</h1>

      <EngineersSection orgSlug={orgSlug} engineers={engineers} />
    </div>
  );
}
