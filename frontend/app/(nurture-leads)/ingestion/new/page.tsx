'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Plus,
  X,
  Save,
  Info,
  Code,
} from 'lucide-react';
import Link from 'next/link';
import { useCreateCustomEndpoint, useListings } from '@/lib/hooks/use-marketplace';
import { toast } from 'sonner';

interface ParameterMapping {
  paramName: string;
  contactField: string;
  required: boolean;
  defaultValue?: string;
}

export default function CreateIngestionEndpointPage() {
  const router = useRouter();
  const { data: listingsData } = useListings();
  const createEndpoint = useCreateCustomEndpoint();

  const [selectedListingId, setSelectedListingId] = useState('');
  const [parameterMappings, setParameterMappings] = useState<ParameterMapping[]>([]);
  const [newMapping, setNewMapping] = useState<ParameterMapping>({
    paramName: '',
    contactField: 'phoneNumber',
    required: false,
    defaultValue: '',
  });

  const listings = listingsData?.listings || [];

  const contactFields = [
    { value: 'phoneNumber', label: 'Phone Number' },
    { value: 'email', label: 'Email' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'metadata.city', label: 'City (Metadata)' },
    { value: 'metadata.state', label: 'State (Metadata)' },
    { value: 'metadata.zipCode', label: 'Zip Code (Metadata)' },
    { value: 'metadata.source', label: 'Source (Metadata)' },
  ];

  const handleAddMapping = () => {
    if (!newMapping.paramName.trim()) {
      toast.error('Parameter name is required');
      return;
    }

    if (parameterMappings.some((m) => m.paramName === newMapping.paramName)) {
      toast.error('Parameter name must be unique');
      return;
    }

    setParameterMappings([...parameterMappings, { ...newMapping }]);
    setNewMapping({
      paramName: '',
      contactField: 'phoneNumber',
      required: false,
      defaultValue: '',
    });
  };

  const handleRemoveMapping = (index: number) => {
    setParameterMappings(parameterMappings.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!selectedListingId) {
      toast.error('Please select a listing');
      return;
    }

    if (parameterMappings.length === 0) {
      toast.error('Please add at least one parameter mapping');
      return;
    }

    try {
      await createEndpoint.mutateAsync({
        listingId: selectedListingId,
        parameterMappings: parameterMappings,
      });
      toast.success('Ingestion endpoint created successfully!');
      router.push('/nurture-leads/ingestion');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create endpoint');
    }
  };

  return (
    <div className="space-y-6">
      <Link href="/nurture-leads/ingestion">
        <Button variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Ingestion
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Ingestion Endpoint</h1>
        <p className="text-muted-foreground mt-1">
          Set up a custom endpoint to ingest leads into your listing
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Listing Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Listing</CardTitle>
              <CardDescription>
                Choose which listing this endpoint will feed leads into
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Listing</Label>
                <select
                  className="w-full px-3 py-2 border rounded-lg"
                  value={selectedListingId}
                  onChange={(e) => setSelectedListingId(e.target.value)}
                >
                  <option value="">Choose a listing...</option>
                  {listings.map((listing) => (
                    <option key={listing.id} value={listing.id}>
                      {listing.name} - {listing.pricePerLead} LR per lead
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Parameter Mappings */}
          <Card>
            <CardHeader>
              <CardTitle>Parameter Mappings</CardTitle>
              <CardDescription>
                Map incoming parameters to contact fields
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {parameterMappings.length > 0 && (
                <div className="space-y-2">
                  {parameterMappings.map((mapping, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 border rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-semibold">{mapping.paramName}</code>
                          <span>→</span>
                          <code className="text-sm">{mapping.contactField}</code>
                          {mapping.required && (
                            <Badge variant="default" className="text-xs">
                              Required
                            </Badge>
                          )}
                          {mapping.defaultValue && (
                            <Badge variant="outline" className="text-xs">
                              Default: {mapping.defaultValue}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMapping(index)}
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
                      placeholder="e.g., phone"
                      value={newMapping.paramName}
                      onChange={(e) =>
                        setNewMapping({ ...newMapping, paramName: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Contact Field</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg"
                      value={newMapping.contactField}
                      onChange={(e) =>
                        setNewMapping({ ...newMapping, contactField: e.target.value })
                      }
                    >
                      {contactFields.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Required</Label>
                    <div className="flex items-center gap-2 h-10">
                      <input
                        type="checkbox"
                        checked={newMapping.required}
                        onChange={(e) =>
                          setNewMapping({ ...newMapping, required: e.target.checked })
                        }
                        className="h-4 w-4"
                      />
                      <span className="text-sm text-muted-foreground">Required</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Default Value (Optional)</Label>
                  <Input
                    placeholder="Default value if parameter is missing"
                    value={newMapping.defaultValue}
                    onChange={(e) =>
                      setNewMapping({ ...newMapping, defaultValue: e.target.value })
                    }
                  />
                </div>

                <Button variant="outline" onClick={handleAddMapping} className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Parameter Mapping
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Link href="/nurture-leads/ingestion">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSubmit} disabled={createEndpoint.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createEndpoint.isPending ? 'Creating...' : 'Create Endpoint'}
            </Button>
          </div>
        </div>

        {/* Help Sidebar */}
        <div className="space-y-4">
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Info className="h-4 w-4 text-blue-600" />
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <div className="font-medium mb-1">1. Create Endpoint</div>
                <div className="text-muted-foreground">
                  Define parameter mappings for your lead data structure
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">2. Get URL & API Key</div>
                <div className="text-muted-foreground">
                  Use the generated endpoint URL and API key to send leads
                </div>
              </div>
              <div>
                <div className="font-medium mb-1">3. Send Leads</div>
                <div className="text-muted-foreground">
                  POST or GET requests to your endpoint will automatically distribute leads
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Example Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs font-mono bg-muted p-3 rounded space-y-1">
                <div className="text-muted-foreground">POST /api/ingest/nurture-leads/endpoint-key</div>
                <div className="text-muted-foreground">Headers:</div>
                <div>X-API-Key: your-api-key</div>
                <div className="text-muted-foreground mt-2">Body:</div>
                <div>{'{'}</div>
                <div className="ml-2">&quot;phone&quot;: &quot;+1234567890&quot;,</div>
                <div className="ml-2">&quot;firstName&quot;: &quot;John&quot;</div>
                <div>{'}'}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

