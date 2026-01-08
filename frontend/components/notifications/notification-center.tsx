'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, Check, CheckCheck, Archive, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationAsRead, useMarkAllNotificationsAsRead, useClearAllReadNotifications, useArchiveNotification, useDeleteNotification, Notification } from '@/lib/hooks/use-notifications';
import { toast } from 'sonner';
import Link from 'next/link';

interface NotificationCenterProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationCenter({ open, onOpenChange }: NotificationCenterProps) {
  // Memoize options to prevent React hooks error #185
  // Show only unread notifications by default
  const notificationsOptions = useMemo(() => ({ limit: 50, status: 'UNREAD' as const }), []);
  
  const { data, isLoading } = useNotifications(notificationsOptions);
  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const markAsRead = useMarkNotificationAsRead();
  const markAllAsRead = useMarkAllNotificationsAsRead();
  const clearAllRead = useClearAllReadNotifications();
  const archiveNotification = useArchiveNotification();
  const deleteNotification = useDeleteNotification();

  const notifications = data?.notifications || [];

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markAsRead.mutateAsync(notificationId);
      // Delete the notification after marking as read so it disappears from the list
      await deleteNotification.mutateAsync(notificationId);
      toast.success('Notification cleared');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to clear notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead.mutateAsync();
      // Also clear all read notifications from the list
      await clearAllRead.mutateAsync();
      toast.success('All notifications cleared');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to clear notifications');
    }
  };

  const handleArchive = async (notificationId: string) => {
    try {
      await archiveNotification.mutateAsync(notificationId);
      toast.success('Notification archived');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to archive notification');
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification.mutateAsync(notificationId);
      toast.success('Notification deleted');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete notification');
    }
  };

  const getNotificationLink = (notification: Notification): string | null => {
    if (notification.metadata?.conversationId) {
      return `/conversations/${notification.metadata.conversationId}`;
    }
    if (notification.metadata?.campaignId) {
      return `/campaigns/${notification.metadata.campaignId}`;
    }
    if (notification.metadata?.journeyId) {
      return `/journeys/${notification.metadata.journeyId}`;
    }
    if (notification.metadata?.contactId) {
      return `/contacts/${notification.metadata.contactId}`;
    }
    return null;
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'SMS_REPLY':
      case 'CAMPAIGN_REPLY':
      case 'JOURNEY_REPLY':
      case 'CONVERSATION_MESSAGE':
        return '💬';
      case 'CAMPAIGN_COMPLETED':
      case 'JOURNEY_COMPLETED':
        return '✅';
      default:
        return '🔔';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Notifications</DialogTitle>
              <DialogDescription>
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
              </DialogDescription>
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm font-medium text-muted-foreground">No notifications</p>
              <p className="text-xs text-muted-foreground mt-1">
                You&apos;re all caught up!
              </p>
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {notifications.map((notification) => {
                const link = getNotificationLink(notification);
                const isUnread = notification.status === 'UNREAD';
                const content = (
                  <div
                    className={`p-4 rounded-lg border transition-colors ${
                      isUnread
                        ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                        : 'bg-background border-border hover:bg-accent/5'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-2xl mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
                              {notification.title}
                            </p>
                            {notification.message && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                              </span>
                              {notification.metadata?.campaignId && (
                                <Badge variant="outline" className="text-xs">
                                  Campaign
                                </Badge>
                              )}
                              {notification.metadata?.journeyId && (
                                <Badge variant="outline" className="text-xs">
                                  Journey
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {isUnread && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMarkAsRead(notification.id);
                                }}
                                title="Mark as read"
                              >
                                <Check className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleArchive(notification.id);
                              }}
                              title="Archive"
                            >
                              <Archive className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(notification.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );

                if (link) {
                  return (
                    <Link key={notification.id} href={link} onClick={() => onOpenChange(false)}>
                      {content}
                    </Link>
                  );
                }

                return <div key={notification.id}>{content}</div>;
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

