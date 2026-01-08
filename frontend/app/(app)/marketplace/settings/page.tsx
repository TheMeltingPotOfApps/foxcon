'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Save,
  User,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Mail,
  Phone,
  Key,
  Link as LinkIcon,
  Link2,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Loader2,
  Edit2,
  Trash2,
  ChevronRight,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useMarketplaceCrmIntegrations,
  useCreateMarketplaceCrmIntegration,
  useUpdateMarketplaceCrmIntegration,
  useDeleteMarketplaceCrmIntegration,
  useTestMarketplaceCrmConnection,
  CrmProvider,
  SyncDirection,
  type CreateCrmIntegrationDto,
  type UpdateCrmIntegrationDto,
} from '@/lib/hooks/use-crm-integrations';
import { useQuery } from '@tanstack/react-query';
import { marketplaceApiClient } from '@/lib/api/marketplace-client';

export default function MarketplaceSettingsPage() {
  const [profileData, setProfileData] = useState({
    companyName: '',
    bio: '',
    website: '',
    email: '',
    phone: '',
  });

  const [notificationSettings, setNotificationSettings] = useState({
    emailOnSale: true,
    emailOnSubscription: true,
    emailOnReview: true,
    pushNotifications: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      toast.success('Profile updated successfully');
      setIsSaving(false);
    }, 1000);
  };

  const handleSaveNotifications = async () => {
    setIsSaving(true);
    setTimeout(() => {
      toast.success('Notification settings saved');
      setIsSaving(false);
    }, 1000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your marketplace profile and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="crm-integrations">CRM Integrations</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="billing">Billing</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="privacy">Privacy</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Public Profile
              </CardTitle>
              <CardDescription>
                This information will be visible to buyers on your listings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="Your company name"
                  value={profileData.companyName}
                  onChange={(e) =>
                    setProfileData({ ...profileData, companyName: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell buyers about your business and lead quality..."
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://example.com"
                    value={profileData.website}
                    onChange={(e) =>
                      setProfileData({ ...profileData, website: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Contact Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@example.com"
                    value={profileData.email}
                    onChange={(e) =>
                      setProfileData({ ...profileData, email: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                />
              </div>

              <Button onClick={handleSaveProfile} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Profile'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email on Sale</div>
                    <div className="text-sm text-muted-foreground">
                      Get notified when someone purchases leads from your listings
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailOnSale}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        emailOnSale: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email on New Subscription</div>
                    <div className="text-sm text-muted-foreground">
                      Get notified when someone subscribes to your listings
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailOnSubscription}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        emailOnSubscription: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Email on Review</div>
                    <div className="text-sm text-muted-foreground">
                      Get notified when someone leaves a review
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.emailOnReview}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        emailOnReview: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Push Notifications</div>
                    <div className="text-sm text-muted-foreground">
                      Receive browser push notifications
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationSettings.pushNotifications}
                    onChange={(e) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        pushNotifications: e.target.checked,
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>
              </div>

              <Button onClick={handleSaveNotifications} disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="crm-integrations" className="space-y-4">
          <MarketplaceCrmIntegrationsSettings />
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Manage your account security and authentication
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Two-Factor Authentication</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">2FA Status</div>
                    <div className="text-sm text-muted-foreground">
                      Add an extra layer of security to your account
                    </div>
                  </div>
                  <Badge variant="secondary">Not Enabled</Badge>
                </div>
                <Button variant="outline" className="w-full">
                  Enable Two-Factor Authentication
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Password</Label>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Last Changed</div>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), {
                        addSuffix: true,
                      })}
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Change Password
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Active Sessions</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Current Session</div>
                      <div className="text-sm text-muted-foreground">
                        Chrome on Windows • {new Date().toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  View All Sessions
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Billing & Payments
              </CardTitle>
              <CardDescription>
                Manage your payment methods and billing information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <Label>Payment Methods</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5" />
                        <div>
                          <div className="font-medium">•••• •••• •••• 4242</div>
                          <div className="text-sm text-muted-foreground">Expires 12/25</div>
                        </div>
                      </div>
                      <Badge variant="default">Default</Badge>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full mt-2">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Payment Method
                  </Button>
                </div>

                <div>
                  <Label>Billing Address</Label>
                  <div className="mt-2 p-4 border rounded-lg">
                    <div className="text-sm">
                      <div className="font-medium">John Doe</div>
                      <div className="text-muted-foreground">123 Main St</div>
                      <div className="text-muted-foreground">New York, NY 10001</div>
                    </div>
                    <Button variant="outline" size="sm" className="mt-2">
                      Edit Address
                    </Button>
                  </div>
                </div>

                <div>
                  <Label>Billing History</Label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">Invoice #INV-001</div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(), 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">$100.00</div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <Link href="/marketplace/purchases">
                    <Button variant="outline" className="w-full mt-2">
                      View All Invoices
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys & Webhooks
              </CardTitle>
              <CardDescription>
                Manage your API keys and webhook endpoints
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Keys</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Marketplace API Key</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        mkp_••••••••••••••••••••
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Generate New API Key
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Webhook Endpoints</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="font-medium">Lead Delivery Webhook</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        https://example.com/webhooks/leads
                      </div>
                    </div>
                    <Badge variant="default">Active</Badge>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Webhook Endpoint
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Privacy & Data
              </CardTitle>
              <CardDescription>
                Control your privacy and data sharing settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Data Sharing</div>
                    <div className="text-sm text-muted-foreground">
                      Allow marketplace to use your data for analytics
                    </div>
                  </div>
                  <input type="checkbox" className="h-4 w-4" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Public Profile</div>
                    <div className="text-sm text-muted-foreground">
                      Show your profile information to other users
                    </div>
                  </div>
                  <input type="checkbox" className="h-4 w-4" defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Marketing Emails</div>
                    <div className="text-sm text-muted-foreground">
                      Receive marketing and promotional emails
                    </div>
                  </div>
                  <input type="checkbox" className="h-4 w-4" />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="destructive" size="sm">
                  Request Data Deletion
                </Button>
                <div className="text-xs text-muted-foreground mt-2">
                  This will permanently delete all your marketplace data
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Display Preferences</CardTitle>
              <CardDescription>
                Customize how the marketplace appears to you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Currency Display</Label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>Lead Reservations (LR)</option>
                  <option>USD ($)</option>
                  <option>EUR (€)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Time Zone</Label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>UTC</option>
                  <option>America/New_York</option>
                  <option>America/Los_Angeles</option>
                  <option>Europe/London</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Date Format</Label>
                <select className="w-full px-3 py-2 border rounded-lg">
                  <option>MM/DD/YYYY</option>
                  <option>DD/MM/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Compact View</div>
                  <div className="text-sm text-muted-foreground">
                    Show more items per page
                  </div>
                </div>
                <input type="checkbox" className="h-4 w-4" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MarketplaceCrmIntegrationsSettings() {
  const { data: integrations, isLoading } = useMarketplaceCrmIntegrations();
  const createIntegration = useCreateMarketplaceCrmIntegration();
  const updateIntegration = useUpdateMarketplaceCrmIntegration();
  const deleteIntegration = useDeleteMarketplaceCrmIntegration();
  const testConnection = useTestMarketplaceCrmConnection();
  const { data: linkStatus } = useQuery({
    queryKey: ['marketplace-account-link-status'],
    queryFn: async () => {
      try {
        const response = await marketplaceApiClient.get('/marketplace/account-linking/status');
        return response.data;
      } catch {
        return { linked: false };
      }
    },
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [integrationType, setIntegrationType] = useState<'webhook' | 'https'>('https');
  const [authType, setAuthType] = useState<'none' | 'basic' | 'bearer' | 'apikey' | 'custom'>('none');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customHeaders, setCustomHeaders] = useState<Array<{ key: string; value: string }>>([]);
  
  const [formData, setFormData] = useState<CreateCrmIntegrationDto>({
    provider: CrmProvider.CUSTOM,
    name: '',
    apiKey: '',
    accessToken: '',
    apiUrl: '',
    syncDirection: SyncDirection.BIDIRECTIONAL,
    syncToLinkedAccount: false,
    syncSettings: {
      syncContacts: true,
      syncLeads: false,
      syncDeals: false,
      autoSync: false,
    },
    metadata: {
      integrationType: 'https',
      requestMethod: 'POST',
      contentType: 'application/json',
      authType: 'none',
      timeout: 10000,
      headers: {},
    },
  });

  const resetForm = () => {
    setFormData({
      provider: CrmProvider.CUSTOM,
      name: '',
      apiKey: '',
      accessToken: '',
      apiUrl: '',
      syncDirection: SyncDirection.BIDIRECTIONAL,
      syncToLinkedAccount: false,
      syncSettings: {
        syncContacts: true,
        syncLeads: false,
        syncDeals: false,
        autoSync: false,
      },
      metadata: {
        integrationType: 'https',
        requestMethod: 'POST',
        contentType: 'application/json',
        authType: 'none',
        timeout: 10000,
        headers: {},
      },
    });
    setIntegrationType('https');
    setAuthType('none');
    setShowAdvanced(false);
    setCustomHeaders([]);
  };

  const buildMetadata = () => {
    const headers: Record<string, string> = {};
    customHeaders.forEach((h) => {
      if (h.key && h.value) {
        headers[h.key] = h.value;
      }
    });

    const metadata: any = {
      integrationType,
      headers,
      timeout: formData.metadata?.timeout || 10000,
    };

    if (integrationType === 'webhook') {
      metadata.webhookUrl = formData.apiUrl || formData.metadata?.webhookUrl;
      if (formData.metadata?.webhookSecret) {
        metadata.webhookSecret = formData.metadata.webhookSecret;
      }
    } else {
      metadata.requestUrl = formData.apiUrl || formData.metadata?.requestUrl;
      metadata.requestMethod = formData.metadata?.requestMethod || 'POST';
      metadata.contentType = formData.metadata?.contentType || 'application/json';
      metadata.authType = authType;
      
      if (authType === 'basic') {
        metadata.basicAuthUsername = formData.metadata?.basicAuthUsername || '';
        metadata.basicAuthPassword = formData.metadata?.basicAuthPassword || '';
      } else if (authType === 'bearer') {
        metadata.bearerToken = formData.accessToken || formData.metadata?.bearerToken || '';
      } else if (authType === 'apikey') {
        metadata.apiKey = formData.apiKey || formData.metadata?.apiKey || '';
        metadata.apiKeyHeader = formData.metadata?.apiKeyHeader || 'X-API-Key';
      }
    }

    return metadata;
  };

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Integration name is required');
      return;
    }
    if (integrationType === 'webhook' && !formData.apiUrl && !formData.metadata?.webhookUrl) {
      toast.error('Webhook URL is required');
      return;
    }
    if (integrationType === 'https' && !formData.apiUrl && !formData.metadata?.requestUrl) {
      toast.error('Request URL is required');
      return;
    }

    try {
      const metadata = buildMetadata();
      await createIntegration.mutateAsync({
        ...formData,
        provider: CrmProvider.CUSTOM,
        metadata,
      });
      toast.success('CRM integration created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to create CRM integration');
    }
  };

  const handleUpdate = async (id: string, dto: UpdateCrmIntegrationDto) => {
    try {
      const metadata = buildMetadata();
      await updateIntegration.mutateAsync({ id, dto: { ...dto, metadata } });
      toast.success('CRM integration updated successfully');
      setEditingId(null);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update CRM integration');
    }
  };

  const loadIntegrationForEdit = (integration: any) => {
    setFormData({
      provider: CrmProvider.CUSTOM,
      name: integration.name || '',
      apiKey: '',
      accessToken: '',
      apiUrl: integration.apiUrl || '',
      syncDirection: integration.syncDirection || SyncDirection.BIDIRECTIONAL,
      syncToLinkedAccount: integration.syncToLinkedAccount || false,
      syncSettings: integration.syncSettings || {
        syncContacts: true,
        syncLeads: false,
        syncDeals: false,
        autoSync: false,
      },
      metadata: integration.metadata || {},
    });
    
    const meta = integration.metadata || {};
    setIntegrationType(meta.integrationType || 'https');
    setAuthType(meta.authType || 'none');
    
    if (meta.headers) {
      setCustomHeaders(Object.entries(meta.headers).map(([key, value]) => ({ key, value: String(value) })));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this CRM integration?')) return;
    try {
      await deleteIntegration.mutateAsync(id);
      toast.success('CRM integration deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete CRM integration');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testConnection.mutateAsync(id);
      if (result.success) {
        toast.success('Connection test successful');
      } else {
        toast.error(result.message || 'Connection test failed');
      }
    } catch (error: any) {
      toast.error(error.message || 'Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>CRM Integrations</CardTitle>
              <CardDescription>
                Connect your CRM to sync contacts, leads, and deals between platforms
              </CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {linkStatus?.linked && (
            <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="font-medium">Accounts Linked</span>
                <span className="text-muted-foreground">
                  CRM integrations will sync to your Engine account when enabled
                </span>
              </div>
            </div>
          )}

          {integrations && integrations.length === 0 ? (
            <div className="text-center py-12">
              <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No CRM integrations</h3>
              <p className="text-muted-foreground mb-4">
                Connect your CRM to start syncing data
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Integration
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {integrations?.map((integration) => (
                <Card key={integration.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{integration.name}</h3>
                          <Badge variant={integration.isActive ? 'default' : 'secondary'}>
                            {integration.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          {integration.syncToLinkedAccount && (
                            <Badge variant="outline" className="text-xs">
                              Synced to Engine
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div>Type: {integration.metadata?.integrationType === 'webhook' ? 'Webhook' : 'HTTPS Request'}</div>
                          {integration.metadata?.integrationType === 'webhook' ? (
                            <div>URL: {integration.metadata?.webhookUrl || integration.apiUrl || 'N/A'}</div>
                          ) : (
                            <div>
                              {integration.metadata?.requestMethod || 'POST'} {integration.metadata?.requestUrl || integration.apiUrl || 'N/A'}
                            </div>
                          )}
                          {integration.metadata?.authType && integration.metadata.authType !== 'none' && (
                            <div>Auth: {integration.metadata.authType}</div>
                          )}
                          <div>Sync Direction: {integration.syncDirection}</div>
                          {integration.syncSettings && (
                            <div>
                              Syncs: {[
                                integration.syncSettings.syncContacts && 'Contacts',
                                integration.syncSettings.syncLeads && 'Leads',
                                integration.syncSettings.syncDeals && 'Deals',
                              ].filter(Boolean).join(', ') || 'None'}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(integration.id)}
                          disabled={testingId === integration.id}
                        >
                          {testingId === integration.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Test'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingId(integration.id);
                            loadIntegrationForEdit(integration);
                            setIsCreateDialogOpen(true);
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(integration.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || editingId !== null} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false);
          setEditingId(null);
          resetForm();
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit CRM Integration' : 'Add Custom CRM Integration'}</DialogTitle>
            <DialogDescription>
              Configure a custom CRM integration using webhooks or HTTPS requests
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              <div>
                <Label>Integration Name *</Label>
                <Input
                  placeholder="My Custom CRM Integration"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Integration Type *</Label>
                <select
                  className="w-full px-3 py-2 border rounded-md mt-1"
                  value={integrationType}
                  onChange={(e) => {
                    setIntegrationType(e.target.value as 'webhook' | 'https');
                    setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, integrationType: e.target.value },
                    });
                  }}
                >
                  <option value="webhook">Webhook (Receive data from CRM)</option>
                  <option value="https">HTTPS Request (Send data to CRM)</option>
                </select>
              </div>

              {integrationType === 'webhook' ? (
                <div>
                  <Label>Webhook URL *</Label>
                  <Input
                    type="url"
                    placeholder="https://your-crm.com/webhook"
                    value={formData.apiUrl || formData.metadata?.webhookUrl || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      apiUrl: e.target.value,
                      metadata: { ...formData.metadata, webhookUrl: e.target.value },
                    })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    URL where your CRM will send webhook events
                  </p>
                </div>
              ) : (
                <div>
                  <Label>Request URL *</Label>
                  <Input
                    type="url"
                    placeholder="https://api.your-crm.com/v1/contacts"
                    value={formData.apiUrl || formData.metadata?.requestUrl || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      apiUrl: e.target.value,
                      metadata: { ...formData.metadata, requestUrl: e.target.value },
                    })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    API endpoint URL for sending data to your CRM
                  </p>
                </div>
              )}
            </div>

            {/* Webhook Configuration */}
            {integrationType === 'webhook' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Webhook Configuration</h3>
                <div>
                  <Label>Webhook Secret (Optional)</Label>
                  <Input
                    type="password"
                    placeholder="Enter webhook secret for signature verification"
                    value={formData.metadata?.webhookSecret || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      metadata: { ...formData.metadata, webhookSecret: e.target.value },
                    })}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Secret key used to verify webhook signatures
                  </p>
                </div>
              </div>
            )}

            {/* HTTPS Request Configuration */}
            {integrationType === 'https' && (
              <div className="space-y-4">
                <h3 className="font-semibold text-sm">Request Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>HTTP Method *</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      value={formData.metadata?.requestMethod || 'POST'}
                      onChange={(e) => setFormData({
                        ...formData,
                        metadata: { ...formData.metadata, requestMethod: e.target.value },
                      })}
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>
                  <div>
                    <Label>Content Type *</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      value={formData.metadata?.contentType || 'application/json'}
                      onChange={(e) => setFormData({
                        ...formData,
                        metadata: { ...formData.metadata, contentType: e.target.value },
                      })}
                    >
                      <option value="application/json">JSON</option>
                      <option value="application/xml">XML</option>
                      <option value="application/x-www-form-urlencoded">Form URL Encoded</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label>Authentication Type</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md mt-1"
                    value={authType}
                    onChange={(e) => {
                      setAuthType(e.target.value as any);
                      setFormData({
                        ...formData,
                        metadata: { ...formData.metadata, authType: e.target.value },
                      });
                    }}
                  >
                    <option value="none">None</option>
                    <option value="basic">Basic Auth</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="apikey">API Key</option>
                    <option value="custom">Custom Headers</option>
                  </select>
                </div>

                {authType === 'basic' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Username</Label>
                      <Input
                        placeholder="Username"
                        value={formData.metadata?.basicAuthUsername || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, basicAuthUsername: e.target.value },
                        })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>Password</Label>
                      <Input
                        type="password"
                        placeholder="Password"
                        value={formData.metadata?.basicAuthPassword || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, basicAuthPassword: e.target.value },
                        })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {authType === 'bearer' && (
                  <div>
                    <Label>Bearer Token</Label>
                    <Input
                      type="password"
                      placeholder="Enter bearer token"
                      value={formData.accessToken || formData.metadata?.bearerToken || ''}
                      onChange={(e) => setFormData({
                        ...formData,
                        accessToken: e.target.value,
                        metadata: { ...formData.metadata, bearerToken: e.target.value },
                      })}
                      className="mt-1"
                    />
                  </div>
                )}

                {authType === 'apikey' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>API Key</Label>
                      <Input
                        type="password"
                        placeholder="Enter API key"
                        value={formData.apiKey || formData.metadata?.apiKey || ''}
                        onChange={(e) => setFormData({
                          ...formData,
                          apiKey: e.target.value,
                          metadata: { ...formData.metadata, apiKey: e.target.value },
                        })}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label>API Key Header Name</Label>
                      <Input
                        placeholder="X-API-Key"
                        value={formData.metadata?.apiKeyHeader || 'X-API-Key'}
                        onChange={(e) => setFormData({
                          ...formData,
                          metadata: { ...formData.metadata, apiKeyHeader: e.target.value },
                        })}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Custom Headers */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Custom Headers</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomHeaders([...customHeaders, { key: '', value: '' }])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Header
                </Button>
              </div>
              {customHeaders.map((header, index) => (
                <div key={index} className="grid grid-cols-5 gap-2">
                  <Input
                    placeholder="Header name"
                    value={header.key}
                    onChange={(e) => {
                      const newHeaders = [...customHeaders];
                      newHeaders[index].key = e.target.value;
                      setCustomHeaders(newHeaders);
                    }}
                  />
                  <Input
                    placeholder="Header value"
                    value={header.value}
                    onChange={(e) => {
                      const newHeaders = [...customHeaders];
                      newHeaders[index].value = e.target.value;
                      setCustomHeaders(newHeaders);
                    }}
                    className="col-span-3"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomHeaders(customHeaders.filter((_, i) => i !== index))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Advanced Options */}
            <div className="space-y-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full"
              >
                {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                {showAdvanced ? <ChevronRight className="h-4 w-4 ml-2 rotate-90" /> : <ChevronRight className="h-4 w-4 ml-2" />}
              </Button>
              {showAdvanced && (
                <div className="space-y-4 pl-4 border-l-2">
                  <div>
                    <Label>Request Timeout (ms)</Label>
                    <Input
                      type="number"
                      placeholder="10000"
                      value={formData.metadata?.timeout || 10000}
                      onChange={(e) => setFormData({
                        ...formData,
                        metadata: { ...formData.metadata, timeout: parseInt(e.target.value) || 10000 },
                      })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Sync Direction</Label>
                    <select
                      className="w-full px-3 py-2 border rounded-md mt-1"
                      value={formData.syncDirection}
                      onChange={(e) => setFormData({ ...formData, syncDirection: e.target.value as SyncDirection })}
                    >
                      <option value={SyncDirection.BIDIRECTIONAL}>Bidirectional</option>
                      <option value={SyncDirection.ENGINE_TO_CRM}>Marketplace → CRM</option>
                      <option value={SyncDirection.CRM_TO_ENGINE}>CRM → Marketplace</option>
                    </select>
                  </div>
                  {linkStatus?.linked && (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="syncToLinkedAccount"
                        checked={formData.syncToLinkedAccount || false}
                        onChange={(e) => setFormData({ ...formData, syncToLinkedAccount: e.target.checked })}
                        className="rounded"
                      />
                      <Label htmlFor="syncToLinkedAccount" className="cursor-pointer">
                        Sync to linked Engine account
                      </Label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setIsCreateDialogOpen(false);
                setEditingId(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={() => editingId ? handleUpdate(editingId, formData) : handleCreate()} disabled={createIntegration.isPending || updateIntegration.isPending}>
                {(createIntegration.isPending || updateIntegration.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {editingId ? 'Updating...' : 'Creating...'}
                  </>
                ) : (
                  editingId ? 'Update Integration' : 'Create Integration'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

