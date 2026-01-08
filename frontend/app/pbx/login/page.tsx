'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { apiClient } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth-store';
import { Phone } from 'lucide-react';

export default function PbxLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [extension, setExtension] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Use PBX-specific login endpoint
      const response = await apiClient.post('/pbx/auth/login', {
        extension,
        password,
      });

      const { user, accessToken, tenantId } = response.data;
      // PBX login doesn't return refreshToken, use empty string
      setAuth(user, accessToken, '', tenantId);
      
      // Redirect to PBX dashboard based on user role
      const userRole = user.role || 'AGENT';
      if (userRole === 'MANAGER' || userRole === 'ADMIN' || userRole === 'OWNER') {
        router.push('/pbx/manager');
      } else {
        router.push('/pbx/agent');
      }
    } catch (err: any) {
      let errorMessage = 'Login failed';
      
      try {
        if (err?.response?.data) {
          const errorData = err.response.data;
          if (typeof errorData === 'string') {
            errorMessage = errorData;
          } else if (errorData?.message) {
            if (Array.isArray(errorData.message)) {
              errorMessage = errorData.message.join(', ');
            } else if (typeof errorData.message === 'string') {
              errorMessage = errorData.message;
            }
          }
        } else if (err?.message) {
          errorMessage = typeof err.message === 'string' ? err.message : 'Login failed. Please try again.';
        }
      } catch (parseError) {
        errorMessage = 'Login failed. Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <Phone className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">PBX Agent Portal</CardTitle>
          <CardDescription>Enter your extension and password to access the call center</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="extension" className="text-sm font-medium">
                Extension
              </label>
              <Input
                id="extension"
                type="text"
                placeholder="1001"
                value={extension}
                onChange={(e) => setExtension(e.target.value.replace(/\D/g, ''))}
                autoComplete="username"
                required
                className="text-lg"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} size="lg">
              {loading ? 'Connecting...' : 'Login to PBX'}
            </Button>
            <div className="text-center text-sm text-muted-foreground">
              <p>Having trouble? Contact your administrator</p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

