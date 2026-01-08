import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface TeamMember {
  id: string;
  userId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
  isActive: boolean;
  createdAt: string;
}

export interface InviteUserDto {
  email: string;
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
  firstName?: string;
  lastName?: string;
  phoneNumber: string;
}

export interface UpdateUserRoleDto {
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER';
}

export function useTeamMembers() {
  return useQuery({
    queryKey: ['teamMembers'],
    queryFn: async () => {
      const response = await apiClient.get('/tenants/current/team');
      return response.data as TeamMember[];
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: InviteUserDto) => {
      const response = await apiClient.post('/tenants/current/team/invite', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userTenantId, role }: { userTenantId: string; role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'AGENT' | 'VIEWER' }) => {
      const response = await apiClient.patch(`/tenants/current/team/${userTenantId}/role`, { role });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });
}

export function useRemoveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userTenantId: string) => {
      const response = await apiClient.delete(`/tenants/current/team/${userTenantId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamMembers'] });
    },
  });
}
