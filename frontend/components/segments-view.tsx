import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
import {
  Plus,
  Search,
  Users,
  Edit2,
  Trash2,
  Filter,
  ArrowUp,
  ArrowDown,
  Loader2,
} from 'lucide-react';
import {
  useSegments,
  useCreateSegment,
  useUpdateSegment,
  useDeleteSegment,
  useSegment,
  useCountMatchingContacts,
} from '@/lib/hooks/use-segments';
import { formatDistanceToNow } from 'date-fns';

type SortField = 'name' | 'age' | 'phone' | 'email';
type SortDirection = 'asc' | 'desc';

interface SegmentsViewProps {
  variant?: 'page' | 'embedded';
}

export function SegmentsView({ variant = 'page' }: SegmentsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [viewingSegment, setViewingSegment] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('age');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { data: segments, isLoading } = useSegments();
  const { data: segmentDetails } = useSegment(viewingSegment || '');
  const createSegment = useCreateSegment();
  const updateSegment = useUpdateSegment();
  const deleteSegment = useDeleteSegment();
  const countMatchingContacts = useCountMatchingContacts();

  const [criteria, setCriteria] = useState({
    status: 'all',
    leadStatus: '',
  });
  const [matchingCount, setMatchingCount] = useState<number | null>(null);
  const [isCounting, setIsCounting] = useState(false);

  // Edit dialog state
  const [editCriteria, setEditCriteria] = useState({
    status: 'all',
    leadStatus: '',
  });
  const [editMatchingCount, setEditMatchingCount] = useState<number | null>(null);
  const [isEditCounting, setIsEditCounting] = useState(false);

  // Initialize edit criteria when editing segment changes
  useEffect(() => {
    if (editingSegment) {
      const segment = segments?.find((s) => s.id === editingSegment);
      if (segment) {
        setEditCriteria({
          status: segment.criteria?.status || 'all',
          leadStatus: segment.criteria?.leadStatus || '',
        });
      }
    }
  }, [editingSegment, segments]);

  // Get contacts for the viewing segment from backend
  const segmentContacts =
    viewingSegment && segmentDetails && (segmentDetails as any).contacts
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
      segment.name.toLowerCase().includes(searchQuery.toLowerCase()),
    ) || [];

  const handleCriteriaChange = async (newCriteria: any) => {
    setCriteria(newCriteria);

    // Build criteria object for backend
    const backendCriteria: any = {};
    if (newCriteria.status && newCriteria.status !== 'all') {
      backendCriteria.status = newCriteria.status;
    }
    if (newCriteria.leadStatus) {
      backendCriteria.leadStatus = newCriteria.leadStatus;
    }

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
    const formData = new FormData(e.currentTarget);

    // Build criteria object
    const segmentCriteria: any = {};
    const status = formData.get('status') as string;
    const leadStatus = formData.get('leadStatus') as string;

    if (status && status !== 'all') {
      segmentCriteria.status = status;
    }
    if (leadStatus) {
      segmentCriteria.leadStatus = leadStatus;
    }

    try {
      await createSegment.mutateAsync({
        name: formData.get('name') as string,
        description: formData.get('description') as string,
        criteria: segmentCriteria,
      });
      setIsCreateDialogOpen(false);
      setCriteria({ status: 'all', leadStatus: '' });
      setMatchingCount(null);
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
          <h2 className="text-2xl font-bold">
            {variant === 'embedded' ? 'Segments' : 'Segments'}
          </h2>
          <p className="text-muted-foreground">
            Create and manage dynamic groups of contacts.
          </p>
        </div>
        <Dialog
          open={isCreateDialogOpen}
          onOpenChange={(open) => {
            setIsCreateDialogOpen(open);
            if (!open) {
              setCriteria({ status: 'all', leadStatus: '' });
              setMatchingCount(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Segment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Segment</DialogTitle>
              <DialogDescription>
                Define criteria to group contacts into segments
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={handleCreate}
              className="space-y-4"
              onReset={() => {
                setCriteria({ status: 'all', leadStatus: '' });
                setMatchingCount(null);
              }}
            >
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
              <div className="space-y-4 p-4 border rounded-lg">
                <h4 className="font-medium">Filter Criteria</h4>
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
                    </Select>
                  </div>
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
                      {matchingCount} contact{matchingCount !== 1 ? 's' : ''} match
                      {matchingCount !== 1 ? '' : 'es'} these criteria
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Select filter criteria to see matching contact count
                  </p>
                )}
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

      <Card className="hover:shadow-md transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Segments</CardTitle>
              <CardDescription>
                {filteredSegments.length} segment
                {filteredSegments.length !== 1 ? 's' : ''}
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
                    <TableCell className="font-medium">{segment.name}</TableCell>
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
                      {formatDistanceToNow(new Date(segment.createdAt), {
                        addSuffix: true,
                      })}
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
      {editingSegment &&
        (() => {
          const segment = segments?.find((s) => s.id === editingSegment);

          const handleEditCriteriaChange = async (newCriteria: any) => {
            setEditCriteria(newCriteria);

            const backendCriteria: any = {};
            if (newCriteria.status && newCriteria.status !== 'all') {
              backendCriteria.status = newCriteria.status;
            }
            if (newCriteria.leadStatus) {
              backendCriteria.leadStatus = newCriteria.leadStatus;
            }

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
            const formData = new FormData(e.currentTarget);

            const segmentCriteria: any = {};
            const status = formData.get('status') as string;
            const leadStatus = formData.get('leadStatus') as string;

            if (status && status !== 'all') {
              segmentCriteria.status = status;
            }
            if (leadStatus) {
              segmentCriteria.leadStatus = leadStatus;
            }

            try {
              await updateSegment.mutateAsync({
                id: editingSegment,
                data: {
                  name: formData.get('name') as string,
                  description: formData.get('description') as string,
                  criteria: segmentCriteria,
                },
              });
              setEditingSegment(null);
              setEditCriteria({ status: 'all', leadStatus: '' });
              setEditMatchingCount(null);
            } catch (error) {
              console.error('Failed to update segment:', error);
            }
          };

          return (
            <Dialog
              open={!!editingSegment}
              onOpenChange={(open) => {
                if (!open) {
                  setEditingSegment(null);
                  setEditCriteria({ status: 'all', leadStatus: '' });
                  setEditMatchingCount(null);
                }
              }}
            >
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Segment</DialogTitle>
                  <DialogDescription>
                    Update segment criteria to group contacts
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdate} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Segment Name</label>
                    <Input
                      name="name"
                      required
                      defaultValue={segment?.name}
                      placeholder="e.g., Active Customers"
                    />
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
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium">Filter Criteria</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Status</label>
                        <Select
                          name="status"
                          value={editCriteria.status}
                          onChange={(e) => {
                            const newCriteria = {
                              ...editCriteria,
                              status: e.target.value,
                            };
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
                            const newCriteria = {
                              ...editCriteria,
                              leadStatus: e.target.value,
                            };
                            handleEditCriteriaChange(newCriteria);
                          }}
                        >
                          <option value="">All Lead Statuses</option>
                          <option value="SOLD">Sold</option>
                          <option value="DNC">Do Not Contact</option>
                          <option value="CONTACT_MADE">Contact Made</option>
                          <option value="PAUSED">Paused</option>
                        </Select>
                      </div>
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
                          {editMatchingCount} contact
                          {editMatchingCount !== 1 ? 's' : ''} match
                          {editMatchingCount !== 1 ? '' : 'es'} these criteria
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Select filter criteria to see matching contact count
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingSegment(null);
                        setEditCriteria({ status: 'all', leadStatus: '' });
                        setEditMatchingCount(null);
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
              {sortedContacts.length} contact
              {sortedContacts.length !== 1 ? 's' : ''} in this segment
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
                  {sortField === field &&
                    (sortDirection === 'asc' ? (
                      <ArrowUp className="ml-1 h-3 w-3" />
                    ) : (
                      <ArrowDown className="ml-1 h-3 w-3" />
                    ))}
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
                          {sortField === 'name' &&
                            (sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            ))}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('phone')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Phone
                          {sortField === 'phone' &&
                            (sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            ))}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('email')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Email
                          {sortField === 'email' &&
                            (sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            ))}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('age')}
                          className="flex items-center gap-1 hover:text-foreground"
                        >
                          Created
                          {sortField === 'age' &&
                            (sortDirection === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            ))}
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
                          {formatDistanceToNow(new Date(contact.createdAt), {
                            addSuffix: true,
                          })}
                        </TableCell>
                        <TableCell>
                          {contact.leadStatus && (
                            <Badge variant="outline">
                              {contact.leadStatus === 'SOLD' && 'Sold'}
                              {contact.leadStatus === 'DNC' && 'Do Not Contact'}
                              {contact.leadStatus === 'CONTACT_MADE' && 'Contact Made'}
                              {contact.leadStatus === 'PAUSED' && 'Paused'}
                              {!['SOLD', 'DNC', 'CONTACT_MADE', 'PAUSED'].includes(
                                contact.leadStatus,
                              ) && contact.leadStatus}
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


