'use client';

import { useState, useEffect } from 'react';
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
// Select component - using native select for now
import { Plus, Search, Users, Edit2, Trash2, Filter, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';
import {
  useSegments,
  useCreateSegment,
  useUpdateSegment,
  useDeleteSegment,
  useSegment,
  useCountMatchingContacts,
} from '@/lib/hooks/use-segments';
import { useContacts, type Contact } from '@/lib/hooks/use-contacts';
import { useJourneys } from '@/lib/hooks/use-journeys';
import { formatDistanceToNow } from 'date-fns';

type SortField = 'name' | 'age' | 'phone' | 'email';
type SortDirection = 'asc' | 'desc';

export default function SegmentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [viewingSegment, setViewingSegment] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('age');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { data: segments, isLoading } = useSegments();
  const { data: segmentDetails } = useSegment(viewingSegment || '');
  const { data: contactsResponse } = useContacts(1, 1000); // Fetch up to 1000 contacts for segment evaluation
  const allContacts = contactsResponse?.data || [];
  const { data: journeys = [] } = useJourneys();
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();
  const deleteSegment = useDeleteSegment();
  const countMatchingContacts = useCountMatchingContacts();
  
  const [criteria, setCriteria] = useState({
    status: 'all',
    leadStatus: '',
    statusNotIn: [] as string[],
    leadStatusNotIn: [] as string[],
    leadAge: {
      minDays: undefined as number | undefined,
      maxDays: undefined as number | undefined,
      createdAfter: undefined as string | undefined,
      createdBefore: undefined as string | undefined,
    },
    notInJourney: false,
    notInJourneyIds: [] as string[],
    limit: undefined as number | undefined,
  });
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(false);
  const [continuousInclusion, setContinuousInclusion] = useState(false);
  
  // Edit dialog state
  const [editCriteria, setEditCriteria] = useState({
    status: 'all',
    leadStatus: '',
    statusNotIn: [] as string[],
    leadStatusNotIn: [] as string[],
    leadAge: {
      minDays: undefined as number | undefined,
      maxDays: undefined as number | undefined,
      createdAfter: undefined as string | undefined,
      createdBefore: undefined as string | undefined,
    },
    notInJourney: false,
    notInJourneyIds: [] as string[],
    limit: undefined as number | undefined,
  });
  const [editMatchingCount, setEditMatchingCount] = useState<number | null>(null);
  const [isEditCounting, setIsEditCounting] = useState(false);
  const [editContinuousInclusion, setEditContinuousInclusion] = useState(false);
  
  // Initialize edit criteria when editing segment changes
  useEffect(() => {
    if (editingSegment) {
      const segment = segments?.find((s) => s.id === editingSegment);
      if (segment) {
        setEditCriteria({
          status: segment.criteria?.status || 'all',
          leadStatus: segment.criteria?.leadStatus || '',
          statusNotIn: segment.criteria?.statusNotIn || [],
          leadStatusNotIn: segment.criteria?.leadStatusNotIn || [],
          leadAge: segment.criteria?.leadAge || {
            minDays: undefined,
            maxDays: undefined,
            createdAfter: undefined,
            createdBefore: undefined,
          },
          notInJourney: segment.criteria?.notInJourney || false,
          notInJourneyIds: segment.criteria?.notInJourneyIds || [],
          limit: segment.criteria?.limit,
        });
        setEditContinuousInclusion((segment as any).continuousInclusion || false);
      }
    }
  }, [editingSegment, segments]);

  // Get contacts for the viewing segment from backend
  const segmentContacts = viewingSegment && segmentDetails && (segmentDetails as any).contacts
    ? (segmentDetails as any).contacts.map((contact: any) => ({
        id: contact.id,
        phone: contact.phoneNumber,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        leadStatus: contact.leadStatus,
        createdAt: contact.createdAt,
      }))
    : [];

  // Sort contacts
  const sortedContacts = [...segmentContacts].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'age':
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case 'name':
        const nameA = `${a.firstName || ''} ${a.lastName || ''}`.trim().toLowerCase();
        const nameB = `${b.firstName || ''} ${b.lastName || ''}`.trim().toLowerCase();
        comparison = nameA.localeCompare(nameB);
        break;
      case 'phone':
        comparison = (a.phone || '').localeCompare(b.phone || '');
        break;
      case 'email':
        comparison = (a.email || '').localeCompare(b.email || '');
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredSegments =
    segments?.filter((segment) =>
      segment.name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const buildBackendCriteria = (criteria: any): any => {
    const backendCriteria: any = {};
    
    if (criteria.status && criteria.status !== 'all') {
      backendCriteria.status = criteria.status;
    }
    
    if (criteria.leadStatus) {
      backendCriteria.leadStatus = criteria.leadStatus;
    }
    
    if (criteria.statusNotIn && Array.isArray(criteria.statusNotIn) && criteria.statusNotIn.length > 0) {
      backendCriteria.statusNotIn = criteria.statusNotIn;
    }
    
    if (criteria.leadStatusNotIn && Array.isArray(criteria.leadStatusNotIn) && criteria.leadStatusNotIn.length > 0) {
      backendCriteria.leadStatusNotIn = criteria.leadStatusNotIn;
    }
    
    if (criteria.leadAge && (
      criteria.leadAge.minDays !== undefined ||
      criteria.leadAge.maxDays !== undefined ||
      criteria.leadAge.createdAfter ||
      criteria.leadAge.createdBefore
    )) {
      backendCriteria.leadAge = {};
      if (criteria.leadAge.minDays !== undefined) backendCriteria.leadAge.minDays = criteria.leadAge.minDays;
      if (criteria.leadAge.maxDays !== undefined) backendCriteria.leadAge.maxDays = criteria.leadAge.maxDays;
      if (criteria.leadAge.createdAfter) backendCriteria.leadAge.createdAfter = criteria.leadAge.createdAfter;
      if (criteria.leadAge.createdBefore) backendCriteria.leadAge.createdBefore = criteria.leadAge.createdBefore;
    }
    
    if (criteria.notInJourney === true) {
      backendCriteria.notInJourney = true;
    } else if (criteria.notInJourneyIds && Array.isArray(criteria.notInJourneyIds) && criteria.notInJourneyIds.length > 0) {
      backendCriteria.notInJourneyIds = criteria.notInJourneyIds;
    }
    
    if (criteria.limit && typeof criteria.limit === 'number' && criteria.limit > 0) {
      backendCriteria.limit = criteria.limit;
    }
    
    return backendCriteria;
  };

  const handleCriteriaChange = async (newCriteria: any) => {
    setCriteria(newCriteria);
    
    // Build criteria object for backend
    const backendCriteria = buildBackendCriteria(newCriteria);
    
    // Count matching contacts
    if (Object.keys(backendCriteria).length > 0) {
      setIsCounting(true);
      try {
        const count = await countMatchingContacts.mutateAsync(backendCriteria);
        setMatchingCount(count);
      } catch (error) {
        console.error('Failed to count matching contacts:', error);
        setMatchingCount(null);
      } finally {
        setIsCounting(false);
      }
    } else {
      setMatchingCount(null);
    }
  };

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Build criteria object from current criteria state
    const segmentCriteria = buildBackendCriteria(criteria);
    
    try {
      await createSegment.mutateAsync({
        name: (e.currentTarget.querySelector('[name="name"]') as HTMLInputElement)?.value || '',
        description: (e.currentTarget.querySelector('[name="description"]') as HTMLTextAreaElement)?.value || '',
        criteria: segmentCriteria,
        continuousInclusion: continuousInclusion,
      });
      setIsCreateDialogOpen(false);
      setCriteria({
        status: 'all',
        leadStatus: '',
        statusNotIn: [],
        leadStatusNotIn: [],
        leadAge: {
          minDays: undefined,
          maxDays: undefined,
          createdAfter: undefined,
          createdBefore: undefined,
        },
        notInJourney: false,
        notInJourneyIds: [],
        limit: undefined,
      });
      setMatchingCount(null);
      setContinuousInclusion(false);
      // Reset form safely - use a ref or setTimeout to ensure form still exists
      const form = e.currentTarget;
      if (form && form.reset) {
        setTimeout(() => form.reset(), 0);
      }
    } catch (error) {
      console.error('Failed to create segment:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this segment?')) {
      try {
        await deleteSegment.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete segment:', error);
      }
    }
  };

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Segments</h1>
          <p className="text-muted-foreground">Create and manage contact segments</p>
        </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
          setIsCreateDialogOpen(open);
          if (!open) {
            setCriteria({
              status: 'all',
              leadStatus: '',
              statusNotIn: [],
              leadStatusNotIn: [],
              leadAge: {
                minDays: undefined,
                maxDays: undefined,
                createdAfter: undefined,
                createdBefore: undefined,
              },
              notInJourney: false,
              notInJourneyIds: [],
              limit: undefined,
            });
            setMatchingCount(null);
            setContinuousInclusion(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Segment</DialogTitle>
              <DialogDescription>
                Define criteria to group contacts into segments
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4" onReset={() => {
              setCriteria({
                status: 'all',
                leadStatus: '',
                statusNotIn: [],
                leadStatusNotIn: [],
                leadAge: {
                  minDays: undefined,
                  maxDays: undefined,
                  createdAfter: undefined,
                  createdBefore: undefined,
                },
                notInJourney: false,
                notInJourneyIds: [],
                limit: undefined,
              });
              setMatchingCount(null);
              setContinuousInclusion(false);
            }}>
              <div>
                <label className="text-sm font-medium mb-2 block">Segment Name</label>
                <Input name="name" required placeholder="e.g., Active Customers" />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  name="description"
                  placeholder="Describe this segment..."
                  rows={3}
                />
              </div>
              <div className="space-y-4 p-4 border rounded-lg max-h-[70vh] overflow-y-auto">
                <h4 className="font-medium">Filter Criteria</h4>
                
                {/* Status Filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Status</label>
                    <Select
                      name="status"
                      value={criteria.status}
                      onChange={(e) => {
                        const newCriteria = { ...criteria, status: e.target.value };
                        setCriteria(newCriteria);
                        handleCriteriaChange(newCriteria);
                      }}
                    >
                      <option value="all">All</option>
                      <option value="active">Active</option>
                      <option value="optedOut">Opted Out</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Lead Status</label>
                    <Select
                      name="leadStatus"
                      value={criteria.leadStatus}
                      onChange={(e) => {
                        const newCriteria = { ...criteria, leadStatus: e.target.value };
                        setCriteria(newCriteria);
                        handleCriteriaChange(newCriteria);
                      }}
                    >
                      <option value="">All Lead Statuses</option>
                      <option value="SOLD">Sold</option>
                      <option value="DNC">Do Not Contact</option>
                      <option value="CONTACT_MADE">Contact Made</option>
                      <option value="PAUSED">Paused</option>
                      <option value="APPOINTMENT_SCHEDULED">Appointment Scheduled</option>
                    </Select>
                  </div>
                </div>

                {/* Not In Status Filters */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Exclude Status</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={criteria.statusNotIn.includes('active')}
                          onChange={(e) => {
                            const newStatusNotIn = e.target.checked
                              ? [...criteria.statusNotIn, 'active']
                              : criteria.statusNotIn.filter((s) => s !== 'active');
                            const newCriteria = { ...criteria, statusNotIn: newStatusNotIn };
                            setCriteria(newCriteria);
                            handleCriteriaChange(newCriteria);
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Active
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={criteria.statusNotIn.includes('optedOut')}
                          onChange={(e) => {
                            const newStatusNotIn = e.target.checked
                              ? [...criteria.statusNotIn, 'optedOut']
                              : criteria.statusNotIn.filter((s) => s !== 'optedOut');
                            const newCriteria = { ...criteria, statusNotIn: newStatusNotIn };
                            setCriteria(newCriteria);
                            handleCriteriaChange(newCriteria);
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Opted Out
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Exclude Lead Status</label>
                    <div className="space-y-2">
                      {['SOLD', 'DNC', 'CONTACT_MADE', 'PAUSED', 'APPOINTMENT_SCHEDULED'].map((status) => (
                        <label key={status} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={criteria.leadStatusNotIn.includes(status)}
                            onChange={(e) => {
                              const newLeadStatusNotIn = e.target.checked
                                ? [...criteria.leadStatusNotIn, status]
                                : criteria.leadStatusNotIn.filter((s) => s !== status);
                              const newCriteria = { ...criteria, leadStatusNotIn: newLeadStatusNotIn };
                              setCriteria(newCriteria);
                              handleCriteriaChange(newCriteria);
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          {status === 'SOLD' && 'Sold'}
                          {status === 'DNC' && 'Do Not Contact'}
                          {status === 'CONTACT_MADE' && 'Contact Made'}
                          {status === 'PAUSED' && 'Paused'}
                          {status === 'APPOINTMENT_SCHEDULED' && 'Appointment Scheduled'}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Lead Age Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Lead Age (Days Since Creation)</label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Minimum Days</label>
                      <Input
                        type="number"
                        placeholder="e.g., 7"
                        value={criteria.leadAge.minDays || ''}
                        onChange={(e) => {
                          const newCriteria = {
                            ...criteria,
                            leadAge: {
                              ...criteria.leadAge,
                              minDays: e.target.value ? parseInt(e.target.value) : undefined,
                            },
                          };
                          setCriteria(newCriteria);
                          handleCriteriaChange(newCriteria);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Maximum Days</label>
                      <Input
                        type="number"
                        placeholder="e.g., 30"
                        value={criteria.leadAge.maxDays || ''}
                        onChange={(e) => {
                          const newCriteria = {
                            ...criteria,
                            leadAge: {
                              ...criteria.leadAge,
                              maxDays: e.target.value ? parseInt(e.target.value) : undefined,
                            },
                          };
                          setCriteria(newCriteria);
                          handleCriteriaChange(newCriteria);
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Created After</label>
                      <Input
                        type="date"
                        value={criteria.leadAge.createdAfter || ''}
                        onChange={(e) => {
                          const newCriteria = {
                            ...criteria,
                            leadAge: {
                              ...criteria.leadAge,
                              createdAfter: e.target.value || undefined,
                            },
                          };
                          setCriteria(newCriteria);
                          handleCriteriaChange(newCriteria);
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Created Before</label>
                      <Input
                        type="date"
                        value={criteria.leadAge.createdBefore || ''}
                        onChange={(e) => {
                          const newCriteria = {
                            ...criteria,
                            leadAge: {
                              ...criteria.leadAge,
                              createdBefore: e.target.value || undefined,
                            },
                          };
                          setCriteria(newCriteria);
                          handleCriteriaChange(newCriteria);
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Not In Journey Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium block">Journey Exclusion</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={criteria.notInJourney}
                        onChange={(e) => {
                          const newCriteria = {
                            ...criteria,
                            notInJourney: e.target.checked,
                            notInJourneyIds: e.target.checked ? [] : criteria.notInJourneyIds,
                          };
                          setCriteria(newCriteria);
                          handleCriteriaChange(newCriteria);
                        }}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      Exclude contacts in any journey
                    </label>
                    {!criteria.notInJourney && (
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Or exclude from specific journeys:</label>
                        <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                          {journeys.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No journeys available</p>
                          ) : (
                            journeys.map((journey) => (
                              <label key={journey.id} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={criteria.notInJourneyIds.includes(journey.id)}
                                  onChange={(e) => {
                                    const newNotInJourneyIds = e.target.checked
                                      ? [...criteria.notInJourneyIds, journey.id]
                                      : criteria.notInJourneyIds.filter((id) => id !== journey.id);
                                    const newCriteria = { ...criteria, notInJourneyIds: newNotInJourneyIds };
                                    setCriteria(newCriteria);
                                    handleCriteriaChange(newCriteria);
                                  }}
                                  className="h-4 w-4 rounded border-gray-300"
                                />
                                {journey.name}
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Limit */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Limit Results</label>
                  <Input
                    type="number"
                    placeholder="e.g., 1000 (leave empty for no limit)"
                    value={criteria.limit || ''}
                    onChange={(e) => {
                      const newCriteria = {
                        ...criteria,
                        limit: e.target.value ? parseInt(e.target.value) : undefined,
                      };
                      setCriteria(newCriteria);
                      handleCriteriaChange(newCriteria);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum number of contacts to include in this segment (newest first)
                  </p>
                </div>
                {isCounting ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Counting matching contacts...
                  </div>
                ) : matchingCount !== null ? (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm font-medium">
                      <Users className="h-4 w-4 inline mr-2" />
                      {matchingCount} contact{matchingCount !== 1 ? 's' : ''} match{matchingCount !== 1 ? '' : 'es'} these criteria
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select filter criteria to see matching contact count
                  </p>
                )}
              </div>
              <div className="p-4 border rounded-lg space-y-2">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="continuousInclusion"
                    checked={continuousInclusion}
                    onChange={(e) => setContinuousInclusion(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label htmlFor="continuousInclusion" className="text-sm font-medium cursor-pointer">
                    Continuous Inclusion
                  </label>
                </div>
                <p className="text-xs text-muted-foreground ml-6">
                  {continuousInclusion
                    ? 'New contacts matching these criteria will be automatically added to this segment.'
                    : 'This is a set audience. Contacts will only be updated when you manually update the segment.'}
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createSegment.isPending}>
                  {createSegment.isPending ? 'Creating...' : 'Create Segment'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Segments</CardTitle>
              <CardDescription>
                {filteredSegments.length} segment{filteredSegments.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search segments..."
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
              <p className="text-muted-foreground">Loading segments...</p>
            </div>
          ) : filteredSegments.length === 0 ? (
            <div className="text-center py-12">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No segments found' : 'No segments yet'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Segment
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Contacts</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSegments.map((segment) => (
                  <TableRow key={segment.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {segment.name}
                        {(segment as any).continuousInclusion && (
                          <Badge variant="secondary" className="text-xs">
                            Continuous
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {segment.description || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {segment.contactCount || 0}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDistanceToNow(new Date(segment.createdAt), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewingSegment(segment.id)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingSegment(segment.id)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(segment.id)}
                          disabled={deleteSegment.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Segment Dialog */}
      {editingSegment && (() => {
        const segment = segments?.find((s) => s.id === editingSegment);

        const handleEditCriteriaChange = async (newCriteria: any) => {
          setEditCriteria(newCriteria);
          
          const backendCriteria = buildBackendCriteria(newCriteria);
          
          if (Object.keys(backendCriteria).length > 0) {
            setIsEditCounting(true);
            try {
              const count = await countMatchingContacts.mutateAsync(backendCriteria);
              setEditMatchingCount(count);
            } catch (error) {
              console.error('Failed to count matching contacts:', error);
              setEditMatchingCount(null);
            } finally {
              setIsEditCounting(false);
            }
          } else {
            setEditMatchingCount(null);
          }
        };

        const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          
          const segmentCriteria = buildBackendCriteria(editCriteria);
          
          try {
            await updateSegment.mutateAsync({
              id: editingSegment,
              data: {
                name: (e.currentTarget.querySelector('[name="name"]') as HTMLInputElement)?.value || '',
                description: (e.currentTarget.querySelector('[name="description"]') as HTMLTextAreaElement)?.value || '',
                criteria: segmentCriteria,
                continuousInclusion: editContinuousInclusion,
              },
            });
            setEditingSegment(null);
            setEditCriteria({
              status: 'all',
              leadStatus: '',
              statusNotIn: [],
              leadStatusNotIn: [],
              leadAge: {
                minDays: undefined,
                maxDays: undefined,
                createdAfter: undefined,
                createdBefore: undefined,
              },
              notInJourney: false,
              notInJourneyIds: [],
              limit: undefined,
            });
            setEditMatchingCount(null);
            setEditContinuousInclusion(false);
          } catch (error) {
            console.error('Failed to update segment:', error);
          }
        };

        return (
          <Dialog open={!!editingSegment} onOpenChange={(open) => {
            if (!open) {
              setEditingSegment(null);
              setEditCriteria({
                status: 'all',
                leadStatus: '',
                statusNotIn: [],
                leadStatusNotIn: [],
                leadAge: {
                  minDays: undefined,
                  maxDays: undefined,
                  createdAfter: undefined,
                  createdBefore: undefined,
                },
                notInJourney: false,
                notInJourneyIds: [],
                limit: undefined,
              });
              setEditMatchingCount(null);
              setEditContinuousInclusion(false);
            }
          }}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Segment</DialogTitle>
                <DialogDescription>
                  Update segment criteria to group contacts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Segment Name</label>
                  <Input name="name" required defaultValue={segment?.name} placeholder="e.g., Active Customers" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description</label>
                  <Textarea
                    name="description"
                    defaultValue={segment?.description || ''}
                    placeholder="Describe this segment..."
                    rows={3}
                  />
                </div>
                <div className="space-y-4 p-4 border rounded-lg max-h-[70vh] overflow-y-auto">
                  <h4 className="font-medium">Filter Criteria</h4>
                  
                  {/* Status Filters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select
                        name="status"
                        value={editCriteria.status}
                        onChange={(e) => {
                          const newCriteria = { ...editCriteria, status: e.target.value };
                          setEditCriteria(newCriteria);
                          handleEditCriteriaChange(newCriteria);
                        }}
                      >
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="optedOut">Opted Out</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Lead Status</label>
                      <Select
                        name="leadStatus"
                        value={editCriteria.leadStatus}
                        onChange={(e) => {
                          const newCriteria = { ...editCriteria, leadStatus: e.target.value };
                          setEditCriteria(newCriteria);
                          handleEditCriteriaChange(newCriteria);
                        }}
                      >
                        <option value="">All Lead Statuses</option>
                        <option value="SOLD">Sold</option>
                        <option value="DNC">Do Not Contact</option>
                        <option value="CONTACT_MADE">Contact Made</option>
                        <option value="PAUSED">Paused</option>
                        <option value="APPOINTMENT_SCHEDULED">Appointment Scheduled</option>
                      </Select>
                    </div>
                  </div>

                  {/* Not In Status Filters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Exclude Status</label>
                      <div className="space-y-2">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editCriteria.statusNotIn.includes('active')}
                            onChange={(e) => {
                              const newStatusNotIn = e.target.checked
                                ? [...editCriteria.statusNotIn, 'active']
                                : editCriteria.statusNotIn.filter((s) => s !== 'active');
                              const newCriteria = { ...editCriteria, statusNotIn: newStatusNotIn };
                              setEditCriteria(newCriteria);
                              handleEditCriteriaChange(newCriteria);
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          Active
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={editCriteria.statusNotIn.includes('optedOut')}
                            onChange={(e) => {
                              const newStatusNotIn = e.target.checked
                                ? [...editCriteria.statusNotIn, 'optedOut']
                                : editCriteria.statusNotIn.filter((s) => s !== 'optedOut');
                              const newCriteria = { ...editCriteria, statusNotIn: newStatusNotIn };
                              setEditCriteria(newCriteria);
                              handleEditCriteriaChange(newCriteria);
                            }}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          Opted Out
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Exclude Lead Status</label>
                      <div className="space-y-2">
                        {['SOLD', 'DNC', 'CONTACT_MADE', 'PAUSED', 'APPOINTMENT_SCHEDULED'].map((status) => (
                          <label key={status} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={editCriteria.leadStatusNotIn.includes(status)}
                              onChange={(e) => {
                                const newLeadStatusNotIn = e.target.checked
                                  ? [...editCriteria.leadStatusNotIn, status]
                                  : editCriteria.leadStatusNotIn.filter((s) => s !== status);
                                const newCriteria = { ...editCriteria, leadStatusNotIn: newLeadStatusNotIn };
                                setEditCriteria(newCriteria);
                                handleEditCriteriaChange(newCriteria);
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            {status === 'SOLD' && 'Sold'}
                            {status === 'DNC' && 'Do Not Contact'}
                            {status === 'CONTACT_MADE' && 'Contact Made'}
                            {status === 'PAUSED' && 'Paused'}
                            {status === 'APPOINTMENT_SCHEDULED' && 'Appointment Scheduled'}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Lead Age Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Lead Age (Days Since Creation)</label>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Minimum Days</label>
                        <Input
                          type="number"
                          placeholder="e.g., 7"
                          value={editCriteria.leadAge.minDays || ''}
                          onChange={(e) => {
                            const newCriteria = {
                              ...editCriteria,
                              leadAge: {
                                ...editCriteria.leadAge,
                                minDays: e.target.value ? parseInt(e.target.value) : undefined,
                              },
                            };
                            setEditCriteria(newCriteria);
                            handleEditCriteriaChange(newCriteria);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Maximum Days</label>
                        <Input
                          type="number"
                          placeholder="e.g., 30"
                          value={editCriteria.leadAge.maxDays || ''}
                          onChange={(e) => {
                            const newCriteria = {
                              ...editCriteria,
                              leadAge: {
                                ...editCriteria.leadAge,
                                maxDays: e.target.value ? parseInt(e.target.value) : undefined,
                              },
                            };
                            setEditCriteria(newCriteria);
                            handleEditCriteriaChange(newCriteria);
                          }}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Created After</label>
                        <Input
                          type="date"
                          value={editCriteria.leadAge.createdAfter || ''}
                          onChange={(e) => {
                            const newCriteria = {
                              ...editCriteria,
                              leadAge: {
                                ...editCriteria.leadAge,
                                createdAfter: e.target.value || undefined,
                              },
                            };
                            setEditCriteria(newCriteria);
                            handleEditCriteriaChange(newCriteria);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Created Before</label>
                        <Input
                          type="date"
                          value={editCriteria.leadAge.createdBefore || ''}
                          onChange={(e) => {
                            const newCriteria = {
                              ...editCriteria,
                              leadAge: {
                                ...editCriteria.leadAge,
                                createdBefore: e.target.value || undefined,
                              },
                            };
                            setEditCriteria(newCriteria);
                            handleEditCriteriaChange(newCriteria);
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Not In Journey Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium block">Journey Exclusion</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editCriteria.notInJourney}
                          onChange={(e) => {
                            const newCriteria = {
                              ...editCriteria,
                              notInJourney: e.target.checked,
                              notInJourneyIds: e.target.checked ? [] : editCriteria.notInJourneyIds,
                            };
                            setEditCriteria(newCriteria);
                            handleEditCriteriaChange(newCriteria);
                          }}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        Exclude contacts in any journey
                      </label>
                      {!editCriteria.notInJourney && (
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Or exclude from specific journeys:</label>
                          <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-2">
                            {journeys.length === 0 ? (
                              <p className="text-xs text-muted-foreground">No journeys available</p>
                            ) : (
                              journeys.map((journey) => (
                                <label key={journey.id} className="flex items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={editCriteria.notInJourneyIds.includes(journey.id)}
                                    onChange={(e) => {
                                      const newNotInJourneyIds = e.target.checked
                                        ? [...editCriteria.notInJourneyIds, journey.id]
                                        : editCriteria.notInJourneyIds.filter((id) => id !== journey.id);
                                      const newCriteria = { ...editCriteria, notInJourneyIds: newNotInJourneyIds };
                                      setEditCriteria(newCriteria);
                                      handleEditCriteriaChange(newCriteria);
                                    }}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  {journey.name}
                                </label>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Limit */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Limit Results</label>
                    <Input
                      type="number"
                      placeholder="e.g., 1000 (leave empty for no limit)"
                      value={editCriteria.limit || ''}
                      onChange={(e) => {
                        const newCriteria = {
                          ...editCriteria,
                          limit: e.target.value ? parseInt(e.target.value) : undefined,
                        };
                        setEditCriteria(newCriteria);
                        handleEditCriteriaChange(newCriteria);
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum number of contacts to include in this segment (newest first)
                    </p>
                  </div>
                  {isEditCounting ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Counting matching contacts...
                    </div>
                  ) : editMatchingCount !== null ? (
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">
                        <Users className="h-4 w-4 inline mr-2" />
                        {editMatchingCount} contact{editMatchingCount !== 1 ? 's' : ''} match{editMatchingCount !== 1 ? '' : 'es'} these criteria
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Select filter criteria to see matching contact count
                    </p>
                  )}
                </div>
                <div className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="editContinuousInclusion"
                      checked={editContinuousInclusion}
                      onChange={(e) => setEditContinuousInclusion(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <label htmlFor="editContinuousInclusion" className="text-sm font-medium cursor-pointer">
                      Continuous Inclusion
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground ml-6">
                    {editContinuousInclusion
                      ? 'New contacts matching these criteria will be automatically added to this segment.'
                      : 'This is a set audience. Contacts will only be updated when you manually update the segment.'}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingSegment(null);
                      setEditCriteria({
                        status: 'all',
                        leadStatus: '',
                        statusNotIn: [],
                        leadStatusNotIn: [],
                        leadAge: {
                          minDays: undefined,
                          maxDays: undefined,
                          createdAfter: undefined,
                          createdBefore: undefined,
                        },
                        notInJourney: false,
                        notInJourneyIds: [],
                        limit: undefined,
                      });
                      setEditMatchingCount(null);
                      setEditContinuousInclusion(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateSegment.isPending}>
                    {updateSegment.isPending ? 'Updating...' : 'Update Segment'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        );
      })()}

      {/* Segment Contacts Dialog */}
      <Dialog open={!!viewingSegment} onOpenChange={(open) => !open && setViewingSegment(null)}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {segments?.find((s) => s.id === viewingSegment)?.name || 'Segment'} Contacts
            </DialogTitle>
            <DialogDescription>
              {sortedContacts.length} contact{sortedContacts.length !== 1 ? 's' : ''} in this segment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Sort Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">Sort by:</span>
              {(['name', 'age', 'phone', 'email'] as SortField[]).map((field) => (
                <Button
                  key={field}
                  size="sm"
                  variant={sortField === field ? 'default' : 'outline'}
                  onClick={() => handleSort(field)}
                  className="capitalize"
                >
                  {field === 'age' ? 'Created Date' : field}
                  {sortField === field && (
                    sortDirection === 'asc' ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    )
                  )}
                </Button>
              ))}
            </div>

            {/* Contacts Table */}
            {sortedContacts.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No contacts in this segment</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Name
                          {sortField === 'name' && (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('phone')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Phone
                          {sortField === 'phone' && (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('email')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Email
                          {sortField === 'email' && (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          )}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('age')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Created
                          {sortField === 'age' && (
                            sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          )}
                        </button>
                      </TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedContacts.map((contact) => (
                      <TableRow key={contact.id}>
                        <TableCell className="font-medium">
                          {contact.firstName || contact.lastName
                            ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                            : '—'}
                        </TableCell>
                        <TableCell>{contact.phone || '—'}</TableCell>
                        <TableCell>{contact.email || '—'}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
                        </TableCell>
                        <TableCell>
                          {contact.leadStatus && (
                            <Badge variant="outline">
                              {contact.leadStatus === 'SOLD' && 'Sold'}
                              {contact.leadStatus === 'DNC' && 'Do Not Contact'}
                              {contact.leadStatus === 'CONTACT_MADE' && 'Contact Made'}
                              {contact.leadStatus === 'PAUSED' && 'Paused'}
                              {!['SOLD', 'DNC', 'CONTACT_MADE', 'PAUSED'].includes(contact.leadStatus) && contact.leadStatus}
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

