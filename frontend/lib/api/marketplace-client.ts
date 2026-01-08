import axios from 'axios';
import { useMarketplaceAuthStore } from '../../store/marketplace-auth-store';

// Determine API URL based on environment
const getApiUrl = () => {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
  }
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  
  // Use same domain as frontend for production domains (routed through Next.js rewrites)
  if (hostname === 'app.nurtureengine.net' || hostname === 'leads.nurtureengine.net' || hostname.includes('nurtureengine.net')) {
    // Use relative URL to route through frontend domain
    return '/api';
  }
  
  // Check if accessing via external IP (for backward compatibility)
  const isExternal = hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('.net');
  
  if (isExternal) {
    // Use external IP for API when accessed via IP address
    return `http://${hostname}:5002/api`;
  }
  
  // Default to localhost for local development
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
};

const API_URL = getApiUrl();

export const marketplaceApiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000,
});

// Request interceptor to add marketplace auth token
marketplaceApiClient.interceptors.request.use(
  (config) => {
    // Don't add auth token to login, signup, or refresh endpoints
    const isAuthEndpoint = config.url?.includes('/marketplace/auth/login') ||
                          config.url?.includes('/marketplace/auth/signup') ||
                          config.url?.includes('/marketplace/auth/refresh');
    
    if (!isAuthEndpoint && typeof window !== 'undefined') {
      try {
        const store = useMarketplaceAuthStore.getState();
        const storeToken = store?.accessToken;
        const localStorageToken = localStorage.getItem('marketplaceAccessToken');
        const token = storeToken || localStorageToken;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch (error) {
        const token = localStorage.getItem('marketplaceAccessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
marketplaceApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const store = useMarketplaceAuthStore.getState();
        const refreshToken = store?.refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('marketplaceRefreshToken') : null);
        
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_URL}/marketplace/auth/refresh`, {
              refreshToken,
            }, {
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data;
            
            if (accessToken) {
              if (typeof window !== 'undefined') {
                localStorage.setItem('marketplaceAccessToken', accessToken);
                if (newRefreshToken) {
                  localStorage.setItem('marketplaceRefreshToken', newRefreshToken);
                }
                if (store?.user) {
                  store.setAuth(store.user, accessToken, newRefreshToken || refreshToken);
                } else {
                  localStorage.setItem('marketplaceAccessToken', accessToken);
                }
              }
              
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return marketplaceApiClient(originalRequest);
            }
          } catch (refreshError: any) {
            console.error('Marketplace token refresh failed:', refreshError);
            if (typeof window !== 'undefined') {
              useMarketplaceAuthStore.getState().clearAuth();
              if (!window.location.pathname.includes('/marketplace/login') && !window.location.pathname.includes('/marketplace/signup')) {
                window.location.href = '/marketplace/login';
              }
            }
            return Promise.reject(refreshError);
          }
        } else {
          if (typeof window !== 'undefined') {
            useMarketplaceAuthStore.getState().clearAuth();
            if (!window.location.pathname.includes('/marketplace/login') && !window.location.pathname.includes('/marketplace/signup')) {
              window.location.href = '/marketplace/login';
            }
          }
        }
      } catch (error) {
        if (typeof window !== 'undefined') {
          useMarketplaceAuthStore.getState().clearAuth();
          if (!window.location.pathname.includes('/marketplace/login') && !window.location.pathname.includes('/marketplace/signup')) {
            window.location.href = '/marketplace/login';
          }
        }
      }
    }

    // Normalize error response
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'object') {
        if (errorData.message) {
          if (Array.isArray(errorData.message)) {
            error.message = errorData.message.join(', ');
          } else if (typeof errorData.message === 'string') {
            error.message = errorData.message;
          }
        } else if (errorData.error && typeof errorData.error === 'string') {
          error.message = errorData.error;
        }
        
        if (!error.message) {
          error.message = `Request failed with status ${error.response.status}`;
        }
      } else if (typeof errorData === 'string') {
        error.message = errorData;
      }
    } else if (!error.message) {
      error.message = 'An unexpected error occurred';
    }

    return Promise.reject(error);
  }
);

