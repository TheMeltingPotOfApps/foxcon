'use client';

import { useState, useMemo } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContactStatus,
  LeadStatus,
  ContactWithActions,
} from '@/lib/hooks/use-contacts';
import { Plus, Search, Upload, Mail, Phone, Trash2, X, Users, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Select } from '@/components/ui/select';
import { toast } from 'sonner';

const statusColors: Record<LeadStatus, string> = {
  SOLD: 'bg-green-100 text-green-800 border-green-200',
  DNC: 'bg-red-100 text-red-800 border-red-200',
  CONTACT_MADE: 'bg-blue-100 text-blue-800 border-blue-200',
  PAUSED: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  APPOINTMENT_SCHEDULED: 'bg-purple-100 text-purple-800 border-purple-200',
};

const statusLabels: Record<LeadStatus, string> = {
  SOLD: 'Sold',
  DNC: 'Do Not Contact',
  CONTACT_MADE: 'Contact Made',
  PAUSED: 'Paused',
  APPOINTMENT_SCHEDULED: 'Appointment Scheduled',
};

type SortField = 'createdAt' | 'firstName' | 'lastName' | 'email' | 'leadStatus' | 'journeyActions';
type SortOrder = 'ASC' | 'DESC';

export default function ContactsPage() {
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('DESC');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [customFields, setCustomFields] = useState<Array<{ key: string; value: string }>>([]);
  
  const { data: contactsResponse, isLoading, isError, error } = useContacts(page, limit, sortBy, sortOrder, searchQuery || undefined);
  const createContact = useCreateContact();
  const deleteContact = useDeleteContact();
  const updateStatus = useUpdateContactStatus();

  // Ensure we never display more than the limit, even if backend returns more
  const allContacts = contactsResponse?.data || [];
  const contacts = allContacts.slice(0, limit);
  const total = contactsResponse?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
    } else {
      setSortBy(field);
      setSortOrder('DESC');
    }
    setPage(1); // Reset to first page when sorting changes
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setPage(1); // Reset to first page when search changes
  };

  const handleCreateContact = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    // Build custom attributes object
    const attributes: Record<string, any> = {};
    const city = formData.get('city') as string;
    const state = formData.get('state') as string;
    const country = formData.get('country') as string;
    
    if (city) attributes.city = city;
    if (state) attributes.state = state;
    if (country) attributes.country = country;
    
    // Add custom fields
    customFields.forEach((field) => {
      if (field.key && field.value) {
        attributes[field.key] = field.value;
      }
    });

    try {
      await createContact.mutateAsync({
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        phone: formData.get('phone') as string,
        email: formData.get('email') as string,
        city,
        state,
        country,
        attributes: Object.keys(attributes).length > 0 ? attributes : undefined,
        optedIn: formData.get('hasConsent') === 'true' || true,
        optedOut: false,
      });
      const form = e.currentTarget;
      if (form && form.reset) {
        form.reset();
      }
      setIsCreateDialogOpen(false);
      setCustomFields([]);
      toast.success('Contact created successfully');
    } catch (error: any) {
      console.error('Failed to create contact:', error);
      toast.error(error?.response?.data?.message || 'Failed to create contact');
    }
  };

  const addCustomField = () => {
    setCustomFields([...customFields, { key: '', value: '' }]);
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
  };

  const updateCustomField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customFields];
    updated[index][field] = value;
    setCustomFields(updated);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      try {
        await deleteContact.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete contact:', error);
      }
    }
  };

  const handleStatusChange = async (contactId: string, status: LeadStatus) => {
    try {
      await updateStatus.mutateAsync({ id: contactId, leadStatus: status });
      toast.success(`Status updated to ${statusLabels[status]}`);
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />;
    }
    return sortOrder === 'ASC' ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
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
          <h1 className="text-3xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">Manage your contact list</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/segments">
            <Button variant="outline">
              <Users className="mr-2 h-4 w-4" />
              Segments
            </Button>
          </Link>
          <Link href="/contacts/import">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
          </Link>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Create a new contact in your database
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateContact} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">First Name</label>
                    <Input name="firstName" required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Last Name</label>
                    <Input name="lastName" required />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone *</label>
                  <Input name="phone" type="tel" required placeholder="+1234567890" />
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input name="email" type="email" placeholder="contact@example.com" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input name="city" placeholder="New York" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <Input name="state" placeholder="NY" />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Country</label>
                    <Input name="country" placeholder="USA" />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="hasConsent"
                      value="true"
                      defaultChecked
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">Has Consent</span>
                  </label>
                </div>
                
                {/* Custom Fields Section */}
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium">Custom Attributes</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addCustomField}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {customFields.map((field, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder="Field name (e.g., company, jobTitle)"
                          value={field.key}
                          onChange={(e) => updateCustomField(index, 'key', e.target.value)}
                          className="flex-1"
                        />
                        <Input
                          placeholder="Value"
                          value={field.value}
                          onChange={(e) => updateCustomField(index, 'value', e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCustomField(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {customFields.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        No custom fields added. Click &quot;Add Field&quot; to add custom attributes.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsCreateDialogOpen(false);
                      setCustomFields([]);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createContact.isPending}>
                    {createContact.isPending ? 'Creating...' : 'Create Contact'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Contacts</CardTitle>
              <CardDescription>
                {total} contact{total !== 1 ? 's' : ''} total
                {totalPages > 1 && ` • Showing page ${page} of ${totalPages}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
              <Select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as SortField);
                  setPage(1);
                }}
                className="w-48"
              >
                <option value="createdAt">Sort by Age</option>
                <option value="journeyActions">Sort by Journey Actions</option>
                <option value="firstName">Sort by First Name</option>
                <option value="lastName">Sort by Last Name</option>
                <option value="email">Sort by Email</option>
                <option value="leadStatus">Sort by Status</option>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading contacts...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-12">
              <p className="text-destructive mb-4">
                Failed to load contacts
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'An error occurred'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {searchQuery ? 'No contacts found' : 'No contacts yet'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Contact
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <button
                        onClick={() => handleSort('firstName')}
                        className="flex items-center hover:text-foreground"
                      >
                        Name
                        <SortIcon field="firstName" />
                      </button>
                    </TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('email')}
                        className="flex items-center hover:text-foreground"
                      >
                        Email
                        <SortIcon field="email" />
                      </button>
                    </TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('leadStatus')}
                        className="flex items-center hover:text-foreground"
                      >
                        Lead Status
                        <SortIcon field="leadStatus" />
                      </button>
                    </TableHead>
                    <TableHead>Opt Status</TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('createdAt')}
                        className="flex items-center hover:text-foreground"
                      >
                        Created
                        <SortIcon field="createdAt" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        onClick={() => handleSort('journeyActions')}
                        className="flex items-center hover:text-foreground"
                      >
                        Journey Actions
                        <SortIcon field="journeyActions" />
                      </button>
                    </TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact: ContactWithActions) => (
                    <TableRow key={contact.id}>
                      <TableCell>
                        <Link
                          href={`/contacts/${contact.id}`}
                          className="font-medium hover:underline"
                        >
                          {contact.firstName} {contact.lastName}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3 text-muted-foreground" />
                          {contact.phone}
                        </div>
                      </TableCell>
                      <TableCell>
                        {contact.email ? (
                          <div className="flex items-center gap-2">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {contact.email}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {contact.city || contact.state
                          ? `${contact.city || ''}${contact.city && contact.state ? ', ' : ''}${
                              contact.state || ''
                            }`
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={contact.leadStatus || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value) {
                              handleStatusChange(contact.id, value as LeadStatus);
                            }
                          }}
                          className="w-40"
                        >
                          <option value="">No Status</option>
                          <option value="SOLD">Sold</option>
                          <option value="DNC">Do Not Contact</option>
                          <option value="CONTACT_MADE">Contact Made</option>
                          <option value="PAUSED">Paused</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Badge variant={contact.optedOut ? 'destructive' : 'success'}>
                          {contact.optedOut ? 'Opted Out' : 'Active'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {(contact as ContactWithActions).journeyActionsCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(contact.id)}
                          disabled={deleteContact.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {/* Pagination Controls */}
              {total > limit && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total} contacts
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (page <= 3) {
                          pageNum = i + 1;
                        } else if (page >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = page - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={page === pageNum ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            className="w-8"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page >= totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
