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
import {
  useLeadStatuses,
  useCreateStatus,
  useUpdateStatus,
  useDeleteStatus,
  useReorderStatuses,
  type TenantLeadStatus,
  type CreateStatusDto,
} from '@/lib/hooks/use-lead-statuses';
import { Plus, Edit2, Trash2, ChevronUp, ChevronDown, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function LeadStatusesSettings() {
  const { data: statuses, isLoading } = useLeadStatuses(true);
  const createMutation = useCreateStatus();
  const updateMutation = useUpdateStatus();
  const deleteMutation = useDeleteStatus();
  const reorderMutation = useReorderStatuses();
  const [editingStatus, setEditingStatus] = useState<TenantLeadStatus | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<CreateStatusDto>({
    name: '',
    description: '',
    color: '#3B82F6',
    isActive: true,
  });

  const handleCreate = async () => {
    try {
      await createMutation.mutateAsync(formData);
      toast.success('Status created successfully');
      setShowCreateDialog(false);
      setFormData({ name: '', description: '', color: '#3B82F6', isActive: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create status');
    }
  };

  const handleUpdate = async () => {
    if (!editingStatus) return;
    try {
      await updateMutation.mutateAsync({
        id: editingStatus.id,
        data: formData,
      });
      toast.success('Status updated successfully');
      setEditingStatus(null);
      setFormData({ name: '', description: '', color: '#3B82F6', isActive: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this status? This action cannot be undone.')) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(id);
      toast.success('Status deleted successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete status');
    }
  };

  const handleMoveUp = async (index: number) => {
    if (!statuses || index === 0) return;
    const items = Array.from(statuses);
    [items[index - 1], items[index]] = [items[index], items[index - 1]];
    const statusIds = items.map((s) => s.id);
    try {
      await reorderMutation.mutateAsync(statusIds);
      toast.success('Status order updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reorder statuses');
    }
  };

  const handleMoveDown = async (index: number) => {
    if (!statuses || index === statuses.length - 1) return;
    const items = Array.from(statuses);
    [items[index], items[index + 1]] = [items[index + 1], items[index]];
    const statusIds = items.map((s) => s.id);
    try {
      await reorderMutation.mutateAsync(statusIds);
      toast.success('Status order updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reorder statuses');
    }
  };

  const openEditDialog = (status: TenantLeadStatus) => {
    setEditingStatus(status);
    setFormData({
      name: status.name,
      description: status.description || '',
      color: status.color || '#3B82F6',
      isActive: status.isActive,
    });
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
              <CardTitle>Lead Statuses</CardTitle>
              <CardDescription>
                Customize and manage lead statuses for your workspace
              </CardDescription>
            </div>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Status
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {!statuses || statuses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No statuses found. Create your first status to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {statuses.map((status, index) => (
                <div
                  key={status.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveDown(index)}
                      disabled={index === statuses.length - 1}
                      className="h-6 w-6 p-0"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: status.color || '#3B82F6' }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{status.name}</span>
                      {status.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          System
                        </Badge>
                      )}
                      {!status.isActive && (
                        <Badge variant="outline" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                    </div>
                    {status.description && (
                      <p className="text-sm text-muted-foreground">{status.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(status)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {!status.isSystem && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(status.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog || !!editingStatus} onOpenChange={(open) => {
        if (!open) {
          setShowCreateDialog(false);
          setEditingStatus(null);
          setFormData({ name: '', description: '', color: '#3B82F6', isActive: true });
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStatus ? 'Edit Status' : 'Create Status'}</DialogTitle>
            <DialogDescription>
              {editingStatus
                ? 'Update the status details below'
                : 'Create a new lead status for your workspace'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., New Lead, Qualified, Closed Won"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Color</label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#3B82F6"
                />
              </div>
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
                Active (can be used for new contacts)
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingStatus(null);
                  setFormData({ name: '', description: '', color: '#3B82F6', isActive: true });
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingStatus ? handleUpdate : handleCreate}
                disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingStatus ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

