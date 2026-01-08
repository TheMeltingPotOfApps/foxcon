import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { TenantLimits } from './use-tenant-limits';
import { PricingPlan } from './use-pricing-plans';

export function useTenantLimitsAdmin(tenantId: string) {
  return useQuery({
    queryKey: ['super-admin', 'tenants', tenantId, 'limits'],
    queryFn: async () => {
      const response = await apiClient.get(`/super-admin/tenants/${tenantId}/limits`);
      return response.data as TenantLimits;
    },
    enabled: !!tenantId,
  });
}

export function useUpdateTenantLimitsAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, updates }: { tenantId: string; updates: Partial<TenantLimits> }) => {
      const response = await apiClient.put(`/super-admin/tenants/${tenantId}/limits`, updates);
      return response.data as TenantLimits;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants', variables.tenantId, 'limits'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
    },
  });
}

export function useUpdateTenantPlanAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, planName }: { tenantId: string; planName: string }) => {
      const response = await apiClient.post(`/super-admin/tenants/${tenantId}/limits/plan`, { planName });
      return response.data as TenantLimits;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants', variables.tenantId, 'limits'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
    },
  });
}

export function usePricingPlansAdmin() {
  return useQuery({
    queryKey: ['super-admin', 'pricing-plans'],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/pricing-plans');
      return response.data as PricingPlan[];
    },
  });
}

export function useCreatePricingPlanAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<PricingPlan>) => {
      const response = await apiClient.post('/super-admin/pricing-plans', data);
      return response.data as PricingPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'pricing-plans'] });
    },
  });
}

export function useUpdatePricingPlanAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<PricingPlan> }) => {
      const response = await apiClient.put(`/super-admin/pricing-plans/${id}`, data);
      return response.data as PricingPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'pricing-plans'] });
    },
  });
}

export function useDeletePricingPlanAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/super-admin/pricing-plans/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'pricing-plans'] });
    },
  });
}

export function useSetDefaultPricingPlanAdmin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/super-admin/pricing-plans/${id}/set-default`);
      return response.data as PricingPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'pricing-plans'] });
    },
  });
}

// ==================== STRIPE PRICING MANAGEMENT ====================

export function useStripePricing() {
  return useQuery({
    queryKey: ['super-admin', 'pricing', 'stripe'],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/pricing/stripe');
      return response.data;
    },
  });
}

export function useCreateStripePrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { planType: string; amount: number; currency?: string; interval: 'month' | 'year' }) => {
      const response = await apiClient.post('/super-admin/pricing/stripe/create-price', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'pricing', 'stripe'] });
    },
  });
}

export function useUpdateStripePricing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { planType: string; stripePriceId?: string; monthlyPrice?: number; yearlyPrice?: number }) => {
      const response = await apiClient.put('/super-admin/pricing/stripe/update', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'pricing', 'stripe'] });
    },
  });
}

// ==================== TENANT MANAGEMENT ====================

export function useAllTenants() {
  return useQuery({
    queryKey: ['super-admin', 'tenants'],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/tenants');
      return response.data;
    },
  });
}

export function useTenantDetails(tenantId: string) {
  return useQuery({
    queryKey: ['super-admin', 'tenants', tenantId],
    queryFn: async () => {
      const response = await apiClient.get(`/super-admin/tenants/${tenantId}`);
      return response.data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      slug?: string;
      timezone?: string;
      planType?: string;
      ownerEmail?: string;
      ownerPassword?: string;
    }) => {
      const response = await apiClient.post('/super-admin/tenants', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, data }: { tenantId: string; data: any }) => {
      const response = await apiClient.put(`/super-admin/tenants/${tenantId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants', variables.tenantId] });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tenantId: string) => {
      await apiClient.delete(`/super-admin/tenants/${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
    },
  });
}

export function useChangeTenantPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ tenantId, planType, prorate }: { tenantId: string; planType: string; prorate?: boolean }) => {
      const response = await apiClient.post(`/super-admin/tenants/${tenantId}/change-plan`, { planType, prorate });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants', variables.tenantId] });
    },
  });
}

// ==================== USER MANAGEMENT ====================

export function useAllUsers() {
  return useQuery({
    queryKey: ['super-admin', 'users'],
    queryFn: async () => {
      const response = await apiClient.get('/super-admin/users');
      return response.data;
    },
  });
}

export function useTenantUsers(tenantId: string) {
  return useQuery({
    queryKey: ['super-admin', 'tenants', tenantId, 'users'],
    queryFn: async () => {
      const response = await apiClient.get(`/super-admin/tenants/${tenantId}/users`);
      return response.data;
    },
    enabled: !!tenantId,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      tenantId: string;
      role?: string;
    }) => {
      const response = await apiClient.post('/super-admin/users', data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants', variables.tenantId, 'users'] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: any }) => {
      const response = await apiClient.put(`/super-admin/users/${userId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      await apiClient.delete(`/super-admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
    },
  });
}

export function useChangeUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, tenantId, role }: { userId: string; tenantId: string; role: string }) => {
      const response = await apiClient.post(`/super-admin/users/${userId}/change-role`, { tenantId, role });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants', variables.tenantId, 'users'] });
    },
  });
}

export function useAssignUserToTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, tenantId, role }: { userId: string; tenantId: string; role?: string }) => {
      const response = await apiClient.post(`/super-admin/users/${userId}/assign-tenant`, { tenantId, role });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants', variables.tenantId, 'users'] });
    },
  });
}

export function useRemoveUserFromTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, tenantId }: { userId: string; tenantId: string }) => {
      await apiClient.delete(`/super-admin/users/${userId}/tenants/${tenantId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['super-admin', 'tenants', variables.tenantId, 'users'] });
    },
  });
}

