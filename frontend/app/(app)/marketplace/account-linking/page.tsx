'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { marketplaceApiClient } from '@/lib/api/marketplace-client';
import { useMarketplaceAuthStore } from '@/store/marketplace-auth-store';
import { useAuthStore } from '@/store/auth-store';
import { motion } from 'framer-motion';
import { Link2, CheckCircle2, XCircle, ArrowRight, ExternalLink, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountLinkingPage() {
  const router = useRouter();
  const marketplaceUser = useMarketplaceAuthStore((state) => state.user);
  const engineUser = useAuthStore((state) => state.user);
  const engineTenantId = useAuthStore((state) => state.tenantId);
  const [linkStatus, setLinkStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadLinkStatus();
  }, []);

  const loadLinkStatus = async () => {
    try {
      const response = await marketplaceApiClient.get('/marketplace/account-linking/status');
      setLinkStatus(response.data);
    } catch (error: any) {
      if (error.response?.status !== 404) {
        console.error('Failed to load link status:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLinkAccounts = async () => {
    if (!engineUser || !engineTenantId) {
      toast.error('Please log in to Engine first to link accounts');
      router.push('/login?redirect=/marketplace/account-linking');
      return;
    }

    setLinking(true);
    try {
      await marketplaceApiClient.post('/marketplace/account-linking/link', {
        engineUserId: engineUser.id,
        engineTenantId,
        linkType: 'MANUAL',
      });
      toast.success('Accounts linked successfully!');
      await loadLinkStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to link accounts');
    } finally {
      setLinking(false);
    }
  };

  const handleUnlink = async () => {
    if (!linkStatus?.link?.id) return;

    if (!confirm('Are you sure you want to unlink your accounts? This will disable data sharing.')) {
      return;
    }

    try {
      await marketplaceApiClient.delete(`/marketplace/account-linking/unlink/${linkStatus.link.id}`);
      toast.success('Accounts unlinked successfully');
      await loadLinkStatus();
    } catch (error: any) {
      toast.error(error.message || 'Failed to unlink accounts');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isLinked = linkStatus?.linked === true;

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Account Linking</h1>
          <p className="text-muted-foreground mt-2">
            Link your marketplace account with your Engine account for seamless access and data sharing
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5" />
              Link Status
            </CardTitle>
            <CardDescription>
              Connect your marketplace and engine accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLinked ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-4 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div className="flex-1">
                    <p className="font-semibold text-success">Accounts Linked</p>
                    <p className="text-sm text-muted-foreground">
                      Your marketplace and engine accounts are connected
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Marketplace Account</p>
                    <p className="font-semibold">{marketplaceUser?.email}</p>
                    <Badge variant="secondary" className="mt-2">
                      {marketplaceUser?.userType}
                    </Badge>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm text-muted-foreground mb-1">Engine Account</p>
                    <p className="font-semibold">{linkStatus.link?.engineUser?.email || engineUser?.email}</p>
                    <Badge variant="secondary" className="mt-2">
                      {linkStatus.link?.linkType || 'MANUAL'}
                    </Badge>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => router.push('/marketplace/data-sharing')}
                  >
                    Manage Data Sharing
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleUnlink}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Unlink Accounts
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted border">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="font-semibold">Accounts Not Linked</p>
                    <p className="text-sm text-muted-foreground">
                      Link your accounts to share data between marketplace and engine
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-4 rounded-lg border">
                    <p className="text-sm font-semibold mb-2">Marketplace Account</p>
                    <p className="text-muted-foreground">{marketplaceUser?.email}</p>
                  </div>

                  {engineUser ? (
                    <div className="p-4 rounded-lg border">
                      <p className="text-sm font-semibold mb-2">Engine Account</p>
                      <p className="text-muted-foreground">{engineUser.email}</p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed">
                      <p className="text-sm text-muted-foreground mb-2">No Engine account logged in</p>
                      <Button
                        variant="outline"
                        onClick={() => router.push('/login?redirect=/marketplace/account-linking')}
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Log in to Engine
                      </Button>
                    </div>
                  )}
                </div>

                <Button
                  onClick={handleLinkAccounts}
                  disabled={!engineUser || linking}
                  className="w-full"
                >
                  {linking ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Linking...
                    </>
                  ) : (
                    <>
                      <Link2 className="mr-2 h-4 w-4" />
                      Link Accounts
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Benefits of Linking</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-semibold">Seamless Access</p>
                  <p className="text-sm text-muted-foreground">
                    Switch between marketplace and engine without re-authentication
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-semibold">Data Sharing</p>
                  <p className="text-sm text-muted-foreground">
                    Share contacts, campaigns, and other data between platforms
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-semibold">Campaign Integration</p>
                  <p className="text-sm text-muted-foreground">
                    Link engine campaigns to marketplace listings automatically
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

