'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Save,
  X,
  MessageSquare,
  Calendar as CalendarIcon,
  Send,
  Inbox,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  FileText,
  Tag,
  Loader2,
  Volume2,
  GitBranch,
} from 'lucide-react';
import {
  useContact,
  useUpdateContact,
  useUpdateContactStatus,
  useContactTimeline,
  LeadStatus,
} from '@/lib/hooks/use-contacts';
import { useContactJourneyExecutions, ContactJourneyExecution, useGenerateTtsAudioForExecution } from '@/lib/hooks/use-journeys';
import { useContactVisits } from '@/lib/hooks/use-contact-visits';
import { useCalendarEvents } from '@/lib/hooks/use-calendar-events';
import { formatDistanceToNow, format } from 'date-fns';
import { toast } from 'sonner';
import { formatInLeadTimezone } from '@/lib/utils/date-timezone';
import { TimezoneSelector } from '@/components/timezone-selector';

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

export default function ContactProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: contact, isLoading } = useContact(params.id);
  const { data: timelineData, isLoading: timelineLoading } = useContactTimeline(params.id);
  const { data: visits = [] } = useContactVisits(params.id);
  const { data: journeyExecutions = [], isLoading: journeyExecutionsLoading } = useContactJourneyExecutions(params.id);
  const generateTtsAudio = useGenerateTtsAudioForExecution();
  
  // State for managing audio generation per execution
  const [generatingAudioFor, setGeneratingAudioFor] = useState<string | null>(null);
  const [generatedAudioUrls, setGeneratedAudioUrls] = useState<Record<string, string>>({});
  
  // Get calendar events for this contact (next 90 days)
  const dateRange = useMemo(() => {
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + 90);
    return { start, end };
  }, []);
  
  const { data: calendarEvents = [] } = useCalendarEvents({
    contactId: params.id,
    startDate: dateRange.start,
    endDate: dateRange.end,
  });
  const updateContact = useUpdateContact();
  const updateStatus = useUpdateContactStatus();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    country: '',
    timezone: '',
  });
  const [selectedStatus, setSelectedStatus] = useState<LeadStatus | ''>('');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading contact...</p>
        </div>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Contact not found</p>
        <Link href="/contacts">
          <Button variant="outline">Back to Contacts</Button>
        </Link>
      </div>
    );
  }

  const handleEdit = () => {
    setEditData({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      city: contact.city || '',
      state: contact.state || '',
      country: contact.country || '',
      timezone: contact.timezone || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateContact.mutateAsync({
        id: params.id,
        data: editData,
      });
      setIsEditing(false);
      toast.success('Contact updated successfully');
    } catch (error) {
      console.error('Failed to update contact:', error);
      toast.error('Failed to update contact');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  const handleStatusChange = async (status: LeadStatus) => {
    try {
      await updateStatus.mutateAsync({ id: params.id, leadStatus: status });
      toast.success(`Status updated to ${statusLabels[status]}`);
      setSelectedStatus('');
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case 'message':
        return <MessageSquare className="h-4 w-4" />;
      case 'conversation_started':
        return <Inbox className="h-4 w-4" />;
      case 'campaign_added':
        return <Send className="h-4 w-4" />;
      case 'journey_enrolled':
        return <PlayCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getJourneyNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'SEND_SMS':
        return <MessageSquare className="h-4 w-4" />;
      case 'MAKE_CALL':
        return <Phone className="h-4 w-4" />;
      case 'ADD_TO_CAMPAIGN':
      case 'REMOVE_FROM_CAMPAIGN':
        return <Send className="h-4 w-4" />;
      case 'EXECUTE_WEBHOOK':
        return <FileText className="h-4 w-4" />;
      case 'TIME_DELAY':
        return <Clock className="h-4 w-4" />;
      case 'CONDITION':
        return <Tag className="h-4 w-4" />;
      default:
        return <PlayCircle className="h-4 w-4" />;
    }
  };

  const getJourneyStatusIcon = (status: string) => {
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

  const getTimelineColor = (type: string) => {
    switch (type) {
      case 'message':
        return 'bg-blue-100 text-blue-600';
      case 'conversation_started':
        return 'bg-purple-100 text-purple-600';
      case 'campaign_added':
        return 'bg-green-100 text-green-600';
      case 'journey_enrolled':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
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
        <div className="flex items-center gap-4">
          <Link href="/contacts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {contact.firstName} {contact.lastName}
            </h1>
            <p className="text-muted-foreground">Contact Profile</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <>
              <Select
                value={selectedStatus || contact.leadStatus || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value && value !== contact.leadStatus) {
                    handleStatusChange(value as LeadStatus);
                  }
                }}
                className="w-48"
              >
                <option value="">Change Status</option>
                <option value="SOLD">Sold</option>
                <option value="DNC">Do Not Contact</option>
                <option value="CONTACT_MADE">Contact Made</option>
                <option value="PAUSED">Paused</option>
                <option value="APPOINTMENT_SCHEDULED">Appointment Scheduled</option>
              </Select>
              <Button onClick={handleEdit} variant="outline">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateContact.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateContact.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {timelineData && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timelineData.stats.totalMessages}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timelineData.stats.totalCampaigns}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Journeys</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timelineData.stats.totalJourneys}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Conversations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{timelineData.stats.totalConversations}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">First Name</label>
                      <Input
                        value={editData.firstName}
                        onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Last Name</label>
                      <Input
                        value={editData.lastName}
                        onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Phone</label>
                    <Input
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Email</label>
                    <Input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">City</label>
                      <Input
                        value={editData.city}
                        onChange={(e) => setEditData({ ...editData, city: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">State</label>
                      <Input
                        value={editData.state}
                        onChange={(e) => setEditData({ ...editData, state: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Timezone</label>
                    <TimezoneSelector
                      value={editData.timezone}
                      onChange={(value) => setEditData({ ...editData, timezone: value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Used for scheduling and displaying times in this contact&apos;s local timezone
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{contact.phone}</span>
                  </div>
                  {contact.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{contact.email}</span>
                    </div>
                  )}
                  {(contact.city || contact.state) && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {contact.city || ''}
                        {contact.city && contact.state ? ', ' : ''}
                        {contact.state || ''}
                      </span>
                    </div>
                  )}
                  {contact.timezone && (
                    <div className="flex items-center gap-3">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{contact.timezone}</span>
                    </div>
                  )}
                  <div className="pt-4 border-t space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Lead Status</span>
                      {contact.leadStatus ? (
                        <Badge className={statusColors[contact.leadStatus]}>
                          {statusLabels[contact.leadStatus]}
                        </Badge>
                      ) : (
                        <Badge variant="outline">No Status</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Opted Out</span>
                      <Badge variant={contact.optedOut ? 'destructive' : 'success'}>
                        {contact.optedOut ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">
                        {formatDistanceToNow(new Date(contact.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Tags feature coming soon</p>
            </CardContent>
          </Card>

          {/* Calendar Visits & Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Calendar Activity</CardTitle>
              <CardDescription>Booking page visits and scheduled events</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {visits.length > 0 ? (
                <div className="space-y-3">
                  {visits.map((visit) => (
                    <div key={visit.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {visit.eventType?.name || 'Calendar Page'} Visit
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {formatInLeadTimezone(new Date(visit.createdAt), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}
                          </p>
                          {visit.scheduledEventAt && (
                            <div className="mt-2 flex items-center gap-2">
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                              <span className="text-sm font-medium text-green-700">
                                Scheduled: {formatInLeadTimezone(new Date(visit.scheduledEventAt), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}
                              </span>
                            </div>
                          )}
                        </div>
                        <Badge variant="outline">
                          {formatDistanceToNow(new Date(visit.createdAt), { addSuffix: true })}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No calendar page visits yet
                </p>
              )}

              {calendarEvents.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Scheduled Events</h4>
                  <div className="space-y-2">
                    {calendarEvents.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                        <div>
                          <p className="font-medium text-sm">{event.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatInLeadTimezone(new Date(event.startTime), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}
                          </p>
                        </div>
                        <Badge variant={event.status === 'SCHEDULED' ? 'default' : 'secondary'}>
                          {event.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Journey Actions */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Journey Actions</CardTitle>
                  <CardDescription>All journey actions executed for this contact</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {journeyExecutionsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading journey actions...</p>
                </div>
              ) : journeyExecutions.length > 0 ? (
                <div className="space-y-4">
                  {journeyExecutions.map((execution: ContactJourneyExecution) => (
                    <div key={execution.id} className="border rounded-lg p-4">
                      <div className="flex gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                          execution.status === 'COMPLETED' ? 'bg-green-100 text-green-600' :
                          execution.status === 'FAILED' ? 'bg-red-100 text-red-600' :
                          execution.status === 'EXECUTING' ? 'bg-blue-100 text-blue-600' :
                          'bg-yellow-100 text-yellow-600'
                        }`}>
                          {getJourneyNodeIcon(execution.nodeType || '')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{execution.nodeName || execution.nodeType}</p>
                                {getJourneyStatusIcon(execution.status)}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Journey: <Link href={`/journeys/${execution.journeyId}`} className="text-primary hover:underline">{execution.journeyName}</Link>
                              </p>
                              {execution.result?.message && (
                                <p className="text-sm text-muted-foreground mt-1">{execution.result.message}</p>
                              )}
                              {execution.result?.error && (
                                <p className="text-sm text-red-600 mt-1">Error: {execution.result.error}</p>
                              )}
                              {execution.result?.outcome && (
                                <Badge variant="outline" className="mt-1">
                                  {execution.result.outcome}
                                </Badge>
                              )}
                              {/* IVR Audio Preview */}
                              {(execution.result?.ivrAudioPreviewUrl || execution.result?.ivrFilePath || generatedAudioUrls[execution.id]) && (
                                <div className="flex items-center gap-2 flex-wrap mt-2">
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
                                            <PlayCircle className="h-3 w-3 mr-1" />
                                            Generate Audio
                                          </>
                                        )}
                                      </Button>
                                      <span className="text-xs text-muted-foreground italic">
                                        File: {execution.result.ivrFilePath}
                                      </span>
                                    </div>
                                  ) : null}
                                </div>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground ml-4 text-right">
                              {execution.executedAt ? (
                                <>
                                  <div>{formatDistanceToNow(new Date(execution.executedAt), { addSuffix: true })}</div>
                                  <div className="mt-1">{formatInLeadTimezone(new Date(execution.executedAt), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}</div>
                                </>
                              ) : execution.scheduledAt ? (
                                <>
                                  <div>Scheduled: {formatDistanceToNow(new Date(execution.scheduledAt), { addSuffix: true })}</div>
                                  <div className="mt-1">{formatInLeadTimezone(new Date(execution.scheduledAt), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}</div>
                                </>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <GitBranch className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No journey actions yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Journey actions will appear here when the contact is enrolled in journeys
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Contact Timeline</CardTitle>
                  <CardDescription>Complete history of all contact attempts</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {timelineLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-sm text-muted-foreground">Loading timeline...</p>
                </div>
              ) : timelineData && timelineData.timeline.length > 0 ? (
                <div className="space-y-4">
                  {timelineData.timeline.map((event, index) => (
                    <div key={index} className="flex gap-4">
                      <div
                        className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getTimelineColor(
                          event.type,
                        )}`}
                      >
                        {getTimelineIcon(event.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium">
                              {event.type === 'message' && (
                                <>
                                  {event.data.direction === 'OUTBOUND' ? 'Sent' : 'Received'} Message
                                </>
                              )}
                              {event.type === 'conversation_started' && 'Conversation Started'}
                              {event.type === 'campaign_added' && (
                                <>Added to Campaign: {event.data.campaignName}</>
                              )}
                              {event.type === 'journey_enrolled' && (
                                <>Enrolled in Journey: {event.data.journeyName}</>
                              )}
                            </p>
                            {event.type === 'message' && (
                              <p className="text-sm text-muted-foreground mt-1">{event.data.body}</p>
                            )}
                            {event.type === 'campaign_added' && (
                              <div className="mt-2 space-y-1">
                                <Badge variant="outline">{event.data.status}</Badge>
                                {event.data.sentAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Sent: {formatInLeadTimezone(new Date(event.data.sentAt), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}
                                  </p>
                                )}
                                {event.data.deliveredAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Delivered: {formatInLeadTimezone(new Date(event.data.deliveredAt), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}
                                  </p>
                                )}
                              </div>
                            )}
                            {event.type === 'journey_enrolled' && (
                              <div className="mt-2 space-y-1">
                                <Badge variant="outline">{event.data.status}</Badge>
                                {event.data.completedAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Completed: {formatInLeadTimezone(new Date(event.data.completedAt), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}
                                  </p>
                                )}
                                {event.data.pausedAt && (
                                  <p className="text-xs text-muted-foreground">
                                    Paused: {formatInLeadTimezone(new Date(event.data.pausedAt), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground ml-4">
                            {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          {formatInLeadTimezone(new Date(event.date), 'MMM d, yyyy h:mm a', contact?.attributes?.timezone)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No timeline events yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Timeline will show all messages, campaigns, and journeys
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
}
