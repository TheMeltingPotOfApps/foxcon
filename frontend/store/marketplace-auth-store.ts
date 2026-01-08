import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface MarketplaceUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  userType: 'MARKETER' | 'BUYER' | 'BOTH';
  companyName?: string;
  storefrontSlug?: string;
  isVerified?: boolean;
}

interface MarketplaceAuthState {
  user: MarketplaceUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: MarketplaceUser, accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useMarketplaceAuthStore = create<MarketplaceAuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken) => {
        // Sync with localStorage for API client compatibility
        if (typeof window !== 'undefined') {
          localStorage.setItem('marketplaceAccessToken', accessToken);
          localStorage.setItem('marketplaceRefreshToken', refreshToken);
        }
        set({
          user,
          accessToken,
          refreshToken,
          isAuthenticated: true,
        });
      },
      clearAuth: () => {
        // Clear localStorage for API client compatibility
        if (typeof window !== 'undefined') {
          localStorage.removeItem('marketplaceAccessToken');
          localStorage.removeItem('marketplaceRefreshToken');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'marketplace-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          state.isAuthenticated = !!state.accessToken && !!state.user;
          if (state.accessToken) {
            localStorage.setItem('marketplaceAccessToken', state.accessToken);
          }
          if (state.refreshToken) {
            localStorage.setItem('marketplaceRefreshToken', state.refreshToken);
          }
          state._hasHydrated = true;
        }
      },
    }
  )
);

// Initialize hydration state
if (typeof window !== 'undefined') {
  useMarketplaceAuthStore.persist.onFinishHydration(() => {
    useMarketplaceAuthStore.getState().setHasHydrated(true);
  });
}

