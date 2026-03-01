'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

export default function SuccessPage() {
  const params = useParams();
  const orgSlug = params.orgSlug as string;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/20">
            <CheckCircle className="h-6 w-6 text-accent" />
          </div>
          <CardTitle>Request Submitted</CardTitle>
          <CardDescription>
            Your maintenance request has been successfully submitted. Our team will review it shortly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full">
            <Link href={`/${orgSlug}/request/my-tickets`}>View My Tickets</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href={`/${orgSlug}/request`}>Submit Another Request</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
