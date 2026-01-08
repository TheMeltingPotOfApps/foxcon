'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Star,
  BarChart3,
  Plus,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';
import {
  useListings,
  useMarketerDashboard,
  useLeadReservationBalance,
} from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';

export default function SellerOverviewPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const { data: dashboardData, isLoading: dashboardLoading } = useMarketerDashboard();
  const { data: listingsData } = useListings({ page: 1, limit: 10 });
  const { data: balanceData } = useLeadReservationBalance();

  const listings = listingsData?.listings || [];
  const balance = balanceData?.balance || 0;
  const dashboard = dashboardData || {
    totalRevenue: 0,
    totalLeadsSold: 0,
    activeListings: 0,
    averageRating: 0,
    totalSubscriptions: 0,
    revenueChange: 0,
    leadsChange: 0,
    topListings: [],
    recentActivity: [],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seller Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of your marketplace performance and sales
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/marketplace/listings/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Listing
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
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalRevenue.toFixed(2)} LR</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {dashboard.revenueChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={dashboard.revenueChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(dashboard.revenueChange).toFixed(1)}%
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Sold</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.totalLeadsSold}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {dashboard.leadsChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
              ) : (
                <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
              )}
              <span className={dashboard.leadsChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                {Math.abs(dashboard.leadsChange).toFixed(1)}%
              </span>
              <span className="ml-1">vs previous period</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard.activeListings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {listings.filter((l) => l.status === 'ACTIVE').length} currently active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboard.averageRating > 0 ? dashboard.averageRating.toFixed(1) : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {dashboard.totalSubscriptions} total subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="listings">My Listings</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Performing Listings */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Listings</CardTitle>
                <CardDescription>Your best-selling lead offerings</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.topListings && dashboard.topListings.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.topListings.map((listing: any, index: number) => (
                      <div key={listing.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-medium">{listing.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {listing.leadsSold || 0} leads sold
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">
                            {(listing.revenue || 0).toFixed(2)} LR
                          </div>
                          <div className="text-xs text-muted-foreground">Revenue</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No performance data yet</p>
                    <Link href="/marketplace/listings/new">
                      <Button variant="outline" size="sm" className="mt-4">
                        Create Your First Listing
                      </Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest marketplace events</CardDescription>
              </CardHeader>
              <CardContent>
                {dashboard.recentActivity && dashboard.recentActivity.length > 0 ? (
                  <div className="space-y-4">
                    {dashboard.recentActivity.map((activity: any, index: number) => (
                      <div key={index} className="flex items-start gap-3">
                        <div className="mt-1">
                          {activity.type === 'sale' ? (
                            <DollarSign className="h-4 w-4 text-green-600" />
                          ) : activity.type === 'subscription' ? (
                            <Users className="h-4 w-4 text-blue-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{activity.message}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <div className="space-y-4">
            {listings.length === 0 ? (
              <Card>
                <CardContent className="pt-12 pb-12 text-center">
                  <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first listing to start selling leads
                  </p>
                  <Link href="/marketplace/listings/new">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Listing
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              listings.map((listing) => (
                <Card key={listing.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{listing.name}</CardTitle>
                          <Badge
                            variant={
                              listing.status === 'ACTIVE'
                                ? 'default'
                                : listing.status === 'PAUSED'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {listing.status}
                          </Badge>
                        </div>
                        <CardDescription>{listing.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Price</div>
                        <div className="text-lg font-semibold">{listing.pricePerLead} LR</div>
                      </div>
                      {listing.metrics && (
                        <>
                          <div>
                            <div className="text-sm text-muted-foreground">Leads Sold</div>
                            <div className="text-lg font-semibold">
                              {listing.metrics.totalLeadsDelivered}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Contact Rate</div>
                            <div className="text-lg font-semibold text-green-600">
                              {Number(listing.metrics.contactRate ?? 0).toFixed(1)}%
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground">Revenue</div>
                            <div className="text-lg font-semibold">
                              {(
                                listing.metrics.totalLeadsDelivered * listing.pricePerLead
                              ).toFixed(2)}{' '}
                              LR
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <Link href={`/marketplace/listings/${listing.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>
                      </Link>
                      <Link href={`/marketplace/listings/${listing.id}/analytics`}>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Metrics</CardTitle>
              <CardDescription>Detailed analytics and insights</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Performance analytics coming soon</p>
                <p className="text-sm mt-2">
                  View detailed charts, trends, and conversion metrics
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="earnings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Earnings Overview</CardTitle>
              <CardDescription>Track your revenue and payouts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Total Earnings</div>
                    <div className="text-2xl font-bold mt-1">{dashboard.totalRevenue.toFixed(2)} LR</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Available Balance</div>
                    <div className="text-2xl font-bold mt-1">{balance.toFixed(2)} LR</div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground">Pending</div>
                    <div className="text-2xl font-bold mt-1">0.00 LR</div>
                  </div>
                </div>
                <div className="text-center py-8 text-muted-foreground">
                  <p>Earnings history and payout details coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

