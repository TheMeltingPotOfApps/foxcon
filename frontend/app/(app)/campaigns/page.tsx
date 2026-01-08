'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useCampaigns, useLaunchCampaign, usePauseCampaign } from '@/lib/hooks/use-campaigns';
import { Plus, Search, Play, Pause, MoreVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const statusColors = {
  DRAFT: 'outline',
  SCHEDULED: 'secondary',
  RUNNING: 'success',
  PAUSED: 'warning',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
} as const;

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { data: campaigns, isLoading } = useCampaigns();
  const launchCampaign = useLaunchCampaign();
  const pauseCampaign = usePauseCampaign();

  const filteredCampaigns =
    campaigns?.filter((campaign) =>
      campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const handleLaunch = async (id: string) => {
    try {
      await launchCampaign.mutateAsync(id);
    } catch (error) {
      console.error('Failed to launch campaign:', error);
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseCampaign.mutateAsync(id);
    } catch (error) {
      console.error('Failed to pause campaign:', error);
    }
  };

  // ===== ORIGINAL CONTENT (COMMENTED OUT) =====
  /*
  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">Manage your SMS campaigns</p>
        </div>
        <Link href="/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Campaigns</CardTitle>
              <CardDescription>
                {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading campaigns...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No campaigns found' : 'No campaigns yet'}
              </p>
              {!searchQuery && (
                <Link href="/campaigns/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Campaign
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Messages</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="font-medium hover:underline"
                      >
                        {campaign.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{campaign.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          statusColors[campaign.status as keyof typeof statusColors] || 'outline'
                        }
                      >
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {campaign.messageCount || 0} sent
                      {campaign.deliveredCount !== undefined && (
                        <span className="text-muted-foreground ml-1">
                          ({campaign.deliveredCount} delivered)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {campaign.status === 'DRAFT' || campaign.status === 'PAUSED' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLaunch(campaign.id)}
                            disabled={launchCampaign.isPending}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Launch
                          </Button>
                        ) : campaign.status === 'RUNNING' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePause(campaign.id)}
                            disabled={pauseCampaign.isPending}
                          >
                            <Pause className="h-3 w-3 mr-1" />
                            Pause
                          </Button>
                        ) : null}
                        <Link href={`/campaigns/${campaign.id}`}>
                          <Button size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
  */

  // ===== NEW MODERN REDESIGN =====
  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-primary">Campaigns</h1>
          <p className="text-lg text-muted-foreground">Manage and track your SMS campaigns</p>
        </div>
        <Link href="/campaigns/new">
          <Button size="lg" className="shadow-glow hover:shadow-glow-accent group">
            <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Enhanced Search and Filter Card */}
      <Card className="border-border/50 shadow-medium">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-xl">Your Campaigns</CardTitle>
              <CardDescription className="text-base">
                {filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''} total
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-12 w-full sm:w-80 text-base border-2 focus-visible:border-primary"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
              <p className="text-muted-foreground font-medium">Loading campaigns...</p>
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-primary" />
              </div>
              <p className="text-lg font-semibold text-foreground mb-2">
                {searchQuery ? 'No campaigns found' : 'No campaigns yet'}
              </p>
              <p className="text-muted-foreground mb-6">
                {searchQuery ? 'Try adjusting your search' : 'Get started by creating your first campaign'}
              </p>
              {!searchQuery && (
                <Link href="/campaigns/new">
                  <Button size="lg" className="shadow-glow">
                    <Plus className="mr-2 h-5 w-5" />
                    Create Your First Campaign
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="font-semibold">Name</TableHead>
                    <TableHead className="font-semibold">Type</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Messages</TableHead>
                    <TableHead className="font-semibold">Created</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCampaigns.map((campaign, idx) => (
                    <motion.tr
                      key={campaign.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <TableCell className="font-medium">
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="hover:text-primary transition-colors font-semibold"
                        >
                          {campaign.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-medium">{campaign.type}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            statusColors[campaign.status as keyof typeof statusColors] || 'outline'
                          }
                          className="font-semibold"
                        >
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{campaign.messageCount || 0}</span>
                        <span className="text-muted-foreground ml-2">sent</span>
                        {campaign.deliveredCount !== undefined && (
                          <span className="text-muted-foreground ml-2">
                            ({campaign.deliveredCount} delivered)
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          {campaign.status === 'DRAFT' || campaign.status === 'PAUSED' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLaunch(campaign.id)}
                              disabled={launchCampaign.isPending}
                              className="hover:bg-success/10 hover:border-success hover:text-success"
                            >
                              <Play className="h-4 w-4 mr-1.5" />
                              Launch
                            </Button>
                          ) : campaign.status === 'RUNNING' ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePause(campaign.id)}
                              disabled={pauseCampaign.isPending}
                              className="hover:bg-warning/10 hover:border-warning hover:text-warning"
                            >
                              <Pause className="h-4 w-4 mr-1.5" />
                              Pause
                            </Button>
                          ) : null}
                          <Link href={`/campaigns/${campaign.id}`}>
                            <Button size="sm" variant="ghost" className="hover:bg-accent/10">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
