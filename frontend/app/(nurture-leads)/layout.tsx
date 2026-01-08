'use client';

import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Store,
  LayoutDashboard,
  Package,
  ShoppingCart,
  DollarSign,
  Settings,
  LogOut,
  TrendingUp,
  Users,
  FileText,
  Link2,
  Star,
  Receipt,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLeadReservationBalance } from '@/lib/hooks/use-marketplace';

export default function NurtureLeadsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const user = useAuthStore((state) => state.user);
  const tenantId = useAuthStore((state) => state.tenantId);
  const { data: balanceData } = useLeadReservationBalance();
  const balance = balanceData?.balance || 0;

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) {
      router.push('/nurture-leads/login');
    }
  }, [hasHydrated, isAuthenticated, router]);

  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading Nurture Leads...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const userRole = (user as any)?.role || '';
  const isMarketer = userRole === 'MARKETER';
  const isBuyer = userRole === 'BUYER';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const navItems = [
    { href: '/nurture-leads', label: 'Browse', icon: Store },
    ...(isMarketer || isSuperAdmin
      ? [
          { href: '/nurture-leads/seller', label: 'Seller Dashboard', icon: TrendingUp },
          { href: '/nurture-leads/listings', label: 'My Listings', icon: Package },
          { href: '/nurture-leads/lead-sources', label: 'Lead Sources', icon: Link2 },
          { href: '/nurture-leads/ingestion', label: 'Ingestion', icon: FileText },
        ]
      : []),
    ...(isBuyer || isSuperAdmin
      ? [
          { href: '/nurture-leads/buyer', label: 'Buyer Dashboard', icon: Users },
          { href: '/nurture-leads/subscriptions', label: 'Subscriptions', icon: ShoppingCart },
        ]
      : []),
    { href: '/nurture-leads/reservations', label: 'Reservations', icon: DollarSign },
    { href: '/nurture-leads/purchases', label: 'Purchases', icon: Receipt },
    { href: '/nurture-leads/reviews', label: 'Reviews', icon: Star },
    { href: '/nurture-leads/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    useAuthStore.getState().clearAuth();
    router.push('/nurture-leads/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          <div className="p-6 border-b border-gray-200 dark:border-gray-800">
            <div className="flex items-center space-x-2">
              <Store className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Nurture Leads</h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lead Nurture Leads</p>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                typeof window !== 'undefined' &&
                window.location.pathname.startsWith(item.href);
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
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Balance</span>
              </div>
              <Badge variant="secondary" className="font-semibold">
                {balance.toFixed(2)} LR
              </Badge>
            </div>
            <div className="text-sm">
              <p className="text-muted-foreground">User</p>
              <p className="font-semibold">
                {user?.firstName} {user?.lastName}
              </p>
            </div>
            <Button variant="outline" className="w-full" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-white dark:bg-gray-900">
          <div className="container mx-auto p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}

