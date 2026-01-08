import axios from 'axios';
import { useAuthStore } from '../../store/auth-store';

// Determine API URL based on environment
// In browser, use window.location to detect domain or IP
const getApiUrl = () => {
  // Server-side rendering: use environment variable or default
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';
  }
  
  // Client-side: check hostname
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

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  timeout: 30000, // 30 second timeout for production
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Try to get token from store first, fallback to localStorage
    if (typeof window !== 'undefined') {
      try {
        const store = useAuthStore.getState();
        // Check both store and localStorage for token
        const storeToken = store?.accessToken;
        const localStorageToken = localStorage.getItem('accessToken');
        const token = storeToken || localStorageToken;
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        } else {
          // No token available - this might be a public endpoint
          // Don't fail here, let the backend handle it
        }
      } catch (error) {
        // If store access fails, try localStorage directly
        const token = localStorage.getItem('accessToken');
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

// Response interceptor to handle token refresh and normalize errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't redirect to login for public endpoints (booking, public event types, etc.)
    const isPublicEndpoint = originalRequest?.url?.includes('/calendar/booking/') || 
                            originalRequest?.url?.includes('/calendar/booking/book') ||
                            originalRequest?.url?.includes('/calendar/booking/event-type/') ||
                            originalRequest?.url?.includes('/calendar/booking/contact/') ||
                            originalRequest?.url?.includes('/calendar/booking/available-slots/');

    if (error.response?.status === 401 && !originalRequest._retry && !isPublicEndpoint) {
      originalRequest._retry = true;

      try {
        const store = useAuthStore.getState();
        const refreshToken = store?.refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null);
        
        if (refreshToken) {
          try {
            const response = await axios.post(`${API_URL}/auth/refresh`, {
              refreshToken,
            }, {
              headers: {
                'Content-Type': 'application/json',
              },
            });

            const { accessToken } = response.data;
            
            if (accessToken) {
              // Update both store and localStorage
              if (typeof window !== 'undefined') {
                localStorage.setItem('accessToken', accessToken);
                if (store?.user && store?.tenantId) {
                  store.setAuth(store.user, accessToken, refreshToken, store.tenantId);
                } else {
                  // If store doesn't have user/tenantId, at least update token
                  localStorage.setItem('accessToken', accessToken);
                }
              }
              
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;

              return apiClient(originalRequest);
            }
          } catch (refreshError: any) {
            console.error('Token refresh failed:', refreshError);
            // If refresh fails, clear auth and redirect (only for non-public endpoints)
            if (typeof window !== 'undefined' && !isPublicEndpoint) {
              useAuthStore.getState().clearAuth();
              // Only redirect if not already on login page and not on booking page
              if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/book/')) {
                window.location.href = '/login';
              }
            }
            return Promise.reject(refreshError);
          }
        } else {
          // No refresh token available - redirect to login (only for non-public endpoints)
          if (typeof window !== 'undefined' && !isPublicEndpoint) {
            useAuthStore.getState().clearAuth();
            if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/book/')) {
              window.location.href = '/login';
            }
          }
        }
      } catch (error) {
        // Clear auth on any error (only for non-public endpoints)
        if (typeof window !== 'undefined' && !isPublicEndpoint) {
          useAuthStore.getState().clearAuth();
          if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/book/')) {
            window.location.href = '/login';
          }
        }
      }
    }

    // Normalize error response to ensure it's always an Error object with a message
    // This prevents React from trying to render error objects directly
    if (error.response?.data) {
      const errorData = error.response.data;
      if (typeof errorData === 'object') {
        // Extract message from NestJS error format {message, error, statusCode}
        if (errorData.message) {
          // Handle array of messages (NestJS validation errors)
          if (Array.isArray(errorData.message)) {
            error.message = errorData.message.join(', ');
          } else if (typeof errorData.message === 'string') {
            error.message = errorData.message;
          }
        } else if (errorData.error && typeof errorData.error === 'string') {
          error.message = errorData.error;
        }
        
        // Fallback if no message was set
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

