import { apiClient } from './client';

// Marketplace Onboarding Types
export interface MarketplaceOnboardingProgress {
  id: string;
  userId: string;
  selectedUserType?: 'MARKETER' | 'BUYER' | 'BOTH';
  currentStep: string;
  completedSteps: string[];
  stepData: Record<string, any>;
  isCompleted: boolean;
  completedAt?: string;
  skipped: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceUser {
  id: string;
  userId: string;
  userType: 'MARKETER' | 'BUYER' | 'BOTH';
  isVerified: boolean;
  companyName?: string;
  storefrontSlug?: string;
  storefrontSettings?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ListingReview {
  id: string;
  listingId: string;
  buyerId: string;
  rating: number;
  comment?: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListingReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: { [key: number]: number };
}

export interface Storefront {
  marketplaceUser: {
    id: string;
    companyName: string;
    storefrontSlug: string;
    isVerified: boolean;
    storefrontSettings: Record<string, any>;
  };
  listings: Array<{
    id: string;
    name: string;
    description?: string;
    industry?: string;
    pricePerLead: number;
    isVerified: boolean;
    leadParameters: Record<string, any>;
    metrics?: any;
    reviewCount: number;
  }>;
  aggregateMetrics: {
    totalListings: number;
    totalLeadsDelivered: number;
    averageRating: number;
    totalReviews: number;
  };
}

export interface MarketplaceOverview {
  users: {
    totalMarketers: number;
    totalBuyers: number;
    totalBoth: number;
    verifiedMarketers: number;
    totalUsers: number;
  };
  listings: {
    total: number;
    active: number;
    verified: number;
  };
  subscriptions: {
    total: number;
    active: number;
  };
  distributions: {
    total: number;
    successful: number;
    successRate: number;
  };
  transactions: {
    total: number;
    totalRevenue: number;
  };
  reviews: {
    total: number;
    averageRating: number;
  };
}

// Marketplace Onboarding API
export const marketplaceOnboardingApi = {
  getProgress: async (): Promise<MarketplaceOnboardingProgress> => {
    const response = await apiClient.get('/nurture-leads/onboarding/progress');
    return response.data;
  },

  updateStep: async (step: string, data?: any): Promise<MarketplaceOnboardingProgress> => {
    const response = await apiClient.post('/nurture-leads/onboarding/step', { step, data });
    return response.data;
  },

  skip: async (): Promise<MarketplaceOnboardingProgress> => {
    const response = await apiClient.post('/nurture-leads/onboarding/skip');
    return response.data;
  },
};

// Marketplace User Registration API
export const marketplaceRegistrationApi = {
  registerAsMarketer: async (data: { companyName: string; storefrontSlug?: string }): Promise<MarketplaceUser> => {
    const response = await apiClient.post('/nurture-leads/register/marketer', data);
    return response.data;
  },

  registerAsBuyer: async (): Promise<MarketplaceUser> => {
    const response = await apiClient.post('/nurture-leads/register/buyer');
    return response.data;
  },

  registerAsBoth: async (data: { companyName: string; storefrontSlug?: string }): Promise<MarketplaceUser> => {
    const response = await apiClient.post('/nurture-leads/register/both', data);
    return response.data;
  },

  updateStorefrontSettings: async (settings: Record<string, any>): Promise<MarketplaceUser> => {
    const response = await apiClient.put('/nurture-leads/register/storefront-settings', { settings });
    return response.data;
  },

  verifyMarketer: async (userId: string): Promise<MarketplaceUser> => {
    const response = await apiClient.post(`/nurture-leads/register/verify/${userId}`);
    return response.data;
  },
};

// Listing Reviews API
export const listingReviewsApi = {
  create: async (listingId: string, data: { rating: number; comment?: string }): Promise<ListingReview> => {
    const response = await apiClient.post(`/nurture-leads/reviews/listings/${listingId}`, data);
    return response.data;
  },

  getByListing: async (listingId: string): Promise<ListingReview[]> => {
    const response = await apiClient.get(`/nurture-leads/reviews/listings/${listingId}`);
    return response.data;
  },

  getStats: async (listingId: string): Promise<ListingReviewStats> => {
    const response = await apiClient.get(`/nurture-leads/reviews/listings/${listingId}/stats`);
    return response.data;
  },

  get: async (reviewId: string): Promise<ListingReview> => {
    const response = await apiClient.get(`/nurture-leads/reviews/${reviewId}`);
    return response.data;
  },

  update: async (reviewId: string, data: { rating?: number; comment?: string }): Promise<ListingReview> => {
    const response = await apiClient.put(`/nurture-leads/reviews/${reviewId}`, data);
    return response.data;
  },

  delete: async (reviewId: string): Promise<void> => {
    await apiClient.delete(`/nurture-leads/reviews/${reviewId}`);
  },
};

// Storefront Management API
export const storefrontApi = {
  getPublic: async (slug: string, tenantId: string): Promise<Storefront> => {
    const response = await apiClient.get(`/nurture-leads/storefront/public/${slug}`, {
      params: { tenantId },
    });
    return response.data;
  },

  getPreview: async (): Promise<Storefront> => {
    const response = await apiClient.get('/nurture-leads/storefront/preview');
    return response.data;
  },

  updateSettings: async (settings: {
    bannerImage?: string;
    logo?: string;
    description?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCss?: string;
    socialLinks?: {
      website?: string;
      twitter?: string;
      linkedin?: string;
      facebook?: string;
    };
  }): Promise<MarketplaceUser> => {
    const response = await apiClient.put('/nurture-leads/storefront/settings', settings);
    return response.data;
  },

  updateSlug: async (slug: string): Promise<MarketplaceUser> => {
    const response = await apiClient.put('/nurture-leads/storefront/slug', { slug });
    return response.data;
  },
};

// Marketplace Admin API (Super Admin Only)
export const marketplaceAdminApi = {
  getOverview: async (startDate?: string, endDate?: string): Promise<MarketplaceOverview> => {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    const response = await apiClient.get('/nurture-leads/admin/overview', { params });
    return response.data;
  },

  getTopMarketers: async (limit: number = 10): Promise<any[]> => {
    const response = await apiClient.get('/nurture-leads/admin/analytics/top-marketers', {
      params: { limit },
    });
    return response.data;
  },

  getTopListings: async (limit: number = 10): Promise<any[]> => {
    const response = await apiClient.get('/nurture-leads/admin/analytics/top-listings', {
      params: { limit },
    });
    return response.data;
  },

  getAllUsers: async (filters?: {
    userType?: string;
    isVerified?: boolean;
    tenantId?: string;
  }): Promise<MarketplaceUser[]> => {
    const response = await apiClient.get('/nurture-leads/admin/users', { params: filters });
    return response.data;
  },

  verifyMarketer: async (userId: string): Promise<MarketplaceUser> => {
    const response = await apiClient.put(`/nurture-leads/admin/users/${userId}/verify`);
    return response.data;
  },

  getAllListings: async (filters?: {
    status?: string;
    isVerified?: boolean;
    tenantId?: string;
    marketerId?: string;
  }): Promise<any[]> => {
    const response = await apiClient.get('/nurture-leads/admin/listings', { params: filters });
    return response.data;
  },

  getListingDetails: async (listingId: string): Promise<any> => {
    const response = await apiClient.get(`/nurture-leads/admin/listings/${listingId}`);
    return response.data;
  },

  getAllSubscriptions: async (filters?: {
    status?: string;
    tenantId?: string;
    buyerId?: string;
    listingId?: string;
  }): Promise<any[]> => {
    const response = await apiClient.get('/nurture-leads/admin/subscriptions', { params: filters });
    return response.data;
  },

  getAllTransactions: async (filters?: {
    type?: string;
    tenantId?: string;
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<any[]> => {
    const response = await apiClient.get('/nurture-leads/admin/transactions', { params: filters });
    return response.data;
  },
};


