'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';

interface BootstrapData {
  departments: Array<{ id: string; name: string; sort_order: number }>;
  locations: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
}

export default function RequestPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;

  const [step, setStep] = useState<'pin' | 'form'>('pin');
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [isLoadingBootstrap, setIsLoadingBootstrap] = useState(false);

  const [formData, setFormData] = useState({
    requestor_name: '',
    title: '',
    description: '',
    department_id: '',
    location_id: '',
    category_id: '',
    job_type: 'reactive' as 'reactive' | 'install',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const response = await fetch(`/api/${orgSlug}/staff/bootstrap`);
        if (response.ok) {
          const data = await response.json();
          setBootstrap(data);
          setStep('form');
        }
      } catch (error) {
        console.error('Session check failed:', error);
      }
    }
    checkSession();
  }, [orgSlug]);

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');
    setIsVerifying(true);

    try {
      const response = await fetch(`/api/${orgSlug}/staff/pin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: pin }),
      });

      if (!response.ok) {
        const data = await response.json();
        setPinError(data.error || 'Invalid access code');
        return;
      }

      setIsLoadingBootstrap(true);
      const bootstrapResponse = await fetch(`/api/${orgSlug}/staff/bootstrap`);
      if (!bootstrapResponse.ok) {
        const errorData = await bootstrapResponse.json();
        console.error('Bootstrap error:', errorData);
        setPinError(errorData.error || 'Failed to load form data');
        return;
      }

      const bootstrapData = await bootstrapResponse.json();
      setBootstrap(bootstrapData);
      setStep('form');
    } catch (error) {
      setPinError('An error occurred. Please try again.');
      console.error('Pin verification error:', error);
    } finally {
      setIsVerifying(false);
      setIsLoadingBootstrap(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/${orgSlug}/staff/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          location_id: formData.location_id || undefined,
          category_id: formData.category_id || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setFormError(data.error || 'Failed to create ticket');
        return;
      }

      router.push(`/${orgSlug}/request/success`);
    } catch (error) {
      setFormError('An error occurred. Please try again.');
      console.error('Form submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === 'pin') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Staff Request Portal</CardTitle>
            <CardDescription>
              Enter your organization access code to submit a maintenance request
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pin">Access Code</Label>
                <Input
                  id="pin"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  placeholder="000000"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                  required
                  className="text-center text-2xl tracking-widest"
                />
                {pinError && <p className="text-sm text-destructive">{pinError}</p>}
              </div>
              <Button type="submit" className="w-full" disabled={isVerifying || pin.length !== 6}>
                {isVerifying ? 'Verifying...' : 'Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoadingBootstrap || !bootstrap) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-muted/30">
      <div className="max-w-2xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Submit Maintenance Request</CardTitle>
            <CardDescription>
              Fill out the form below to create a new maintenance ticket
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="requestor_name">Your Name *</Label>
                <Input
                  id="requestor_name"
                  type="text"
                  placeholder="John Smith"
                  value={formData.requestor_name}
                  onChange={(e) =>
                    setFormData({ ...formData, requestor_name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="department_id">Department *</Label>
                <Select
                  id="department_id"
                  value={formData.department_id}
                  onChange={(e) =>
                    setFormData({ ...formData, department_id: e.target.value })
                  }
                  required
                >
                  <option value="">Select department</option>
                  {bootstrap.departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location_id">Location</Label>
                <Select
                  id="location_id"
                  value={formData.location_id}
                  onChange={(e) =>
                    setFormData({ ...formData, location_id: e.target.value })
                  }
                >
                  <option value="">Select location (optional)</option>
                  {bootstrap.locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category_id">Category</Label>
                <Select
                  id="category_id"
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                >
                  <option value="">Select category (optional)</option>
                  {bootstrap.categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Issue Summary *</Label>
                <Input
                  id="title"
                  type="text"
                  placeholder="Brief description of the issue"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Details</Label>
                <Textarea
                  id="description"
                  placeholder="Provide more details about the issue..."
                  rows={4}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              {formError && <p className="text-sm text-destructive">{formError}</p>}

              <div className="flex gap-3">
                <Button type="submit" className="flex-1" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/${orgSlug}/request/my-tickets`)}
                >
                  My Tickets
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
