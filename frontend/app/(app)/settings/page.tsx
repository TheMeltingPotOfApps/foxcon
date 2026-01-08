'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useSubscription, useInvoices, usePaymentMethods, useCreatePortalSession, useCancelSubscription } from '@/lib/hooks/use-billing';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Settings,
  Building2,
  Phone,
  Users,
  CreditCard,
  Webhook,
  Key,
  Bell,
  Save,
  Loader2,
  Upload,
  Copy,
  Trash2,
  Plus,
  X,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Shield,
  PhoneCall,
  ArrowUpDown,
  Search,
  Clock,
  AlertTriangle,
  Sparkles,
  Wand2,
  Link2,
} from 'lucide-react';
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  type CreateWebhookDto,
  type WebhookEvent,
} from '@/lib/hooks/use-webhooks';
import {
  useIngestionEndpoints,
  useCreateIngestionEndpoint,
  useUpdateIngestionEndpoint,
  useDeleteIngestionEndpoint,
  useTestIngestionEndpoint,
  IngestionActionType,
  type CreateIngestionEndpointDto,
  type ParameterMapping,
  type IngestionAction,
  type LeadIngestionEndpoint,
} from '@/lib/hooks/use-lead-ingestion';
import { useGenerateLeadIngestionWithAi } from '@/lib/hooks/use-integration-builder';
import { AiIntegrationBuilder } from '@/components/integrations/ai-integration-builder';
import {
  useTwilioConfig,
  useCreateTwilioConfig,
  useTestTwilioConnection,
  useTwilioNumbers,
  useImportTwilioNumbers,
  useNumberPools,
  useCreateNumberPool,
  useUpdateNumberPool,
  useDeleteNumberPool,
  useUpdateTwilioNumber,
  useAssignNumberToPool,
  useRemoveNumberFromPool,
} from '@/lib/hooks/use-twilio';
import { useCampaigns } from '@/lib/hooks/use-campaigns';
import { useJourneys } from '@/lib/hooks/use-journeys';
import { useTenant, useUpdateTenant } from '@/lib/hooks/use-tenant';
import {
  useTcpaconfig,
  useUpdateTcpaconfig,
  type Tcpaconfig,
  useTcpaviolations,
  useOverrideTcpaviolation,
} from '@/lib/hooks/use-tcpa';
import { ExecutionRulesSettings } from './execution-rules-settings';
import { LeadStatusesSettings } from '@/components/settings/lead-statuses-settings';
import { StatusAutomationsSettings } from '@/components/settings/status-automations-settings';
import {
  useVoiceDids,
  useCreateVoiceDid,
  useUpdateVoiceDid,
  useDeleteVoiceDid,
  useImportVoiceDids,
} from '@/lib/hooks/use-calls';
import { useSystemConfig, useUpdateSystemConfig } from '@/lib/hooks/use-system-config';
import { useUserProfile, useUpdateUserProfile } from '@/lib/hooks/use-user-profile';
import { TimezoneSelector } from '@/components/timezone-selector';
import { Label } from '@/components/ui/label';
import {
  useTeamMembers,
  useInviteUser,
  useUpdateUserRole,
  useRemoveUser,
  type TeamMember,
} from '@/lib/hooks/use-team';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';
import {
  useCrmIntegrations,
  useCreateCrmIntegration,
  useUpdateCrmIntegration,
  useDeleteCrmIntegration,
  useTestCrmConnection,
  CrmProvider,
  SyncDirection,
  type CreateCrmIntegrationDto,
  type UpdateCrmIntegrationDto,
} from '@/lib/hooks/use-crm-integrations';

// Helper function to safely extract error messages
const getErrorMessage = (error: any, fallback: string): string => {
  if (typeof error?.message === 'string') {
    return error.message;
  }
  if (Array.isArray(error?.response?.data?.message)) {
    return error.response.data.message.join(', ');
  }
  if (typeof error?.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  if (typeof error?.response?.data?.error === 'string') {
    return error.response.data.error;
  }
  return fallback;
};

const settingsTabs = [
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'profile', label: 'Profile', icon: Users },
  { id: 'twilio', label: 'Twilio', icon: Phone },
  { id: 'voice-numbers', label: 'Voice Numbers', icon: PhoneCall },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'billing', label: 'Billing', icon: CreditCard },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'lead-ingestion', label: 'Lead Ingestion', icon: Upload },
  { id: 'crm-integrations', label: 'CRM Integrations', icon: Link2 },
  { id: 'tcpa', label: 'TCPA Compliance', icon: Shield },
  { id: 'execution-rules', label: 'Execution Rules', icon: Clock },
  { id: 'lead-statuses', label: 'Lead Statuses', icon: ArrowUpDown },
  { id: 'api-keys', label: 'API Keys', icon: Key },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('workspace');

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your workspace and account settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardContent className="pt-6">
              <nav className="space-y-1">
                {settingsTabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'workspace' && <WorkspaceSettings />}
          {activeTab === 'profile' && <ProfileSettings />}
          {activeTab === 'twilio' && <TwilioSettings />}
          {activeTab === 'voice-numbers' && <VoiceNumbersSettings />}
          {activeTab === 'team' && <TeamSettings />}
          {activeTab === 'billing' && <BillingSettings />}
          {activeTab === 'webhooks' && <WebhooksSettings />}
          {activeTab === 'lead-ingestion' && <LeadIngestionSettings />}
          {activeTab === 'crm-integrations' && <CrmIntegrationsSettings />}
          {activeTab === 'tcpa' && <Tcpasettings />}
          {activeTab === 'execution-rules' && <ExecutionRulesSettings />}
          {activeTab === 'lead-statuses' && (
            <div className="space-y-6">
              <LeadStatusesSettings />
              <StatusAutomationsSettings />
            </div>
          )}
          {activeTab === 'api-keys' && <ApiKeysSettings />}
          {activeTab === 'notifications' && <NotificationsSettings />}
        </div>
      </div>
    </motion.div>
  );
}

