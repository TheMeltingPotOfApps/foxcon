import axios from 'axios';
import { apiClient } from '@/lib/api/client';
import { marketplaceApiClient } from '@/lib/api/marketplace-client';
import { useAuthStore } from '@/store/auth-store';
import { useMarketplaceAuthStore } from '@/store/marketplace-auth-store';

// Get API base URL
const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
  }
  const hostname = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  
  if (hostname === 'app.nurtureengine.net' || hostname === 'leads.nurtureengine.net' || hostname.includes('nurtureengine.net')) {
    return '/api';
  }
  
  const isExternal = hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('.net');
  if (isExternal) {
    return `http://${hostname}:5002/api`;
  }
  
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
};

/**
 * Unified authentication helper for managing both Engine and Marketplace auth
 */
export class UnifiedAuth {
  /**
   * Check if user has a linked account on the other platform
   */
  static async checkLinkedMarketplaceAccount(): Promise<{
    linked: boolean;
    marketplaceUserId?: string;
  }> {
    try {
      const response = await apiClient.get('/auth/check-linked-marketplace');
      return response.data;
    } catch (error) {
      return { linked: false };
    }
  }

  static async checkLinkedEngineAccount(): Promise<{
    linked: boolean;
    engineUserId?: string;
    engineTenantId?: string;
  }> {
    try {
      const marketplaceAuth = useMarketplaceAuthStore.getState();
      if (!marketplaceAuth.isAuthenticated || !marketplaceAuth.user) {
        return { linked: false };
      }
      const response = await marketplaceApiClient.get('/marketplace/auth/check-linked-account');
      return response.data;
    } catch (error) {
      return { linked: false };
    }
  }

  /**
   * Login to Marketplace using Engine credentials
   */
  static async loginToMarketplaceFromEngine(): Promise<boolean> {
    try {
      const engineAuth = useAuthStore.getState();
      if (!engineAuth.isAuthenticated || !engineAuth.accessToken || !engineAuth.tenantId) {
        return false;
      }

      // Use engine token to get marketplace token
      const baseUrl = getApiBaseUrl();
      const response = await axios.post(
        `${baseUrl}/marketplace/auth/login-from-engine`,
        {},
        {
          headers: {
            Authorization: `Bearer ${engineAuth.accessToken}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      const { user, accessToken, refreshToken } = response.data;
      useMarketplaceAuthStore.getState().setAuth(user, accessToken, refreshToken);
      return true;
    } catch (error) {
      console.error('Failed to login to marketplace from engine:', error);
      return false;
    }
  }

  /**
   * Login to Engine using Marketplace credentials
   */
  static async loginToEngineFromMarketplace(tenantId: string): Promise<boolean> {
    try {
      const marketplaceAuth = useMarketplaceAuthStore.getState();
      if (!marketplaceAuth.isAuthenticated || !marketplaceAuth.accessToken) {
        return false;
      }

      // Use marketplace token to get engine token
      const baseUrl = getApiBaseUrl();
      const response = await axios.post(
        `${baseUrl}/auth/login-from-marketplace`,
        { tenantId },
        {
          headers: {
            Authorization: `Bearer ${marketplaceAuth.accessToken}`,
            'Content-Type': 'application/json',
          },
          withCredentials: true,
        }
      );

      const { user, accessToken, refreshToken, tenantId: returnedTenantId } = response.data;
      useAuthStore.getState().setAuth(user, accessToken, refreshToken, returnedTenantId || tenantId);
      return true;
    } catch (error) {
      console.error('Failed to login to engine from marketplace:', error);
      return false;
    }
  }

  /**
   * Check if user is authenticated in both platforms
   */
  static isAuthenticatedInBoth(): boolean {
    const engineAuth = useAuthStore.getState();
    const marketplaceAuth = useMarketplaceAuthStore.getState();
    return engineAuth.isAuthenticated && marketplaceAuth.isAuthenticated;
  }

  /**
   * Get current authentication status
   */
  static getAuthStatus() {
    return {
      engine: {
        isAuthenticated: useAuthStore.getState().isAuthenticated,
        user: useAuthStore.getState().user,
      },
      marketplace: {
        isAuthenticated: useMarketplaceAuthStore.getState().isAuthenticated,
        user: useMarketplaceAuthStore.getState().user,
      },
    };
  }
}

