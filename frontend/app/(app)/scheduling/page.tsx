'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Calendar as CalendarIcon, Clock, Settings, Grid3x3, List, Link as LinkIcon, Copy } from 'lucide-react';
import { useEventTypes, useCreateEventType, useUpdateEventType, EventType } from '@/lib/hooks/use-event-types';
import { useAvailabilities, useCreateAvailability, useUpdateAvailability } from '@/lib/hooks/use-availability';
import { useCalendarEvents } from '@/lib/hooks/use-calendar-events';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { EventTypeConfigurationDialog } from './components/event-type-config-dialog';
import { CalendarView } from './components/calendar-view';

type ViewMode = 'grid' | 'calendar';

export default function SchedulingPage() {
  const [showCreateEventType, setShowCreateEventType] = useState(false);
  const [configuringEventType, setConfiguringEventType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string | null>(null);
  const { data: eventTypes = [], isLoading } = useEventTypes();
  const createEventType = useCreateEventType();

  // Memoize date range to prevent React hooks error
  const dateRange = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    const end = new Date(now.getFullYear(), now.getMonth() + 2, now.getDate());
    return {
      startDate: start,
      endDate: end,
    };
  }, []);

  // Memoize filters object to prevent React hooks error #185
  const calendarFilters = useMemo(() => ({
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  }), [dateRange.startDate, dateRange.endDate]);

  // Get calendar events
  const { data: calendarEvents = [] } = useCalendarEvents(calendarFilters);

  const filteredEvents = selectedEventTypeId
    ? calendarEvents.filter((e) => e.eventTypeId === selectedEventTypeId)
    : calendarEvents;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Scheduling</h1>
          <p className="text-muted-foreground mt-2">
            Manage event types, availability, and scheduled events
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid3x3 className="h-4 w-4 mr-2" />
              Event Types
            </Button>
            <Button
              variant={viewMode === 'calendar' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('calendar')}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
          <Button onClick={() => setShowCreateEventType(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event Type
          </Button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              Loading event types...
            </div>
          ) : eventTypes.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No event types yet</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Create your first event type to start scheduling events
                </p>
                <Button onClick={() => setShowCreateEventType(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Event Type
                </Button>
              </CardContent>
            </Card>
          ) : (
            eventTypes.map((eventType) => (
              <Card key={eventType.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{eventType.name}</CardTitle>
                      {eventType.description && (
                        <CardDescription className="mt-1">{eventType.description}</CardDescription>
                      )}
                    </div>
                    {eventType.isActive ? (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {eventType.durationMinutes && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>{eventType.durationMinutes} minutes</span>
                      </div>
                    )}
                    {eventType.reminderSettings?.enabled && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CalendarIcon className="h-4 w-4" />
                        <span>
                          {eventType.reminderSettings.reminders?.length || 0} reminder(s) configured
                        </span>
                      </div>
                    )}
                    {eventType.actions && eventType.actions.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        {eventType.actions.length} action(s) configured
                      </div>
                    )}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => setConfiguringEventType(eventType.id)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configure
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedEventTypeId(eventType.id);
                          setViewMode('calendar');
                        }}
                      >
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        View Events
                      </Button>
                    </div>
                    <div className="pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          const bookingUrl = `${window.location.origin}/book/${eventType.id}`;
                          navigator.clipboard.writeText(bookingUrl);
                          toast.success('Booking link copied to clipboard!');
                        }}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Copy Booking Link
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <CalendarView
          events={filteredEvents}
          eventTypes={eventTypes}
          selectedEventTypeId={selectedEventTypeId}
          onEventTypeChange={setSelectedEventTypeId}
        />
      )}

      {/* Create Event Type Dialog */}
      <Dialog open={showCreateEventType} onOpenChange={setShowCreateEventType}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event Type</DialogTitle>
            <DialogDescription>
              Define a new event type for scheduling. Event types can be assigned to AI messengers
              and configured with automatic actions.
            </DialogDescription>
          </DialogHeader>
          <CreateEventTypeForm
            onClose={() => setShowCreateEventType(false)}
            onCreate={async (data) => {
              try {
                await createEventType.mutateAsync(data);
                toast.success('Event type created successfully');
                setShowCreateEventType(false);
              } catch (error: any) {
                toast.error(error?.response?.data?.message || 'Failed to create event type');
              }
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Event Type Configuration Dialog */}
      {configuringEventType && (
        <EventTypeConfigurationDialog
          eventTypeId={configuringEventType}
          onClose={() => setConfiguringEventType(null)}
        />
      )}
    </div>
  );
}

function CreateEventTypeForm({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: any) => Promise<void>;
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    durationMinutes: 30,
    isActive: true,
  });

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Event type name is required');
      return;
    }
    onCreate(formData);
  };

  return (
    <div className="space-y-4 mt-4">
      <div>
        <Label htmlFor="name">Event Type Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Sales Call, Demo, Support Call"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Optional description of this event type"
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="duration">Duration (minutes) *</Label>
        <Input
          id="duration"
          type="number"
          value={formData.durationMinutes}
          onChange={(e) =>
            setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 30 })
          }
          min={5}
          max={480}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Create Event Type</Button>
      </div>
    </div>
  );
}
