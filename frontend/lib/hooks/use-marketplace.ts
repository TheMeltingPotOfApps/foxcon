import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import {
  marketplaceOnboardingApi,
  marketplaceRegistrationApi,
  listingReviewsApi,
  storefrontApi,
  marketplaceAdminApi,
  type MarketplaceOnboardingProgress,
  type MarketplaceUser,
  type ListingReview,
  type ListingReviewStats,
  type Storefront,
  type MarketplaceOverview,
} from '../api/marketplace';

// Types
export interface LeadReservation {
  id: string;
  userId: string;
  balance: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadReservationTransaction {
  id: string;
  userId: string;
  type: 'PURCHASE' | 'SPEND' | 'REFUND' | 'ADJUSTMENT';
  amount: number;
  listingId?: string;
  subscriptionId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface Listing {
  id: string;
  marketerId: string;
  name: string;
  description?: string;
  industry?: string;
  pricePerLead: number;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  isVerified: boolean;
  leadParameters: Record<string, any>;
  weightDistribution?: Record<string, any>;
  campaignId?: string;
  adsetId?: string;
  adId?: string;
  createdAt: string;
  updatedAt: string;
  metrics?: ListingMetrics;
}

export interface ListingMetrics {
  id: string;
  listingId: string;
  totalLeadsDelivered: number;
  contactRate: number;
  dncRate: number;
  soldCount: number;
  averageDealValue?: number;
  lastUpdated: string;
}

export interface MarketplaceSubscription {
  id: string;
  buyerId: string;
  listingId: string;
  status: 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';
  leadCount: number;
  leadsDelivered: number;
  leadReservationsSpent: number;
  priority: number;
  startDate: string;
  endDate: string;
  distributionSchedule?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  listing?: Listing;
}

export interface MarketingPlatformIntegration {
  id: string;
  marketerId: string;
  platform: 'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS' | 'CUSTOM';
  platformAccountId?: string;
  isActive: boolean;
  lastSyncedAt?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceCustomEndpoint {
  id: string;
  marketerId: string;
  listingId: string;
  endpointKey: string;
  apiKey: string;
  parameterMappings: Record<string, any>[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  listing?: Listing;
}

// Lead Reservations
export function useLeadReservationBalance() {
  return useQuery({
    queryKey: ['nurture-leads', 'reservations', 'balance'],
    queryFn: async () => {
      const response = await apiClient.get('/nurture-leads/reservations/balance');
      return response.data as { balance: number };
    },
  });
}

export function usePurchaseReservations() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { usdAmount: number; metadata?: Record<string, any> }) => {
      // #region agent log
      fetch('http://localhost:7242/ingest/8946cbf9-23c2-4220-ae50-098ac315e837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-marketplace.ts:111',message:'Purchase reservations mutation called',data:{usdAmount:data.usdAmount},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      const response = await apiClient.post('/nurture-leads/reservations/purchase', data);
      // #region agent log
      fetch('http://localhost:7242/ingest/8946cbf9-23c2-4220-ae50-098ac315e837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-marketplace.ts:114',message:'Purchase response received',data:{balance:response.data?.balance},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return response.data;
    },
    onSuccess: () => {
      // #region agent log
      fetch('http://localhost:7242/ingest/8946cbf9-23c2-4220-ae50-098ac315e837',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'use-marketplace.ts:118',message:'Invalidating queries',data:{invalidatedKeys:['nurture-leads','reservations'],actualQueryKeys:['nurture-leads','reservations','balance']},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'reservations'] });
    },
  });
}

export function useReservationTransactions(limit = 50, offset = 0) {
  return useQuery({
    queryKey: ['nurture-leads', 'reservations', 'transactions', limit, offset],
    queryFn: async () => {
      const response = await apiClient.get('/nurture-leads/reservations/transactions', {
        params: { limit, offset },
      });
      return response.data as { transactions: LeadReservationTransaction[]; total: number };
    },
  });
}

// Listings
export function useListings(filters?: {
  status?: string;
  marketerId?: string;
  industry?: string;
  isVerified?: boolean;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['nurture-leads', 'listings', filters],
    queryFn: async () => {
      const response = await apiClient.get('/nurture-leads/listings', { params: filters });
      return response.data as { listings: Listing[]; total: number };
    },
  });
}

export function useListing(id: string) {
  return useQuery({
    queryKey: ['nurture-leads', 'listings', id],
    queryFn: async () => {
      const response = await apiClient.get(`/nurture-leads/listings/${id}`);
      return response.data as Listing;
    },
    enabled: !!id,
  });
}

export function useCreateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: Partial<Listing>) => {
      const response = await apiClient.post('/nurture-leads/listings', data);
      return response.data as Listing;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'listings'] });
    },
  });
}

export function useUpdateListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Listing> }) => {
      const response = await apiClient.put(`/nurture-leads/listings/${id}`, data);
      return response.data as Listing;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'listings', variables.id] });
    },
  });
}

