'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Users,
  DollarSign,
  CheckCircle2,
  Star,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { useListings, useLeadReservationBalance } from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';

export default function NurtureLeadsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<{
    industry?: string;
    isVerified?: boolean;
    minPrice?: number;
    maxPrice?: number;
  }>({});

  const { data: listingsData, isLoading } = useListings({
    status: 'ACTIVE',
    ...filters,
    page: 1,
    limit: 50,
  });

  const { data: balanceData } = useLeadReservationBalance();

  const listings = listingsData?.listings || [];
  const balance = balanceData?.balance || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Nurture Leads</h1>
          <p className="text-muted-foreground mt-1">
            Buy and sell high-quality leads in real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Card className="px-4 py-2">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-xs text-muted-foreground">Balance</div>
                <div className="text-sm font-semibold">{balance.toFixed(2)} LR</div>
              </div>
            </div>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Link href="/nurture-leads/seller">
              <Button variant="outline" size="sm">
                Seller Dashboard
              </Button>
            </Link>
            <Link href="/nurture-leads/buyer">
              <Button variant="outline" size="sm">
                Buyer Dashboard
              </Button>
            </Link>
            <Link href="/nurture-leads/lead-sources">
              <Button variant="outline" size="sm">
                Lead Sources
              </Button>
            </Link>
            <Link href="/nurture-leads/ingestion">
              <Button variant="outline" size="sm">
                Ingestion
              </Button>
            </Link>
            <Link href="/nurture-leads/purchases">
              <Button variant="outline" size="sm">
                Purchases
              </Button>
            </Link>
            <Link href="/nurture-leads/reviews">
              <Button variant="outline" size="sm">
                Reviews
              </Button>
            </Link>
            <Link href="/nurture-leads/listings/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Listings Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No listings found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || Object.keys(filters).length > 0
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a listing'}
            </p>
            <Link href="/nurture-leads/listings/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Listing
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-full flex flex-col hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={`/nurture-leads/listings/${listing.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{listing.name}</CardTitle>
                        <div className="flex items-center gap-2 flex-wrap">
                          {listing.isVerified && (
                            <Badge variant="default" className="text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                          {listing.industry && (
                            <Badge variant="outline" className="text-xs">
                              {listing.industry}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1">
                    {listing.description && (
                      <CardDescription className="mb-4 line-clamp-2">
                        {listing.description}
                      </CardDescription>
                    )}
                    <div className="space-y-3">
                      {listing.metrics && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Leads Delivered</span>
                          <span className="font-semibold">{listing.metrics.totalLeadsDelivered}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Price per Lead</span>
                        <span className="font-semibold">{listing.pricePerLead} LR</span>
                      </div>
                      {listing.metrics && listing.metrics.contactRate != null && listing.metrics.contactRate > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Contact Rate</span>
                          <span className="font-semibold text-green-600">
                            {Number(listing.metrics.contactRate).toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardContent className="pt-0">
                    <Button className="w-full" variant="outline">
                      View Details
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

