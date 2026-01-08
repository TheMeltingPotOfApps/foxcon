'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Download,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import { useListing, useListingMetrics } from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';

export default function ListingAnalyticsPage({ params }: { params: { id: string } }) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const { data: listing, isLoading } = useListing(params.id);
  const { data: metrics } = useListingMetrics(params.id);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted animate-pulse rounded w-1/4"></div>
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-3/4"></div>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="space-y-6">
        <Link href="/nurture-leads/listings">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Listings
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Listing not found</h3>
            <Link href="/nurture-leads/listings">
              <Button>Back to Listings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/nurture-leads/listings/${params.id}`}>
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Listing
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight mt-2">{listing.name} - Analytics</h1>
          <p className="text-muted-foreground mt-1">
            Detailed performance metrics and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
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
            <CardTitle className="text-sm font-medium">Total Leads Delivered</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics?.totalLeadsDelivered || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all subscriptions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics?.contactRate.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads successfully contacted
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">DNC Rate</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics?.dncRate.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Do Not Contact requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold Count</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.soldCount || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Leads converted to sales
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Total Revenue</div>
              <div className="text-2xl font-bold mt-1">
                {((metrics?.totalLeadsDelivered || 0) * listing.pricePerLead).toFixed(2)} LR
              </div>
            </div>
            {metrics?.averageDealValue && (
              <div className="p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground">Average Deal Value</div>
                <div className="text-2xl font-bold mt-1">
                  ${metrics.averageDealValue.toFixed(2)}
                </div>
              </div>
            )}
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Price per Lead</div>
              <div className="text-2xl font-bold mt-1">{listing.pricePerLead} LR</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="subscribers">Subscribers</TabsTrigger>
          <TabsTrigger value="quality">Lead Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
              <CardDescription>Key metrics at a glance</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Total Subscriptions</div>
                    <div className="text-sm text-muted-foreground">
                      Active buyers subscribed to this listing
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {/* TODO: Fetch subscription count from API */}
                    0
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">Average Lead Quality Score</div>
                    <div className="text-sm text-muted-foreground">
                      Based on contact and conversion rates
                    </div>
                  </div>
                  <div className="text-2xl font-bold">
                    {metrics && metrics.contactRate != null && metrics.dncRate != null
                      ? ((Number(metrics.contactRate) - Number(metrics.dncRate)) / 10).toFixed(1)
                      : '0.0'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Trends & Patterns</CardTitle>
              <CardDescription>Performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Trend charts coming soon</p>
                <p className="text-sm mt-2">
                  View performance trends, daily/weekly patterns, and seasonal variations
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscribers">
          <Card>
            <CardHeader>
              <CardTitle>Subscriber Analytics</CardTitle>
              <CardDescription>Performance by subscriber</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Subscriber analytics coming soon</p>
                <p className="text-sm mt-2">
                  View individual subscriber performance and lead distribution
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality">
          <Card>
            <CardHeader>
              <CardTitle>Lead Quality Metrics</CardTitle>
              <CardDescription>Detailed quality analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Contact Success Rate</div>
                    <div className="text-3xl font-bold text-green-600">
                      {metrics?.contactRate != null ? Number(metrics.contactRate).toFixed(1) : '0.0'}%
                    </div>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Conversion Rate</div>
                    <div className="text-3xl font-bold text-blue-600">
                      {metrics && metrics.totalLeadsDelivered > 0
                        ? ((metrics.soldCount / metrics.totalLeadsDelivered) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

