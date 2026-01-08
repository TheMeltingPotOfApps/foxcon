'use client';

import { useState, useEffect, useMemo } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  NotificationPreferences,
} from '@/lib/hooks/use-notifications';
import { toast } from 'sonner';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId?: string;
  journeyId?: string;
  conversationId?: string;
}

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
  campaignId,
  journeyId,
  conversationId,
}: NotificationPreferencesDialogProps) {
  // Memoize options to prevent React hooks error #185
  const preferencesOptions = useMemo(
    () => ({
      campaignId,
      journeyId,
      conversationId,
    }),
    [campaignId, journeyId, conversationId]
  );

  const { data: preferences, isLoading } = useNotificationPreferences(preferencesOptions);
  const updatePreferences = useUpdateNotificationPreferences();

  const [formData, setFormData] = useState<Partial<NotificationPreferences>>({
    smsReplyEnabled: true,
    campaignReplyEnabled: false,
    journeyReplyEnabled: false,
    conversationMessageEnabled: false,
    campaignCompletedEnabled: false,
    journeyCompletedEnabled: false,
  });

  useEffect(() => {
    if (preferences) {
      setFormData({
        smsReplyEnabled: preferences.smsReplyEnabled,
        campaignReplyEnabled: preferences.campaignReplyEnabled,
        journeyReplyEnabled: preferences.journeyReplyEnabled,
        conversationMessageEnabled: preferences.conversationMessageEnabled,
        campaignCompletedEnabled: preferences.campaignCompletedEnabled,
        journeyCompletedEnabled: preferences.journeyCompletedEnabled,
      });
    } else {
      // Set defaults
      setFormData({
        smsReplyEnabled: true,
        campaignReplyEnabled: false,
        journeyReplyEnabled: false,
        conversationMessageEnabled: false,
        campaignCompletedEnabled: false,
        journeyCompletedEnabled: false,
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    try {
      await updatePreferences.mutateAsync({
        preferences: formData,
        campaignId,
        journeyId,
        conversationId,
      });
      toast.success('Notification preferences saved');
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save preferences');
    }
  };

  const getTitle = () => {
    if (campaignId) return 'Campaign Notification Preferences';
    if (journeyId) return 'Journey Notification Preferences';
    if (conversationId) return 'Conversation Notification Preferences';
    return 'Notification Preferences';
  };

  const getDescription = () => {
    if (campaignId) return 'Configure when you want to be notified about replies to this campaign';
    if (journeyId) return 'Configure when you want to be notified about replies in this journey';
    if (conversationId) return 'Configure when you want to be notified about new messages in this conversation';
    return 'Configure your default notification preferences';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Loading preferences...
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {!campaignId && !journeyId && !conversationId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="sms-reply">SMS Replies</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when someone replies to your SMS
                    </p>
                  </div>
                  <Switch
                    id="sms-reply"
                    checked={formData.smsReplyEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, smsReplyEnabled: checked })
                    }
                  />
                </div>
              </div>
            )}

            {campaignId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="campaign-reply">Campaign Replies</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when contacts reply to this campaign
                    </p>
                  </div>
                  <Switch
                    id="campaign-reply"
                    checked={formData.campaignReplyEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, campaignReplyEnabled: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="campaign-completed">Campaign Completed</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when this campaign completes
                    </p>
                  </div>
                  <Switch
                    id="campaign-completed"
                    checked={formData.campaignCompletedEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, campaignCompletedEnabled: checked })
                    }
                  />
                </div>
              </div>
            )}

            {journeyId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="journey-reply">Journey Replies</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when contacts reply in this journey
                    </p>
                  </div>
                  <Switch
                    id="journey-reply"
                    checked={formData.journeyReplyEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, journeyReplyEnabled: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="journey-completed">Journey Completed</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when a contact completes this journey
                    </p>
                  </div>
                  <Switch
                    id="journey-completed"
                    checked={formData.journeyCompletedEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, journeyCompletedEnabled: checked })
                    }
                  />
                </div>
              </div>
            )}

            {conversationId && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="conversation-message">New Messages</Label>
                    <p className="text-xs text-muted-foreground">
                      Get notified when new messages arrive in this conversation
                    </p>
                  </div>
                  <Switch
                    id="conversation-message"
                    checked={formData.conversationMessageEnabled}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, conversationMessageEnabled: checked })
                    }
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Preferences</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

