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
  useAllUsers,
  useTenantUsers,
  useCreateUser,
  useUpdateUser,
  useDeleteUser,
  useChangeUserRole,
  useAssignUserToTenant,
  useRemoveUserFromTenant,
} from '@/lib/hooks/use-super-admin';
import { useAllTenants } from '@/lib/hooks/use-super-admin';
import { toast } from 'sonner';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  ArrowUpDown,
  Loader2,
  Building2,
  Mail,
  Shield,
} from 'lucide-react';
import { format } from 'date-fns';

const USER_ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'AGENT', 'VIEWER', 'MARKETER'] as const;
const ROLE_LABELS: Record<string, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  AGENT: 'Agent',
  VIEWER: 'Viewer',
  MARKETER: 'Marketer',
};

export default function SuperAdminUsersPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [editingUser, setEditingUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    tenantId: '',
    role: 'VIEWER' as string,
  });

  const { data: allUsers, isLoading: usersLoading, refetch: refetchUsers } = useAllUsers();
  const { data: tenants } = useAllTenants();
  const { data: tenantUsers, refetch: refetchTenantUsers } = useTenantUsers(selectedTenantId);
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const changeRole = useChangeUserRole();
  const assignToTenant = useAssignUserToTenant();
  const removeFromTenant = useRemoveUserFromTenant();

  const handleCreateUser = async () => {
    try {
      await createUser.mutateAsync(newUser);
      toast.success('User created successfully');
      setShowCreateDialog(false);
      setNewUser({
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        tenantId: '',
        role: 'VIEWER',
      });
      refetchUsers();
      if (selectedTenantId === newUser.tenantId) {
        refetchTenantUsers();
      }
    } catch (error: any) {
      toast.error('Failed to create user', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  const handleUpdateUser = async (userId: string, updates: any) => {
    try {
      await updateUser.mutateAsync({ userId, data: updates });
      toast.success('User updated successfully');
      setEditingUser(null);
      refetchUsers();
    } catch (error: any) {
      toast.error('Failed to update user', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }
    try {
      await deleteUser.mutateAsync(userId);
      toast.success('User deleted successfully');
      refetchUsers();
      if (selectedTenantId) {
        refetchTenantUsers();
      }
    } catch (error: any) {
      toast.error('Failed to delete user', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  const handleChangeRole = async (userId: string, tenantId: string, role: string) => {
    try {
      await changeRole.mutateAsync({ userId, tenantId, role });
      toast.success('Role updated successfully');
      refetchUsers();
      if (selectedTenantId === tenantId) {
        refetchTenantUsers();
      }
    } catch (error: any) {
      toast.error('Failed to change role', {
        description: error?.response?.data?.message || 'Unknown error',
      });
    }
  };

  const displayUsers = selectedTenantId ? tenantUsers : allUsers;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage all users across all tenants
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select
            value={selectedTenantId}
            onChange={(e) => setSelectedTenantId(e.target.value)}
            className="w-[250px]"
          >
            <option value="">All Tenants</option>
            {tenants?.map((tenant: any) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </Select>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New User</DialogTitle>
                <DialogDescription>
                  Create a new user and assign them to a tenant
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Secure password"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <Input
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Last Name</Label>
                    <Input
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Tenant *</Label>
                  <Select
                    value={newUser.tenantId}
                    onChange={(e) => setNewUser({ ...newUser, tenantId: e.target.value })}
                  >
                    <option value="">Select tenant</option>
                    {tenants?.map((tenant: any) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    {USER_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button
                  onClick={handleCreateUser}
                  disabled={createUser.isPending || !newUser.email || !newUser.password || !newUser.tenantId}
                  className="w-full"
                >
                  {createUser.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create User
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {usersLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedTenantId ? 'Tenant Users' : 'All Users'}
            </CardTitle>
            <CardDescription>
              {displayUsers?.length || 0} users
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  {!selectedTenantId && <TableHead>Tenants</TableHead>}
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayUsers?.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.email}</TableCell>
                    <TableCell>
                      {user.firstName || user.lastName
                        ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
                        : '-'}
                    </TableCell>
                    {!selectedTenantId && (
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.tenants?.map((t: any) => (
                            <Badge key={t.tenantId} variant="outline">
                              {t.role}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    )}
                    <TableCell>
                      {selectedTenantId ? (
                        <Select
                          value={user.role}
                          onChange={(e) => handleChangeRole(user.id, selectedTenantId, e.target.value)}
                          className="w-[120px]"
                        >
                          {USER_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {ROLE_LABELS[role]}
                            </option>
                          ))}
                        </Select>
                      ) : (
                        <Badge>{ROLE_LABELS[user.role] || user.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.isActive ? (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(user.createdAt), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setEditingUser(user)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <EditUserForm
              user={editingUser}
              onSave={(updates) => {
                handleUpdateUser(editingUser.id, updates);
              }}
              onCancel={() => setEditingUser(null)}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function EditUserForm({ user, onSave, onCancel }: { user: any; onSave: (updates: any) => void; onCancel: () => void }) {
  const [updates, setUpdates] = useState({
    email: user.email || '',
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    isActive: user.isActive ?? true,
    timezone: user.timezone || '',
  });

  return (
    <div className="space-y-4">
      <div>
        <Label>Email</Label>
        <Input
          type="email"
          value={updates.email}
          onChange={(e) => setUpdates({ ...updates, email: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>First Name</Label>
          <Input
            value={updates.firstName}
            onChange={(e) => setUpdates({ ...updates, firstName: e.target.value })}
          />
        </div>
        <div>
          <Label>Last Name</Label>
          <Input
            value={updates.lastName}
            onChange={(e) => setUpdates({ ...updates, lastName: e.target.value })}
          />
        </div>
      </div>
      <div>
        <Label>Timezone</Label>
        <Input
          value={updates.timezone}
          onChange={(e) => setUpdates({ ...updates, timezone: e.target.value })}
          placeholder="America/New_York"
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

