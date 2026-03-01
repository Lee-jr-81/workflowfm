'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Ticket {
  id: string;
  title: string;
  description: string | null;
  status: 'new' | 'taken' | 'completed';
  job_type: 'reactive' | 'install';
  created_at: string;
  department: { name: string } | null;
  location: { name: string } | null;
  category: { name: string } | null;
}

const statusLabels = {
  new: 'New',
  taken: 'In Progress',
  completed: 'Completed',
};

const statusColors = {
  new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  taken: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

export default function MyTicketsPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchTickets() {
      try {
        const response = await fetch(`/api/${orgSlug}/staff/my-tickets`);

        if (response.status === 401) {
          router.push(`/${orgSlug}/request`);
          return;
        }

        if (!response.ok) {
          setError('Failed to load tickets');
          return;
        }

        const data = await response.json();
        setTickets(data.tickets);
      } catch (err) {
        setError('An error occurred while loading tickets');
        console.error('Fetch tickets error:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTickets();
  }, [orgSlug, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading tickets...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Tickets</h1>
            <p className="text-muted-foreground mt-1">
              View all your submitted maintenance requests
            </p>
          </div>
          <Button asChild>
            <Link href={`/${orgSlug}/request`}>New Request</Link>
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {tickets.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">
                You haven&apos;t submitted any tickets yet
              </p>
              <Button asChild>
                <Link href={`/${orgSlug}/request`}>Submit Your First Request</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">{ticket.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {ticket.department?.name}
                        {ticket.location && ` • ${ticket.location.name}`}
                        {ticket.category && ` • ${ticket.category.name}`}
                      </CardDescription>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        statusColors[ticket.status]
                      }`}
                    >
                      {statusLabels[ticket.status]}
                    </span>
                  </div>
                </CardHeader>
                {ticket.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Submitted {new Date(ticket.created_at).toLocaleDateString()} at{' '}
                      {new Date(ticket.created_at).toLocaleTimeString()}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
