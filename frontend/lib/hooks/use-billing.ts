import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { toast } from 'sonner';

export enum PlanType {
  FREE = 'free',
  STARTER = 'starter',
  PROFESSIONAL = 'professional',
  ENTERPRISE = 'enterprise',
}

export interface Subscription {
  id: string;
  tenantId: string;
  stripeSubscriptionId: string;
  stripeCustomerId?: string;
  planType: PlanType;
  status: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  tenantId: string;
  stripeInvoiceId: string;
  status: string;
  amount: number;
  amountPaid?: number;
  currency?: string;
  invoicePdf?: string;
  hostedInvoiceUrl?: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaymentMethod {
  id: string;
  tenantId: string;
  stripePaymentMethodId: string;
  type: string;
  isDefault: boolean;
  cardDetails?: {
    brand?: string;
    last4?: string;
    expMonth?: number;
    expYear?: number;
  };
}

export function useSubscription() {
  return useQuery<Subscription | null>({
    queryKey: ['billing', 'subscription'],
    queryFn: async () => {
      const response = await apiClient.get('/billing/subscription');
      return response.data || null;
    },
  });
}

export function useInvoices() {
  return useQuery<Invoice[]>({
    queryKey: ['billing', 'invoices'],
    queryFn: async () => {
      const response = await apiClient.get('/billing/invoices');
      return response.data || [];
    },
  });
}

export function usePaymentMethods() {
  return useQuery<PaymentMethod[]>({
    queryKey: ['billing', 'payment-methods'],
    queryFn: async () => {
      const response = await apiClient.get('/billing/payment-methods');
      return response.data || [];
    },
  });
}

export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: { planType: PlanType; successUrl?: string; cancelUrl?: string }) => {
      const response = await apiClient.post('/billing/checkout', data);
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create checkout session');
    },
  });
}

export function useCreatePortalSession() {
  return useMutation({
    mutationFn: async (data?: { returnUrl?: string }) => {
      const response = await apiClient.post('/billing/portal', data || {});
      return response.data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create portal session');
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (cancelAtPeriodEnd: boolean = true) => {
      const response = await apiClient.post('/billing/subscription/cancel', { cancelAtPeriodEnd });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing'] });
      toast.success('Subscription cancellation scheduled');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to cancel subscription');
    },
  });
}

