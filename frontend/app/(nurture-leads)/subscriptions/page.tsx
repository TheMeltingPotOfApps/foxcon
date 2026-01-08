'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Pause,
  Play,
  X,
  TrendingUp,
  Users,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';
import {
  useSubscriptions,
  usePauseSubscription,
  useResumeSubscription,
  useCancelSubscription,
} from '@/lib/hooks/use-marketplace';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

export default function MySubscriptionsPage() {
  const { data: subscriptions, isLoading } = useSubscriptions();
  const pauseSubscription = usePauseSubscription();
  const resumeSubscription = useResumeSubscription();
  const cancelSubscription = useCancelSubscription();

  const handlePause = async (id: string) => {
    try {
      await pauseSubscription.mutateAsync(id);
      toast.success('Subscription paused successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause subscription');
    }
  };

  const handleResume = async (id: string) => {
    try {
      await resumeSubscription.mutateAsync(id);
      toast.success('Subscription resumed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to resume subscription');
    }
  };

  const handleCancel = async (id: string) => {
    if (confirm('Are you sure you want to cancel this subscription? Unused Lead Reservations will be refunded.')) {
      try {
        await cancelSubscription.mutateAsync(id);
        toast.success('Subscription cancelled successfully');
      } catch (error: any) {
        toast.error(error.message || 'Failed to cancel subscription');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Subscriptions</h1>
        <p className="text-muted-foreground mt-1">
          Manage your lead subscriptions and track delivery
        </p>
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
      ) : !subscriptions || subscriptions.length === 0 ? (
        <Card>
          <CardContent className="pt-12 pb-12 text-center">
            <h3 className="text-lg font-semibold mb-2">No subscriptions yet</h3>
            <p className="text-muted-foreground mb-4">
              Browse listings and subscribe to start receiving leads
            </p>
            <Link href="/nurture-leads">
              <Button>
                Browse Listings
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {subscriptions.map((subscription) => {
            const progress = subscription.leadCount > 0
              ? (subscription.leadsDelivered / subscription.leadCount) * 100
              : 0;
            const remaining = subscription.leadCount - subscription.leadsDelivered;

            return (
              <motion.div
                key={subscription.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <CardTitle>{subscription.listing?.name || 'Unknown Listing'}</CardTitle>
                          <Badge
                            variant={
                              subscription.status === 'ACTIVE'
                                ? 'default'
                                : subscription.status === 'PAUSED'
                                ? 'secondary'
                                : 'outline'
                            }
                          >
                            {subscription.status}
                          </Badge>
                        </div>
                        <CardDescription>
                          {subscription.listing?.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Leads Delivered</span>
                        <span className="font-semibold">
                          {subscription.leadsDelivered} / {subscription.leadCount}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Remaining</span>
                        <span className="font-semibold">{remaining} leads</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Lead Reservations Spent</span>
                        <span className="font-semibold">
                          {subscription.leadReservationsSpent.toFixed(2)} LR
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Priority</span>
                        <span className="font-semibold">{subscription.priority}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">End Date</span>
                        <span className="font-semibold">
                          {formatDistanceToNow(new Date(subscription.endDate), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        {subscription.status === 'ACTIVE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePause(subscription.id)}
                            disabled={pauseSubscription.isPending}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </Button>
                        ) : subscription.status === 'PAUSED' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResume(subscription.id)}
                            disabled={resumeSubscription.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Resume
                          </Button>
                        ) : null}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleCancel(subscription.id)}
                          disabled={cancelSubscription.isPending}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

