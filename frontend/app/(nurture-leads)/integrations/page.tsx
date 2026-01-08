'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  CheckCircle2,
  XCircle,
  Settings,
  Link as LinkIcon,
  Facebook,
  Instagram,
  Globe,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import {
  useMarketingIntegrations,
  useCreateIntegration,
  useDisconnectIntegration,
} from '@/lib/hooks/use-marketplace';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export default function IntegrationsPage() {
  const { data: integrations, isLoading } = useMarketingIntegrations();
  const createIntegration = useCreateIntegration();
  const disconnectIntegration = useDisconnectIntegration();

  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<
    'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS' | null
  >(null);

  const handleConnect = async (platform: 'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS') => {
    setSelectedPlatform(platform);
    setShowConnectDialog(true);
    // In a real implementation, this would open OAuth flow
    toast.info(`${platform} OAuth integration coming soon`);
  };

  const handleDisconnect = async (id: string) => {
    if (confirm('Are you sure you want to disconnect this integration?')) {
      try {
        await disconnectIntegration.mutateAsync(id);
        toast.success('Integration disconnected successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to disconnect integration');
      }
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'FACEBOOK':
        return <Facebook className="h-5 w-5" />;
      case 'TIKTOK':
        return <Instagram className="h-5 w-5" />;
      case 'GOOGLE_ADS':
        return <Globe className="h-5 w-5" />;
      default:
        return <LinkIcon className="h-5 w-5" />;
    }
  };

  const platforms = [
    { id: 'FACEBOOK', name: 'Facebook Ads', description: 'Connect your Facebook ad campaigns' },
    { id: 'TIKTOK', name: 'TikTok Ads', description: 'Connect your TikTok advertising account' },
    { id: 'GOOGLE_ADS', name: 'Google Ads', description: 'Connect your Google Ads campaigns' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Marketing Integrations</h1>
          <p className="text-muted-foreground mt-1">
            Connect your advertising platforms to automatically sync leads
          </p>
        </div>
      </div>

      {/* Available Platforms */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Available Platforms</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {platforms.map((platform) => {
            const integration = integrations?.find((i) => i.platform === platform.id);
            const isConnected = integration?.isActive;

            return (
              <Card key={platform.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getPlatformIcon(platform.id)}
                      <CardTitle>{platform.name}</CardTitle>
                    </div>
                    {isConnected && (
                      <Badge variant="default">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{platform.description}</CardDescription>
                </CardHeader>
                <CardContent>
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
                          onClick={() => toast.info('Sync feature coming soon')}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Sync Now
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDisconnect(integration!.id)}
                        >
                          Disconnect
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => handleConnect(platform.id as any)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Connect
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Connected Integrations */}
      {integrations && integrations.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Connected Integrations</h2>
          <div className="space-y-4">
            {integrations.map((integration) => (
              <Card key={integration.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getPlatformIcon(integration.platform)}
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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toast.info('Settings coming soon')}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDisconnect(integration.id)}
                      >
                        Disconnect
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