export function usePublishListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/nurture-leads/listings/${id}/publish`);
      return response.data as Listing;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'listings', id] });
    },
  });
}

export function usePauseListing() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/nurture-leads/listings/${id}/pause`);
      return response.data as Listing;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'listings'] });
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'listings', id] });
    },
  });
}

export function useListingMetrics(listingId: string) {
  return useQuery({
    queryKey: ['nurture-leads', 'listings', listingId, 'metrics'],
    queryFn: async () => {
      const response = await apiClient.get(`/nurture-leads/listings/${listingId}/metrics`);
      return response.data as ListingMetrics;
    },
    enabled: !!listingId,
  });
}

// Subscriptions
export function useSubscriptions(listingId?: string, status?: string) {
  return useQuery({
    queryKey: ['nurture-leads', 'subscriptions', listingId, status],
    queryFn: async () => {
      const params: any = {};
      if (listingId) params.listingId = listingId;
      if (status) params.status = status;
      const response = await apiClient.get('/nurture-leads/subscriptions', { params });
      return response.data as MarketplaceSubscription[];
    },
  });
}

export function useSubscription(id: string) {
  return useQuery({
    queryKey: ['nurture-leads', 'subscriptions', id],
    queryFn: async () => {
      const response = await apiClient.get(`/nurture-leads/subscriptions/${id}`);
      return response.data as MarketplaceSubscription;
    },
    enabled: !!id,
  });
}

export function useCreateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      listingId: string;
      leadCount: number;
      startDate: Date;
      endDate: Date;
      priority?: number;
      distributionSchedule?: Record<string, any>;
    }) => {
      const response = await apiClient.post('/nurture-leads/subscriptions', data);
      return response.data as MarketplaceSubscription;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'subscriptions'] });
    },
  });
}

export function usePauseSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/nurture-leads/subscriptions/${id}/pause`);
      return response.data as MarketplaceSubscription;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'subscriptions', id] });
    },
  });
}

export function useResumeSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/nurture-leads/subscriptions/${id}/resume`);
      return response.data as MarketplaceSubscription;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'subscriptions', id] });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/nurture-leads/subscriptions/${id}/cancel`);
      return response.data as MarketplaceSubscription;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'subscriptions', id] });
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'reservations', 'balance'] });
    },
  });
}

// Marketing Integrations
export function useMarketingIntegrations() {
  return useQuery({
    queryKey: ['nurture-leads', 'integrations'],
    queryFn: async () => {
      const response = await apiClient.get('/nurture-leads/integrations');
      return response.data as MarketingPlatformIntegration[];
    },
  });
}

export function useCreateIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      platform: 'FACEBOOK' | 'TIKTOK' | 'GOOGLE_ADS' | 'CUSTOM';
      accessToken: string;
      refreshToken?: string;
      platformAccountId?: string;
      metadata?: Record<string, any>;
    }) => {
      const response = await apiClient.post('/nurture-leads/integrations', data);
      return response.data as MarketingPlatformIntegration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'integrations'] });
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'listings'] });
    },
  });
}

export function useDisconnectIntegration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.delete(`/nurture-leads/integrations/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'integrations'] });
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'listings'] });
    },
  });
}

// Custom Endpoints
export function useCustomEndpoints(listingId?: string) {
  return useQuery({
    queryKey: ['nurture-leads', 'endpoints', listingId],
    queryFn: async () => {
      const params = listingId ? { listingId } : {};
      const response = await apiClient.get('/nurture-leads/endpoints', { params });
      return response.data as MarketplaceCustomEndpoint[];
    },
  });
}

export function useCreateCustomEndpoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { listingId: string; parameterMappings: Record<string, any>[] }) => {
      const response = await apiClient.post('/nurture-leads/endpoints', data);
      return response.data as MarketplaceCustomEndpoint;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'endpoints'] });
    },
  });
}

export function useRegenerateEndpointKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.post(`/nurture-leads/endpoints/${id}/regenerate-key`);
      return response.data as { apiKey: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'endpoints'] });
    },
  });
}

// Analytics
export function useMarketerDashboard() {
  return useQuery({
    queryKey: ['nurture-leads', 'analytics', 'marketer'],
    queryFn: async () => {
      const response = await apiClient.get('/nurture-leads/analytics/marketer');
      return response.data;
    },
  });
}

export function useBuyerDashboard() {
  return useQuery({
    queryKey: ['nurture-leads', 'analytics', 'buyer'],
    queryFn: async () => {
      const response = await apiClient.get('/nurture-leads/analytics/buyer');
      return response.data;
    },
  });
}

// Marketplace Onboarding
export function useMarketplaceOnboarding() {
  return useQuery({
    queryKey: ['nurture-leads', 'onboarding'],
    queryFn: () => marketplaceOnboardingApi.getProgress(),
  });
}

export function useUpdateOnboardingStep() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ step, data }: { step: string; data?: any }) =>
      marketplaceOnboardingApi.updateStep(step, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'onboarding'] });
    },
  });
}

