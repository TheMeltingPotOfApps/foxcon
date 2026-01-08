'use client';

import { useAuthStore } from '@/store/auth-store';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Users,
  Settings,
  Bell,
  Search,
  LogOut,
  ChevronDown,
  Shield,
  FileText,
  Calendar,
  Store,
  Building2,
  DollarSign,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NotificationCenter } from '@/components/notifications/notification-center';
import { useUnreadNotificationCount } from '@/lib/hooks/use-notifications';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { useMarketplaceAuthStore } from '@/store/marketplace-auth-store';
import { UnifiedAuth } from '@/lib/auth/unified-auth';
import { toast } from 'sonner';
import { usePathname } from 'next/navigation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const user = useAuthStore((state) => state.user);
  const tenantId = useAuthStore((state) => state.tenantId);
  const marketplaceAuth = useMarketplaceAuthStore((state) => state.isAuthenticated);
  const [showTenantSwitcher, setShowTenantSwitcher] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [switchingToMarketplace, setSwitchingToMarketplace] = useState(false);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  useEffect(() => {
    // Don't check auth for marketplace routes - they have their own layout
    if (pathname?.startsWith('/marketplace')) {
      return;
    }
    // Wait for hydration before checking auth
    if (hasHydrated && !isAuthenticated) {
      router.push('/login');
    }
  }, [hasHydrated, isAuthenticated, router, pathname]);

  // Don't render this layout for marketplace routes - they have their own layout
  if (pathname?.startsWith('/marketplace')) {
    return <>{children}</>;
  }

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

  if (!isAuthenticated) {
    return null;
  }

  const userRole = (user as any)?.role;
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(isSuperAdmin ? [
      { href: '/super-admin', label: 'Super Admin', icon: Shield },
      { href: '/super-admin/tenants', label: 'Tenants', icon: Building2 },
      { href: '/super-admin/users', label: 'Users', icon: Users },
      { href: '/super-admin/pricing', label: 'Stripe Pricing', icon: DollarSign },
      { href: '/super-admin/limits', label: 'Limits & Pricing', icon: Shield },
      { href: '/super-admin/compliance', label: 'Compliance', icon: Shield },
    ] : []),
    { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
    { href: '/journeys', label: 'Journeys', icon: MessageSquare },
    { href: '/conversations', label: 'Conversations', icon: MessageSquare },
    { href: '/contacts', label: 'Contacts', icon: Users },
    { href: '/templates', label: 'Templates', icon: FileText },
    { href: '/scheduling', label: 'Scheduling', icon: Calendar },
    { href: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Link href="/dashboard" className="flex items-center gap-2 group">
                <Image 
                  src="/engine-logo.svg" 
                  alt="Engine Logo" 
                  width={120} 
                  height={36}
                  className="h-9 w-auto transition-opacity duration-200 group-hover:opacity-80"
                />
              </Link>
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-black hover:text-white transition-all duration-200 group relative"
                    >
                      <Icon className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
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
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-5 w-5 bg-destructive rounded-full ring-2 ring-background flex items-center justify-center text-[10px] font-semibold text-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
              
              {/* Switch to Marketplace Button */}
              {marketplaceAuth && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/marketplace')}
                  className="hidden sm:flex items-center gap-2"
                >
                  <Store className="h-4 w-4" />
                  Switch to Marketplace
                </Button>
              )}
              
              {!marketplaceAuth && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    setSwitchingToMarketplace(true);
                    try {
                      const linkStatus = await UnifiedAuth.checkLinkedMarketplaceAccount();
                      if (linkStatus.linked) {
                        const success = await UnifiedAuth.loginToMarketplaceFromEngine();
                        if (success) {
                          toast.success('Switched to Marketplace');
                          router.push('/marketplace');
                        } else {
                          toast.error('Failed to switch to Marketplace');
                        }
                      } else {
                        router.push('/marketplace/login');
                      }
                    } catch (error) {
                      toast.error('Failed to switch to Marketplace');
                    } finally {
                      setSwitchingToMarketplace(false);
                    }
                  }}
                  disabled={switchingToMarketplace}
                  className="hidden sm:flex items-center gap-2"
                >
                  <Store className="h-4 w-4" />
                  {switchingToMarketplace ? 'Switching...' : 'Go to Marketplace'}
                </Button>
              )}

              <div className="relative">
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 rounded-lg hover:bg-accent/10 transition-all duration-200"
                  onClick={() => setShowTenantSwitcher(!showTenantSwitcher)}
                >
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                    {user?.firstName?.[0]?.toUpperCase() || 'W'}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">{user?.firstName || 'Workspace'}</span>
                  <ChevronDown className="h-4 w-4 hidden sm:inline" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-lg hover:bg-accent/10 transition-all duration-200"
                onClick={() => {
                  useAuthStore.getState().clearAuth();
                  router.push('/login');
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
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

      {/* Tenant Switcher Dialog */}
      <Dialog open={showTenantSwitcher} onOpenChange={setShowTenantSwitcher}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Switch Workspace</DialogTitle>
            <DialogDescription>
              Select a workspace to switch to
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Workspace switching coming soon
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notifications Dialog */}
      <NotificationCenter open={showNotifications} onOpenChange={setShowNotifications} />
      
      {/* Onboarding Flow */}
      <OnboardingFlow />
    </div>
  );
}
