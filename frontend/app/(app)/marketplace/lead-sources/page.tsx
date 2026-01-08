'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Link as LinkIcon,
  Facebook,
  Instagram,
  Globe,
  CheckCircle2,
  ArrowRight,
  Info,
  Settings,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import {
  useMarketingIntegrations,
  useCreateIntegration,
  useListings,
} from '@/lib/hooks/use-marketplace';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function LeadSourcesPage() {
  const { data: integrations } = useMarketingIntegrations();
  const { data: listingsData } = useListings();
  const createIntegration = useCreateIntegration();

  const [activeStep, setActiveStep] = useState<number | null>(null);

  const listings = listingsData?.listings || [];

  const platforms = [
    {
      id: 'FACEBOOK',
      name: 'Facebook Ads',
      icon: Facebook,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Connect your Facebook advertising account to automatically sync leads from your ad campaigns',
      steps: [
        'Go to Facebook Business Settings',
        'Create a new app or use existing app',
        'Add Marketing API permissions',
        'Generate access token',
        'Connect to marketplace',
      ],
    },
    {
      id: 'TIKTOK',
      name: 'TikTok Ads',
      icon: Instagram,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      description: 'Sync leads from your TikTok advertising campaigns automatically',
      steps: [
        'Go to TikTok Ads Manager',
        'Navigate to Tools > API',
        'Create an API app',
        'Generate access token',
        'Connect to marketplace',
      ],
    },
    {
      id: 'GOOGLE_ADS',
      name: 'Google Ads',
      icon: Globe,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Import leads from your Google Ads campaigns',
      steps: [
        'Go to Google Ads account',
        'Navigate to Tools & Settings > API Center',
        'Create OAuth credentials',
        'Authorize marketplace access',
        'Connect to marketplace',
      ],
    },
  ];

  const handleConnect = async (platform: 'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS') => {
    // In production, this would open OAuth flow
    toast.info(`Connecting to ${platform}... OAuth flow coming soon`);
    // For now, show the walkthrough
    const platformIndex = platforms.findIndex((p) => p.id === platform);
    setActiveStep(platformIndex);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Lead Sources & Integrations</h1>
        <p className="text-muted-foreground mt-1">
          Connect your advertising platforms to automatically sync leads to your listings
        </p>
      </div>

      {/* Quick Start Guide */}
      <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Quick Start Guide
          </CardTitle>
          <CardDescription>
            Connect your advertising platforms in 3 simple steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <div className="font-medium mb-1">Choose Platform</div>
                <div className="text-sm text-muted-foreground">
                  Select Facebook, TikTok, or Google Ads
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <div className="font-medium mb-1">Authorize Access</div>
                <div className="text-sm text-muted-foreground">
                  Grant permissions via OAuth
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <div className="font-medium mb-1">Auto-Sync Leads</div>
                <div className="text-sm text-muted-foreground">
                  Leads automatically flow to your listings
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Guided Walkthrough Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {platforms.map((platform, index) => {
          const Icon = platform.icon;
          const integration = integrations?.find((i) => i.platform === platform.id);
          const isConnected = integration?.isActive;

          return (
            <motion.div
              key={platform.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className={`h-full ${isConnected ? 'border-green-500' : ''}`}>
                <CardHeader>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`p-3 rounded-lg ${platform.bgColor}`}>
                      <Icon className={`h-6 w-6 ${platform.color}`} />
                    </div>
                    {isConnected && (
                      <Badge variant="default">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>
                  <CardTitle>{platform.name}</CardTitle>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {activeStep === index ? (
                    <div className="space-y-3">
                      <div className="text-sm font-medium mb-2">Setup Steps:</div>
                      {platform.steps.map((step, stepIndex) => (
                        <div key={stepIndex} className="flex items-start gap-2">
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">
                            {stepIndex + 1}
                          </div>
                          <div className="text-sm text-muted-foreground flex-1">{step}</div>
                        </div>
                      ))}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-4"
                        onClick={() => setActiveStep(null)}
                      >
                        Hide Steps
                      </Button>
                    </div>
                  ) : (
                    <>
                      {isConnected ? (
                        <div className="space-y-2">
                          <div className="text-sm text-muted-foreground">
                            Last synced:{' '}
                            {integration?.lastSyncedAt
                              ? formatDistanceToNow(new Date(integration.lastSyncedAt), {
                                  addSuffix: true,
                                })
                              : 'Never'}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => toast.info('Sync feature coming soon')}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync Now
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setActiveStep(index)}
                            >
                              <Info className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          className="w-full"
                          onClick={() => handleConnect(platform.id as any)}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Connect {platform.name}
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Connected Integrations */}
      {integrations && integrations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Connected Integrations</h2>
          <div className="space-y-4">
            {integrations.map((integration) => {
              const platform = platforms.find((p) => p.id === integration.platform);
              const Icon = platform?.icon || LinkIcon;

              return (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5" />
                        <div>
                          <CardTitle>{integration.platform}</CardTitle>
                          {integration.platformAccountId && (
                            <CardDescription>
                              Account: {integration.platformAccountId}
                            </CardDescription>
                          )}
                        </div>
                      </div>
                      <Badge variant={integration.isActive ? 'default' : 'secondary'}>
                        {integration.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Last synced:{' '}
                        {integration.lastSyncedAt
                          ? formatDistanceToNow(new Date(integration.lastSyncedAt), {
                              addSuffix: true,
                            })
                          : 'Never'}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                        </Button>
                        <Button variant="outline" size="sm">
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Link to Listings */}
      <Card>
        <CardHeader>
          <CardTitle>Link Campaigns to Listings</CardTitle>
          <CardDescription>
            Connect your advertising campaigns to specific listings for automatic lead distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          {listings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">
                Create a listing first to link campaigns
              </p>
              <Link href="/marketplace/listings/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Listing
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {listings.slice(0, 5).map((listing) => (
                <div
                  key={listing.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{listing.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {listing.industry || 'No industry'}
                    </div>
                  </div>
                  <Link href={`/marketplace/listings/${listing.id}`}>
                    <Button variant="outline" size="sm">
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Link Campaigns
                    </Button>
                  </Link>
                </div>
              ))}
              {listings.length > 5 && (
                <Link href="/marketplace/listings">
                  <Button variant="ghost" className="w-full">
                    View All Listings
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

