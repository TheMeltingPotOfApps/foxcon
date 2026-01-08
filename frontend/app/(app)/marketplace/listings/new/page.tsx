'use client';

import { useState } from 'react';
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
  Tag,
  Settings,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useCreateListing } from '@/lib/hooks/use-marketplace';
import { useCampaigns } from '@/lib/hooks/use-campaigns';
import { toast } from 'sonner';

interface LeadParameter {
  name: string;
  type: 'string' | 'number' | 'email' | 'phone' | 'date' | 'boolean';
  required: boolean;
  description?: string;
}

export default function CreateListingPage() {
  const router = useRouter();
  const createListing = useCreateListing();
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

  const [leadParameters, setLeadParameters] = useState<LeadParameter[]>([]);
  const [newParameter, setNewParameter] = useState<LeadParameter>({
    name: '',
    type: 'string',
    required: false,
    description: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddParameter = () => {
    if (!newParameter.name.trim()) {
      toast.error('Parameter name is required');
      return;
    }

    if (leadParameters.some((p) => p.name === newParameter.name)) {
      toast.error('Parameter name must be unique');
      return;
    }

    setLeadParameters([...leadParameters, { ...newParameter }]);
    setNewParameter({ name: '', type: 'string', required: false, description: '' });
  };

  const handleRemoveParameter = (index: number) => {
    setLeadParameters(leadParameters.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!formData.name.trim()) {
      toast.error('Listing name is required');
      setIsSubmitting(false);
      return;
    }

    if (!formData.pricePerLead || parseFloat(formData.pricePerLead) <= 0) {
      toast.error('Price per lead must be greater than 0');
      setIsSubmitting(false);
      return;
    }

    try {
      const leadParamsObj: Record<string, any> = {};
      leadParameters.forEach((param) => {
        leadParamsObj[param.name] = {
          type: param.type,
          required: param.required,
          description: param.description,
        };
      });

      const listing = await createListing.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        industry: formData.industry || undefined,
        pricePerLead: parseFloat(formData.pricePerLead),
        campaignId: formData.campaignId || undefined,
        adsetId: formData.adsetId || undefined,
        adId: formData.adId || undefined,
        leadParameters: leadParamsObj,
        status: 'DRAFT',
      });

      toast.success('Listing created successfully!');
      router.push(`/marketplace/listings/${listing.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/marketplace/listings">
        <Button variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Listings
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Listing</h1>
        <p className="text-muted-foreground mt-1">
          Set up your lead offering to start selling on the marketplace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              Basic Information
            </CardTitle>
            <CardDescription>
              Provide details about your lead offering
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Listing Name *</Label>
              <Input
                id="name"
                placeholder="e.g., High-Quality Home Improvement Leads"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your leads, their quality, source, and what makes them valuable..."
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
                  placeholder="e.g., Home Improvement, Insurance, Real Estate"
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
                  placeholder="10.00"
                  value={formData.pricePerLead}
                  onChange={(e) => setFormData({ ...formData, pricePerLead: e.target.value })}
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Linking */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              Campaign Linking (Optional)
            </CardTitle>
            <CardDescription>
              Link this listing to an Engine campaign or external platform
            </CardDescription>
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
                <Label htmlFor="adsetId">Ad Set ID (External)</Label>
                <Input
                  id="adsetId"
                  placeholder="Facebook/TikTok Ad Set ID"
                  value={formData.adsetId}
                  onChange={(e) => setFormData({ ...formData, adsetId: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="adId">Ad ID (External)</Label>
                <Input
                  id="adId"
                  placeholder="Facebook/TikTok Ad ID"
                  value={formData.adId}
                  onChange={(e) => setFormData({ ...formData, adId: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Lead Parameters
            </CardTitle>
            <CardDescription>
              Define what fields each lead will include
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {leadParameters.length > 0 && (
              <div className="space-y-2">
                {leadParameters.map((param, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50"
                  >
                    <Badge variant="outline">{param.name}</Badge>
                    <Badge variant="secondary">{param.type}</Badge>
                    {param.required && <Badge variant="default">Required</Badge>}
                    {param.description && (
                      <span className="text-sm text-muted-foreground flex-1">
                        {param.description}
                      </span>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveParameter(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Parameter Name</Label>
                  <Input
                    placeholder="e.g., firstName"
                    value={newParameter.name}
                    onChange={(e) =>
                      setNewParameter({ ...newParameter, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>Type</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg"
                    value={newParameter.type}
                    onChange={(e) =>
                      setNewParameter({
                        ...newParameter,
                        type: e.target.value as LeadParameter['type'],
                      })
                    }
                  >
                    <option value="string">String</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="date">Date</option>
                    <option value="boolean">Boolean</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Required</Label>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newParameter.required}
                      onChange={(e) =>
                        setNewParameter({ ...newParameter, required: e.target.checked })
                      }
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-muted-foreground">Required field</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description (Optional)</Label>
                <Input
                  placeholder="Brief description of this parameter"
                  value={newParameter.description}
                  onChange={(e) =>
                    setNewParameter({ ...newParameter, description: e.target.value })
                  }
                />
              </div>

              <Button type="button" variant="outline" onClick={handleAddParameter}>
                <Plus className="h-4 w-4 mr-2" />
                Add Parameter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/marketplace/listings">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Creating...' : 'Create Listing'}
          </Button>
        </div>
      </form>
    </div>
  );
}

