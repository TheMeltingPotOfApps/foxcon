'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Edit,
  BarChart3,
  CheckCircle2,
  Star,
  TrendingUp,
  Users,
  DollarSign,
} from 'lucide-react';
import Link from 'next/link';
import { useListing, useListingMetrics, useCreateSubscription } from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { ListingReviews } from '@/components/marketplace/listing-reviews';

export default function ListingDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: listing, isLoading } = useListing(params.id);
  const { data: metrics } = useListingMetrics(params.id);
  const createSubscription = useCreateSubscription();
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const [leadCount, setLeadCount] = useState('100');
  const [priority, setPriority] = useState('0');

  const handleSubscribe = async () => {
    if (!listing) return;

    const count = parseInt(leadCount);
    if (!count || count <= 0) {
      toast.error('Please enter a valid lead count');
      return;
    }

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7); // Default to 7 days

    try {
      await createSubscription.mutateAsync({
        listingId: listing.id,
        leadCount: count,
        startDate,
        endDate,
        priority: parseInt(priority) || 0,
      });
      toast.success('Subscription created successfully');
      router.push('/nurture-leads/subscriptions');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create subscription');
    }
  };

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
        <Link href="/nurture-leads">
          <Button variant="ghost">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Nurture Leads
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Listing not found</h3>
            <Link href="/nurture-leads">
              <Button>Browse Listings</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/nurture-leads">
        <Button variant="ghost">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Nurture Leads
        </Button>
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{listing.name}</h1>
            {listing.isVerified && (
              <Badge variant="default">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
            <Badge variant={listing.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {listing.status}
            </Badge>
          </div>
          {listing.description && (
            <p className="text-muted-foreground mt-2">{listing.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Link href={`/nurture-leads/listings/${listing.id}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          {listing.status === 'ACTIVE' && (
            <Button onClick={() => setShowSubscribeDialog(true)}>
              Subscribe
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Price per Lead
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{listing.pricePerLead} LR</div>
              </CardContent>
            </Card>
            {listing.industry && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Industry
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{listing.industry}</div>
                </CardContent>
              </Card>
            )}
            {metrics && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Leads Delivered
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalLeadsDelivered}</div>
                </CardContent>
              </Card>
            )}
          </div>

          {listing.leadParameters && Object.keys(listing.leadParameters).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Lead Parameters</CardTitle>
                <CardDescription>
                  Fields provided with each lead
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.keys(listing.leadParameters).map((key) => (
                    <Badge key={key} variant="outline">
                      {key}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          {metrics ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Contact Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    {Number(metrics.contactRate ?? 0).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    DNC Rate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {Number(metrics.dncRate ?? 0).toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Sold Count
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{metrics.soldCount}</div>
                </CardContent>
              </Card>
              {metrics.averageDealValue && (
                <Card>
                  <CardHeader>
                    <CardTitle>Average Deal Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      ${metrics.averageDealValue.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-12 pb-12 text-center text-muted-foreground">
                No metrics available yet
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reviews">
          <ListingReviews listingId={listing.id} />
        </TabsContent>
      </Tabs>

      {/* Subscribe Dialog */}
      {showSubscribeDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Subscribe to Listing</CardTitle>
              <CardDescription>
                {listing.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Lead Count</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={leadCount}
                  onChange={(e) => setLeadCount(e.target.value)}
                  min="1"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Priority (0-100)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border rounded-lg"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  min="0"
                  max="100"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowSubscribeDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSubscribe}
                  disabled={createSubscription.isPending}
                >
                  {createSubscription.isPending ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