function WorkspaceSettings() {
  const { data: tenant, isLoading } = useTenant();
  const updateTenant = useUpdateTenant();
  const [formData, setFormData] = useState({
    name: '',
    timezone: '',
    legalFooterTemplate: '',
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        timezone: tenant.timezone || 'UTC',
        legalFooterTemplate: tenant.legalFooterTemplate || '',
      });
    }
  }, [tenant]);

  const handleSave = async () => {
    try {
      await updateTenant.mutateAsync(formData);
      toast.success('Workspace settings saved successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to save workspace settings'));
    }
  };

  // Common timezones list
  const timezones = [
    'UTC',
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'America/Phoenix',
    'America/Anchorage',
    'America/Honolulu',
    'America/Toronto',
    'America/Vancouver',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Europe/Rome',
    'Europe/Madrid',
    'Europe/Amsterdam',
    'Europe/Stockholm',
    'Europe/Zurich',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Hong_Kong',
    'Asia/Singapore',
    'Asia/Dubai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Australia/Melbourne',
    'Pacific/Auckland',
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workspace Settings</CardTitle>
        <CardDescription>Configure your workspace branding and preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label htmlFor="workspace-name" className="text-sm font-medium mb-2 block">
            Workspace Name
          </label>
          <Input
            id="workspace-name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Workspace"
          />
        </div>
        <div>
          <label htmlFor="timezone" className="text-sm font-medium mb-2 block">
            Timezone
          </label>
          <Select
            id="timezone"
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
          >
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="legal-footer" className="text-sm font-medium mb-2 block">
            Legal Footer Template
          </label>
          <Textarea
            id="legal-footer"
            value={formData.legalFooterTemplate}
            onChange={(e) => setFormData({ ...formData, legalFooterTemplate: e.target.value })}
            placeholder="Reply STOP to unsubscribe"
            rows={3}
          />
          <p className="text-xs text-muted-foreground mt-1">
            This footer will be automatically appended to all SMS messages sent from your workspace.
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateTenant.isPending}>
          {updateTenant.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

function ProfileSettings() {
  const { data: profile, isLoading } = useUserProfile();
  const updateProfile = useUpdateUserProfile();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    timezone: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        timezone: profile.timezone || '',
      });
    }
  }, [profile]);

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync(formData);
      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to update profile'));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Settings</CardTitle>
        <CardDescription>Manage your personal profile and preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label htmlFor="profile-email" className="text-sm font-medium mb-2 block">
            Email
          </label>
          <Input
            id="profile-email"
            value={profile?.email || ''}
            disabled
            className="bg-muted"
          />
          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-first-name" className="text-sm font-medium mb-2 block">
              First Name
            </label>
            <Input
              id="profile-first-name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              placeholder="John"
            />
          </div>
          <div>
            <label htmlFor="profile-last-name" className="text-sm font-medium mb-2 block">
              Last Name
            </label>
            <Input
              id="profile-last-name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              placeholder="Doe"
            />
          </div>
        </div>
        <div>
          <label htmlFor="profile-timezone" className="text-sm font-medium mb-2 block">
            Timezone
          </label>
          <TimezoneSelector
            id="profile-timezone"
            value={formData.timezone}
            onChange={(value) => setFormData({ ...formData, timezone: value })}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Used for scheduling and displaying times in your local timezone
          </p>
        </div>
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TwilioSettings() {
  const { data: config, isLoading: configLoading } = useTwilioConfig();
  const [numbersPage, setNumbersPage] = useState(1);
  const numbersLimit = 20;
  const { data: numbersResponse, isLoading: numbersLoading } = useTwilioNumbers(undefined, numbersPage, numbersLimit);
  const numbers = numbersResponse?.data || [];
  const numbersTotal = numbersResponse?.total || 0;
  const { data: pools = [], isLoading: poolsLoading } = useNumberPools();
  const createConfig = useCreateTwilioConfig();
  const testConnection = useTestTwilioConnection();
  const importNumbers = useImportTwilioNumbers();
  const createPool = useCreateNumberPool();

  const updatePool = useUpdateNumberPool();
  const deletePool = useDeleteNumberPool();
  const updateNumber = useUpdateTwilioNumber();
  const assignToPool = useAssignNumberToPool();
  const removeFromPool = useRemoveNumberFromPool();

  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [showPoolDialog, setShowPoolDialog] = useState(false);
  const [editingPool, setEditingPool] = useState<string | null>(null);
  const [editingNumber, setEditingNumber] = useState<string | null>(null);
  const [selectedPoolForNumber, setSelectedPoolForNumber] = useState<string | null>(null);
  const [selectedNumberForPool, setSelectedNumberForPool] = useState<string | null>(null);

  const handleSaveConfig = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createConfig.mutateAsync({
        accountSid: formData.get('accountSid') as string,
        authToken: formData.get('authToken') as string,
        messagingServiceSid: formData.get('messagingServiceSid') as string || undefined,
      });
      toast.success('Twilio configuration saved successfully');
      setShowConfigDialog(false);
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to save configuration'));
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testConnection.mutateAsync();
      if (result.success) {
        toast.success('Connection test successful');
      } else {
        const message = typeof result.message === 'string' ? result.message : 'Connection test failed';
        toast.error(`Connection test failed: ${message}`);
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to test connection'));
    }
  };

  const handleImportNumbers = async () => {
    try {
      const imported = await importNumbers.mutateAsync();
      setNumbersPage(1); // Reset to first page after import
      toast.success(`Successfully imported ${imported.length} numbers`);
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to import numbers'));
    }
  };

  const handleCreatePool = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createPool.mutateAsync({
        name: formData.get('name') as string,
        description: formData.get('description') as string || undefined,
        maxMessagesPerDay: formData.get('maxMessagesPerDay') ? parseInt(formData.get('maxMessagesPerDay') as string) : null,
      });
      toast.success('Number pool created successfully');
      setShowPoolDialog(false);
      e.currentTarget.reset();
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to create pool'));
    }
  };

  const handleUpdatePool = async (poolId: string, data: { name?: string; description?: string; maxMessagesPerDay?: number | null; isActive?: boolean }) => {
    try {
      await updatePool.mutateAsync({ id: poolId, data });
      toast.success('Pool updated successfully');
      setEditingPool(null);
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to update pool'));
    }
  };

  const handleDeletePool = async (poolId: string) => {
    if (!confirm('Are you sure you want to delete this pool? Numbers will be removed from the pool.')) return;
    try {
      await deletePool.mutateAsync(poolId);
      toast.success('Pool deleted successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to delete pool'));
    }
  };

  const handleUpdateNumber = async (numberId: string, data: { maxMessagesPerDay?: number | null; friendlyName?: string }) => {
    try {
      await updateNumber.mutateAsync({ id: numberId, data });
      toast.success('Number updated successfully');
      setEditingNumber(null);
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to update number'));
    }
  };

  const handleAssignToPool = async (numberId: string, poolId: string) => {
    try {
      await assignToPool.mutateAsync({ numberId, poolId });
      toast.success('Number assigned to pool successfully');
      setSelectedNumberForPool(null);
      setSelectedPoolForNumber(null);
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to assign number to pool'));
    }
  };

  const handleRemoveFromPool = async (numberId: string) => {
    try {
      await removeFromPool.mutateAsync(numberId);
      toast.success('Number removed from pool successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to remove number from pool'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Twilio Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Twilio Configuration</CardTitle>
              <CardDescription>Connect your Twilio account</CardDescription>
            </div>
            {config && (
              <Button variant="outline" onClick={() => setShowConfigDialog(true)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Config
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {configLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : !config ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No Twilio configuration found</p>
              <Button onClick={() => setShowConfigDialog(true)}>
                Configure Twilio
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Account SID</label>
                  <Input value={config.accountSid.replace(/(.{4})(.*)(.{4})/, '$1****$3')} disabled />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Messaging Service SID</label>
                  <Input value={config.messagingServiceSid || 'Not set'} disabled />
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Connection Status</p>
                  <p className="text-sm text-muted-foreground">
                    {config.isActive ? 'Connected' : 'Inactive'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge variant={config.isActive ? 'default' : 'secondary'}>
                    {config.isActive ? 'Connected' : 'Disconnected'}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleTestConnection} disabled={testConnection.isPending}>
                    {testConnection.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      'Test Connection'
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Number Pools */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Number Pools</CardTitle>
              <CardDescription>Organize your Twilio numbers into pools</CardDescription>
            </div>
            <Button onClick={() => setShowPoolDialog(true)} disabled={!config}>
              <Plus className="h-4 w-4 mr-2" />
              Create Pool
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {poolsLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : pools.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No number pools created</p>
              <Button onClick={() => setShowPoolDialog(true)} disabled={!config}>
                Create Your First Pool
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {pools.map((pool) => (
                <div key={pool.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{pool.name}</p>
                        <Badge variant={pool.isActive ? 'default' : 'secondary'}>
                          {pool.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {pool.description && (
                        <p className="text-sm text-muted-foreground mb-2">{pool.description}</p>
                      )}
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>{pool.numbers?.length || 0} numbers</span>
                        <span>
                          Max per day: {pool.maxMessagesPerDay === null ? 'Unlimited' : pool.maxMessagesPerDay}
                        </span>
                        <span>Sent today: {pool.totalMessagesSentToday || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingPool(pool.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePool(pool.id)}
                        disabled={deletePool.isPending}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {editingPool === pool.id && (
                    <EditPoolDialog
                      pool={pool}
                      onSave={(data) => handleUpdatePool(pool.id, data)}
                      onCancel={() => setEditingPool(null)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Twilio Numbers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Twilio Numbers</CardTitle>
              <CardDescription>Manage your Twilio phone numbers</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleImportNumbers} disabled={!config || importNumbers.isPending}>
                {importNumbers.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Import Numbers
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {numbersLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : numbers.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No numbers imported yet</p>
              <Button onClick={handleImportNumbers} disabled={!config || importNumbers.isPending}>
                Import Numbers from Twilio
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {numbers.map((number) => (
                <div key={number.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{number.phoneNumber}</p>
                        <Badge variant={number.status === 'active' ? 'default' : 'secondary'}>
                          {number.status}
                        </Badge>
                        {number.numberPoolId && (
                          <Badge variant="outline">
                            Pool: {pools.find((p) => p.id === number.numberPoolId)?.name || 'Unknown'}
                          </Badge>
                        )}
                      </div>
                      {number.friendlyName && (
                        <p className="text-sm text-muted-foreground mb-2">{number.friendlyName}</p>
                      )}
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span>
                          Max per day: {number.maxMessagesPerDay === null ? 'Unlimited' : number.maxMessagesPerDay}
                        </span>
                        <span>Sent today: {number.messagesSentToday || 0}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingNumber(number.id)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {number.numberPoolId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoveFromPool(number.id)}
                          disabled={removeFromPool.isPending}
                        >
                          Remove from Pool
                        </Button>
                      )}
                    </div>
                  </div>
                  {editingNumber === number.id && (
                    <EditNumberDialog
                      number={number}
                      pools={pools}
                      onSave={(data) => handleUpdateNumber(number.id, data)}
                      onAssignToPool={(poolId) => handleAssignToPool(number.id, poolId)}
                      onCancel={() => setEditingNumber(null)}
                    />
                  )}
                </div>
              ))}
              {/* Pagination */}
              {numbersTotal > numbersLimit && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(numbersPage - 1) * numbersLimit + 1} to {Math.min(numbersPage * numbersLimit, numbersTotal)} of {numbersTotal} numbers
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNumbersPage((p) => Math.max(1, p - 1))}
                      disabled={numbersPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNumbersPage((p) => p + 1)}
                      disabled={numbersPage * numbersLimit >= numbersTotal}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Config Dialog */}
      {showConfigDialog && (
        <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{config ? 'Edit' : 'Configure'} Twilio</DialogTitle>
              <DialogDescription>
                Enter your Twilio account credentials
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Account SID *</label>
                <Input
                  name="accountSid"
                  type="password"
                  defaultValue={config?.accountSid || ''}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Auth Token *</label>
                <Input
                  name="authToken"
                  type="password"
                  placeholder="Your auth token"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Messaging Service SID (Optional)</label>
                <Input
                  name="messagingServiceSid"
                  defaultValue={config?.messagingServiceSid || ''}
                  placeholder="MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowConfigDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createConfig.isPending}>
                  {createConfig.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save & Connect
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Create Pool Dialog */}
      {showPoolDialog && (
        <Dialog open={showPoolDialog} onOpenChange={setShowPoolDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Number Pool</DialogTitle>
              <DialogDescription>
                Create a pool to organize your Twilio numbers
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreatePool} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Pool Name *</label>
                <Input name="name" placeholder="e.g., Sales Pool" required />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea name="description" placeholder="Optional description" rows={2} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max Messages Per Day</label>
                <Input
                  name="maxMessagesPerDay"
                  type="number"
                  placeholder="Leave empty for unlimited"
                  min="1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty for unlimited messages per day
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setShowPoolDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createPool.isPending}>
                  {createPool.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Pool'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditPoolDialog({
  pool,
  onSave,
  onCancel,
}: {
  pool: any;
  onSave: (data: { name?: string; description?: string; maxMessagesPerDay?: number | null; isActive?: boolean }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(pool.name);
  const [description, setDescription] = useState(pool.description || '');
  const [maxMessagesPerDay, setMaxMessagesPerDay] = useState(pool.maxMessagesPerDay?.toString() || '');
  const [isActive, setIsActive] = useState(pool.isActive);

  const handleSubmit = () => {
    onSave({
      name,
      description,
      maxMessagesPerDay: maxMessagesPerDay ? parseInt(maxMessagesPerDay) : null,
      isActive,
    });
  };

  return (
    <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Pool Name *</label>
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Description</label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Max Messages Per Day</label>
        <Input
          type="number"
          value={maxMessagesPerDay}
          onChange={(e) => setMaxMessagesPerDay(e.target.value)}
          placeholder="Leave empty for unlimited"
          min="1"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="rounded"
        />
        <label className="text-sm font-medium">Active</label>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}

function EditNumberDialog({
  number,
  pools,
  onSave,
  onAssignToPool,
  onCancel,
}: {
  number: any;
  pools: any[];
  onSave: (data: { maxMessagesPerDay?: number | null; friendlyName?: string }) => void;
  onAssignToPool: (poolId: string) => void;
  onCancel: () => void;
}) {
  const [friendlyName, setFriendlyName] = useState(number.friendlyName || '');
  const [maxMessagesPerDay, setMaxMessagesPerDay] = useState(number.maxMessagesPerDay?.toString() || '');
  const [selectedPool, setSelectedPool] = useState('');

  const handleSubmit = () => {
    onSave({
      friendlyName,
      maxMessagesPerDay: maxMessagesPerDay ? parseInt(maxMessagesPerDay) : null,
    });
  };

  return (
    <div className="mt-4 p-4 bg-muted rounded-lg space-y-4">
      <div>
        <label className="text-sm font-medium mb-2 block">Friendly Name</label>
        <Input
          value={friendlyName}
          onChange={(e) => setFriendlyName(e.target.value)}
          placeholder="e.g., Sales Number"
        />
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Max Messages Per Day</label>
        <Input
          type="number"
          value={maxMessagesPerDay}
          onChange={(e) => setMaxMessagesPerDay(e.target.value)}
          placeholder="Leave empty for unlimited"
          min="1"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Overrides pool limit if set
        </p>
      </div>
      <div>
        <label className="text-sm font-medium mb-2 block">Assign to Pool</label>
        <Select value={selectedPool} onChange={(e) => setSelectedPool(e.target.value)}>
          <option value="">Select a pool...</option>
          {pools.map((pool) => (
            <option key={pool.id} value={pool.id}>
              {pool.name}
            </option>
          ))}
        </Select>
        {selectedPool && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => {
              onAssignToPool(selectedPool);
              setSelectedPool('');
            }}
          >
            Assign to Pool
          </Button>
        )}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}

function TeamSettings() {
  const { data: teamMembers, isLoading } = useTeamMembers();
  const inviteUser = useInviteUser();
  const updateUserRole = useUpdateUserRole();
  const removeUser = useRemoveUser();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'VIEWER' as 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER',
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });

  const authUser = useAuthStore((state) => state.user);
  const currentUserId = authUser?.id;
  
  // Get current user's role from team members list
  const currentUserMember = teamMembers?.find((member) => member.userId === currentUserId);
  const currentUserRole = currentUserMember?.role;

  const canManageTeam = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const handleInvite = async () => {
    try {
      await inviteUser.mutateAsync({
        email: inviteForm.email,
        role: inviteForm.role,
        firstName: inviteForm.firstName || undefined,
        lastName: inviteForm.lastName || undefined,
        phoneNumber: inviteForm.phoneNumber,
      });
      setInviteDialogOpen(false);
      setInviteForm({ email: '', role: 'VIEWER', firstName: '', lastName: '', phoneNumber: '' });
    } catch (error: any) {
      console.error('Failed to invite user:', error);
    }
  };

  const handleRoleChange = async (userTenantId: string, newRole: 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER') => {
    try {
      await updateUserRole.mutateAsync({ userTenantId, role: newRole });
    } catch (error: any) {
      console.error('Failed to update role:', error);
    }
  };

  const handleRemove = async (userTenantId: string) => {
    try {
      await removeUser.mutateAsync(userTenantId);
      setRemoveDialogOpen(null);
    } catch (error: any) {
      console.error('Failed to remove user:', error);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'OWNER':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'MANAGER':
        return 'bg-green-100 text-green-800';
      case 'AGENT':
        return 'bg-yellow-100 text-yellow-800';
      case 'VIEWER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Management</CardTitle>
        <CardDescription>Manage users and roles</CardDescription>
      </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Team Management</CardTitle>
              <CardDescription>Manage users and roles for your workspace</CardDescription>
            </div>
            {canManageTeam && (
              <Button onClick={() => setInviteDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Invite Team Member
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canManageTeam && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                Only owners and admins can manage team members.
              </p>
            </div>
          )}

          {teamMembers && teamMembers.length > 0 ? (
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="font-medium">
                          {member.firstName || member.lastName
                            ? `${member.firstName || ''} ${member.lastName || ''}`.trim()
                            : member.email}
                        </p>
                        {member.userId === currentUserId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {canManageTeam && member.userId !== currentUserId && (
                      <Select
                        value={member.role}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value as any)
                        }
                        disabled={updateUserRole.isPending}
                      >
                        <option value="OWNER">Owner</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MANAGER">Manager</option>
                        <option value="AGENT">Agent</option>
                        <option value="VIEWER">Viewer</option>
                      </Select>
                    )}
                    {(!canManageTeam || member.userId === currentUserId) && (
                      <Badge className={getRoleBadgeColor(member.role)}>
                        {member.role}
                      </Badge>
                    )}
                    {canManageTeam &&
                      member.userId !== currentUserId &&
                      member.role !== 'OWNER' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setRemoveDialogOpen(member.id)}
                          disabled={removeUser.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No team members yet</p>
              {canManageTeam && (
                <Button onClick={() => setInviteDialogOpen(true)} variant="outline">
                  Invite Team Member
                </Button>
              )}
        </div>
          )}
      </CardContent>
    </Card>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Invite a new user to join your workspace. They will receive an SMS with a signup link and temporary password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number *</Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={inviteForm.phoneNumber}
                onChange={(e) => setInviteForm({ ...inviteForm, phoneNumber: e.target.value })}
                placeholder="+1234567890"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Include country code (e.g., +1 for US)
              </p>
            </div>
            <div>
              <Label htmlFor="role">Role *</Label>
              <Select
                id="role"
                value={inviteForm.role}
                onChange={(e) =>
                  setInviteForm({ ...inviteForm, role: e.target.value as any })
                }
              >
                <option value="VIEWER">Viewer - Read-only access</option>
                <option value="AGENT">Agent - Can manage contacts and campaigns</option>
                <option value="MANAGER">Manager - Can manage most resources</option>
                <option value="ADMIN">Admin - Full access except billing</option>
                <option value="OWNER">Owner - Full access including billing</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                  placeholder="John"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                  placeholder="Doe"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setInviteDialogOpen(false)}
                disabled={inviteUser.isPending}
              >
                Cancel
              </Button>
              <Button onClick={handleInvite} disabled={inviteUser.isPending || !inviteForm.email || !inviteForm.phoneNumber}>
                {inviteUser.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Inviting...
                  </>
                ) : (
                  'Invite'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Remove Dialog */}
      <Dialog open={removeDialogOpen !== null} onOpenChange={() => setRemoveDialogOpen(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Team Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this team member? They will lose access to this workspace.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => setRemoveDialogOpen(null)}
              disabled={removeUser.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removeDialogOpen && handleRemove(removeDialogOpen)}
              disabled={removeUser.isPending}
            >
              {removeUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Removing...
                </>
              ) : (
                'Remove'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function BillingSettings() {
  const { data: subscription, isLoading: subscriptionLoading } = useSubscription();
  const { data: invoices, isLoading: invoicesLoading } = useInvoices();
  const { data: paymentMethods, isLoading: paymentMethodsLoading } = usePaymentMethods();
  const createPortalSession = useCreatePortalSession();
  const cancelSubscription = useCancelSubscription();

  const isLoading = subscriptionLoading || invoicesLoading || paymentMethodsLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
          <CardDescription>Manage your subscription and payment methods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const planBadgeColors: Record<string, string> = {
    active: 'bg-success text-success-foreground',
    trialing: 'bg-info text-info-foreground',
    canceled: 'bg-muted text-muted-foreground',
    past_due: 'bg-warning text-warning-foreground',
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscription</CardTitle>
          <CardDescription>Manage your subscription and payment methods</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Subscription */}
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Current Plan</span>
              {subscription ? (
                <Badge className={planBadgeColors[subscription.status] || ''}>
                  {subscription.planType.charAt(0).toUpperCase() + subscription.planType.slice(1)} - {subscription.status}
                </Badge>
              ) : (
                <Badge>Free</Badge>
              )}
            </div>
            {subscription && subscription.currentPeriodEnd && (
              <p className="text-sm text-muted-foreground">
                {subscription.cancelAtPeriodEnd
                  ? `Cancels on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`
                  : `Renews on ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}`}
              </p>
            )}
            {!subscription && (
              <p className="text-sm text-muted-foreground">
                Upgrade to unlock more features
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={() => window.location.href = '/pricing'}>
              {subscription ? 'Change Plan' : 'Upgrade Plan'}
            </Button>
            {subscription && (
              <>
                <Button
                  variant="outline"
                  onClick={() => createPortalSession.mutate(undefined)}
                  disabled={createPortalSession.isPending}
                >
                  Manage Billing
                </Button>
                {!subscription.cancelAtPeriodEnd && (
                  <Button
                    variant="outline"
                    onClick={() => cancelSubscription.mutate(true)}
                    disabled={cancelSubscription.isPending}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment Methods */}
      {paymentMethods && paymentMethods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>Your saved payment methods</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {method.cardDetails && (
                      <>
                        <div className="text-2xl">
                          {method.cardDetails.brand === 'visa' && '💳'}
                          {method.cardDetails.brand === 'mastercard' && '💳'}
                          {method.cardDetails.brand === 'amex' && '💳'}
                          {!['visa', 'mastercard', 'amex'].includes(method.cardDetails.brand || '') && '💳'}
                        </div>
                        <div>
                          <div className="font-medium">
                            •••• •••• •••• {method.cardDetails.last4}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {method.cardDetails.brand?.toUpperCase()} • Expires {method.cardDetails.expMonth}/{method.cardDetails.expYear}
                          </div>
                        </div>
                      </>
                    )}
                    {method.isDefault && (
                      <Badge variant="secondary">Default</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices */}
      {invoices && invoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>View and download your invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">
                      ${invoice.amount.toFixed(2)} {invoice.currency?.toUpperCase()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(invoice.createdAt).toLocaleDateString()} • {invoice.status}
                    </div>
                  </div>
                  {invoice.hostedInvoiceUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(invoice.hostedInvoiceUrl, '_blank')}
                    >
                      View Invoice
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function WebhooksSettings() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: webhooks = [], isLoading } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this webhook?')) return;
    try {
      await deleteWebhook.mutateAsync(id);
      toast.success('Webhook deleted successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to delete webhook'));
    }
  };

  const handleTest = async (id: string) => {
    try {
      const result = await testWebhook.mutateAsync(id);
      if (result.success) {
        toast.success('Webhook test successful');
      } else {
        const message = typeof result.message === 'string' ? result.message : 'Webhook test failed';
        toast.error(message);
      }
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to test webhook'));
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>Configure webhooks for event notifications</CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Webhook className="h-4 w-4 mr-2" />
              Add Webhook
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Webhook className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No webhooks configured</p>
              <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                Add Webhook
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{webhook.url}</p>
                        <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                          {webhook.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {webhook.events.length} event(s) configured
                      </p>
                      {webhook.lastTriggeredAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last triggered: {new Date(webhook.lastTriggeredAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTest(webhook.id)}
                        disabled={testWebhook.isPending}
                      >
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(webhook.id)}
                        disabled={deleteWebhook.isPending}
                        className="text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateDialog && (
        <CreateWebhookDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={async (data) => {
            try {
              await createWebhook.mutateAsync(data);
              toast.success('Webhook created successfully');
              setShowCreateDialog(false);
            } catch (error: any) {
              toast.error(getErrorMessage(error, 'Failed to create webhook'));
            }
          }}
        />
      )}
    </>
  );
}

function CreateWebhookDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: CreateWebhookDto) => Promise<void>;
}) {
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>([]);
  const [isActive, setIsActive] = useState(true);

  const allEvents: WebhookEvent[] = [
    'CONTACT_CREATED',
    'CONTACT_UPDATED',
    'CONTACT_OPTED_OUT',
    'CAMPAIGN_LAUNCHED',
    'CAMPAIGN_PAUSED',
    'CAMPAIGN_COMPLETED',
    'MESSAGE_SENT',
    'MESSAGE_DELIVERED',
    'MESSAGE_FAILED',
    'CONVERSATION_CREATED',
    'CONVERSATION_CLOSED',
    'JOURNEY_ENROLLED',
    'JOURNEY_COMPLETED',
  ];

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleSubmit = () => {
    if (!url || selectedEvents.length === 0) {
      toast.error('Please provide a URL and select at least one event');
      return;
    }
    onCreate({ url, events: selectedEvents, isActive });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Webhook</DialogTitle>
          <DialogDescription>
            Configure a webhook to receive event notifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Webhook URL</label>
            <Input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhook"
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Events</label>
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto border rounded-lg p-4">
              {allEvents.map((event) => (
                <label key={event} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(event)}
                    onChange={() => toggleEvent(event)}
                    className="rounded"
                  />
                  <span className="text-sm">{event.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <label className="text-sm font-medium">Active</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>Create Webhook</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LeadIngestionSettings() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingEndpoint, setEditingEndpoint] = useState<LeadIngestionEndpoint | null>(null);
  const [testingEndpoint, setTestingEndpoint] = useState<LeadIngestionEndpoint | null>(null);
  const { data: endpoints = [], isLoading } = useIngestionEndpoints();
  const createEndpoint = useCreateIngestionEndpoint();
  const updateEndpoint = useUpdateIngestionEndpoint();
  const deleteEndpoint = useDeleteIngestionEndpoint();
  const testEndpoint = useTestIngestionEndpoint();

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this endpoint?')) return;
    try {
      await deleteEndpoint.mutateAsync(id);
      toast.success('Endpoint deleted successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to delete endpoint'));
    }
  };

  const getEndpointUrl = (endpointKey: string) => {
    // Use custom domain if accessing via app.nurtureengine.net
    if (typeof window !== 'undefined' && window.location.hostname === 'app.nurtureengine.net') {
      const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
      return `${protocol}://api.nurtureengine.net/api/ingest/${endpointKey}`;
    }
    
    // Fallback to environment variable or default
    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5002';
    return `${baseUrl}/api/ingest/${endpointKey}`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lead Ingestion Endpoints</CardTitle>
              <CardDescription>
                Create endpoints to receive leads from external systems
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Endpoint
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : endpoints.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No endpoints configured</p>
              <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                Create Endpoint
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {endpoints.map((endpoint) => (
                <div key={endpoint.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{endpoint.name}</p>
                        <Badge variant={endpoint.isActive ? 'default' : 'secondary'}>
                          {endpoint.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {endpoint.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {endpoint.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {getEndpointUrl(endpoint.endpointKey)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(getEndpointUrl(endpoint.endpointKey))}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {endpoint.apiKey && (
                        <div className="mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">API Key:</span>
                            <code className="text-xs bg-muted px-2 py-1 rounded flex-1 font-mono">
                              {endpoint.apiKey}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(endpoint.apiKey)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Include this in the <code className="bg-muted px-1 rounded">X-API-Key</code> header
                          </p>
                        </div>
                      )}
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>
                          Requests: {endpoint.requestCount} | Success: {endpoint.successCount} |
                          Failed: {endpoint.failureCount}
                        </span>
                      </div>
                      {endpoint.lastRequestAt && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last request: {new Date(endpoint.lastRequestAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTestingEndpoint(endpoint)}
                      >
                        Test
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingEndpoint(endpoint)}
                      >
                        <Edit2 className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(endpoint.id)}
                        disabled={deleteEndpoint.isPending}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateDialog && (
        <CreateIngestionEndpointDialog
          mode="create"
          onClose={() => setShowCreateDialog(false)}
          onCreate={async (data) => {
            try {
              await createEndpoint.mutateAsync(data);
              toast.success('Endpoint created successfully');
              setShowCreateDialog(false);
            } catch (error: any) {
              toast.error(getErrorMessage(error, 'Failed to create endpoint'));
            }
          }}
        />
      )}

      {editingEndpoint && (
        <CreateIngestionEndpointDialog
          mode="edit"
          initialEndpoint={editingEndpoint}
          onClose={() => setEditingEndpoint(null)}
          onCreate={async (data) => {
            try {
              await updateEndpoint.mutateAsync({ id: editingEndpoint.id, data });
              toast.success('Endpoint updated successfully');
              setEditingEndpoint(null);
            } catch (error: any) {
              toast.error(getErrorMessage(error, 'Failed to update endpoint'));
            }
          }}
        />
      )}

      {testingEndpoint && (
        <TestIngestionEndpointDialog
          endpoint={testingEndpoint}
          isTesting={testEndpoint.isPending}
          onClose={() => setTestingEndpoint(null)}
          onTest={async (payload, method) => {
            try {
              const result = await testEndpoint.mutateAsync({
                endpointKey: testingEndpoint.endpointKey,
                payload,
                apiKey: testingEndpoint.apiKey,
                method,
              });
              return { success: true, result };
            } catch (error: any) {
              return {
                success: false,
                error: error?.message || 'Test request failed',
                rawError: error?.response?.data,
              };
            }
          }}
        />
      )}
    </>
  );
}

function CreateIngestionEndpointDialog({
  onClose,
  onCreate,
  mode = 'create',
  initialEndpoint,
}: {
  onClose: () => void;
  onCreate: (data: CreateIngestionEndpointDto) => Promise<void>;
  mode?: 'create' | 'edit';
  initialEndpoint?: LeadIngestionEndpoint | null;
}) {
  const { data: campaigns = [] } = useCampaigns();
  const { data: journeys = [] } = useJourneys();
  const [name, setName] = useState(initialEndpoint?.name || '');
  const [description, setDescription] = useState(initialEndpoint?.description || '');
  const [endpointKey, setEndpointKey] = useState(initialEndpoint?.endpointKey || '');
  const [parameterMappings, setParameterMappings] = useState<ParameterMapping[]>(
    initialEndpoint?.parameterMappings?.length
      ? initialEndpoint.parameterMappings
      : [{ paramName: 'phone', contactField: 'phoneNumber', required: true }],
  );
  const [actions, setActions] = useState<IngestionAction[]>(initialEndpoint?.actions || []);
  const [isActive, setIsActive] = useState(
    initialEndpoint?.isActive !== undefined ? initialEndpoint.isActive : true,
  );
  const [showAiBuilder, setShowAiBuilder] = useState(false);
  const { mutateAsync: generateWithAi } = useGenerateLeadIngestionWithAi();

  const contactFields = [
    { value: 'phoneNumber', label: 'Phone Number' },
    { value: 'email', label: 'Email' },
    { value: 'firstName', label: 'First Name' },
    { value: 'lastName', label: 'Last Name' },
    { value: 'attributes', label: 'Custom Attribute' },
  ];

  const actionTypes = [
    { value: IngestionActionType.CREATE_CONTACT, label: 'Create Contact' },
    { value: IngestionActionType.ADD_TO_CAMPAIGN, label: 'Add to Campaign' },
    { value: IngestionActionType.REMOVE_FROM_CAMPAIGN, label: 'Remove from Campaign' },
    { value: IngestionActionType.ADD_TO_JOURNEY, label: 'Add to Journey' },
    { value: IngestionActionType.REMOVE_FROM_JOURNEY, label: 'Remove from Journey' },
    { value: IngestionActionType.PAUSE_IN_JOURNEY, label: 'Pause in Journey' },
    { value: IngestionActionType.UPDATE_CONTACT_STATUS, label: 'Update Contact Status' },
  ];

  const leadStatuses = ['SOLD', 'DNC', 'CONTACT_MADE', 'PAUSED'];

  const addParameterMapping = () => {
    setParameterMappings([
      ...parameterMappings,
      { paramName: '', contactField: 'phoneNumber', required: false },
    ]);
  };

  const removeParameterMapping = (index: number) => {
    setParameterMappings(parameterMappings.filter((_, i) => i !== index));
  };

  const updateParameterMapping = (index: number, updates: Partial<ParameterMapping>) => {
    setParameterMappings(
      parameterMappings.map((mapping, i) => (i === index ? { ...mapping, ...updates } : mapping)),
    );
  };

  const addAction = () => {
    setActions([...actions, { type: IngestionActionType.CREATE_CONTACT, config: {} }]);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const updateAction = (index: number, updates: Partial<IngestionAction>) => {
    setActions(actions.map((action, i) => (i === index ? { ...action, ...updates } : action)));
  };

  const handleSubmit = () => {
    if (!name || !endpointKey) {
      toast.error('Please provide a name and endpoint key');
      return;
    }
    if (parameterMappings.length === 0) {
      toast.error('Please add at least one parameter mapping');
      return;
    }
    // Validate that all parameter mappings have valid paramName and contactField
    const invalidMappings = parameterMappings.filter(
      (mapping) => !mapping.paramName || !mapping.paramName.trim() || !mapping.contactField || !mapping.contactField.trim()
    );
    if (invalidMappings.length > 0) {
      toast.error('Please ensure all parameter mappings have a valid parameter name and contact field');
      return;
    }
    onCreate({
      name,
      description,
      endpointKey,
      parameterMappings: parameterMappings.filter(
        (mapping) => mapping.paramName && mapping.paramName.trim() && mapping.contactField && mapping.contactField.trim()
      ),
      actions,
      isActive,
    });
  };

  const title =
    mode === 'edit' ? 'Edit Lead Ingestion Endpoint' : 'Create Lead Ingestion Endpoint';
  const descriptionText =
    mode === 'edit'
      ? 'Update how this endpoint ingests leads and triggers actions'
      : 'Configure an endpoint to receive leads from external systems';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {mode === 'create' && (
            <>
              <div className="border rounded-lg p-4 bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">AI Integration Builder</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAiBuilder(true)}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Generate with AI
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Let AI configure your endpoint automatically based on your integration needs
                </p>
              </div>
              {showAiBuilder && (
                <AiIntegrationBuilder
                  open={showAiBuilder}
                  onOpenChange={setShowAiBuilder}
                  integrationType="lead_ingestion"
                  onConfigGenerated={async (config) => {
                    try {
                      const result = await generateWithAi({
                        description: config.description || config.name,
                        context: {
                          contactFields: ['phoneNumber', 'email', 'firstName', 'lastName'],
                        },
                      });
                      
                      // Apply generated config to form
                      if (result.dto) {
                        setName(result.dto.name || config.name);
                        setDescription(result.dto.description || config.description);
                        setEndpointKey(result.dto.endpointKey || '');
                        if (result.dto.parameterMappings) {
                          setParameterMappings(result.dto.parameterMappings);
                        }
                        if (result.dto.actions) {
                          setActions(result.dto.actions);
                        }
                      }
                      setShowAiBuilder(false);
                      toast.success('Configuration applied! Review and save when ready.');
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to apply configuration');
                    }
                  }}
                />
              )}
            </>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name *</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My Endpoint" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Endpoint Key *</label>
              <Input
                value={endpointKey}
                onChange={(e) =>
                  setEndpointKey(
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                  )
                }
                placeholder="my-endpoint-key"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL: /ingest/{endpointKey || 'your-key'}
              </p>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={2}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Parameter Mappings *</label>
              <Button variant="outline" size="sm" onClick={addParameterMapping}>
                <Plus className="h-3 w-3 mr-1" />
                Add Mapping
              </Button>
            </div>
            <div className="space-y-2 border rounded-lg p-4">
              {parameterMappings.map((mapping, index) => (
                <div key={index} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Parameter Name</label>
                    <Input
                      value={mapping.paramName}
                      onChange={(e) =>
                        updateParameterMapping(index, { paramName: e.target.value })
                      }
                      placeholder="phone"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground mb-1 block">Contact Field</label>
                    <Select
                      value={mapping.contactField}
                      onChange={(e) =>
                        updateParameterMapping(index, { contactField: e.target.value })
                      }
                    >
                      {contactFields.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={mapping.required}
                        onChange={(e) =>
                          updateParameterMapping(index, { required: e.target.checked })
                        }
                        className="mr-1"
                      />
                      Required
                    </label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeParameterMapping(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Actions</label>
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-3 w-3 mr-1" />
                Add Action
              </Button>
            </div>
            <div className="space-y-2 border rounded-lg p-4">
              {actions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No actions configured. Actions will execute when a lead is ingested.
                </p>
              ) : (
                actions.map((action, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 bg-muted rounded-lg">
                    <div className="flex-1 space-y-2">
                      <Select
                        value={action.type}
                        onChange={(e) =>
                          updateAction(index, { type: e.target.value as IngestionActionType })
                        }
                      >
                        {actionTypes.map((type) => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </Select>

                      {action.type === IngestionActionType.ADD_TO_CAMPAIGN ||
                      action.type === IngestionActionType.REMOVE_FROM_CAMPAIGN ? (
                        <Select
                          value={action.config.campaignId || ''}
                          onChange={(e) =>
                            updateAction(index, {
                              config: { ...action.config, campaignId: e.target.value },
                            })
                          }
                        >
                          <option value="">Select Campaign</option>
                          {campaigns.map((campaign) => (
                            <option key={campaign.id} value={campaign.id}>
                              {campaign.name}
                            </option>
                          ))}
                        </Select>
                      ) : null}

                      {action.type === IngestionActionType.ADD_TO_JOURNEY ||
                      action.type === IngestionActionType.REMOVE_FROM_JOURNEY ||
                      action.type === IngestionActionType.PAUSE_IN_JOURNEY ? (
                        <Select
                          value={action.config.journeyId || ''}
                          onChange={(e) =>
                            updateAction(index, {
                              config: { ...action.config, journeyId: e.target.value },
                            })
                          }
                        >
                          <option value="">Select Journey</option>
                          {journeys.map((journey) => (
                            <option key={journey.id} value={journey.id}>
                              {journey.name}
                            </option>
                          ))}
                        </Select>
                      ) : null}

                      {action.type === IngestionActionType.UPDATE_CONTACT_STATUS ? (
                        <Select
                          value={action.config.leadStatus || ''}
                          onChange={(e) =>
                            updateAction(index, {
                              config: { ...action.config, leadStatus: e.target.value },
                            })
                          }
                        >
                          <option value="">Select Status</option>
                          {leadStatuses.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </Select>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAction(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="rounded"
            />
            <label className="text-sm font-medium">Active</label>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            {mode === 'edit' ? 'Save Changes' : 'Create Endpoint'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TestIngestionEndpointDialog({
  endpoint,
  isTesting,
  onClose,
  onTest,
}: {
  endpoint: LeadIngestionEndpoint;
  isTesting: boolean;
  onClose: () => void;
  onTest: (
    payload: Record<string, any>,
    method: 'GET' | 'POST',
  ) => Promise<{
    success: boolean;
    result?: any;
    error?: string;
    rawError?: any;
  }>;
}) {
  const [method, setMethod] = useState<'GET' | 'POST'>('POST');
  const [payloadText, setPayloadText] = useState(
    JSON.stringify(
      {
        phone: '+15555550123',
        firstName: 'Test',
        lastName: 'User',
      },
      null,
      2,
    ),
  );
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleRunTest = async () => {
    setError(null);
    setResult(null);

    let parsed: Record<string, any>;
    try {
      parsed = payloadText ? JSON.parse(payloadText) : {};
    } catch (e: any) {
      setError('Payload must be valid JSON');
      return;
    }

    const response = await onTest(parsed, method);
    if (!response.success) {
      setError(response.error || 'Test failed');
      if (response.rawError) {
        setResult(response.rawError);
      }
    } else {
      setResult(response.result);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Test Endpoint: {endpoint.name}</DialogTitle>
          <DialogDescription>
            Send a sample request to this lead ingestion endpoint and inspect the response.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="text-xs text-muted-foreground">
            <div className="mb-1">
              URL:{' '}
              <code className="bg-muted px-1 rounded text-[10px]">
                /ingest/{endpoint.endpointKey}
              </code>
            </div>
            {endpoint.apiKey && (
              <div>
                Header:{' '}
                <code className="bg-muted px-1 rounded text-[10px]">
                  X-API-Key: {endpoint.apiKey}
                </code>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Method</label>
              <Select
                value={method}
                onChange={(e) => setMethod(e.target.value as 'GET' | 'POST')}
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Payload (JSON body or query params)
            </label>
            <Textarea
              value={payloadText}
              onChange={(e) => setPayloadText(e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </div>

          {error && (
            <div className="text-xs text-destructive border border-destructive/40 bg-destructive/5 rounded-md p-2">
              {error}
            </div>
          )}

          {result && (
            <div className="text-xs border rounded-md p-2 bg-muted font-mono overflow-x-auto max-h-64 overflow-y-auto">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button onClick={handleRunTest} disabled={isTesting}>
              {isTesting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                'Run Test'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ApiKeysSettings() {
  const { data: elevenLabsConfig, isLoading: isLoadingElevenLabs } = useSystemConfig('ELEVENLABS_API_KEY');
  const { data: anthropicConfig, isLoading: isLoadingAnthropic } = useSystemConfig('ANTHROPIC_API_KEY');
  const updateConfig = useUpdateSystemConfig();
  
  const [elevenLabsKey, setElevenLabsKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (elevenLabsConfig) {
      setElevenLabsKey(elevenLabsConfig.value || '');
    }
  }, [elevenLabsConfig]);

  useEffect(() => {
    if (anthropicConfig) {
      setAnthropicKey(anthropicConfig.value || '');
    }
  }, [anthropicConfig]);

  const handleSaveElevenLabs = async () => {
    if (!elevenLabsKey.trim()) {
      toast.error('ElevenLabs API key cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        key: 'ELEVENLABS_API_KEY',
        value: elevenLabsKey.trim(),
        description: 'ElevenLabs API key for text-to-speech generation',
      });
      toast.success('ElevenLabs API key updated successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to update ElevenLabs API key'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAnthropic = async () => {
    if (!anthropicKey.trim()) {
      toast.error('Anthropic API key cannot be empty');
      return;
    }

    setIsSaving(true);
    try {
      await updateConfig.mutateAsync({
        key: 'ANTHROPIC_API_KEY',
        value: anthropicKey.trim(),
        description: 'Anthropic Claude API key for AI generation',
      });
      toast.success('Anthropic API key updated successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to update Anthropic API key'));
    } finally {
      setIsSaving(false);
    }
  };

  const maskApiKey = (key: string): string => {
    if (!key || key.length < 8) return key;
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  if (isLoadingElevenLabs || isLoadingAnthropic) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>External API Keys</CardTitle>
          <CardDescription>
            Configure API keys for third-party services used by the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ElevenLabs API Key */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="elevenlabs-key" className="text-base font-semibold">
                ElevenLabs API Key
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Used for text-to-speech voice generation. Get your API key from{' '}
                <a
                  href="https://elevenlabs.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  elevenlabs.io
                </a>
              </p>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  id="elevenlabs-key"
                  type="password"
                  value={elevenLabsKey}
                  onChange={(e) => setElevenLabsKey(e.target.value)}
                  placeholder="sk_..."
                  className="font-mono"
                />
                {elevenLabsConfig?.value && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Current: {maskApiKey(elevenLabsConfig.value)}
                  </p>
                )}
              </div>
              <Button
                onClick={handleSaveElevenLabs}
                disabled={isSaving || !elevenLabsKey.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
            {elevenLabsConfig?.value && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  If you&apos;re experiencing &quot;API key is invalid or expired&quot; errors, update the key above and try again.
                </span>
              </div>
            )}
          </div>

          <div className="border-t pt-6">
            {/* Anthropic API Key */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="anthropic-key" className="text-base font-semibold">
                  Anthropic (Claude) API Key
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Used for AI-powered content generation. Get your API key from{' '}
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    id="anthropic-key"
                    type="password"
                    value={anthropicKey}
                    onChange={(e) => setAnthropicKey(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="font-mono"
                  />
                  {anthropicConfig?.value && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Current: {maskApiKey(anthropicConfig.value)}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleSaveAnthropic}
                  disabled={isSaving || !anthropicKey.trim()}
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NotificationsSettings() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>Configure how you receive notifications</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive notifications via email</p>
            </div>
            <input type="checkbox" defaultChecked className="rounded" />
          </div>
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">SMS Notifications</p>
              <p className="text-sm text-muted-foreground">Receive notifications via SMS</p>
            </div>
            <input type="checkbox" className="rounded" />
          </div>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Preferences
        </Button>
      </CardContent>
    </Card>
  );
}

function Tcpasettings() {
  const { data: config, isLoading } = useTcpaconfig();
  const updateConfig = useUpdateTcpaconfig();
  const [localConfig, setLocalConfig] = useState<Partial<Tcpaconfig>>({});
  const [showViolations, setShowViolations] = useState(false);

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = async () => {
    try {
      await updateConfig.mutateAsync(localConfig);
      toast.success('TCPA settings saved successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to save TCPA settings'));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>TCPA Compliance Settings</CardTitle>
          <CardDescription>
            Configure TCPA (Telephone Consumer Protection Act) compliance rules to ensure legal compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compliance Mode */}
          <div>
            <label className="text-sm font-medium mb-2 block">Compliance Mode</label>
            <select
              value={localConfig.complianceMode || 'STRICT'}
              onChange={(e) =>
                setLocalConfig({ ...localConfig, complianceMode: e.target.value as any })
              }
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="STRICT">Strict - Block all violations</option>
              <option value="MODERATE">Moderate - Block critical violations only</option>
              <option value="PERMISSIVE">Permissive - Log violations but allow execution</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {localConfig.complianceMode === 'STRICT' &&
                'All TCPA violations will block execution'}
              {localConfig.complianceMode === 'MODERATE' &&
                'Critical violations block execution, warnings are logged'}
              {localConfig.complianceMode === 'PERMISSIVE' &&
                'All violations are logged but execution continues'}
            </p>
          </div>

          {/* Time Restrictions */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Time Restrictions</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Allowed Start Hour</label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={localConfig.allowedStartHour || 8}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, allowedStartHour: parseInt(e.target.value) })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Allowed End Hour</label>
                <Input
                  type="number"
                  min="0"
                  max="23"
                  value={localConfig.allowedEndHour || 21}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, allowedEndHour: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium mb-2 block">Allowed Days of Week</label>
              <div className="flex flex-wrap gap-2">
                {daysOfWeek.map((day) => (
                  <label key={day} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={
                        !localConfig.allowedDaysOfWeek ||
                        localConfig.allowedDaysOfWeek.length === 0 ||
                        localConfig.allowedDaysOfWeek.includes(day)
                      }
                      onChange={(e) => {
                        const current = localConfig.allowedDaysOfWeek || [];
                        if (e.target.checked) {
                          if (current.length === 0) {
                            // If empty, add all days
                            setLocalConfig({ ...localConfig, allowedDaysOfWeek: daysOfWeek });
                          } else {
                            setLocalConfig({
                              ...localConfig,
                              allowedDaysOfWeek: [...current, day],
                            });
                          }
                        } else {
                          const filtered = current.filter((d) => d !== day);
                          setLocalConfig({
                            ...localConfig,
                            allowedDaysOfWeek: filtered.length === 0 ? undefined : filtered,
                          });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{day.substring(0, 3)}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Leave all unchecked to allow all days
              </p>
            </div>
          </div>

          {/* Consent Requirements */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Consent Requirements</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.requireExpressConsent ?? true}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, requireExpressConsent: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">Require Express Written Consent</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.requireConsentForAutomated ?? true}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      requireConsentForAutomated: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  Require Consent for Automated Messages
                </span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.requireConsentForMarketing ?? true}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      requireConsentForMarketing: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">Require Consent for Marketing Messages</span>
              </label>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Consent Expiration (Days)
                </label>
                <Input
                  type="number"
                  placeholder="Leave empty for no expiration"
                  value={localConfig.consentExpirationDays || ''}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      consentExpirationDays: e.target.value ? parseInt(e.target.value) : undefined,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty if consent never expires
                </p>
              </div>
            </div>
          </div>

          {/* Opt-Out Handling */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Opt-Out Handling</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.honorOptOuts ?? true}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, honorOptOuts: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">Honor Opt-Outs</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.honorDncList ?? true}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, honorDncList: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">Honor Do Not Call List</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.autoOptOutOnStop ?? true}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, autoOptOutOnStop: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  Automatically Opt-Out on STOP Keyword
                </span>
              </label>
            </div>
          </div>

          {/* Violation Handling */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Violation Handling</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Violation Action</label>
                <select
                  value={localConfig.violationAction || 'BLOCK'}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, violationAction: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="BLOCK">Block Execution</option>
                  <option value="LOG_ONLY">Log Only</option>
                  <option value="PAUSE_JOURNEY">Pause Journey</option>
                  <option value="SKIP_NODE">Skip Node</option>
                </select>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.logViolations ?? true}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, logViolations: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">Log All Violations</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.notifyOnViolation ?? true}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, notifyOnViolation: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">Notify on Violation</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.allowManualOverride ?? true}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, allowManualOverride: e.target.checked })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">Allow Manual Override</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={localConfig.blockNonCompliantJourneys ?? true}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      blockNonCompliantJourneys: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-sm font-medium">Block Non-Compliant Journeys</span>
              </label>
            </div>
          </div>

          {/* Sender Identification */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold mb-4">Sender Identification</h3>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={localConfig.requireSenderIdentification ?? true}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, requireSenderIdentification: e.target.checked })
                }
                className="rounded"
              />
              <span className="text-sm font-medium">Require Sender Identification</span>
            </label>
            {localConfig.requireSenderIdentification && (
              <div>
                <label className="text-sm font-medium mb-2 block">Required Sender Name</label>
                <Input
                  placeholder="Your Company Name"
                  value={localConfig.requiredSenderName || ''}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, requiredSenderName: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This name must appear in all messages
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowViolations(true)}>
              View Violations
            </Button>
            <Button onClick={handleSave} disabled={updateConfig.isPending}>
              {updateConfig.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Violations Dialog */}
      <Dialog open={showViolations} onOpenChange={setShowViolations}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>TCPA Violations</DialogTitle>
            <DialogDescription>View and manage TCPA compliance violations</DialogDescription>
          </DialogHeader>
          <TcpaviolationsList />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TcpaviolationsList() {
  const { data: violations, isLoading } = useTcpaviolations();
  const overrideViolation = useOverrideTcpaviolation();
  const [selectedViolation, setSelectedViolation] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');

  const handleOverride = async () => {
    if (!selectedViolation || !overrideReason) return;
    try {
      await overrideViolation.mutateAsync({
        violationId: selectedViolation,
        reason: overrideReason,
        notes: overrideNotes,
        userId: 'current-user-id', // TODO: Get from auth context
      });
      toast.success('Violation overridden successfully');
      setSelectedViolation(null);
      setOverrideReason('');
      setOverrideNotes('');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to override violation'));
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!violations || violations.length === 0) {
    return (
      <div className="text-center py-12">
        <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No violations found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {violations.map((violation) => (
          <Card key={violation.id}>
            <CardContent className="pt-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant={
                        violation.status === 'BLOCKED'
                          ? 'destructive'
                          : violation.status === 'OVERRIDDEN'
                            ? 'default'
                            : 'secondary'
                      }
                    >
                      {violation.status}
                    </Badge>
                    <Badge variant="outline">{violation.violationType}</Badge>
                  </div>
                  <p className="text-sm font-medium mb-1">{violation.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(violation.createdAt).toLocaleString()}
                  </p>
                  {violation.attemptedAction && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Attempted: {violation.attemptedAction}
                    </p>
                  )}
                </div>
                {violation.status === 'BLOCKED' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedViolation(violation.id)}
                  >
                    Override
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedViolation && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Override Violation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Override Reason</label>
              <Input
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g., EXPRESS_CONSENT, ESTABLISHED_BUSINESS"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
              <Textarea
                value={overrideNotes}
                onChange={(e) => setOverrideNotes(e.target.value)}
                placeholder="Additional notes about this override"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedViolation(null)}>
                Cancel
              </Button>
              <Button onClick={handleOverride} disabled={!overrideReason || overrideViolation.isPending}>
                {overrideViolation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Overriding...
                  </>
                ) : (
                  'Override'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function VoiceNumbersSettings() {
  const { data: dids = [], isLoading } = useVoiceDids();
  const createDid = useCreateVoiceDid();
  const updateDid = useUpdateVoiceDid();
  const deleteDid = useDeleteVoiceDid();
  const importDids = useImportVoiceDids();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingDid, setEditingDid] = useState<any>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Pagination and sorting state
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<'number' | 'status' | 'usageCount' | 'trunk' | 'lastUsed'>('number');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 25;

  const [formData, setFormData] = useState({
    number: '',
    trunk: 'MC',
    status: 'active',
    maxUsage: '',
    provider: '',
    region: '',
    notes: '',
  });

  const handleCreate = async () => {
    try {
      await createDid.mutateAsync({
        number: formData.number,
        trunk: formData.trunk,
        status: formData.status as any,
        maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : undefined,
        metadata: {
          provider: formData.provider || undefined,
          region: formData.region || undefined,
          notes: formData.notes || undefined,
        },
      });
      toast.success('Voice DID created successfully');
      setIsCreateDialogOpen(false);
      setFormData({
        number: '',
        trunk: 'MC',
        status: 'active',
        maxUsage: '',
        provider: '',
        region: '',
        notes: '',
      });
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to create voice DID'));
    }
  };

  const handleEdit = async () => {
    if (!editingDid) return;
    try {
      await updateDid.mutateAsync({
        id: editingDid.id,
        data: {
          trunk: formData.trunk,
          status: formData.status as any,
          maxUsage: formData.maxUsage ? parseInt(formData.maxUsage) : undefined,
          metadata: {
            provider: formData.provider || undefined,
            region: formData.region || undefined,
            notes: formData.notes || undefined,
          },
        },
      });
      toast.success('Voice DID updated successfully');
      setIsEditDialogOpen(false);
      setEditingDid(null);
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to update voice DID'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice DID?')) return;
    try {
      await deleteDid.mutateAsync(id);
      toast.success('Voice DID deleted successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to delete voice DID'));
    }
  };

  const handleImport = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a CSV file');
      return;
    }
    try {
      const result = await importDids.mutateAsync(file);
      toast.success(`Imported ${result.success} voice DIDs successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`);
      setIsImportDialogOpen(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to import voice DIDs'));
    }
  };

  const openEditDialog = (did: any) => {
    setEditingDid(did);
    setFormData({
      number: did.number,
      trunk: did.trunk || 'MC',
      status: did.status || 'active',
      maxUsage: did.maxUsage?.toString() || '',
      provider: did.metadata?.provider || '',
      region: did.metadata?.region || '',
      notes: did.metadata?.notes || '',
    });
    setIsEditDialogOpen(true);
  };

  // Filter and sort DIDs
  const filteredAndSortedDids = dids
    .filter((did) => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        did.number.toLowerCase().includes(query) ||
        did.trunk.toLowerCase().includes(query) ||
        did.status.toLowerCase().includes(query) ||
        did.metadata?.provider?.toLowerCase().includes(query) ||
        did.metadata?.region?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'number':
          aValue = a.number;
          bValue = b.number;
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        case 'usageCount':
          aValue = a.usageCount || 0;
          bValue = b.usageCount || 0;
          break;
        case 'trunk':
          aValue = a.trunk || '';
          bValue = b.trunk || '';
          break;
        case 'lastUsed':
          aValue = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          bValue = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedDids.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDids = filteredAndSortedDids.slice(startIndex, endIndex);

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

  // Reset to first page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Voice Numbers (DIDs)</h2>
        <p className="text-gray-500 mt-1">
          Manage Direct Inward Dialing (DID) numbers for voice calls. DIDs are automatically rotated based on usage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Voice DIDs</CardTitle>
              <CardDescription>
                Manage your voice DID numbers. DIDs are used for outbound voice calls and automatically rotated.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsImportDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add DID
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : dids.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <PhoneCall className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No voice DIDs configured</p>
              <p className="text-sm mt-2">Add a DID manually or import from CSV</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search and Sort Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search DIDs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <select
                    value={sortField}
                    onChange={(e) => handleSort(e.target.value as typeof sortField)}
                    className="rounded-md border border-input bg-background px-3 py-1.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="number">Number</option>
                    <option value="status">Status</option>
                    <option value="usageCount">Usage</option>
                    <option value="trunk">Trunk</option>
                    <option value="lastUsed">Last Used</option>
                  </select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
                  >
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Results count */}
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedDids.length)} of {filteredAndSortedDids.length} DIDs
                {searchQuery && ` (filtered from ${dids.length} total)`}
              </div>

              {/* DIDs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedDids.map((did) => (
                  <Card key={did.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="h-4 w-4 text-gray-400" />
                            <span className="font-mono font-semibold">{did.number}</span>
                          </div>
                          <div className="mt-2 space-y-1 text-sm text-gray-600">
                            <div>Trunk: {did.trunk}</div>
                            <div>Status: <span className={`font-medium ${did.status === 'active' ? 'text-green-600' : 'text-gray-600'}`}>{did.status}</span></div>
                            <div>Usage: {did.usageCount}{did.maxUsage ? ` / ${did.maxUsage}` : ' (unlimited)'}</div>
                            {did.areaCode && <div>Area Code: {did.areaCode}</div>}
                            {did.metadata?.provider && <div>Provider: {did.metadata.provider}</div>}
                            {did.metadata?.region && <div>Region: {did.metadata.region}</div>}
                            {did.lastUsed && <div className="text-xs text-gray-500">Last used: {new Date(did.lastUsed).toLocaleDateString()}</div>}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(did)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(did.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="min-w-[2.5rem]"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Voice DID</DialogTitle>
            <DialogDescription>
              Add a new voice DID number for outbound calls.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Phone Number *</label>
              <Input
                placeholder="+14045556789"
                value={formData.number}
                onChange={(e) => setFormData({ ...formData, number: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Trunk</label>
              <Input
                placeholder="MC"
                value={formData.trunk}
                onChange={(e) => setFormData({ ...formData, trunk: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="available">Available</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Max Usage (optional)</label>
              <Input
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.maxUsage}
                onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Provider (optional)</label>
              <Input
                placeholder="Provider name"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Region (optional)</label>
              <Input
                placeholder="US-East"
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                placeholder="Additional notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={!formData.number || createDid.isPending}>
                {createDid.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Voice DID</DialogTitle>
            <DialogDescription>
              Update voice DID settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Phone Number</label>
              <Input value={formData.number} disabled />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Trunk</label>
              <Input
                value={formData.trunk}
                onChange={(e) => setFormData({ ...formData, trunk: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Status</label>
              <select
                className="w-full px-3 py-2 border rounded-md"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="available">Available</option>
                <option value="inactive">Inactive</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Max Usage (optional)</label>
              <Input
                type="number"
                placeholder="Leave empty for unlimited"
                value={formData.maxUsage}
                onChange={(e) => setFormData({ ...formData, maxUsage: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Provider (optional)</label>
              <Input
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Region (optional)</label>
              <Input
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Notes (optional)</label>
              <textarea
                className="w-full px-3 py-2 border rounded-md"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={updateDid.isPending}>
                {updateDid.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Voice DIDs from CSV</DialogTitle>
            <DialogDescription>
              Import multiple voice DIDs from a CSV file. CSV should include columns: number, trunk, status, maxUsage, provider, region, notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">CSV File</label>
              <Input
                type="file"
                accept=".csv"
                ref={fileInputRef}
              />
            </div>
            <div className="text-xs text-gray-500">
              <p>CSV Format:</p>
              <pre className="mt-1 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
{`number,trunk,status,maxUsage,provider,region,notes
+14045556789,MC,active,1000,Provider A,US-East,Main DID
+14045556790,MC,active,500,Provider A,US-East,Backup DID`}
              </pre>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={importDids.isPending}>
                {importDids.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importing...
                  </>
                ) : (
                  'Import'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CrmIntegrationsSettings() {
  const { data: integrations, isLoading } = useCrmIntegrations();
  const createIntegration = useCreateCrmIntegration();
  const updateIntegration = useUpdateCrmIntegration();
  const deleteIntegration = useDeleteCrmIntegration();
  const testConnection = useTestCrmConnection();
  const { data: linkStatus } = useQuery({
    queryKey: ['account-link-status'],
    queryFn: async () => {
      try {
        const response = await apiClient.get('/marketplace/account-linking/status-from-engine');
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
      toast.error(getErrorMessage(error, 'Failed to create CRM integration'));
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
      toast.error(getErrorMessage(error, 'Failed to update CRM integration'));
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
      toast.error(getErrorMessage(error, 'Failed to delete CRM integration'));
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
      toast.error(getErrorMessage(error, 'Connection test failed'));
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
                  CRM integrations will sync to your Marketplace account when enabled
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
                              Synced to Marketplace
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
                      <option value={SyncDirection.ENGINE_TO_CRM}>Engine → CRM</option>
                      <option value={SyncDirection.CRM_TO_ENGINE}>CRM → Engine</option>
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
                        Sync to linked Marketplace account
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
