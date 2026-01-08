'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select } from '@/components/ui/select';
import {
  useStatusAutomations,
  useCreateAutomation,
  useUpdateAutomation,
  useDeleteAutomation,
  useLeadStatuses,
  type StatusAutomation,
  type CreateAutomationDto,
} from '@/lib/hooks/use-lead-statuses';
import { Plus, Edit2, Trash2, Loader2, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export function StatusAutomationsSettings() {
  const { data: automations, isLoading } = useStatusAutomations(true);
  const { data: statuses } = useLeadStatuses();
  const createMutation = useCreateAutomation();
  const updateMutation = useUpdateAutomation();
  const deleteMutation = useDeleteAutomation();
  const [editingAutomation, setEditingAutomation] = useState<StatusAutomation | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<CreateAutomationDto>({
    name: '',
    triggerType: 'TIME_BASED',
    targetStatusId: '',
    isActive: true,
  });

  const handleCreate = async () => {
    try {
      // Validate required fields based on trigger type
      if (formData.triggerType === 'TIME_BASED') {
        if (!formData.timeValue || !formData.timeUnit) {
          toast.error('Time value and unit are required for time-based automations');
          return;
        }
      } else if (formData.triggerType === 'STATUS_CHANGE') {
        if (!formData.triggerStatusId) {
          toast.error('Trigger status is required for status-change automations');
          return;
        }
      }

      if (!formData.targetStatusId) {
        toast.error('Target status is required');
        return;
      }

      await createMutation.mutateAsync(formData);
      toast.success('Automation created successfully');
      setShowCreateDialog(false);
      setFormData({
        name: '',
        triggerType: 'TIME_BASED',
        targetStatusId: '',
        isActive: true,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create automation');
    }
  };

  const handleUpdate = async () => {
    if (!editingAutomation) return;
    try {
      await updateMutation.mutateAsync({
        id: editingAutomation.id,
        data: formData,
      });
      toast.success('Automation updated successfully');
      setEditingAutomation(null);
      setFormData({
        name: '',
        triggerType: 'TIME_BASED',
        targetStatusId: '',
        isActive: true,
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update automation');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this automation? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Automation deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete automation');
    }
  };

  const openEditDialog = (automation: StatusAutomation) => {
    setEditingAutomation(automation);
    setFormData({
      name: automation.name,
      triggerType: automation.triggerType,
      fromStatusId: automation.fromStatusId || undefined,
      timeValue: automation.timeValue || undefined,
      timeUnit: automation.timeUnit || undefined,
      triggerStatusId: automation.triggerStatusId || undefined,
      targetStatusId: automation.targetStatusId,
      isActive: automation.isActive,
      conditions: automation.conditions,
    });
  };

  const getStatusName = (statusId?: string) => {
    if (!statusId || !statuses) return 'Any Status';
    return statuses.find((s) => s.id === statusId)?.name || 'Unknown';
  };

  const formatTimeDescription = (automation: StatusAutomation) => {
    if (automation.triggerType === 'TIME_BASED' && automation.timeValue && automation.timeUnit) {
      const fromStatus = automation.fromStatus
        ? automation.fromStatus.name
        : 'any status';
      return `After ${automation.timeValue} ${automation.timeUnit.toLowerCase()} in "${fromStatus}"`;
    } else if (automation.triggerType === 'STATUS_CHANGE' && automation.triggerStatus) {
      return `When status changes to "${automation.triggerStatus.name}"`;
    }
    return 'Invalid configuration';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Status Automations</CardTitle>
              <CardDescription>
                Automatically change lead statuses based on time or status changes
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!automations || automations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No automations found. Create your first automation to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {automations.map((automation) => (
                <div
                  key={automation.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{automation.name}</span>
                      {!automation.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatTimeDescription(automation)}</span>
                      <ArrowRight className="h-4 w-4 mx-1" />
                      <span className="font-medium">{getStatusName(automation.targetStatusId)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(automation)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(automation.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingAutomation} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingAutomation(null);
          setFormData({
            name: '',
            triggerType: 'TIME_BASED',
            targetStatusId: '',
            isActive: true,
          });
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingAutomation ? 'Edit Automation' : 'Create Automation'}</DialogTitle>
            <DialogDescription>
              {editingAutomation
                ? 'Update the automation rule below'
                : 'Create a new automation rule to automatically change lead statuses'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Move to Qualified after 2 days"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Trigger Type</label>
              <Select
                value={formData.triggerType}
                onChange={(e) =>
                  setFormData({ ...formData, triggerType: e.target.value as 'TIME_BASED' | 'STATUS_CHANGE' })
                }
              >
                <option value="TIME_BASED">Time Based</option>
                <option value="STATUS_CHANGE">Status Change</option>
              </Select>
            </div>

            {formData.triggerType === 'TIME_BASED' && (
              <>
                <div>
                  <label className="text-sm font-medium mb-2 block">From Status</label>
                  <Select
                    value={formData.fromStatusId || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, fromStatusId: e.target.value || undefined })
                    }
                  >
                    <option value="">Any Status</option>
                    {statuses?.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to apply to contacts in any status
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Time Value</label>
                    <Input
                      type="number"
                      min="1"
                      value={formData.timeValue || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, timeValue: parseInt(e.target.value) || undefined })
                      }
                      placeholder="e.g., 2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Time Unit</label>
                    <Select
                      value={formData.timeUnit || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, timeUnit: e.target.value as 'MINUTES' | 'HOURS' | 'DAYS' })
                      }
                    >
                      <option value="">Select unit</option>
                      <option value="MINUTES">Minutes</option>
                      <option value="HOURS">Hours</option>
                      <option value="DAYS">Days</option>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {formData.triggerType === 'STATUS_CHANGE' && (
              <div>
                <label className="text-sm font-medium mb-2 block">Trigger Status</label>
                <Select
                  value={formData.triggerStatusId || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, triggerStatusId: e.target.value })
                  }
                >
                  <option value="">Select status</option>
                  {statuses?.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This automation will trigger when a contact&apos;s status changes to this status
                </p>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Change Status To</label>
              <Select
                value={formData.targetStatusId}
                onChange={(e) => setFormData({ ...formData, targetStatusId: e.target.value })}
              >
                <option value="">Select target status</option>
                {statuses?.map((status) => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="isActive" className="text-sm font-medium">
                Active (automation will run automatically)
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingAutomation(null);
                  setFormData({
                    name: '',
                    triggerType: 'TIME_BASED',
                    targetStatusId: '',
                    isActive: true,
                  });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingAutomation ? handleUpdate : handleCreate}
                disabled={
                  !formData.name ||
                  !formData.targetStatusId ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingAutomation ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

