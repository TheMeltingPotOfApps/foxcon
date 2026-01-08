'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select } from '@/components/ui/select';
import { marketplaceApiClient } from '@/lib/api/marketplace-client';
import { motion } from 'framer-motion';
import { Database, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Permission {
  resourceType: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  sharingDirection: string;
}

export default function DataSharingPage() {
  const [linkStatus, setLinkStatus] = useState<any>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPermissions();
  }, []);

  const loadPermissions = async () => {
    try {
      const response = await marketplaceApiClient.get('/marketplace/account-linking/status');
      setLinkStatus(response.data);
      
      if (response.data?.permissions) {
        setPermissions(response.data.permissions);
      } else {
        // Default permissions
        setPermissions([
          {
            resourceType: 'CONTACTS',
            canRead: true,
            canWrite: true,
            canDelete: false,
            sharingDirection: 'BIDIRECTIONAL',
          },
          {
            resourceType: 'CAMPAIGNS',
            canRead: true,
            canWrite: false,
            canDelete: false,
            sharingDirection: 'ENGINE_TO_MARKETPLACE',
          },
        ]);
      }
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Please link your accounts first');
      } else {
        console.error('Failed to load permissions:', error);
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = (index: number, field: string, value: any) => {
    const updated = [...permissions];
    updated[index] = { ...updated[index], [field]: value };
    setPermissions(updated);
  };

  const handleSave = async () => {
    if (!linkStatus?.link?.id) {
      toast.error('Please link your accounts first');
      return;
    }

    setSaving(true);
    try {
      await marketplaceApiClient.post(`/marketplace/account-linking/permissions/${linkStatus.link.id}`, {
        permissions,
      });
      toast.success('Data sharing permissions updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!linkStatus?.linked) {
    return (
      <div className="container mx-auto py-8 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Please link your accounts first to configure data sharing
              </p>
              <Button onClick={() => window.location.href = '/marketplace/account-linking'}>
                Go to Account Linking
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const resourceTypes = [
    { value: 'CONTACTS', label: 'Contacts' },
    { value: 'CAMPAIGNS', label: 'Campaigns' },
    { value: 'JOURNEYS', label: 'Journeys' },
    { value: 'TEMPLATES', label: 'Templates' },
  ];

  const directions = [
    { value: 'ENGINE_TO_MARKETPLACE', label: 'Engine → Marketplace' },
    { value: 'MARKETPLACE_TO_ENGINE', label: 'Marketplace → Engine' },
    { value: 'BIDIRECTIONAL', label: 'Bidirectional' },
  ];

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Sharing Settings</h1>
          <p className="text-muted-foreground mt-2">
            Configure what data can be shared between your marketplace and engine accounts
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Sharing Permissions
            </CardTitle>
            <CardDescription>
              Control access to your data across platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {permissions.map((permission, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="p-4 rounded-lg border space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">
                      {resourceTypes.find(r => r.value === permission.resourceType)?.label || permission.resourceType}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Control {permission.resourceType.toLowerCase()} sharing
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Read Access</Label>
                      <p className="text-xs text-muted-foreground">View data from other platform</p>
                    </div>
                    <Switch
                      checked={permission.canRead}
                      onCheckedChange={(checked) => updatePermission(index, 'canRead', checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Write Access</Label>
                      <p className="text-xs text-muted-foreground">Create/update data in other platform</p>
                    </div>
                    <Switch
                      checked={permission.canWrite}
                      onCheckedChange={(checked) => updatePermission(index, 'canWrite', checked)}
                      disabled={!permission.canRead}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Delete Access</Label>
                      <p className="text-xs text-muted-foreground">Remove data from other platform</p>
                    </div>
                    <Switch
                      checked={permission.canDelete}
                      onCheckedChange={(checked) => updatePermission(index, 'canDelete', checked)}
                      disabled={!permission.canWrite}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Sharing Direction</Label>
                    <Select
                      value={permission.sharingDirection}
                      onChange={(e) => updatePermission(index, 'sharingDirection', e.target.value)}
                      className="w-full"
                    >
                      {directions.map((dir) => (
                        <option key={dir.value} value={dir.value}>
                          {dir.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              </motion.div>
            ))}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Permissions
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About Data Sharing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-semibold">Secure & Private</p>
                <p className="text-sm text-muted-foreground">
                  Your data is encrypted and only shared according to your permissions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-semibold">Granular Control</p>
                <p className="text-sm text-muted-foreground">
                  Set different permissions for each resource type
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
              <div>
                <p className="font-semibold">Change Anytime</p>
                <p className="text-sm text-muted-foreground">
                  Update your sharing preferences at any time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

