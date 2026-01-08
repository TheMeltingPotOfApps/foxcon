'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Pause,
  Play,
  Trash2,
  BarChart3,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useListings, usePauseListing, usePublishListing } from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function MyListingsPage() {
  const { data: listingsData, isLoading } = useListings({
    page: 1,
    limit: 100,
  });

  const pauseListing = usePauseListing();
  const publishListing = usePublishListing();

  const listings = listingsData?.listings || [];

  const handlePause = async (id: string) => {
    try {
      await pauseListing.mutateAsync(id);
      toast.success('Listing paused successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause listing');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await publishListing.mutateAsync(id);
      toast.success('Listing published successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to publish listing');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Listings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your lead offerings and track performance
          </p>
        </div>
        <Link href="/nurture-leads/listings/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Listing
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      ) : listings.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No listings yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first listing to start selling leads
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
        <div className="space-y-4">
          {listings.map((listing) => (
            <motion.div
              key={listing.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card>
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
                        {listing.isVerified && (
                          <Badge variant="default" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      {listing.description && (
                        <CardDescription className="mt-2">{listing.description}</CardDescription>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      <div>
                        <div className="text-sm text-muted-foreground">Price per Lead</div>
                        <div className="text-lg font-semibold">{listing.pricePerLead} LR</div>
                      </div>
                      {listing.metrics && (
                        <>
                          <div>
                            <div className="text-sm text-muted-foreground">Leads Delivered</div>
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
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/nurture-leads/listings/${listing.id}/analytics`}>
                        <Button variant="outline" size="sm">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                      </Link>
                      <Link href={`/nurture-leads/listings/${listing.id}/edit`}>
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                      </Link>
                      {listing.status === 'ACTIVE' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePause(listing.id)}
                          disabled={pauseListing.isPending}
                        >
                          <Pause className="h-4 w-4 mr-2" />
                          Pause
                        </Button>
                      ) : listing.status === 'DRAFT' ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePublish(listing.id)}
                          disabled={publishListing.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Publish
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handlePublish(listing.id)}
                          disabled={publishListing.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Resume
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

