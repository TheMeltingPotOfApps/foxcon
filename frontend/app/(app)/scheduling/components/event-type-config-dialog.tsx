'use client';

import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEventType, useUpdateEventType, EventType, EventAction, ReminderSettings } from '@/lib/hooks/use-event-types';
import { useAvailabilities, useCreateAvailability, useUpdateAvailability, Availability, DayOfWeek } from '@/lib/hooks/use-availability';
import { useAiTemplates } from '@/lib/hooks/use-ai-templates';
import { useJourneys } from '@/lib/hooks/use-journeys';
import { toast } from 'sonner';
import { Plus, Trash2, Clock, Bell, Zap, Calendar as CalendarIcon, X } from 'lucide-react';
import { format, addDays, startOfWeek, eachDayOfInterval } from 'date-fns';

interface EventTypeConfigurationDialogProps {
  eventTypeId: string;
  onClose: () => void;
}

export function EventTypeConfigurationDialog({ eventTypeId, onClose }: EventTypeConfigurationDialogProps) {
  const { data: eventType, isLoading } = useEventType(eventTypeId);
  const { data: availabilities = [] } = useAvailabilities(eventTypeId);
  const { data: aiTemplates = [] } = useAiTemplates();
  const { data: journeys = [] } = useJourneys();
  const updateEventType = useUpdateEventType();
  const createAvailability = useCreateAvailability();
  const updateAvailability = useUpdateAvailability();

  const [activeTab, setActiveTab] = useState<'general' | 'availability' | 'actions' | 'reminders'>('general');
  const [formData, setFormData] = useState<Partial<EventType>>({});
  const [availabilityData, setAvailabilityData] = useState<Partial<Availability>>({});

  // Memoize eventType properties to create stable dependencies
  const currentEventTypeId = eventType?.id;
  const eventTypeName = eventType?.name;
  const eventTypeDescription = eventType?.description;
  const eventTypeDurationMinutes = eventType?.durationMinutes;
  const eventTypeAiTemplateId = eventType?.aiTemplateId;
  const eventTypeIsActive = eventType?.isActive;
  const eventTypeActions = useMemo(() => eventType?.actions || [], [eventType?.actions]);
  const eventTypeReminderSettings = useMemo(() => eventType?.reminderSettings || { enabled: false, reminders: [] }, [eventType?.reminderSettings]);

  useEffect(() => {
    if (eventType) {
      setFormData({
        name: eventTypeName,
        description: eventTypeDescription,
        durationMinutes: eventTypeDurationMinutes,
        aiTemplateId: eventTypeAiTemplateId,
        isActive: eventTypeIsActive,
        actions: eventTypeActions,
        reminderSettings: eventTypeReminderSettings,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentEventTypeId,
    eventTypeName,
    eventTypeDescription,
    eventTypeDurationMinutes,
    eventTypeAiTemplateId,
    eventTypeIsActive,
    eventTypeActions,
    eventTypeReminderSettings,
  ]);

  useEffect(() => {
    if (availabilities && availabilities.length > 0) {
      const availability = availabilities[0];
      setAvailabilityData({
        weeklySchedule: availability.weeklySchedule,
        maxEventsPerSlot: (availability as any).maxEventsPerSlot || 1,
        startDate: availability.startDate,
        endDate: availability.endDate,
        blockedDates: availability.blockedDates || [],
        isActive: availability.isActive,
      });
    } else {
      // Initialize with default schedule
      const defaultSchedule: any = {};
      Object.values(DayOfWeek).forEach((day) => {
        if (day !== DayOfWeek.SATURDAY && day !== DayOfWeek.SUNDAY) {
          defaultSchedule[day] = { enabled: false, startTime: '09:00', endTime: '17:00' };
        }
      });
      setAvailabilityData({
        weeklySchedule: defaultSchedule,
        maxEventsPerSlot: 1,
        isActive: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availabilities?.length, availabilities?.[0]?.id]);

  const handleSave = async () => {
    try {
      await updateEventType.mutateAsync({ id: eventTypeId, data: formData });
      
      // Save or update availability
      if (availabilities.length > 0) {
        await updateAvailability.mutateAsync({
          id: availabilities[0].id,
          data: { ...availabilityData, eventTypeId },
        });
      } else {
        await createAvailability.mutateAsync({ ...availabilityData, eventTypeId });
      }

      toast.success('Event type configuration saved successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save configuration');
    }
  };

  const addAction = () => {
    const newAction: EventAction = { type: 'ADD_TO_JOURNEY', config: {} };
    const newActions = [...(formData.actions || []), newAction];
    setFormData({ ...formData, actions: newActions });
  };

  const removeAction = (index: number) => {
    const newActions = formData.actions?.filter((_, i) => i !== index) || [];
    setFormData({ ...formData, actions: newActions });
  };

  const updateAction = (index: number, updates: Partial<EventAction>) => {
    const newActions = [...(formData.actions || [])];
    newActions[index] = { ...newActions[index], ...updates } as EventAction;
    setFormData({ ...formData, actions: newActions });
  };

  const addReminder = () => {
    const reminders = formData.reminderSettings?.reminders || [];
    const newReminder: ReminderSettings['reminders'][0] = { minutesBefore: 1440, message: '', journeyId: '' };
    const newReminders = [...reminders, newReminder];
    setFormData({
      ...formData,
      reminderSettings: {
        enabled: true,
        reminders: newReminders,
      },
    });
  };

  const removeReminder = (index: number) => {
    const reminders = formData.reminderSettings?.reminders || [];
    const newReminders = reminders.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      reminderSettings: {
        enabled: newReminders.length > 0,
        reminders: newReminders,
      },
    });
  };

  const updateReminder = (index: number, updates: Partial<ReminderSettings['reminders'][0]>) => {
    const reminders = formData.reminderSettings?.reminders || [];
    const newReminders = [...reminders];
    newReminders[index] = { ...newReminders[index], ...updates } as ReminderSettings['reminders'][0];
    setFormData({
      ...formData,
      reminderSettings: {
        enabled: true,
        reminders: newReminders,
      },
    });
  };

  const toggleDaySchedule = (day: DayOfWeek) => {
    const schedule = availabilityData.weeklySchedule || {};
    const daySchedule = schedule[day];
    setAvailabilityData({
      ...availabilityData,
      weeklySchedule: {
        ...schedule,
        [day]: {
          enabled: !daySchedule?.enabled,
          startTime: daySchedule?.startTime || '09:00',
          endTime: daySchedule?.endTime || '17:00',
        },
      },
    });
  };

  const updateDaySchedule = (day: DayOfWeek, field: 'startTime' | 'endTime', value: string) => {
    const schedule = availabilityData.weeklySchedule || {};
    setAvailabilityData({
      ...availabilityData,
      weeklySchedule: {
        ...schedule,
        [day]: {
          ...schedule[day],
          enabled: schedule[day]?.enabled || false,
          [field]: value,
        },
      },
    });
  };

  if (!eventTypeId) {
    return null;
  }

  return (
    <Dialog open={true} onOpenChange={(open) => {
      if (!open) {
        onClose();
      }
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isLoading ? 'Loading...' : `Configure Event Type: ${eventType?.name || 'Unknown'}`}
          </DialogTitle>
          <DialogDescription>
            {isLoading 
              ? 'Loading event type configuration...'
              : 'Set up availability, actions, reminders, and AI messenger integration'
            }
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading event type configuration...
          </div>
        ) : !eventType ? (
          <div className="py-8 text-center text-muted-foreground">
            Event type not found
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex gap-2 border-b mb-4">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            General
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'availability'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Availability
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'actions'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Actions
          </button>
          <button
            onClick={() => setActiveTab('reminders')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'reminders'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Reminders
          </button>
        </div>

        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Event Type Name *</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                value={formData.durationMinutes || 30}
                onChange={(e) =>
                  setFormData({ ...formData, durationMinutes: parseInt(e.target.value) || 30 })
                }
                min={5}
                max={480}
              />
            </div>
            <div>
              <Label htmlFor="aiTemplate">AI Messenger Template</Label>
              <select
                id="aiTemplate"
                className="flex h-10 w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-sm"
                value={formData.aiTemplateId || ''}
                onChange={(e) => setFormData({ ...formData, aiTemplateId: e.target.value || undefined })}
              >
                <option value="">None</option>
                {aiTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Assign an AI messenger template to allow contacts to schedule events via SMS
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive ?? true}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="rounded border-gray-300"
              />
              <Label htmlFor="isActive">Active</Label>
            </div>
          </div>
        )}

        {/* Availability Tab */}
        {activeTab === 'availability' && (
          <div className="space-y-4">
            <div>
              <Label>Maximum Events Per Time Slot</Label>
              <Input
                type="number"
                min={1}
                value={(availabilityData as any).maxEventsPerSlot || 1}
                onChange={(e) =>
                  setAvailabilityData({
                    ...availabilityData,
                    maxEventsPerSlot: parseInt(e.target.value) || 1,
                  } as any)
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Maximum number of events that can be scheduled in the same time slot
              </p>
            </div>

            <div>
              <Label>Weekly Schedule</Label>
              <div className="space-y-2 mt-2">
                {Object.values(DayOfWeek).map((day) => {
                  const daySchedule = availabilityData.weeklySchedule?.[day];
                  return (
                    <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                      <div className="flex items-center gap-2 w-24">
                        <input
                          type="checkbox"
                          checked={daySchedule?.enabled || false}
                          onChange={() => toggleDaySchedule(day)}
                          className="rounded border-gray-300"
                        />
                        <Label className="font-medium">{day.slice(0, 3)}</Label>
                      </div>
                      {daySchedule?.enabled && (
                        <div className="flex items-center gap-2 flex-1">
                          <Input
                            type="time"
                            value={daySchedule.startTime || '09:00'}
                            onChange={(e) => updateDaySchedule(day, 'startTime', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={daySchedule.endTime || '17:00'}
                            onChange={(e) => updateDaySchedule(day, 'endTime', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startDate">Start Date (optional)</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={availabilityData.startDate ? new Date(availabilityData.startDate).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setAvailabilityData({
                      ...availabilityData,
                      startDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    })
                  }
                />
              </div>
              <div>
                <Label htmlFor="endDate">End Date (optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={availabilityData.endDate ? new Date(availabilityData.endDate).toISOString().split('T')[0] : ''}
                  onChange={(e) =>
                    setAvailabilityData({
                      ...availabilityData,
                      endDate: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Actions Tab */}
        {activeTab === 'actions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Automatic Actions</Label>
              <Button variant="outline" size="sm" onClick={addAction}>
                <Plus className="h-4 w-4 mr-2" />
                Add Action
              </Button>
            </div>
            <div className="space-y-3">
              {formData.actions?.map((action, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Action {index + 1}</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAction(index)}
                        className="h-8 w-8 p-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label>Action Type</Label>
                      <select
                        className="flex h-10 w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-sm"
                        value={action.type}
                        onChange={(e) =>
                          updateAction(index, {
                            type: e.target.value as EventAction['type'],
                            config: {},
                          })
                        }
                      >
                        <option value="ADD_TO_JOURNEY">Add to Journey</option>
                        <option value="UPDATE_CONTACT_STATUS">Update Contact Status</option>
                        <option value="SEND_SMS">Send SMS</option>
                        <option value="CREATE_TASK">Create Task</option>
                      </select>
                    </div>
                    {action.type === 'ADD_TO_JOURNEY' && (
                      <div>
                        <Label>Journey</Label>
                        <select
                          className="flex h-10 w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-sm"
                          value={action.config.journeyId || ''}
                          onChange={(e) =>
                            updateAction(index, {
                              config: { ...action.config, journeyId: e.target.value },
                            })
                          }
                        >
                          <option value="">Select a journey</option>
                          {journeys.map((journey) => (
                            <option key={journey.id} value={journey.id}>
                              {journey.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    {action.type === 'UPDATE_CONTACT_STATUS' && (
                      <div>
                        <Label>Status</Label>
                        <Input
                          value={action.config.status || ''}
                          onChange={(e) =>
                            updateAction(index, {
                              config: { ...action.config, status: e.target.value },
                            })
                          }
                          placeholder="e.g., CONTACT_MADE, SOLD"
                        />
                      </div>
                    )}
                    {action.type === 'SEND_SMS' && (
                      <div>
                        <Label>Message</Label>
                        <Textarea
                          value={action.config.message || ''}
                          onChange={(e) =>
                            updateAction(index, {
                              config: { ...action.config, message: e.target.value },
                            })
                          }
                          placeholder="SMS message to send"
                          rows={3}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {(!formData.actions || formData.actions.length === 0) && (
                <div className="text-center py-8 text-muted-foreground">
                  No actions configured. Add an action to execute when an event is scheduled.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reminders Tab */}
        {activeTab === 'reminders' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remindersEnabled"
                checked={formData.reminderSettings?.enabled || false}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    reminderSettings: {
                      ...formData.reminderSettings,
                      enabled: e.target.checked,
                      reminders: formData.reminderSettings?.reminders || [],
                    },
                  })
                }
                className="rounded border-gray-300"
              />
              <Label htmlFor="remindersEnabled">Enable Reminders</Label>
            </div>

            {formData.reminderSettings?.enabled && (
              <>
                <div className="flex items-center justify-between">
                  <Label>Reminder Schedule</Label>
                  <Button variant="outline" size="sm" onClick={addReminder}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Reminder
                  </Button>
                </div>
                <div className="space-y-3">
                  {formData.reminderSettings.reminders?.map((reminder, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">Reminder {index + 1}</CardTitle>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeReminder(index)}
                            className="h-8 w-8 p-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label>Minutes Before Event</Label>
                          <Input
                            type="number"
                            value={reminder.minutesBefore}
                            onChange={(e) =>
                              updateReminder(index, {
                                minutesBefore: parseInt(e.target.value) || 0,
                              })
                            }
                            placeholder="e.g., 1440 for 24 hours"
                          />
                        </div>
                        <div>
                          <Label>Reminder Message (optional)</Label>
                          <Textarea
                            value={reminder.message || ''}
                            onChange={(e) => updateReminder(index, { message: e.target.value })}
                            placeholder="Custom reminder message"
                            rows={2}
                          />
                        </div>
                        <div>
                          <Label>Add to Journey for Reminder (optional)</Label>
                          <select
                            className="flex h-10 w-full rounded-lg border-2 border-input bg-background px-4 py-2 text-sm"
                            value={reminder.journeyId || ''}
                            onChange={(e) => updateReminder(index, { journeyId: e.target.value })}
                          >
                            <option value="">None</option>
                            {journeys.map((journey) => (
                              <option key={journey.id} value={journey.id}>
                                {journey.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

            {!isLoading && eventType && (
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handleSave}>Save Configuration</Button>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

