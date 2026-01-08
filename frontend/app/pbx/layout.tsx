'use client';

import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Phone,
  PhoneIncoming,
  PhoneOutgoing,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Activity,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePbxWebSocket } from '@/lib/hooks/use-pbx-websocket';
import { useAgentExtensions } from '@/lib/hooks/use-pbx';

export default function PbxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const user = useAuthStore((state) => state.user);
  const tenantId = useAuthStore((state) => state.tenantId);
  // Always call hooks - they handle auth checks internally
  const { isConnected } = usePbxWebSocket();
  const { data: agentExtensions = [] } = useAgentExtensions();
  const agentExtension = agentExtensions?.find((ext: any) => ext.userId === user?.id);

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/pbx/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Connecting to PBX...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Determine user role and navigation items
  const userRole = (user as any)?.role || 'AGENT';
  const isManager = ['MANAGER', 'ADMIN', 'OWNER'].includes(userRole);

  const navItems = [
    { href: '/pbx/agent', label: 'Agent Portal', icon: Phone },
    ...(isManager ? [{ href: '/pbx/manager', label: 'Manager Dashboard', icon: BarChart3 }] : []),
    { href: '/pbx/dashboard', label: 'Dashboard', icon: Activity },
  ];

  const handleLogout = () => {
    useAuthStore.getState().clearAuth();
    router.push('/pbx/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2">
              <Phone className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">PBX Portal</h1>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = typeof window !== 'undefined' && window.location.pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{item.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            {agentExtension && (
              <div className="text-sm">
                <p className="text-muted-foreground">Extension</p>
                <p className="font-semibold">{agentExtension.extension}</p>
              </div>
            )}
            <div className="text-sm">
              <p className="text-muted-foreground">User</p>
              <p className="font-semibold">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

