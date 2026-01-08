'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Link as LinkIcon,
  Code,
  Key,
  Globe,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import Link from 'next/link';
import {
  useCustomEndpoints,
  useCreateCustomEndpoint,
  useRegenerateEndpointKey,
  useListings,
} from '@/lib/hooks/use-marketplace';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function IngestionPage() {
  const { data: endpoints, isLoading } = useCustomEndpoints();
  const { data: listingsData } = useListings();
  const createEndpoint = useCreateCustomEndpoint();
  const regenerateKey = useRegenerateEndpointKey();

  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [copiedEndpoint, setCopiedEndpoint] = useState<string | null>(null);

  const listings = listingsData?.listings || [];

  const handleCopyEndpoint = (endpointKey: string, apiKey: string) => {
    const url = `${window.location.origin}/api/ingest/marketplace/${endpointKey}`;
    navigator.clipboard.writeText(url);
    setCopiedEndpoint(endpointKey);
    setTimeout(() => setCopiedEndpoint(null), 2000);
    toast.success('Endpoint URL copied to clipboard');
  };

  const handleCopyApiKey = (apiKey: string) => {
    navigator.clipboard.writeText(apiKey);
    toast.success('API key copied to clipboard');
  };

  const handleRegenerateKey = async (id: string) => {
    if (confirm('Are you sure you want to regenerate the API key? The old key will stop working.')) {
      try {
        const result = await regenerateKey.mutateAsync(id);
        toast.success('API key regenerated successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to regenerate API key');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Lead Ingestion</h1>
          <p className="text-muted-foreground mt-1">
            Create custom endpoints to ingest leads into your listings
          </p>
        </div>
        <Link href="/marketplace/ingestion/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Endpoint
          </Button>
        </Link>
      </div>

      {/* Quick Start Guide */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-600" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                1
              </div>
              <div>
                <div className="font-medium">Create a Custom Endpoint</div>
                <div className="text-sm text-muted-foreground">
                  Define parameter mappings for your lead data
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                2
              </div>
              <div>
                <div className="font-medium">Get Your Endpoint URL & API Key</div>
                <div className="text-sm text-muted-foreground">
                  Use these credentials to send leads via POST or GET requests
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold">
                3
              </div>
              <div>
                <div className="font-medium">Leads Are Automatically Distributed</div>
                <div className="text-sm text-muted-foreground">
                  Leads are queued and distributed to subscribed buyers in real-time
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : !endpoints || endpoints.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <LinkIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No ingestion endpoints yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first custom endpoint to start ingesting leads
            </p>
            <Link href="/marketplace/ingestion/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Endpoint
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {endpoints.map((endpoint) => {
            const endpointUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/ingest/marketplace/${endpoint.endpointKey}`;
            const isApiKeyVisible = showApiKey[endpoint.id];

            return (
              <Card key={endpoint.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <CardTitle>{endpoint.listing?.name || 'Unknown Listing'}</CardTitle>
                        <Badge variant={endpoint.isActive ? 'default' : 'secondary'}>
                          {endpoint.isActive ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </div>
                      <CardDescription>
                        Endpoint Key: <code className="text-xs">{endpoint.endpointKey}</code>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Endpoint URL */}
                  <div className="space-y-2">
                    <Label>Endpoint URL</Label>
                    <div className="flex gap-2">
                      <Input value={endpointUrl} readOnly className="font-mono text-sm" />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyEndpoint(endpoint.endpointKey, endpoint.apiKey)}
                      >
                        {copiedEndpoint === endpoint.endpointKey ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        type={isApiKeyVisible ? 'text' : 'password'}
                        value={endpoint.apiKey}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setShowApiKey({
                            ...showApiKey,
                            [endpoint.id]: !isApiKeyVisible,
                          })
                        }
                      >
                        {isApiKeyVisible ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyApiKey(endpoint.apiKey)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRegenerateKey(endpoint.id)}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Parameter Mappings */}
                  {endpoint.parameterMappings && endpoint.parameterMappings.length > 0 && (
                    <div className="space-y-2">
                      <Label>Parameter Mappings</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {endpoint.parameterMappings.map((mapping: any, index: number) => (
                          <div
                            key={index}
                            className="p-2 border rounded text-sm bg-muted/50"
                          >
                            <code className="font-semibold">{mapping.paramName}</code>
                            <span className="mx-2">→</span>
                            <code>{mapping.contactField}</code>
                            {mapping.required && (
                              <Badge variant="outline" className="ml-2 text-xs">
                                Required
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Usage Example */}
                  <div className="space-y-2">
                    <Label>Usage Example</Label>
                    <div className="p-3 bg-muted rounded-lg font-mono text-xs overflow-x-auto">
                      <div className="text-muted-foreground mb-1">POST {endpointUrl}</div>
                      <div className="text-muted-foreground mb-1">Headers:</div>
                      <div className="ml-2">
                        X-API-Key: {endpoint.apiKey.substring(0, 20)}...
                      </div>
                      <div className="text-muted-foreground mt-2 mb-1">Body:</div>
                      <div className="ml-2">
                        {JSON.stringify(
                          endpoint.parameterMappings?.reduce((acc: any, m: any) => {
                            acc[m.paramName] = m.defaultValue || 'value';
                            return acc;
                          }, {}),
                          null,
                          2,
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <Link href={`/marketplace/listings/${endpoint.listingId}`}>
                      <Button variant="outline" size="sm">
                        <LinkIcon className="h-4 w-4 mr-2" />
                        View Listing
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm">
                      <Code className="h-4 w-4 mr-2" />
                      Documentation
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

