'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useAllTenants,
  useTenantDetails,
  useCreateTenant,
  useUpdateTenant,
  useDeleteTenant,
  useChangeTenantPlan,
} from '@/lib/hooks/use-super-admin';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  Loader2,
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const PLAN_TYPES = ['free', 'starter', 'professional', 'enterprise'] as const;
const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

export default function SuperAdminTenantsPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<any>(null);
  const [newTenant, setNewTenant] = useState({
    name: '',
    slug: '',
    timezone: 'America/New_York',
    planType: 'starter' as string,
    ownerEmail: '',
    ownerPassword: '',
  });

  const { data: tenants, isLoading, refetch } = useAllTenants();
  const { data: tenantDetails } = useTenantDetails(selectedTenantId || '');
  const createTenant = useCreateTenant();
  const updateTenant = useUpdateTenant();
  const deleteTenant = useDeleteTenant();
  const changePlan = useChangeTenantPlan();

  const handleCreateTenant = async () => {
    try {
      await createTenant.mutateAsync(newTenant);
      toast.success('Tenant created successfully');
      setShowCreateDialog(false);
      setNewTenant({
        name: '',
        slug: '',
        timezone: 'America/New_York',
        planType: 'starter',
        ownerEmail: '',
        ownerPassword: '',
      });
      refetch();
    } catch (error: any) {
      toast.error('Failed to create tenant', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  const handleUpdateTenant = async (tenantId: string, updates: any) => {
    try {
      await updateTenant.mutateAsync({ tenantId, data: updates });
      toast.success('Tenant updated successfully');
      setEditingTenant(null);
      refetch();
    } catch (error: any) {
      toast.error('Failed to update tenant', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('Are you sure you want to delete this tenant? This will deactivate the tenant.')) {
      return;
    }
    try {
      await deleteTenant.mutateAsync(tenantId);
      toast.success('Tenant deleted successfully');
      refetch();
    } catch (error: any) {
      toast.error('Failed to delete tenant', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  const handleChangePlan = async (tenantId: string, planType: string) => {
    if (!confirm(`Change tenant plan to ${PLAN_LABELS[planType]}?`)) {
      return;
    }
    try {
      await changePlan.mutateAsync({ tenantId, planType, prorate: true });
      toast.success('Plan changed successfully');
      refetch();
      if (selectedTenantId === tenantId) {
        // Refetch tenant details
        window.location.reload();
      }
    } catch (error: any) {
      toast.error('Failed to change plan', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tenant Management</h1>
          <p className="text-muted-foreground mt-2">
            Create, update, and manage all tenants in the system
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tenant
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Tenant</DialogTitle>
              <DialogDescription>
                Create a new tenant organization. Optionally create an owner user.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Tenant Name *</Label>
                <Input
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  placeholder="Company Name"
                />
              </div>
              <div>
                <Label>Slug (optional)</Label>
                <Input
                  value={newTenant.slug}
                  onChange={(e) => setNewTenant({ ...newTenant, slug: e.target.value })}
                  placeholder="company-name"
                />
              </div>
              <div>
                <Label>Timezone</Label>
                <Input
                  value={newTenant.timezone}
                  onChange={(e) => setNewTenant({ ...newTenant, timezone: e.target.value })}
                  placeholder="America/New_York"
                />
              </div>
              <div>
                <Label>Initial Plan</Label>
                <Select
                  value={newTenant.planType}
                  onChange={(e) => setNewTenant({ ...newTenant, planType: e.target.value })}
                >
                  {PLAN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PLAN_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="pt-4 border-t">
                <Label className="text-base font-semibold">Owner User (Optional)</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  Create an owner user for this tenant
                </p>
                <div className="space-y-4">
                  <div>
                    <Label>Owner Email</Label>
                    <Input
                      type="email"
                      value={newTenant.ownerEmail}
                      onChange={(e) => setNewTenant({ ...newTenant, ownerEmail: e.target.value })}
                      placeholder="owner@company.com"
                    />
                  </div>
                  <div>
                    <Label>Owner Password</Label>
                    <Input
                      type="password"
                      value={newTenant.ownerPassword}
                      onChange={(e) => setNewTenant({ ...newTenant, ownerPassword: e.target.value })}
                      placeholder="Secure password"
                    />
                  </div>
                </div>
              </div>
              <Button
                onClick={handleCreateTenant}
                disabled={createTenant.isPending || !newTenant.name}
                className="w-full"
              >
                {createTenant.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Tenant
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>All Tenants</CardTitle>
                <CardDescription>{tenants?.length || 0} tenants total</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {tenants?.map((tenant: any) => (
                    <div
                      key={tenant.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedTenantId === tenant.id ? 'border-primary bg-primary/5' : 'hover:bg-accent/50'
                      }`}
                      onClick={() => setSelectedTenantId(tenant.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span className="font-semibold">{tenant.name}</span>
                            {tenant.isActive ? (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          {tenant.billing?.planType && (
                            <Badge variant="outline" className="mt-1">
                              {PLAN_LABELS[tenant.billing.planType] || tenant.billing.planType}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingTenant(tenant);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTenant(tenant.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Created {format(new Date(tenant.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            {selectedTenantId && tenantDetails ? (
              <Card>
                <CardHeader>
                  <CardTitle>Tenant Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-sm font-semibold">Plan</Label>
                    <Select
                      value={tenantDetails.tenant?.billing?.planType || 'free'}
                      onChange={(e) => handleChangePlan(selectedTenantId, e.target.value)}
                    >
                      {PLAN_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {PLAN_LABELS[type]}
                        </option>
                      ))}
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <p className="text-sm text-muted-foreground">Users</p>
                      <p className="text-2xl font-bold">{tenantDetails.userCount || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Contacts</p>
                      <p className="text-2xl font-bold">{tenantDetails.contacts || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Campaigns</p>
                      <p className="text-2xl font-bold">{tenantDetails.campaigns || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Journeys</p>
                      <p className="text-2xl font-bold">{tenantDetails.journeys || 0}</p>
                    </div>
                  </div>

                  {tenantDetails.subscription && (
                    <div className="pt-4 border-t">
                      <Label className="text-sm font-semibold">Subscription</Label>
                      <div className="mt-2 space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <Badge>{tenantDetails.subscription.status}</Badge>
                        </div>
                        {tenantDetails.subscription.currentPeriodEnd && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Renews:</span>
                            <span>{format(new Date(tenantDetails.subscription.currentPeriodEnd), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select a tenant to view details
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Edit Tenant Dialog */}
      {editingTenant && (
        <Dialog open={!!editingTenant} onOpenChange={() => setEditingTenant(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Tenant</DialogTitle>
            </DialogHeader>
            <EditTenantForm
              tenant={editingTenant}
              onSave={(updates) => {
                handleUpdateTenant(editingTenant.id, updates);
              }}
              onCancel={() => setEditingTenant(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditTenantForm({ tenant, onSave, onCancel }: { tenant: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const [updates, setUpdates] = useState({
    name: tenant.name || '',
    slug: tenant.slug || '',
    timezone: tenant.timezone || 'America/New_York',
    isActive: tenant.isActive ?? true,
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Name</Label>
        <Input
          value={updates.name}
          onChange={(e) => setUpdates({ ...updates, name: e.target.value })}
        />
      </div>
      <div>
        <Label>Slug</Label>
        <Input
          value={updates.slug}
          onChange={(e) => setUpdates({ ...updates, slug: e.target.value })}
        />
      </div>
      <div>
        <Label>Timezone</Label>
        <Input
          value={updates.timezone}
          onChange={(e) => setUpdates({ ...updates, timezone: e.target.value })}
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isActive"
          checked={updates.isActive}
          onChange={(e) => setUpdates({ ...updates, isActive: e.target.checked })}
          className="rounded"
        />
        <Label htmlFor="isActive">Active</Label>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => onSave(updates)} className="flex-1">
          Save
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  );
}

