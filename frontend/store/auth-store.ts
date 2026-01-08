import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tenantId: string | null;
  isAuthenticated: boolean;
  _hasHydrated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string, tenantId: string) => void;
  clearAuth: () => void;
  setTenantId: (tenantId: string) => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      tenantId: null,
      isAuthenticated: false,
      _hasHydrated: false,
      setAuth: (user, accessToken, refreshToken, tenantId) => {
        // Sync with localStorage for API client compatibility
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
        }
        set({
          user,
          accessToken,
          refreshToken,
          tenantId,
          isAuthenticated: true,
        });
      },
      clearAuth: () => {
        // Clear localStorage for API client compatibility
        if (typeof window !== 'undefined') {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
        }
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tenantId: null,
          isAuthenticated: false,
        });
      },
      setTenantId: (tenantId) => {
        set({ tenantId });
      },
      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // Compute isAuthenticated from other state
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tenantId: state.tenantId,
      }),
      // Restore isAuthenticated on rehydrate and sync localStorage
      onRehydrateStorage: () => (state) => {
        if (state && typeof window !== 'undefined') {
          // Compute isAuthenticated from persisted state
          state.isAuthenticated = !!state.accessToken && !!state.user;
          // Sync tokens to localStorage for API client
          if (state.accessToken) {
            localStorage.setItem('accessToken', state.accessToken);
          }
          if (state.refreshToken) {
            localStorage.setItem('refreshToken', state.refreshToken);
          }
          // Mark as hydrated
          state._hasHydrated = true;
        }
      },
    }
  )
);

// Initialize hydration state
if (typeof window !== 'undefined') {
  useAuthStore.persist.onFinishHydration(() => {
    useAuthStore.getState().setHasHydrated(true);
  });
}

