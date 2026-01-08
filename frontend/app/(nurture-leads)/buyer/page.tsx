'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ShoppingCart,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  Plus,
  Eye,
  Filter,
  Search,
} from 'lucide-react';
import Link from 'next/link';
import {
  useSubscriptions,
  useBuyerDashboard,
  useLeadReservationBalance,
} from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';
import { Input } from '@/components/ui/input';

export default function BuyerOverviewPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [searchTerm, setSearchTerm] = useState('');
  const { data: dashboardData, isLoading: dashboardLoading } = useBuyerDashboard();
  const { data: subscriptions } = useSubscriptions();
  const { data: balanceData } = useLeadReservationBalance();

  const balance = balanceData?.balance || 0;
  const dashboard = dashboardData || {
    totalSpent: 0,
    totalLeadsReceived: 0,
    activeSubscriptions: 0,
    averageLeadQuality: 0,
    conversionRate: 0,
    topListings: [],
    recentLeads: [],
  };

  const activeSubscriptions = subscriptions?.filter((s) => s.status === 'ACTIVE') || [];
  const pausedSubscriptions = subscriptions?.filter((s) => s.status === 'PAUSED') || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Buyer Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your lead subscriptions and track performance
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/nurture-leads">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Browse Listings
            </Button>
          </Link>
        </div>
      </div>

      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(['7d', '30d', '90d', 'all'] as const).map((range) => (
          <Button
            key={range}
            variant={timeRange === range ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTimeRange(range)}
          >
            {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : range === '90d' ? '90 Days' : 'All Time'}
          </Button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalSpent.toFixed(2)} LR</div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.activeSubscriptions} active subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Received</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalLeadsReceived}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.conversionRate > 0 ? dashboard.conversionRate.toFixed(1) : '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads converted to sales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{balance.toFixed(2)} LR</div>
            <Link href="/nurture-leads/reservations">
              <Button variant="link" size="sm" className="p-0 h-auto mt-1">
                Add Funds
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="leads">Recent Leads</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          {/* Active Subscriptions */}
          {activeSubscriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Active Subscriptions ({activeSubscriptions.length})
              </h3>
              <div className="space-y-4">
                {activeSubscriptions.map((subscription) => {
                  const progress =
                    subscription.leadCount > 0
                      ? (subscription.leadsDelivered / subscription.leadCount) * 100
                      : 0;
                  const remaining = subscription.leadCount - subscription.leadsDelivered;

                  return (
                    <Card key={subscription.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CardTitle>{subscription.listing?.name || 'Unknown Listing'}</CardTitle>
                              <Badge variant="default">Active</Badge>
                            </div>
                            <CardDescription>{subscription.listing?.description}</CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <div className="text-sm text-muted-foreground">Progress</div>
                              <div className="text-lg font-semibold">
                                {subscription.leadsDelivered} / {subscription.leadCount}
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Remaining</div>
                              <div className="text-lg font-semibold">{remaining} leads</div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">Spent</div>
                              <div className="text-lg font-semibold">
                                {subscription.leadReservationsSpent.toFixed(2)} LR
                              </div>
                            </div>
                            <div>
                              <div className="text-sm text-muted-foreground">End Date</div>
                              <div className="text-sm font-semibold">
                                {formatDistanceToNow(new Date(subscription.endDate), {
                                  addSuffix: true,
                                })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link href={`/nurture-leads/subscriptions/${subscription.id}`}>
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </Link>
                            <Link href={`/nurture-leads/listings/${subscription.listingId}`}>
                              <Button variant="outline" size="sm">
                                View Listing
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Paused Subscriptions */}
          {pausedSubscriptions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-600" />
                Paused Subscriptions ({pausedSubscriptions.length})
              </h3>
              <div className="space-y-4">
                {pausedSubscriptions.map((subscription) => (
                  <Card key={subscription.id} className="opacity-75">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <CardTitle>{subscription.listing?.name || 'Unknown Listing'}</CardTitle>
                            <Badge variant="secondary">Paused</Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {activeSubscriptions.length === 0 && pausedSubscriptions.length === 0 && (
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No subscriptions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Browse listings and subscribe to start receiving leads
                </p>
                <Link href="/nurture-leads">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Browse Listings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="leads" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Leads</CardTitle>
              <CardDescription>Leads received from your subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard.recentLeads && dashboard.recentLeads.length > 0 ? (
                <div className="space-y-4">
                  {dashboard.recentLeads.map((lead: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </div>
                        <div className="text-sm text-muted-foreground">{lead.phone}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          From: {lead.listingName}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{lead.status || 'NEW'}</Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(lead.receivedAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No leads received yet</p>
                  <p className="text-sm mt-2">
                    Subscribe to listings to start receiving leads
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Track your lead quality and conversion rates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Performance analytics coming soon</p>
                <p className="text-sm mt-2">
                  View detailed metrics on lead quality, conversion rates, and ROI
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Favorite Listings</CardTitle>
              <CardDescription>Save listings for quick access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <p>Favorite listings feature coming soon</p>
                <p className="text-sm mt-2">
                  Save listings you&apos;re interested in for easy access later
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

