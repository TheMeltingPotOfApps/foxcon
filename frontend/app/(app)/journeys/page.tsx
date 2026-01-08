'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, Play, Pause, Archive, MoreVertical, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useJourneys,
  useLaunchJourney,
  usePauseJourney,
  useDeleteJourney,
  type Journey,
} from '@/lib/hooks/use-journeys';
import { toast } from 'sonner';

type JourneyStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export default function JourneysPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<JourneyStatus | 'ALL'>('ALL');
  
  const { data: journeys = [], isLoading, error } = useJourneys();
  const launchJourney = useLaunchJourney();
  const pauseJourney = usePauseJourney();
  const deleteJourney = useDeleteJourney();

  const filteredJourneys = useMemo(() => {
    return journeys.filter((journey) => {
      const matchesSearch = journey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        journey.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || journey.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [journeys, searchQuery, statusFilter]);

  const handleLaunch = async (id: string) => {
    try {
      await launchJourney.mutateAsync(id);
      toast.success('Journey launched successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to launch journey');
    }
  };

  const handlePause = async (id: string) => {
    try {
      await pauseJourney.mutateAsync(id);
      toast.success('Journey paused successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause journey');
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Are you sure you want to archive this journey?')) return;
    try {
      await deleteJourney.mutateAsync(id);
      toast.success('Journey archived successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to archive journey');
    }
  };

  const getStatusBadge = (status: JourneyStatus) => {
    const variants = {
      DRAFT: 'secondary',
      ACTIVE: 'default',
      PAUSED: 'outline',
      ARCHIVED: 'secondary',
    };
    return <Badge variant={variants[status] as any}>{status}</Badge>;
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Journeys</h1>
          <p className="text-muted-foreground mt-2">
            Create automated SMS workflows with drag-and-drop builder
          </p>
        </div>
        <Link href="/journeys/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Journey
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search journeys..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as JourneyStatus | 'ALL')}
          className="px-4 py-2 border rounded-md bg-background"
        >
          <option value="ALL">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      <div className="bg-card rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Contacts</TableHead>
              <TableHead>Nodes</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-destructive">
                  Failed to load journeys. Please try again.
                </TableCell>
              </TableRow>
            ) : filteredJourneys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {searchQuery || statusFilter !== 'ALL'
                    ? 'No journeys match your filters.'
                    : 'No journeys found. Create your first journey to get started.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredJourneys.map((journey) => (
                <TableRow key={journey.id} className="hover:bg-muted/50">
                  <TableCell>
                    <Link href={`/journeys/${journey.id}`} className="font-medium hover:underline">
                      {journey.name}
                    </Link>
                    {journey.description && (
                      <p className="text-sm text-muted-foreground mt-1">{journey.description}</p>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(journey.status)}</TableCell>
                  <TableCell>{journey.contactsCount || 0}</TableCell>
                  <TableCell>{journey.nodesCount || 0}</TableCell>
                  <TableCell>{new Date(journey.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/journeys/${journey.id}/edit`}>Edit</Link>
                        </DropdownMenuItem>
                        {journey.status === 'ACTIVE' ? (
                          <DropdownMenuItem
                            onClick={() => handlePause(journey.id)}
                            disabled={pauseJourney.isPending}
                          >
                            <Pause className="h-4 w-4 mr-2" />
                            Pause
                          </DropdownMenuItem>
                        ) : journey.status === 'DRAFT' || journey.status === 'PAUSED' ? (
                          <DropdownMenuItem
                            onClick={() => handleLaunch(journey.id)}
                            disabled={launchJourney.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Launch
                          </DropdownMenuItem>
                        ) : null}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => handleArchive(journey.id)}
                          disabled={deleteJourney.isPending}
                        >
                          <Archive className="h-4 w-4 mr-2" />
                          Archive
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

