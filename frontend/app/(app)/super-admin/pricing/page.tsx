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
import { useStripePricing, useCreateStripePrice, useUpdateStripePricing } from '@/lib/hooks/use-super-admin';
import { toast } from 'sonner';
import { DollarSign, Plus, Edit, Save, Loader2, Copy, CheckCircle2 } from 'lucide-react';

const PLAN_TYPES = ['free', 'starter', 'professional', 'enterprise'] as const;
const PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  starter: 'Starter',
  professional: 'Professional',
  enterprise: 'Enterprise',
};

function EditPriceIdForm({ planType, currentPriceId, priceId, onPriceIdChange, onSave, onCancel }: {
  planType: string;
  currentPriceId: string;
  priceId: string;
  onPriceIdChange: (priceId: string) => void;
  onSave: (priceId: string) => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label>Update Price ID</Label>
      <div className="flex gap-2">
        <Input
          value={priceId}
          onChange={(e) => onPriceIdChange(e.target.value)}
          placeholder="price_xxxxx"
          className="font-mono text-sm"
        />
        <Button
          size="sm"
          onClick={() => {
            if (priceId) {
              onSave(priceId);
            }
          }}
        >
          <Save className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default function SuperAdminPricingPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [editingPriceIds, setEditingPriceIds] = useState<Record<string, string>>({});
  const [newPrice, setNewPrice] = useState({ planType: 'starter', amount: 0, interval: 'month' as 'month' | 'year' });
  const [copiedPriceId, setCopiedPriceId] = useState<string | null>(null);

  const { data: pricing, isLoading, refetch } = useStripePricing();
  const createPrice = useCreateStripePrice();
  const updatePricing = useUpdateStripePricing();

  const handleCreatePrice = async () => {
    try {
      const result = await createPrice.mutateAsync({
        planType: newPrice.planType,
        amount: newPrice.amount,
        interval: newPrice.interval,
      });
      
      toast.success('Price created successfully!', {
        description: `Add to .env: STRIPE_PRICE_${newPrice.planType.toUpperCase()}=${result.priceId}`,
        duration: 10000,
      });
      
      setShowCreateDialog(false);
      setNewPrice({ planType: 'starter', amount: 0, interval: 'month' });
      refetch();
    } catch (error: any) {
      toast.error('Failed to create price', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  const handleUpdatePriceId = async (planType: string, priceId: string) => {
    try {
      await updatePricing.mutateAsync({
        planType,
        stripePriceId: priceId,
      });
      
      toast.success('Price ID updated', {
        description: 'Update .env file and restart backend to apply changes',
        duration: 8000,
      });
      
      setEditingPlan(null);
    } catch (error: any) {
      toast.error('Failed to update price', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPriceId(text);
    setTimeout(() => setCopiedPriceId(null), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stripe Pricing Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage Stripe products and prices. Changes require .env updates and backend restart.
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create New Price
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Stripe Price</DialogTitle>
              <DialogDescription>
                Create a new price in Stripe. You&apos;ll need to add the price ID to .env after creation.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Plan Type</Label>
                <Select
                  value={newPrice.planType}
                  onChange={(e) => setNewPrice({ ...newPrice, planType: e.target.value })}
                >
                  {PLAN_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {PLAN_LABELS[type]}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label>Amount (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newPrice.amount}
                  onChange={(e) => setNewPrice({ ...newPrice, amount: parseFloat(e.target.value) || 0 })}
                  placeholder="29.99"
                />
              </div>
              <div>
                <Label>Billing Interval</Label>
                <Select
                  value={newPrice.interval}
                  onChange={(e) => setNewPrice({ ...newPrice, interval: e.target.value as 'month' | 'year' })}
                >
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </Select>
              </div>
              <Button
                onClick={handleCreatePrice}
                disabled={createPrice.isPending || newPrice.amount <= 0}
                className="w-full"
              >
                {createPrice.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Price
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {PLAN_TYPES.map((planType) => {
            const planData = pricing?.[planType];
            
            return (
              <Card key={planType}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">{PLAN_LABELS[planType]}</CardTitle>
                    <Badge variant={planData?.priceId ? 'default' : 'secondary'}>
                      {planData?.priceId ? 'Configured' : 'Not Set'}
                    </Badge>
                  </div>
                  <CardDescription>
                    {planData?.currentPrice !== undefined
                      ? `$${planData.currentPrice.toFixed(2)}/${planData.interval || 'month'}`
                      : 'No price configured'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {planData?.priceId && (
                    <div className="space-y-2">
                      <Label>Stripe Price ID</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          value={planData.priceId}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(planData.priceId)}
                        >
                          {copiedPriceId === planData.priceId ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Environment Variable: STRIPE_PRICE_{planType.toUpperCase()}
                      </p>
                    </div>
                  )}

                  {editingPlan === planType ? (
                    <EditPriceIdForm
                      planType={planType}
                      currentPriceId={planData?.priceId || ''}
                      priceId={editingPriceIds[planType] || planData?.priceId || ''}
                      onPriceIdChange={(priceId) => setEditingPriceIds({ ...editingPriceIds, [planType]: priceId })}
                      onSave={(priceId) => {
                        handleUpdatePriceId(planType, priceId);
                        setEditingPlan(null);
                        setEditingPriceIds({ ...editingPriceIds, [planType]: '' });
                      }}
                      onCancel={() => {
                        setEditingPlan(null);
                        setEditingPriceIds({ ...editingPriceIds, [planType]: '' });
                      }}
                    />
                  ) : (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setEditingPlan(planType);
                        setEditingPriceIds({ ...editingPriceIds, [planType]: planData?.priceId || '' });
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Update Price ID
                    </Button>
                  )}

                  {planData && (
                    <div className="pt-4 border-t space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Currency:</span>
                        <span className="font-medium">{planData.currency?.toUpperCase() || 'USD'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Interval:</span>
                        <span className="font-medium capitalize">{planData.interval || 'month'}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
        <CardHeader>
          <CardTitle className="text-lg">⚠️ Important Notes</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p>
            • After creating or updating prices, you must add the price IDs to your <code className="bg-background px-1 py-0.5 rounded">.env</code> file
          </p>
          <p>
            • Restart the backend after updating <code className="bg-background px-1 py-0.5 rounded">.env</code> for changes to take effect
          </p>
          <p>
            • Price IDs start with <code className="bg-background px-1 py-0.5 rounded">price_</code>
          </p>
          <p>
            • Changing prices affects all new subscriptions. Existing subscriptions keep their current price.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

