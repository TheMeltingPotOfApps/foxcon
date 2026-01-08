'use client';

import { useMarketplaceAuthStore } from '@/store/marketplace-auth-store';
import { useAuthStore } from '@/store/auth-store';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  Store,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Package,
  TrendingUp,
  Users,
  DollarSign,
  Receipt,
  Star,
  FileText,
  Link2,
  Zap,
  LayoutDashboard,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { UnifiedAuth } from '@/lib/auth/unified-auth';
import { toast } from 'sonner';

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useMarketplaceAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useMarketplaceAuthStore((state) => state._hasHydrated);
  const user = useMarketplaceAuthStore((state) => state.user);
  const engineAuth = useAuthStore((state) => state.isAuthenticated);
  const [showNotifications, setShowNotifications] = useState(false);
  const [switchingToEngine, setSwitchingToEngine] = useState(false);

  useEffect(() => {
    // Wait for hydration before checking auth
    if (hasHydrated && !isAuthenticated && pathname !== '/marketplace/login' && pathname !== '/marketplace/signup') {
      router.push('/marketplace/login');
    }
  }, [hasHydrated, isAuthenticated, router, pathname]);

  // Show loading state while hydrating
  if (!hasHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 animate-pulse-soft rounded-full bg-primary/10"></div>
          </div>
          <p className="text-sm font-medium text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && pathname !== '/marketplace/login' && pathname !== '/marketplace/signup') {
    return null;
  }

  const userType = (user as any)?.userType;
  const isMarketer = userType === 'MARKETER' || userType === 'BOTH';
  const isBuyer = userType === 'BUYER' || userType === 'BOTH';

  const navItems = [
    { href: '/marketplace', label: 'Browse', icon: Store },
    ...(isMarketer
      ? [
          { href: '/marketplace/seller', label: 'Seller Dashboard', icon: TrendingUp },
          { href: '/marketplace/listings', label: 'My Listings', icon: Package },
          { href: '/marketplace/lead-sources', label: 'Lead Sources', icon: Link2 },
          { href: '/marketplace/ingestion', label: 'Ingestion', icon: FileText },
        ]
      : []),
    ...(isBuyer
      ? [
          { href: '/marketplace/buyer', label: 'Buyer Dashboard', icon: Users },
          { href: '/marketplace/subscriptions', label: 'Subscriptions', icon: DollarSign },
        ]
      : []),
    { href: '/marketplace/reservations', label: 'Reservations', icon: DollarSign },
    { href: '/marketplace/purchases', label: 'Purchases', icon: Receipt },
    { href: '/marketplace/reviews', label: 'Reviews', icon: Star },
    { href: '/marketplace/settings', label: 'Settings', icon: Settings },
  ];

  const handleSwitchToEngine = async () => {
    setSwitchingToEngine(true);
    try {
      const linkStatus = await UnifiedAuth.checkLinkedEngineAccount();
      if (linkStatus.linked && linkStatus.engineTenantId) {
        const success = await UnifiedAuth.loginToEngineFromMarketplace(linkStatus.engineTenantId);
        if (success) {
          toast.success('Switched to Engine');
          router.push('/dashboard');
        } else {
          toast.error('Failed to switch to Engine');
        }
      } else {
        toast.error('No linked Engine account found');
      }
    } catch (error) {
      toast.error('Failed to switch to Engine');
    } finally {
      setSwitchingToEngine(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/marketplace" className="flex items-center gap-2 group">
                <Image 
                  src="/engine-logo.svg" 
                  alt="Marketplace Logo" 
                  width={120} 
                  height={36}
                  className="h-9 w-auto transition-opacity duration-200 group-hover:opacity-80"
                />
              </Link>
              {isAuthenticated && (
                <nav className="hidden md:flex items-center gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || (item.href !== '/marketplace' && pathname?.startsWith(item.href));
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 group relative ${
                          isActive
                            ? 'bg-black text-white'
                            : 'hover:bg-black hover:text-white'
                        }`}
                      >
                        <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              )}
            </div>
            {isAuthenticated && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative rounded-lg hover:bg-accent/10 transition-all duration-200"
                >
                  <Search className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-lg hover:bg-accent/10 transition-all duration-200"
                  onClick={() => setShowNotifications(!showNotifications)}
                >
                  <Bell className="h-4 w-4" />
                </Button>
                
                {/* Switch to Engine Button */}
                {engineAuth && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSwitchToEngine}
                    disabled={switchingToEngine}
                    className="hidden sm:flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    {switchingToEngine ? 'Switching...' : 'Switch to Engine'}
                  </Button>
                )}
                
                {!engineAuth && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const linkStatus = await UnifiedAuth.checkLinkedEngineAccount();
                      if (linkStatus.linked) {
                        handleSwitchToEngine();
                      } else {
                        router.push('/login');
                      }
                    }}
                    className="hidden sm:flex items-center gap-2"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Go to Engine
                  </Button>
                )}

                <div className="relative">
                  <Button
                    variant="ghost"
                    className="flex items-center gap-2 rounded-lg hover:bg-accent/10 transition-all duration-200"
                  >
                    <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                      {user?.firstName?.[0]?.toUpperCase() || 'M'}
                    </div>
                    <span className="text-sm font-medium hidden sm:inline">{user?.firstName || 'Marketplace'}</span>
                    <ChevronDown className="h-4 w-4 hidden sm:inline" />
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg hover:bg-accent/10 transition-all duration-200"
                  onClick={() => {
                    useMarketplaceAuthStore.getState().clearAuth();
                    router.push('/marketplace/login');
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

