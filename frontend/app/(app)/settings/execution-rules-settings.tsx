'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import {
  useExecutionRules,
  useUpdateExecutionRules,
  type ExecutionRules,
  type AfterHoursAction,
  type TcpaviolationAction,
  type ResubmissionAction,
} from '@/lib/hooks/use-execution-rules';
import { useEventTypes } from '@/lib/hooks/use-event-types';

const getErrorMessage = (error: any, fallback: string): string => {
  if (typeof error?.message === 'string') {
    return error.message;
  }
  if (Array.isArray(error?.response?.data?.message)) {
    return error.response.data.message.join(', ');
  }
  if (typeof error?.response?.data?.message === 'string') {
    return error.response.data.message;
  }
  if (typeof error?.response?.data?.error === 'string') {
    return error.response.data.error;
  }
  return fallback;
};

export function ExecutionRulesSettings() {
  const { data: rules, isLoading } = useExecutionRules();
  const { data: eventTypes = [] } = useEventTypes();
  const updateRules = useUpdateExecutionRules();
  const [localRules, setLocalRules] = useState<Partial<ExecutionRules>>({});

  useEffect(() => {
    if (rules) {
      setLocalRules(rules);
    }
  }, [rules]);

  const handleSave = async () => {
    try {
      await updateRules.mutateAsync(localRules);
      toast.success('Execution rules saved successfully');
    } catch (error: any) {
      toast.error(getErrorMessage(error, 'Failed to save execution rules'));
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const daysOfWeek = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Execution Rules</CardTitle>
          <CardDescription>
            Configure how the system handles events scheduled outside business hours, TCPA violations, and lead resubmissions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* After Hours Handling */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">After Hours Handling</h3>
                <p className="text-sm text-muted-foreground">
                  Configure what happens when events are scheduled outside business hours
                </p>
              </div>
              <Switch
                checked={localRules.enableAfterHoursHandling ?? true}
                onCheckedChange={(checked) =>
                  setLocalRules({ ...localRules, enableAfterHoursHandling: checked })
                }
              />
            </div>

            {localRules.enableAfterHoursHandling && (
              <div className="space-y-4 pl-4 border-l-2">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Action</Label>
                  <select
                    value={localRules.afterHoursAction || 'RESCHEDULE_NEXT_BUSINESS_DAY'}
                    onChange={(e) =>
                      setLocalRules({ ...localRules, afterHoursAction: e.target.value as AfterHoursAction })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="RESCHEDULE_NEXT_AVAILABLE">Reschedule to Next Available Time</option>
                    <option value="RESCHEDULE_NEXT_BUSINESS_DAY">Reschedule to Next Business Day</option>
                    <option value="RESCHEDULE_SPECIFIC_TIME">Reschedule to Specific Time</option>
                    <option value="SKIP_NODE">Skip Node</option>
                    <option value="PAUSE_JOURNEY">Pause Journey</option>
                    <option value="DEFAULT_EVENT">Route to Default Event</option>
                  </select>
                </div>

                {localRules.afterHoursAction === 'RESCHEDULE_SPECIFIC_TIME' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Reschedule Time (HH:mm)</Label>
                    <Input
                      type="time"
                      value={localRules.afterHoursRescheduleTime || '09:00'}
                      onChange={(e) =>
                        setLocalRules({ ...localRules, afterHoursRescheduleTime: e.target.value })
                      }
                      className="w-full"
                    />
                  </div>
                )}

                {localRules.afterHoursAction === 'DEFAULT_EVENT' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Default Event Type</Label>
                    <select
                      value={localRules.afterHoursDefaultEventTypeId || ''}
                      onChange={(e) =>
                        setLocalRules({ ...localRules, afterHoursDefaultEventTypeId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select an event type...</option>
                      {eventTypes
                        .filter((et) => et.isActive)
                        .map((eventType) => (
                          <option key={eventType.id} value={eventType.id}>
                            {eventType.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="space-y-3">
                  <Label className="text-sm font-medium">Business Hours</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Start Hour</Label>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={localRules.afterHoursBusinessHours?.startHour ?? 8}
                        onChange={(e) =>
                          setLocalRules({
                            ...localRules,
                            afterHoursBusinessHours: {
                              ...localRules.afterHoursBusinessHours,
                              startHour: parseInt(e.target.value) || 8,
                              endHour: localRules.afterHoursBusinessHours?.endHour ?? 21,
                              daysOfWeek: localRules.afterHoursBusinessHours?.daysOfWeek ?? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
                            },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">End Hour</Label>
                      <Input
                        type="number"
                        min="0"
                        max="23"
                        value={localRules.afterHoursBusinessHours?.endHour ?? 21}
                        onChange={(e) =>
                          setLocalRules({
                            ...localRules,
                            afterHoursBusinessHours: {
                              ...localRules.afterHoursBusinessHours,
                              startHour: localRules.afterHoursBusinessHours?.startHour ?? 8,
                              endHour: parseInt(e.target.value) || 21,
                              daysOfWeek: localRules.afterHoursBusinessHours?.daysOfWeek ?? ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Business Days</Label>
                    <div className="flex flex-wrap gap-2">
                      {daysOfWeek.map((day) => (
                        <label key={day} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={
                              (localRules.afterHoursBusinessHours?.daysOfWeek || [
                                'MONDAY',
                                'TUESDAY',
                                'WEDNESDAY',
                                'THURSDAY',
                                'FRIDAY',
                              ]).includes(day)
                            }
                            onChange={(e) => {
                              const currentDays =
                                localRules.afterHoursBusinessHours?.daysOfWeek || [
                                  'MONDAY',
                                  'TUESDAY',
                                  'WEDNESDAY',
                                  'THURSDAY',
                                  'FRIDAY',
                                ];
                              const newDays = e.target.checked
                                ? [...currentDays, day]
                                : currentDays.filter((d) => d !== day);
                              setLocalRules({
                                ...localRules,
                                afterHoursBusinessHours: {
                                  ...localRules.afterHoursBusinessHours,
                                  startHour: localRules.afterHoursBusinessHours?.startHour ?? 8,
                                  endHour: localRules.afterHoursBusinessHours?.endHour ?? 21,
                                  daysOfWeek: newDays,
                                },
                              });
                            }}
                            className="rounded"
                          />
                          <span className="text-sm">{day.slice(0, 3)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* TCPA Violation Handling */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">TCPA Violation Handling</h3>
                <p className="text-sm text-muted-foreground">
                  Configure what happens when a TCPA violation is detected
                </p>
              </div>
              <Switch
                checked={localRules.enableTcpaviolationHandling ?? true}
                onCheckedChange={(checked) =>
                  setLocalRules({ ...localRules, enableTcpaviolationHandling: checked })
                }
              />
            </div>

            {localRules.enableTcpaviolationHandling && (
              <div className="space-y-4 pl-4 border-l-2">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Action</Label>
                  <select
                    value={localRules.tcpaViolationAction || 'BLOCK'}
                    onChange={(e) =>
                      setLocalRules({ ...localRules, tcpaViolationAction: e.target.value as TcpaviolationAction })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="BLOCK">Block Execution</option>
                    <option value="RESCHEDULE_NEXT_AVAILABLE">Reschedule to Next Available Time</option>
                    <option value="RESCHEDULE_NEXT_BUSINESS_DAY">Reschedule to Next Business Day</option>
                    <option value="SKIP_NODE">Skip Node</option>
                    <option value="PAUSE_JOURNEY">Pause Journey</option>
                    <option value="DEFAULT_EVENT">Route to Default Event</option>
                  </select>
                </div>

                {localRules.tcpaViolationAction === 'RESCHEDULE_NEXT_BUSINESS_DAY' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Reschedule Time (HH:mm)</Label>
                    <Input
                      type="time"
                      value={localRules.tcpaRescheduleTime || '09:00'}
                      onChange={(e) =>
                        setLocalRules({ ...localRules, tcpaRescheduleTime: e.target.value })
                      }
                      className="w-full"
                    />
                  </div>
                )}

                {localRules.tcpaViolationAction === 'DEFAULT_EVENT' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Default Event Type</Label>
                    <select
                      value={localRules.tcpaDefaultEventTypeId || ''}
                      onChange={(e) =>
                        setLocalRules({ ...localRules, tcpaDefaultEventTypeId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select an event type...</option>
                      {eventTypes
                        .filter((et) => et.isActive)
                        .map((eventType) => (
                          <option key={eventType.id} value={eventType.id}>
                            {eventType.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Lead Resubmission Handling */}
          <div className="space-y-4 border-t pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Lead Resubmission Handling</h3>
                <p className="text-sm text-muted-foreground">
                  Configure what happens when a duplicate lead is detected
                </p>
              </div>
              <Switch
                checked={localRules.enableResubmissionHandling ?? true}
                onCheckedChange={(checked) =>
                  setLocalRules({ ...localRules, enableResubmissionHandling: checked })
                }
              />
            </div>

            {localRules.enableResubmissionHandling && (
              <div className="space-y-4 pl-4 border-l-2">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Action</Label>
                  <select
                    value={localRules.resubmissionAction || 'SKIP_DUPLICATE'}
                    onChange={(e) =>
                      setLocalRules({ ...localRules, resubmissionAction: e.target.value as ResubmissionAction })
                    }
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="SKIP_DUPLICATE">Skip Duplicate</option>
                    <option value="RESCHEDULE_DELAY">Reschedule with Delay</option>
                    <option value="PAUSE_JOURNEY">Pause Journey</option>
                    <option value="DEFAULT_EVENT">Route to Default Event</option>
                    <option value="CONTINUE">Continue Execution</option>
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">Detection Window (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={localRules.resubmissionDetectionWindowHours ?? 24}
                    onChange={(e) =>
                      setLocalRules({
                        ...localRules,
                        resubmissionDetectionWindowHours: parseInt(e.target.value) || 24,
                      })
                    }
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    How many hours to look back when detecting duplicate leads
                  </p>
                </div>

                {localRules.resubmissionAction === 'RESCHEDULE_DELAY' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Reschedule Delay (hours)</Label>
                    <Input
                      type="number"
                      min="1"
                      value={localRules.resubmissionRescheduleDelayHours ?? 24}
                      onChange={(e) =>
                        setLocalRules({
                          ...localRules,
                          resubmissionRescheduleDelayHours: parseInt(e.target.value) || 24,
                        })
                      }
                      className="w-full"
                    />
                  </div>
                )}

                {localRules.resubmissionAction === 'DEFAULT_EVENT' && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Default Event Type</Label>
                    <select
                      value={localRules.resubmissionDefaultEventTypeId || ''}
                      onChange={(e) =>
                        setLocalRules({ ...localRules, resubmissionDefaultEventTypeId: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select an event type...</option>
                      {eventTypes
                        .filter((et) => et.isActive)
                        .map((eventType) => (
                          <option key={eventType.id} value={eventType.id}>
                            {eventType.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={handleSave} disabled={updateRules.isPending}>
              {updateRules.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