export function useSkipOnboarding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceOnboardingApi.skip(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'onboarding'] });
    },
  });
}

// Marketplace Registration
export function useRegisterAsMarketer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyName: string; storefrontSlug?: string }) =>
      marketplaceRegistrationApi.registerAsMarketer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'onboarding'] });
    },
  });
}

export function useRegisterAsBuyer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => marketplaceRegistrationApi.registerAsBuyer(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'onboarding'] });
    },
  });
}

export function useRegisterAsBoth() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { companyName: string; storefrontSlug?: string }) =>
      marketplaceRegistrationApi.registerAsBoth(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'onboarding'] });
    },
  });
}

export function useUpdateStorefrontSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Record<string, any>) => marketplaceRegistrationApi.updateStorefrontSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'storefront'] });
    },
  });
}

// Listing Reviews
export function useListingReviews(listingId: string) {
  return useQuery({
    queryKey: ['nurture-leads', 'reviews', listingId],
    queryFn: () => listingReviewsApi.getByListing(listingId),
    enabled: !!listingId,
  });
}

export function useListingReviewStats(listingId: string) {
  return useQuery({
    queryKey: ['nurture-leads', 'reviews', listingId, 'stats'],
    queryFn: () => listingReviewsApi.getStats(listingId),
    enabled: !!listingId,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ listingId, data }: { listingId: string; data: { rating: number; comment?: string } }) =>
      listingReviewsApi.create(listingId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'reviews', variables.listingId] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ reviewId, data }: { reviewId: string; data: { rating?: number; comment?: string } }) =>
      listingReviewsApi.update(reviewId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'reviews'] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) => listingReviewsApi.delete(reviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'reviews'] });
    },
  });
}

// Storefront
export function usePublicStorefront(slug: string, tenantId: string) {
  return useQuery({
    queryKey: ['nurture-leads', 'storefront', 'public', slug],
    queryFn: () => storefrontApi.getPublic(slug, tenantId),
    enabled: !!slug && !!tenantId,
  });
}

export function useStorefrontPreview() {
  return useQuery({
    queryKey: ['nurture-leads', 'storefront', 'preview'],
    queryFn: () => storefrontApi.getPreview(),
  });
}

export function useUpdateStorefront() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: {
      bannerImage?: string;
      logo?: string;
      description?: string;
      primaryColor?: string;
      secondaryColor?: string;
      customCss?: string;
      socialLinks?: Record<string, string>;
    }) => storefrontApi.updateSettings(settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'storefront'] });
    },
  });
}

export function useUpdateStorefrontSlug() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (slug: string) => storefrontApi.updateSlug(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'storefront'] });
    },
  });
}

// Marketplace Admin (Super Admin Only)
export function useMarketplaceOverview(startDate?: string, endDate?: string) {
  return useQuery({
    queryKey: ['nurture-leads', 'admin', 'overview', startDate, endDate],
    queryFn: () => marketplaceAdminApi.getOverview(startDate, endDate),
  });
}

export function useTopMarketers(limit: number = 10) {
  return useQuery({
    queryKey: ['nurture-leads', 'admin', 'top-marketers', limit],
    queryFn: () => marketplaceAdminApi.getTopMarketers(limit),
  });
}

export function useTopListings(limit: number = 10) {
  return useQuery({
    queryKey: ['nurture-leads', 'admin', 'top-listings', limit],
    queryFn: () => marketplaceAdminApi.getTopListings(limit),
  });
}

export function useAllMarketplaceUsers(filters?: {
  userType?: string;
  isVerified?: boolean;
  tenantId?: string;
}) {
  return useQuery({
    queryKey: ['nurture-leads', 'admin', 'users', filters],
    queryFn: () => marketplaceAdminApi.getAllUsers(filters),
  });
}

export function useVerifyMarketer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => marketplaceAdminApi.verifyMarketer(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['nurture-leads', 'admin', 'users'] });
    },
  });
}

export function useAdminListings(filters?: {
  status?: string;
  isVerified?: boolean;
  tenantId?: string;
  marketerId?: string;
}) {
  return useQuery({
    queryKey: ['nurture-leads', 'admin', 'listings', filters],
    queryFn: () => marketplaceAdminApi.getAllListings(filters),
  });
}

export function useAdminSubscriptions(filters?: {
  status?: string;
  tenantId?: string;
  buyerId?: string;
  listingId?: string;
}) {
  return useQuery({
    queryKey: ['nurture-leads', 'admin', 'subscriptions', filters],
    queryFn: () => marketplaceAdminApi.getAllSubscriptions(filters),
  });
}

export function useAdminTransactions(filters?: {
  type?: string;
  tenantId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery({
    queryKey: ['nurture-leads', 'admin', 'transactions', filters],
    queryFn: () => marketplaceAdminApi.getAllTransactions(filters),
  });
}

