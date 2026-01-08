'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Users,
  Package,
  ShoppingCart,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Star,
  Filter,
  Search,
} from 'lucide-react';
import {
  useMarketplaceOverview,
  useTopMarketers,
  useTopListings,
  useAllMarketplaceUsers,
  useAdminListings,
  useAdminSubscriptions,
  useAdminTransactions,
  useVerifyMarketer,
} from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';

export default function SuperAdminMarketplacePage() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userFilters, setUserFilters] = useState<{ userType?: string; isVerified?: boolean }>({});
  const [listingFilters, setListingFilters] = useState<{ status?: string; isVerified?: boolean }>({});

  const { data: overview, isLoading: overviewLoading } = useMarketplaceOverview(startDate || undefined, endDate || undefined);
  const { data: topMarketers = [] } = useTopMarketers(10);
  const { data: topListings = [] } = useTopListings(10);
  const { data: users = [] } = useAllMarketplaceUsers(userFilters);
  const { data: listings = [] } = useAdminListings(listingFilters);
  const { data: subscriptions = [] } = useAdminSubscriptions();
  const { data: transactions = [] } = useAdminTransactions();
  const verifyMarketer = useVerifyMarketer();

  const handleVerifyMarketer = async (userId: string) => {
    await verifyMarketer.mutateAsync(userId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Marketplace Admin</h1>
        <p className="text-muted-foreground mt-1">
          Complete oversight of the Lead Marketplace
        </p>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Stats */}
      {overviewLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.users.totalUsers}</div>
              <p className="text-xs text-muted-foreground">
                {overview.users.totalMarketers} marketers, {overview.users.totalBuyers} buyers
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Listings</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.listings.active}</div>
              <p className="text-xs text-muted-foreground">
                {overview.listings.total} total, {overview.listings.verified} verified
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.subscriptions.active}</div>
              <p className="text-xs text-muted-foreground">
                {overview.subscriptions.total} total
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${overview.transactions.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                {overview.transactions.total} transactions
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Marketers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Marketers</CardTitle>
                <CardDescription>By leads delivered</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topMarketers.slice(0, 5).map((marketer: any, index: number) => (
                    <div key={marketer.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{marketer.companyName || 'Unknown'}</div>
                          <div className="text-sm text-muted-foreground">
                            {marketer.totalListings} listings
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{marketer.totalLeadsDelivered}</div>
                        <div className="text-xs text-muted-foreground">leads</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Listings */}
            <Card>
              <CardHeader>
                <CardTitle>Top Listings</CardTitle>
                <CardDescription>By distributions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {topListings.slice(0, 5).map((listing: any, index: number) => (
                    <div key={listing.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-semibold">{listing.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {listing.pricePerLead} LR per lead
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">{listing.totalDistributions}</div>
                        <div className="text-xs text-muted-foreground">distributions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Marketplace Users</CardTitle>
                  <CardDescription>All marketers and buyers</CardDescription>
                </div>
                <div className="flex gap-2">
                  <select
                    className="px-3 py-2 border rounded-md text-sm"
                    value={userFilters.userType || ''}
                    onChange={(e) => setUserFilters({ ...userFilters, userType: e.target.value || undefined })}
                  >
                    <option value="">All Types</option>
                    <option value="MARKETER">Marketers</option>
                    <option value="BUYER">Buyers</option>
                    <option value="BOTH">Both</option>
                  </select>
                  <select
                    className="px-3 py-2 border rounded-md text-sm"
                    value={userFilters.isVerified === undefined ? '' : userFilters.isVerified.toString()}
                    onChange={(e) =>
                      setUserFilters({
                        ...userFilters,
                        isVerified: e.target.value === '' ? undefined : e.target.value === 'true',
                      })
                    }
                  >
                    <option value="">All Verification</option>
                    <option value="true">Verified</option>
                    <option value="false">Unverified</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user: any) => (
                  <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-semibold">{user.companyName || 'No Company Name'}</div>
                      <div className="text-sm text-muted-foreground">
                        Type: {user.userType} {user.isVerified && <Badge variant="secondary" className="ml-2">Verified</Badge>}
                      </div>
                    </div>
                    {user.userType === 'MARKETER' || user.userType === 'BOTH' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerifyMarketer(user.userId)}
                        disabled={user.isVerified || verifyMarketer.isPending}
                      >
                        {user.isVerified ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Verified
                          </>
                        ) : (
                          'Verify'
                        )}
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>All Listings</CardTitle>
                  <CardDescription>Manage all marketplace listings</CardDescription>
                </div>
                <div className="flex gap-2">
                  <select
                    className="px-3 py-2 border rounded-md text-sm"
                    value={listingFilters.status || ''}
                    onChange={(e) => setListingFilters({ ...listingFilters, status: e.target.value || undefined })}
                  >
                    <option value="">All Status</option>
                    <option value="ACTIVE">Active</option>
                    <option value="PAUSED">Paused</option>
                    <option value="DRAFT">Draft</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {listings.map((listing: any) => (
                  <div key={listing.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{listing.name}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {listing.industry && <Badge variant="outline" className="mr-2">{listing.industry}</Badge>}
                          {listing.isVerified && <Badge variant="secondary" className="mr-2">Verified</Badge>}
                          <Badge>{listing.status}</Badge>
                        </div>
                        <div className="text-sm mt-2">
                          Price: {listing.pricePerLead} LR per lead
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>Active and completed subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscriptions.map((sub: any) => (
                  <div key={sub.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{sub.listing?.name || 'Unknown Listing'}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          <Badge>{sub.status}</Badge>
                        </div>
                        <div className="text-sm mt-2">
                          {sub.leadsDelivered} / {sub.leadCount} leads delivered
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>All Transactions</CardTitle>
              <CardDescription>Lead Reservation transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((tx: any) => (
                  <div key={tx.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-semibold">{tx.type}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Amount: {tx.amount} LR
                        </div>
                        <div className="text-sm mt-2">
                          {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}


