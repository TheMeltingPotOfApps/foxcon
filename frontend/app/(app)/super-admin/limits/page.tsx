'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useTenantLimitsAdmin,
  useUpdateTenantLimitsAdmin,
  useUpdateTenantPlanAdmin,
} from '@/lib/hooks/use-super-admin';
import {
  usePricingPlansAdmin,
  useCreatePricingPlanAdmin,
  useUpdatePricingPlanAdmin,
  useDeletePricingPlanAdmin,
  useSetDefaultPricingPlanAdmin,
} from '@/lib/hooks/use-super-admin';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';
import {
  Users,
  MessageSquare,
  Phone,
  Sparkles,
  Settings,
  Plus,
  Trash2,
  Star,
  Save,
  Loader2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function SuperAdminLimitsPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [showCreatePlanDialog, setShowCreatePlanDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  // Fetch tenants
  const { data: tenants } = useQuery({
    queryKey: ['super-admin', 'tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/tenants');
      return response.data;
    },
  });

  // Fetch tenant limits
  const { data: tenantLimits, isLoading: limitsLoading } = useTenantLimitsAdmin(selectedTenantId);
  const updateLimits = useUpdateTenantLimitsAdmin();
  const updatePlan = useUpdateTenantPlanAdmin();

  // Fetch pricing plans
  const { data: pricingPlans, isLoading: plansLoading } = usePricingPlansAdmin();
  const createPlan = useCreatePricingPlanAdmin();
  const updatePlanMutation = useUpdatePricingPlanAdmin();
  const deletePlan = useDeletePricingPlanAdmin();
  const setDefaultPlan = useSetDefaultPricingPlanAdmin();

  const handleUpdateLimits = async (updates: any) => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant first');
      return;
    }
    try {
      await updateLimits.mutateAsync({ tenantId: selectedTenantId, updates });
      toast.success('Limits updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update limits');
    }
  };

  const handleUpdatePlan = async (planName: string) => {
    if (!selectedTenantId) {
      toast.error('Please select a tenant first');
      return;
    }
    try {
      await updatePlan.mutateAsync({ tenantId: selectedTenantId, planName });
      toast.success('Plan updated successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update plan');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tenant Limits & Pricing Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage tenant limits, restrictions, and pricing plans
        </p>
      </div>

      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">Tenant Limits</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Tenant</CardTitle>
              <CardDescription>Choose a tenant to manage their limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>Tenant</Label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                >
                  <option value="">Select a tenant...</option>
                  {tenants?.map((tenant: any) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name}
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>

          {selectedTenantId && tenantLimits && (
            <Card>
              <CardHeader>
                <CardTitle>Current Limits</CardTitle>
                <CardDescription>Plan: {tenantLimits.planType}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* SMS Limits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>SMS Limit</Label>
                    <Badge>
                      {tenantLimits.smsUsed} / {tenantLimits.smsLimit === 0 ? '∞' : tenantLimits.smsLimit}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={tenantLimits.smsLimit}
                      onChange={(e) => {
                        handleUpdateLimits({ smsLimit: parseInt(e.target.value) || 0 });
                      }}
                    />
                    <Button
                      onClick={() => handleUpdateLimits({ smsUsed: 0 })}
                      variant="outline"
                    >
                      Reset Usage
                    </Button>
                  </div>
                </div>

                {/* Call Limits */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Call Limit</Label>
                    <Badge>
                      {tenantLimits.callUsed} / {tenantLimits.callLimit === 0 ? '∞' : tenantLimits.callLimit}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={tenantLimits.callLimit}
                      onChange={(e) => {
                        handleUpdateLimits({ callLimit: parseInt(e.target.value) || 0 });
                      }}
                    />
                    <Button
                      onClick={() => handleUpdateLimits({ callUsed: 0 })}
                      variant="outline"
                    >
                      Reset Usage
                    </Button>
                  </div>
                </div>

                {/* AI Limits */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>AI Messages</Label>
                    <Input
                      type="number"
                      value={tenantLimits.aiMessageLimit}
                      onChange={(e) => {
                        handleUpdateLimits({ aiMessageLimit: parseInt(e.target.value) || 0 });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AI Voice</Label>
                    <Input
                      type="number"
                      value={tenantLimits.aiVoiceLimit}
                      onChange={(e) => {
                        handleUpdateLimits({ aiVoiceLimit: parseInt(e.target.value) || 0 });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>AI Templates</Label>
                    <Input
                      type="number"
                      value={tenantLimits.aiTemplateLimit}
                      onChange={(e) => {
                        handleUpdateLimits({ aiTemplateLimit: parseInt(e.target.value) || 0 });
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Content AI</Label>
                    <Input
                      type="number"
                      value={tenantLimits.contentAiLimit}
                      onChange={(e) => {
                        handleUpdateLimits({ contentAiLimit: parseInt(e.target.value) || 0 });
                      }}
                    />
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="space-y-2">
                  <Label>Change Plan</Label>
                  <select
                    className="w-full p-2 border rounded-md"
                    value={tenantLimits.planType}
                    onChange={(e) => handleUpdatePlan(e.target.value)}
                  >
                    {pricingPlans?.map((plan) => (
                      <option key={plan.id} value={plan.name}>
                        {plan.displayName || plan.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Restrictions */}
                <div className="space-y-2">
                  <Label>Feature Restrictions</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(tenantLimits.restrictions || {}).map(([key, value]) => (
                      <label key={key} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={value === true}
                          onChange={(e) => {
                            handleUpdateLimits({
                              restrictions: {
                                ...tenantLimits.restrictions,
                                [key]: e.target.checked,
                              },
                            });
                          }}
                        />
                        <span className="text-sm">{key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Pricing Plans</CardTitle>
                  <CardDescription>Manage pricing plans and their limits</CardDescription>
                </div>
                <Dialog open={showCreatePlanDialog} onOpenChange={setShowCreatePlanDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Plan
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Pricing Plan</DialogTitle>
                      <DialogDescription>
                        Create a new pricing plan with limits and restrictions
                      </DialogDescription>
                    </DialogHeader>
                    <CreatePlanForm
                      onSuccess={() => {
                        setShowCreatePlanDialog(false);
                        toast.success('Plan created successfully');
                      }}
                      onCancel={() => setShowCreatePlanDialog(false)}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {plansLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                ) : pricingPlans?.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No pricing plans found</p>
                ) : (
                  pricingPlans?.map((plan) => (
                    <Card key={plan.id}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CardTitle>{plan.displayName || plan.name}</CardTitle>
                            {plan.isDefault && (
                              <Badge variant="default">
                                <Star className="h-3 w-3 mr-1" />
                                Default
                              </Badge>
                            )}
                            {!plan.isActive && (
                              <Badge variant="secondary">Inactive</Badge>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setEditingPlan(plan)}
                            >
                              Edit
                            </Button>
                            {!plan.isDefault && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    await setDefaultPlan.mutateAsync(plan.id);
                                    toast.success('Default plan updated');
                                  } catch (error: any) {
                                    toast.error('Failed to set default plan');
                                  }
                                }}
                              >
                                Set Default
                              </Button>
                            )}
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={async () => {
                                if (confirm('Are you sure you want to delete this plan?')) {
                                  try {
                                    await deletePlan.mutateAsync(plan.id);
                                    toast.success('Plan deleted');
                                  } catch (error: any) {
                                    toast.error('Failed to delete plan');
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">SMS:</span> {plan.smsLimit === 0 ? '∞' : plan.smsLimit}
                          </div>
                          <div>
                            <span className="font-medium">Calls:</span> {plan.callLimit === 0 ? '∞' : plan.callLimit}
                          </div>
                          <div>
                            <span className="font-medium">AI Messages:</span> {plan.aiMessageLimit === 0 ? '∞' : plan.aiMessageLimit}
                          </div>
                          <div>
                            <span className="font-medium">AI Voice:</span> {plan.aiVoiceLimit === 0 ? '∞' : plan.aiVoiceLimit}
                          </div>
                          <div>
                            <span className="font-medium">AI Templates:</span> {plan.aiTemplateLimit === 0 ? '∞' : plan.aiTemplateLimit}
                          </div>
                          <div>
                            <span className="font-medium">Content AI:</span> {plan.contentAiLimit === 0 ? '∞' : plan.contentAiLimit}
                          </div>
                        </div>
                        {plan.monthlyPrice && (
                          <div className="mt-4">
                            <span className="font-medium">Monthly Price:</span> ${plan.monthlyPrice}
                            {plan.yearlyPrice && (
                              <span className="ml-4">
                                <span className="font-medium">Yearly Price:</span> ${plan.yearlyPrice}
                              </span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {editingPlan && (
        <Dialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Pricing Plan</DialogTitle>
              <DialogDescription>
                Update plan limits and restrictions
              </DialogDescription>
            </DialogHeader>
            <EditPlanForm
              plan={editingPlan}
              onSuccess={() => {
                setEditingPlan(null);
                toast.success('Plan updated successfully');
              }}
              onCancel={() => setEditingPlan(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function CreatePlanForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const createPlan = useCreatePricingPlanAdmin();
  const [formData, setFormData] = useState({
    name: '',
    displayName: '',
    description: '',
    smsLimit: 0,
    callLimit: 0,
    aiMessageLimit: 0,
    aiVoiceLimit: 0,
    aiTemplateLimit: 0,
    contentAiLimit: 0,
    monthlyPrice: '',
    yearlyPrice: '',
    trialDays: '',
    restrictions: {
      canSendSMS: true,
      canMakeCalls: true,
      canUseAI: true,
      canUseVoiceAI: true,
      canUseContentAI: true,
      canCreateJourneys: true,
      canCreateCampaigns: true,
      canUseScheduling: true,
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPlan.mutateAsync({
        ...formData,
        monthlyPrice: formData.monthlyPrice ? parseFloat(formData.monthlyPrice) : undefined,
        yearlyPrice: formData.yearlyPrice ? parseFloat(formData.yearlyPrice) : undefined,
        trialDays: formData.trialDays ? parseInt(formData.trialDays) : undefined,
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create plan');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Plan Name (ID)</Label>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="basic, pro, enterprise"
          required
        />
      </div>
      <div>
        <Label>Display Name</Label>
        <Input
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          placeholder="Basic Plan"
        />
      </div>
      <div>
        <Label>Description</Label>
        <textarea
          className="w-full p-2 border rounded-md"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>SMS Limit (0 = unlimited)</Label>
          <Input
            type="number"
            value={formData.smsLimit}
            onChange={(e) => setFormData({ ...formData, smsLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Call Limit (0 = unlimited)</Label>
          <Input
            type="number"
            value={formData.callLimit}
            onChange={(e) => setFormData({ ...formData, callLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>AI Message Limit</Label>
          <Input
            type="number"
            value={formData.aiMessageLimit}
            onChange={(e) => setFormData({ ...formData, aiMessageLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>AI Voice Limit</Label>
          <Input
            type="number"
            value={formData.aiVoiceLimit}
            onChange={(e) => setFormData({ ...formData, aiVoiceLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>AI Template Limit</Label>
          <Input
            type="number"
            value={formData.aiTemplateLimit}
            onChange={(e) => setFormData({ ...formData, aiTemplateLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Content AI Limit</Label>
          <Input
            type="number"
            value={formData.contentAiLimit}
            onChange={(e) => setFormData({ ...formData, contentAiLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Monthly Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.monthlyPrice}
            onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
          />
        </div>
        <div>
          <Label>Yearly Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.yearlyPrice}
            onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
          />
        </div>
        <div>
          <Label>Trial Days</Label>
          <Input
            type="number"
            value={formData.trialDays}
            onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Feature Restrictions</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {Object.keys(formData.restrictions).map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.restrictions[key as keyof typeof formData.restrictions]}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    restrictions: {
                      ...formData.restrictions,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
              <span className="text-sm">{key}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createPlan.isPending}>
          {createPlan.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Plan'
          )}
        </Button>
      </div>
    </form>
  );
}

function EditPlanForm({
  plan,
  onSuccess,
  onCancel,
}: {
  plan: any;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const updatePlan = useUpdatePricingPlanAdmin();
  const [formData, setFormData] = useState({
    displayName: plan.displayName || '',
    description: plan.description || '',
    smsLimit: plan.smsLimit || 0,
    callLimit: plan.callLimit || 0,
    aiMessageLimit: plan.aiMessageLimit || 0,
    aiVoiceLimit: plan.aiVoiceLimit || 0,
    aiTemplateLimit: plan.aiTemplateLimit || 0,
    contentAiLimit: plan.contentAiLimit || 0,
    monthlyPrice: plan.monthlyPrice?.toString() || '',
    yearlyPrice: plan.yearlyPrice?.toString() || '',
    trialDays: plan.trialDays?.toString() || '',
    isActive: plan.isActive ?? true,
    restrictions: plan.restrictions || {},
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePlan.mutateAsync({
        id: plan.id,
        data: {
          ...formData,
          monthlyPrice: formData.monthlyPrice ? parseFloat(formData.monthlyPrice) : undefined,
          yearlyPrice: formData.yearlyPrice ? parseFloat(formData.yearlyPrice) : undefined,
          trialDays: formData.trialDays ? parseInt(formData.trialDays) : undefined,
        },
      });
      onSuccess();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update plan');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Display Name</Label>
        <Input
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
        />
      </div>
      <div>
        <Label>Description</Label>
        <textarea
          className="w-full p-2 border rounded-md"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>SMS Limit (0 = unlimited)</Label>
          <Input
            type="number"
            value={formData.smsLimit}
            onChange={(e) => setFormData({ ...formData, smsLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Call Limit (0 = unlimited)</Label>
          <Input
            type="number"
            value={formData.callLimit}
            onChange={(e) => setFormData({ ...formData, callLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>AI Message Limit</Label>
          <Input
            type="number"
            value={formData.aiMessageLimit}
            onChange={(e) => setFormData({ ...formData, aiMessageLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>AI Voice Limit</Label>
          <Input
            type="number"
            value={formData.aiVoiceLimit}
            onChange={(e) => setFormData({ ...formData, aiVoiceLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>AI Template Limit</Label>
          <Input
            type="number"
            value={formData.aiTemplateLimit}
            onChange={(e) => setFormData({ ...formData, aiTemplateLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Content AI Limit</Label>
          <Input
            type="number"
            value={formData.contentAiLimit}
            onChange={(e) => setFormData({ ...formData, contentAiLimit: parseInt(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Monthly Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.monthlyPrice}
            onChange={(e) => setFormData({ ...formData, monthlyPrice: e.target.value })}
          />
        </div>
        <div>
          <Label>Yearly Price ($)</Label>
          <Input
            type="number"
            step="0.01"
            value={formData.yearlyPrice}
            onChange={(e) => setFormData({ ...formData, yearlyPrice: e.target.value })}
          />
        </div>
        <div>
          <Label>Trial Days</Label>
          <Input
            type="number"
            value={formData.trialDays}
            onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
          />
        </div>
        <div>
          <Label>Active</Label>
          <select
            className="w-full p-2 border rounded-md"
            value={formData.isActive.toString()}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </div>
      <div>
        <Label>Feature Restrictions</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {Object.keys(formData.restrictions).map((key) => (
            <label key={key} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.restrictions[key as keyof typeof formData.restrictions] === true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    restrictions: {
                      ...formData.restrictions,
                      [key]: e.target.checked,
                    },
                  })
                }
              />
              <span className="text-sm">{key}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={updatePlan.isPending}>
          {updatePlan.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            'Update Plan'
          )}
        </Button>
      </div>
    </form>
  );
}

