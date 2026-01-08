'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Settings, 
  Users, 
  GitBranch, 
  Loader2, 
  UserPlus, 
  X,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  Webhook,
  UserMinus,
  Bell,
  Phone,
  Volume2,
  ArrowRight,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useJourney, useLaunchJourney, usePauseJourney, useEnrollContactInJourney, useRemoveContactFromJourney, useJourneyExecutions, useJourneyContacts, JourneyExecution, useGenerateTtsAudioForExecution } from '@/lib/hooks/use-journeys';
import { useContacts } from '@/lib/hooks/use-contacts';
import { toast } from 'sonner';
import { NotificationPreferencesDialog } from '@/components/notifications/notification-preferences';
import { RemovalCriteriaDialog } from '@/components/journeys/removal-criteria-dialog';
import { useFormatInUserTimezone } from '@/lib/utils/date-timezone';

export default function JourneyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const journeyId = params.id as string;
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsSortBy, setContactsSortBy] = useState<string>('enrolledAt');
  const [contactsSortOrder, setContactsSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [contactsSearch, setContactsSearch] = useState('');
  const [selectionDialogPage, setSelectionDialogPage] = useState(1);
  const [selectionDialogSearch, setSelectionDialogSearch] = useState('');
  const [showRemovalCriteria, setShowRemovalCriteria] = useState(false);

  const { data: journey, isLoading, error } = useJourney(journeyId);
  const { data: contactsResponse, isLoading: contactsLoading } = useContacts(selectionDialogPage, 25, 'createdAt', 'DESC', selectionDialogSearch || undefined); // Paginated contact selection
  const contacts = contactsResponse?.data || [];
  const { data: journeyContactsData, isLoading: journeyContactsLoading } = useJourneyContacts(
    journeyId,
    contactsPage,
    10,
    contactsSortBy,
    contactsSortOrder,
    contactsSearch || undefined,
  );
  const launchJourney = useLaunchJourney();
  const pauseJourney = usePauseJourney();
  const enrollContact = useEnrollContactInJourney();
  const removeContact = useRemoveContactFromJourney();

  const handleLaunch = async () => {
    try {
      await launchJourney.mutateAsync(journeyId);
      toast.success('Journey launched successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to launch journey');
    }
  };

  const handlePause = async () => {
    try {
      await pauseJourney.mutateAsync(journeyId);
      toast.success('Journey paused successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to pause journey');
    }
  };

  const handleAddContacts = async () => {
    if (selectedContactIds.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    try {
      let successCount = 0;
      let errorCount = 0;

      for (const contactId of selectedContactIds) {
        try {
          await enrollContact.mutateAsync({
            journeyId,
            contactId,
            enrollmentSource: 'manual',
          });
          successCount++;
        } catch (error: any) {
          errorCount++;
          const errorMessage = error?.response?.data?.message || error?.message || 'Unknown error';
          console.error(`Failed to enroll contact ${contactId}:`, error);
          // Show individual error for first failed enrollment
          if (errorCount === 1) {
            toast.error(errorMessage);
          }
        }
      }

      if (successCount > 0) {
        toast.success(`Successfully added ${successCount} contact${successCount > 1 ? 's' : ''} to journey`);
      }
      if (errorCount > 0 && successCount === 0) {
        // Only show generic error if all enrollments failed and we haven't shown a specific error yet
        toast.error(`Failed to add ${errorCount} contact${errorCount > 1 ? 's' : ''}. Please ensure the journey is active or draft.`);
      }

      setSelectedContactIds([]);
      setIsAddContactDialogOpen(false);
      setSearchQuery('');
      setSelectionDialogPage(1);
      setSelectionDialogSearch('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to add contacts');
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to remove this contact from the journey?')) {
      return;
    }

    try {
      await removeContact.mutateAsync({
        journeyId,
        contactId,
        pause: false,
      });
      toast.success('Contact removed from journey');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove contact');
    }
  };

  const toggleContactSelection = (contactId: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  // Get enrolled contact IDs from journey contacts data
  const enrolledContactIds: string[] = journeyContactsData?.contacts.map(jc => jc.contact.id) || [];
  const availableContacts = contacts.filter((c) => !enrolledContactIds.includes(c.id));

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (error || !journey) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">Failed to load journey</p>
          <Link href="/journeys">
            <Button variant="outline">Back to Journeys</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/journeys" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to Journeys
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{journey.name}</h1>
            <p className="text-muted-foreground mt-2">{journey.description}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowNotificationPrefs(true)}
              title="Notification Preferences"
            >
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </Button>
            <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Contacts
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Contacts to Journey</DialogTitle>
                  <DialogDescription>
                    Select contacts to manually add to this journey
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <Input
                    placeholder="Search contacts by name, phone, or email..."
                    value={selectionDialogSearch}
                    onChange={(e) => {
                      setSelectionDialogSearch(e.target.value);
                      setSelectionDialogPage(1);
                    }}
                  />
                  <div className="border rounded-lg max-h-[400px] overflow-y-auto">
                    {contactsLoading ? (
                      <div className="p-8 text-center">
                        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                      </div>
                    ) : availableContacts.length === 0 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        {selectionDialogSearch ? 'No contacts match your search' : 'All contacts are already enrolled in this journey'}
                      </div>
                    ) : (
                      <>
                      <div className="divide-y">
                        {availableContacts.map((contact) => (
                          <div
                            key={contact.id}
                            className={`p-4 hover:bg-muted/50 cursor-pointer flex items-center justify-between ${
                              selectedContactIds.includes(contact.id) ? 'bg-muted' : ''
                            }`}
                            onClick={() => toggleContactSelection(contact.id)}
                          >
                            <div className="flex-1">
                              <div className="font-medium">
                                {contact.firstName || contact.lastName
                                  ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                                  : 'Unnamed Contact'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {(contact.phone || (contact as any).phoneNumber) && (
                                  <span>{contact.phone || (contact as any).phoneNumber}</span>
                                )}
                                {(contact.phone || (contact as any).phoneNumber) && contact.email && <span> • </span>}
                                {contact.email && <span>{contact.email}</span>}
                              </div>
                            </div>
                            <div className="ml-4">
                              {selectedContactIds.includes(contact.id) ? (
                                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                                  <span className="text-primary-foreground text-xs">✓</span>
                                </div>
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                        {/* Pagination for contact selection */}
                        {contactsResponse && contactsResponse.total > 25 && (
                          <div className="flex items-center justify-between p-4 border-t">
                            <div className="text-sm text-muted-foreground">
                              Showing {(selectionDialogPage - 1) * 25 + 1} to {Math.min(selectionDialogPage * 25, contactsResponse.total)} of {contactsResponse.total} contacts
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectionDialogPage(selectionDialogPage - 1)}
                                disabled={selectionDialogPage === 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                                Previous
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectionDialogPage(selectionDialogPage + 1)}
                                disabled={selectionDialogPage >= Math.ceil(contactsResponse.total / 25)}
                              >
                                Next
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  {selectedContactIds.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        {selectedContactIds.length} contact{selectedContactIds.length !== 1 ? 's' : ''} selected
                      </span>
                      <Button
                        onClick={handleAddContacts}
                        disabled={enrollContact.isPending}
                      >
                        {enrollContact.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            Add {selectedContactIds.length} Contact{selectedContactIds.length !== 1 ? 's' : ''}
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              onClick={() => setShowRemovalCriteria(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            {journey.status === 'ACTIVE' ? (
              <Button
                variant="outline"
                onClick={handlePause}
                disabled={pauseJourney.isPending}
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
            ) : (
              <Button
                onClick={handleLaunch}
                disabled={launchJourney.isPending}
              >
                <Play className="h-4 w-4 mr-2" />
                Launch
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <GitBranch className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Status</div>
              <Badge variant={journey.status === 'ACTIVE' ? 'default' : 'secondary'}>
                {journey.status}
              </Badge>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Active Contacts</div>
              <div className="text-2xl font-bold">{journey.contactsCount}</div>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 rounded-lg">
              <GitBranch className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Nodes</div>
              <div className="text-2xl font-bold">{journey.nodesCount}</div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Enrolled Contacts</h2>
          <Badge variant="secondary">{journey.contactsCount || 0} Active</Badge>
        </div>
        
        {/* Search and Sort Controls */}
        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="Search contacts by name, phone, or email..."
            value={contactsSearch}
            onChange={(e) => {
              setContactsSearch(e.target.value);
              setContactsPage(1);
            }}
            className="max-w-sm"
          />
          <select
            value={contactsSortBy}
            onChange={(e) => {
              setContactsSortBy(e.target.value);
              setContactsPage(1);
            }}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="enrolledAt">Sort by Enrollment Date</option>
            <option value="name">Sort by Name</option>
            <option value="phone">Sort by Phone</option>
            <option value="email">Sort by Email</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setContactsSortOrder(contactsSortOrder === 'ASC' ? 'DESC' : 'ASC');
              setContactsPage(1);
            }}
          >
            {contactsSortOrder === 'ASC' ? '↑ Asc' : '↓ Desc'}
          </Button>
        </div>

        {journeyContactsLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
            <p>Loading contacts...</p>
          </div>
        ) : journeyContactsData && journeyContactsData.contacts.length > 0 ? (
          <>
            <div className="space-y-2">
              {journeyContactsData.contacts.map((journeyContact) => {
                const contact = journeyContact.contact;
                return (
                  <ContactExecutionCard
                    key={journeyContact.id}
                    journeyId={journeyId}
                    contact={contact}
                    journeyContact={journeyContact}
                    onRemove={() => handleRemoveContact(contact.id)}
                    isRemoving={removeContact.isPending}
                  />
                );
              })}
            </div>
            
            {/* Pagination Controls */}
            {journeyContactsData.total > 10 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Showing {(contactsPage - 1) * 10 + 1} to {Math.min(contactsPage * 10, journeyContactsData.total)} of {journeyContactsData.total} contacts
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setContactsPage(contactsPage - 1)}
                    disabled={contactsPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, Math.ceil(journeyContactsData.total / 10)) }, (_, i) => {
                      const totalPages = Math.ceil(journeyContactsData.total / 10);
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (contactsPage <= 3) {
                        pageNum = i + 1;
                      } else if (contactsPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = contactsPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={contactsPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setContactsPage(pageNum)}
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
                    onClick={() => setContactsPage(contactsPage + 1)}
                    disabled={contactsPage >= Math.ceil(journeyContactsData.total / 10)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{contactsSearch ? 'No contacts match your search' : 'No contacts enrolled in this journey yet'}</p>
            {!contactsSearch && (
              <p className="text-sm mt-2">Click &quot;Add Contacts&quot; to manually add contacts to this journey</p>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Journey Builder</h2>
        <div className="text-center py-12 text-muted-foreground">
          <p>Journey builder will be displayed here</p>
          <Button className="mt-4" onClick={() => router.push(`/journeys/${journeyId}/edit`)}>
            Edit Journey
          </Button>
        </div>
      </Card>

      {/* Notification Preferences Dialog */}
      <NotificationPreferencesDialog
        open={showNotificationPrefs}
        onOpenChange={setShowNotificationPrefs}
        journeyId={journeyId}
      />

      {/* Removal Criteria Dialog */}
      <RemovalCriteriaDialog
        open={showRemovalCriteria}
        onOpenChange={setShowRemovalCriteria}
        journeyId={journeyId}
      />
    </div>
  );
}

function ContactExecutionCard({ 
  journeyId, 
  contact, 
  journeyContact, 
  onRemove, 
  isRemoving 
}: { 
  journeyId: string; 
  contact: any; 
  journeyContact: any; 
  onRemove: () => void; 
  isRemoving: boolean;
}) {
  const formatInUserTimezone = useFormatInUserTimezone();
  const [showExecutions, setShowExecutions] = useState(false);
  const { data: executions = [], isLoading: executionsLoading } = useJourneyExecutions(
    journeyId,
    contact.id
  );
  const generateTtsAudio = useGenerateTtsAudioForExecution();
  const [generatingAudioFor, setGeneratingAudioFor] = useState<string | null>(null);
  const [generatedAudioUrls, setGeneratedAudioUrls] = useState<Record<string, string>>({});

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'EXECUTING':
        return <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'SEND_SMS':
        return <MessageSquare className="h-4 w-4" />;
      case 'MAKE_CALL':
        return <Phone className="h-4 w-4" />;
      case 'ADD_TO_CAMPAIGN':
      case 'REMOVE_FROM_CAMPAIGN':
        return <Users className="h-4 w-4" />;
      case 'EXECUTE_WEBHOOK':
        return <Webhook className="h-4 w-4" />;
      case 'TIME_DELAY':
        return <Clock className="h-4 w-4" />;
      case 'CONDITION':
      case 'WEIGHTED_PATH':
        return <GitBranch className="h-4 w-4" />;
      default:
        return <GitBranch className="h-4 w-4" />;
    }
  };

  return (
    <div className="border rounded-lg">
      <div className="flex items-center justify-between p-3 hover:bg-muted/50">
        <div className="flex-1">
          <div className="font-medium">
            <Link 
              href={`/contacts/${contact.id}`}
              className="hover:underline text-primary"
              onClick={(e) => e.stopPropagation()}
            >
            {contact.firstName || contact.lastName
              ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
              : 'Unnamed Contact'}
            </Link>
          </div>
          <div className="text-sm text-muted-foreground">
            {(contact.phone || contact.phoneNumber) && (
              <span>{contact.phone || contact.phoneNumber}</span>
            )}
            {(contact.phone || contact.phoneNumber) && contact.email && <span> • </span>}
            {contact.email && <span>{contact.email}</span>}
            {journeyContact.enrolledAt && (
              <>
                {' • '}
                <span>Enrolled {formatInUserTimezone(new Date(journeyContact.enrolledAt), 'MMM d, yyyy')}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowExecutions(!showExecutions)}
          >
            {showExecutions ? 'Hide' : 'View'} History ({executions.length})
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={isRemoving}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {showExecutions && (
        <div className="border-t p-4 bg-muted/30">
          {executionsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No execution history yet
            </div>
          ) : (
            <div className="space-y-3">
              {executions.map((execution: JourneyExecution) => (
                <div
                  key={execution.id}
                  className="flex items-start gap-3 p-3 bg-background rounded-lg border"
                >
                  <div className="mt-0.5">
                    {getNodeIcon(execution.nodeType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{execution.nodeName}</span>
                      {getStatusIcon(execution.status)}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>
                        Scheduled: {formatInUserTimezone(new Date(execution.scheduledAt))}
                      </div>
                      {execution.executedAt && (
                        <div>
                          Executed: {formatInUserTimezone(new Date(execution.executedAt))}
                        </div>
                      )}
                      {execution.completedAt && (
                        <div>
                          Completed: {formatInUserTimezone(new Date(execution.completedAt))}
                        </div>
                      )}
                      {execution.result && (
                        <div className="mt-2 pt-2 border-t space-y-2">
                          {/* Previous Action */}
                          {execution.result.previousAction && (
                            <div className="flex items-center gap-1 text-xs">
                              <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">Previous: </span>
                              <span className="font-medium">{execution.result.previousNodeName || execution.result.previousAction}</span>
                            </div>
                          )}
                          
                          {/* Action */}
                          {execution.result.action && (
                            <div className="font-medium">{execution.result.action}</div>
                          )}
                          
                          {/* Outcome */}
                          {execution.result.outcome && (
                            <div className="flex items-center gap-2">
                              <Badge variant={execution.result.success ? 'default' : 'destructive'} className="text-xs">
                                {execution.result.outcome}
                              </Badge>
                              {execution.result.outcomeDetails && (
                                <span className="text-xs text-muted-foreground">{execution.result.outcomeDetails}</span>
                              )}
                            </div>
                          )}
                          
                          {/* IVR Audio Preview */}
                          {(execution.result?.ivrAudioPreviewUrl || execution.result?.ivrFilePath || generatedAudioUrls[execution.id]) && (
                            <div className="flex items-center gap-2 flex-wrap">
                              <Volume2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">IVR Audio:</span>
                              {(execution.result?.ivrAudioPreviewUrl || generatedAudioUrls[execution.id]) ? (
                                <audio
                                  controls
                                  className="h-6 text-xs max-w-xs"
                                  preload="metadata"
                                  src={(() => {
                                    const url = generatedAudioUrls[execution.id] || execution.result?.ivrAudioPreviewUrl;
                                    if (!url) return '';
                                    
                                    // If it's already a full URL (http/https) or data URL, use as-is
                                    if (url.startsWith('http') || url.startsWith('data:')) {
                                      return url;
                                    }
                                    
                                    // Construct API URL using same logic as apiClient
                                    if (typeof window !== 'undefined') {
                                      const hostname = window.location.hostname;
                                      const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
                                      
                                      // Use relative URL for production domains (routed through Next.js rewrites)
                                      if (hostname === 'app.nurtureengine.net' || hostname === 'leads.nurtureengine.net' || hostname.includes('nurtureengine.net')) {
                                        // Ensure URL starts with /api
                                        const apiUrl = url.startsWith('/api') ? url : `/api${url}`;
                                        return apiUrl;
                                      }
                                      
                                      // Check if accessing via external IP
                                      const isExternal = hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('.net');
                                      if (isExternal) {
                                        // Ensure URL starts with /api
                                        const apiUrl = url.startsWith('/api') ? url : `/api${url}`;
                                        return `${protocol}://${hostname}:5002${apiUrl}`;
                                      }
                                      
                                      // Default to localhost for local development
                                      const apiUrl = url.startsWith('/api') ? url : `/api${url}`;
                                      return `http://localhost:5002${apiUrl}`;
                                    }
                                    
                                    // Server-side: return as-is (will be handled client-side)
                                    return url;
                                  })()}
                                >
                                  Your browser does not support audio playback.
                                </audio>
                              ) : execution.result?.ivrFilePath ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={async () => {
                                      if (generatingAudioFor === execution.id) return;
                                      setGeneratingAudioFor(execution.id);
                                      try {
                                        const result = await generateTtsAudio.mutateAsync(execution.id);
                                        if (result.audioDataUrl) {
                                          setGeneratedAudioUrls(prev => ({ ...prev, [execution.id]: result.audioDataUrl! }));
                                        } else if (result.audioUrl) {
                                          // Construct full URL if needed
                                          let audioUrl = result.audioUrl;
                                          if (typeof window !== 'undefined' && !audioUrl.startsWith('http')) {
                                            const hostname = window.location.hostname;
                                            const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
                                            if (hostname === 'app.nurtureengine.net') {
                                              audioUrl = `${protocol}://api.nurtureengine.net${result.audioUrl}`;
                                            } else {
                                              const isExternal = hostname !== 'localhost' && hostname !== '127.0.0.1' && !hostname.includes('.net');
                                              audioUrl = isExternal 
                                                ? `${protocol}://${hostname}:5002${result.audioUrl}`
                                                : `http://localhost:5002${result.audioUrl}`;
                                            }
                                          }
                                          setGeneratedAudioUrls(prev => ({ ...prev, [execution.id]: audioUrl }));
                                        }
                                        toast.success('Audio generated successfully');
                                      } catch (error: any) {
                                        console.error('Failed to generate audio:', error);
                                        toast.error(error?.response?.data?.message || 'Failed to generate audio');
                                      } finally {
                                        setGeneratingAudioFor(null);
                                      }
                                    }}
                                    disabled={generatingAudioFor === execution.id || generateTtsAudio.isPending}
                                    className="h-6 text-xs"
                                  >
                                    {generatingAudioFor === execution.id || generateTtsAudio.isPending ? (
                                      <>
                                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <Play className="h-3 w-3 mr-1" />
                                        Generate Audio
                                      </>
                                    )}
                                  </Button>
                                  <span className="text-xs text-muted-foreground italic">
                                    File: {execution.result.ivrFilePath}
                                  </span>
                                </div>
                              ) : null}
                              {execution.result.ivrFilePath && execution.result.ivrAudioPreviewUrl && (
                                <span className="text-xs text-muted-foreground">({execution.result.ivrFilePath})</span>
                              )}
                            </div>
                          )}
                          
                          {/* DID Used */}
                          {execution.result?.didUsed && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">DID:</span>
                              <span className="font-medium">{execution.result.didUsed}</span>
                              {execution.result.callUniqueId && (
                                <span className="text-muted-foreground ml-2">(ID: {execution.result.callUniqueId.substring(0, 8)}...)</span>
                              )}
                            </div>
                          )}
                          
                          {/* Show DID ID if DID used but phone number not available */}
                          {execution.result?.didId && !execution.result?.didUsed && (
                            <div className="flex items-center gap-1 text-xs">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              <span className="text-muted-foreground">DID ID:</span>
                              <span className="font-medium">{execution.result.didId}</span>
                            </div>
                          )}
                          
                          {/* Message details */}
                          {execution.result.message && (
                            <div>{execution.result.message}</div>
                          )}
                          {execution.result.error && (
                            <div className="text-red-600">Error: {execution.result.error}</div>
                          )}
                          {execution.result.messageSid && (
                            <div className="text-xs">Message SID: {execution.result.messageSid}</div>
                          )}
                          {execution.result.delayValue && (
                            <div>
                              Delay: {execution.result.delayValue} {execution.result.delayUnit}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

