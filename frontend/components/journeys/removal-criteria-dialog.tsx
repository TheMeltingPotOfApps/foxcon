'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  useJourneyRemovalCriteria, 
  useUpdateJourneyRemovalCriteria,
  useJourneyWebhookUrl,
  useGenerateJourneyWebhookToken,
} from '@/lib/hooks/use-journeys';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, X, Copy, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface RemovalCriteriaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journeyId: string;
}

type ConditionType = 'call_transferred' | 'call_duration' | 'webhook' | 'call_status' | 'custom';

interface RemovalCondition {
  type: ConditionType;
  config?: {
    minDurationSeconds?: number;
    webhookUrl?: string;
    webhookPayloadField?: string;
    callStatuses?: string[];
    customCondition?: Record<string, any>;
  };
}

export function RemovalCriteriaDialog({
  open,
  onOpenChange,
  journeyId,
}: RemovalCriteriaDialogProps) {
  const { data: removalCriteria, isLoading } = useJourneyRemovalCriteria(journeyId);
  const { data: webhookUrl } = useJourneyWebhookUrl(journeyId);
  const updateRemovalCriteria = useUpdateJourneyRemovalCriteria();
  const generateWebhookToken = useGenerateJourneyWebhookToken();

  const [enabled, setEnabled] = useState(false);
  const [conditions, setConditions] = useState<RemovalCondition[]>([]);
  const [webhookPayloadField, setWebhookPayloadField] = useState('phoneNumber');

  useEffect(() => {
    if (removalCriteria) {
      setEnabled(removalCriteria.enabled || false);
      setConditions(removalCriteria.conditions || []);
      setWebhookPayloadField(removalCriteria.webhookPayloadField || 'phoneNumber');
    } else {
      setEnabled(false);
      setConditions([]);
      setWebhookPayloadField('phoneNumber');
    }
  }, [removalCriteria]);

  const handleSave = async () => {
    try {
      await updateRemovalCriteria.mutateAsync({
        journeyId,
        removalCriteria: {
          enabled,
          conditions,
          webhookPayloadField,
        },
      });
      toast.success('Removal criteria updated successfully');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update removal criteria');
    }
  };

  const handleCopyWebhookUrl = async () => {
    if (webhookUrl) {
      await navigator.clipboard.writeText(webhookUrl);
      toast.success('Webhook URL copied to clipboard');
    }
  };

  const handleGenerateWebhookToken = async () => {
    try {
      await generateWebhookToken.mutateAsync({ journeyId });
      toast.success('Webhook token generated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate webhook token');
    }
  };

  const addCondition = () => {
    setConditions([
      ...conditions,
      {
        type: 'call_transferred',
        config: {},
      },
    ]);
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const updateCondition = (index: number, updates: Partial<RemovalCondition>) => {
    const updated = [...conditions];
    updated[index] = { ...updated[index], ...updates };
    setConditions(updated);
  };

  const updateConditionConfig = (index: number, configUpdates: any) => {
    const updated = [...conditions];
    updated[index] = {
      ...updated[index],
      config: { ...updated[index].config, ...configUpdates },
    };
    setConditions(updated);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Lead Exit Rules</DialogTitle>
          <DialogDescription>
            Configure when contacts should be automatically removed from this journey
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6 mt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="enabled">Enable Lead Exit Rules</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically remove contacts from this journey when conditions are met
                </p>
              </div>
              <Switch
                id="enabled"
                checked={enabled}
                onCheckedChange={setEnabled}
              />
            </div>

            {enabled && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Exit Conditions</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCondition}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Condition
                  </Button>
                </div>

                {conditions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      <p>No exit conditions configured</p>
                      <p className="text-sm mt-2">
                        Add a condition to automatically remove contacts from this journey
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {conditions.map((condition, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">
                              Condition {index + 1}
                            </CardTitle>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCondition(index)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div>
                            <Label>Condition Type</Label>
                            <select
                              value={condition.type}
                              onChange={(e) =>
                                updateCondition(index, { type: e.target.value as ConditionType, config: {} })
                              }
                              className="w-full px-3 py-2 border rounded-md"
                            >
                              <option value="call_transferred">Call Transferred</option>
                              <option value="call_duration">Call Duration Over X</option>
                              <option value="call_status">Call Status Matches</option>
                              <option value="webhook">Webhook Payload Contains Phone Number</option>
                              <option value="custom">Custom Condition</option>
                            </select>
                          </div>

                          {condition.type === 'call_duration' && (
                            <div>
                              <Label>Minimum Duration (seconds)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={condition.config?.minDurationSeconds || ''}
                                onChange={(e) =>
                                  updateConditionConfig(index, {
                                    minDurationSeconds: parseInt(e.target.value) || 0,
                                  })
                                }
                                placeholder="e.g., 60"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Remove contact if call duration exceeds this value
                              </p>
                            </div>
                          )}

                          {condition.type === 'call_status' && (
                            <div>
                              <Label>Call Statuses (comma-separated)</Label>
                              <Input
                                value={condition.config?.callStatuses?.join(', ') || ''}
                                onChange={(e) =>
                                  updateConditionConfig(index, {
                                    callStatuses: e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean),
                                  })
                                }
                                placeholder="e.g., answered, transferred, completed"
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Remove contact if call status matches any of these values
                              </p>
                            </div>
                          )}

                          {condition.type === 'webhook' && (
                            <div className="space-y-4">
                              <div>
                                <Label>Use Our Webhook Endpoint</Label>
                                <p className="text-xs text-muted-foreground mb-2">
                                  We&apos;ll provide you with a custom endpoint URL to send webhook payloads to
                                </p>
                                {webhookUrl ? (
                                  <div className="space-y-2">
                                    <div className="flex gap-2">
                                      <Input
                                        value={webhookUrl}
                                        readOnly
                                        className="font-mono text-sm"
                                      />
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={handleCopyWebhookUrl}
                                      >
                                        <Copy className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      onClick={handleGenerateWebhookToken}
                                      disabled={generateWebhookToken.isPending}
                                    >
                                      {generateWebhookToken.isPending ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <RefreshCw className="h-4 w-4 mr-2" />
                                          Regenerate Token
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                ) : (
                                  <div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={handleGenerateWebhookToken}
                                      disabled={generateWebhookToken.isPending}
                                    >
                                      {generateWebhookToken.isPending ? (
                                        <>
                                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                          Generating...
                                        </>
                                      ) : (
                                        <>
                                          <Plus className="h-4 w-4 mr-2" />
                                          Generate Webhook Endpoint
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </div>
                              <div>
                                <Label>Payload Field Name</Label>
                                <Input
                                  value={webhookPayloadField}
                                  onChange={(e) => setWebhookPayloadField(e.target.value)}
                                  placeholder="e.g., phoneNumber, phone, contact_phone"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                  Field in webhook payload that contains the contact&apos;s phone number
                                </p>
                              </div>
                              <div className="bg-muted p-3 rounded-md">
                                <p className="text-xs font-medium mb-1">Example Payload:</p>
                                <pre className="text-xs font-mono bg-background p-2 rounded overflow-x-auto">
{`{
  "${webhookPayloadField}": "+1234567890",
  "otherField": "value"
}`}
                                </pre>
                              </div>
                            </div>
                          )}

                          {condition.type === 'custom' && (
                            <div>
                              <Label>Custom Condition</Label>
                              <p className="text-xs text-muted-foreground mb-2">
                                Custom conditions are not yet implemented
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateRemovalCriteria.isPending}
              >
                {updateRemovalCriteria.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

