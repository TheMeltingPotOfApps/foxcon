'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Save,
  Plus,
  X,
  Info,
  DollarSign,
  Settings,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useListing, useUpdateListing } from '@/lib/hooks/use-marketplace';
import { useCampaigns } from '@/lib/hooks/use-campaigns';
import { toast } from 'sonner';

export default function EditListingPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: listing, isLoading } = useListing(params.id);
  const updateListing = useUpdateListing();
  const { data: campaigns } = useCampaigns();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    industry: '',
    pricePerLead: '',
    campaignId: '',
    adsetId: '',
    adId: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (listing) {
      setFormData({
        name: listing.name || '',
        description: listing.description || '',
        industry: listing.industry || '',
        pricePerLead: listing.pricePerLead?.toString() || '',
        campaignId: listing.campaignId || '',
        adsetId: listing.adsetId || '',
        adId: listing.adId || '',
      });
    }
  }, [listing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateListing.mutateAsync({
        id: params.id,
        data: {
          name: formData.name,
          description: formData.description || undefined,
          industry: formData.industry || undefined,
          pricePerLead: parseFloat(formData.pricePerLead),
          campaignId: formData.campaignId || undefined,
          adsetId: formData.adsetId || undefined,
          adId: formData.adId || undefined,
        },
      });

      toast.success('Listing updated successfully!');
      router.push(`/marketplace/listings/${params.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-1/4"></div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4"></div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="space-y-6">
        <Link href="/marketplace/listings">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Listings
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Listing not found</h3>
            <Link href="/marketplace/listings">
              <Button>Back to Listings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href={`/marketplace/listings/${params.id}`}>
        <Button variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Listing
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Edit Listing</h1>
        <p className="text-muted-foreground mt-1">
          Update your lead offering details
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Listing Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerLead">Price per Lead (LR) *</Label>
                <Input
                  id="pricePerLead"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.pricePerLead}
                  onChange={(e) => setFormData({ ...formData, pricePerLead: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Campaign Linking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaignId">Engine Campaign</Label>
              <select
                id="campaignId"
                className="w-full px-3 py-2 border rounded-lg"
                value={formData.campaignId}
                onChange={(e) => setFormData({ ...formData, campaignId: e.target.value })}
              >
                <option value="">None</option>
                {campaigns?.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="adsetId">Ad Set ID</Label>
                <Input
                  id="adsetId"
                  value={formData.adsetId}
                  onChange={(e) => setFormData({ ...formData, adsetId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adId">Ad ID</Label>
                <Input
                  id="adId"
                  value={formData.adId}
                  onChange={(e) => setFormData({ ...formData, adId: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-4">
          <Link href={`/marketplace/listings/${params.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}

