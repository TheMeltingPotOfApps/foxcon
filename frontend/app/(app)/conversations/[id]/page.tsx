'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send, Bot, User, CheckCircle2, XCircle, Clock, Power, PowerOff, Bell, MessageSquare } from 'lucide-react';
import {
  useConversation,
  useSendMessage,
  useCloseConversation,
} from '@/lib/hooks/use-conversations';
import { useAiTemplates } from '@/lib/hooks/use-ai-templates';
import { formatDistanceToNow } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { NotificationPreferencesDialog } from '@/components/notifications/notification-preferences';

export default function ConversationDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: conversation, isLoading } = useConversation(params.id);
  const sendMessage = useSendMessage();
  const closeConversation = useCloseConversation();
  const [messageText, setMessageText] = useState('');
  const { data: aiTemplates = [] } = useAiTemplates();
  const [aiChatbotEnabled, setAiChatbotEnabled] = useState(false);
  const [selectedAiTemplateId, setSelectedAiTemplateId] = useState<string>('');
  const [showAiConfigDialog, setShowAiConfigDialog] = useState(false);
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);
  const [useImessage, setUseImessage] = useState(false); // Toggle for Send Blue (iMessage)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Loading conversation...</p>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Conversation not found</p>
        <Link href="/conversations">
          <Button variant="outline">Back to Conversations</Button>
        </Link>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;

    try {
      await sendMessage.mutateAsync({
        conversationId: params.id,
        body: messageText,
        messageType: useImessage ? 'IMESSAGE' : 'SMS',
      });
      setMessageText('');
      setUseImessage(false); // Reset after sending
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleClose = async () => {
    if (confirm('Are you sure you want to close this conversation?')) {
      try {
        await closeConversation.mutateAsync(params.id);
        router.push('/conversations');
      } catch (error) {
        console.error('Failed to close conversation:', error);
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DELIVERED':
        return <CheckCircle2 className="h-3 w-3 text-success" />;
      case 'FAILED':
        return <XCircle className="h-3 w-3 text-destructive" />;
      case 'SENT':
        return <Clock className="h-3 w-3 text-muted-foreground" />;
      default:
        return null;
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
          <Link href="/conversations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">
              {conversation.contact?.firstName} {conversation.contact?.lastName}
            </h1>
            <p className="text-muted-foreground">{conversation.contact?.phone}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowNotificationPrefs(true)}
            title="Notification Preferences"
          >
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </Button>
          <Badge variant={conversation.status === 'OPEN' ? 'success' : 'secondary'}>
            {conversation.status}
          </Badge>
          {conversation.status === 'OPEN' && (
            <Button variant="outline" onClick={handleClose}>
              Close Conversation
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Messages Thread */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>
                {conversation.messages?.length || 0} message
                {(conversation.messages?.length || 0) !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {conversation.messages && conversation.messages.length > 0 ? (
                  conversation.messages.map((message) => (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-3 ${
                        message.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-3 ${
                          message.direction === 'OUTBOUND'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {message.direction === 'INBOUND' ? (
                            <User className="h-4 w-4 mt-0.5" />
                          ) : (
                            <Bot className="h-4 w-4 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="text-sm">{message.body}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs opacity-70">
                                {formatDistanceToNow(new Date(message.createdAt), {
                                  addSuffix: true,
                                })}
                              </span>
                              {message.direction === 'OUTBOUND' && getStatusIcon(message.status)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">No messages yet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message Input */}
          {conversation.status === 'OPEN' && (
            <Card>
              <CardContent className="pt-6">
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type your message..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={useImessage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setUseImessage(!useImessage)}
                        className={useImessage ? 'bg-blue-600 hover:bg-blue-700' : ''}
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Send Blue
                      </Button>
                      {useImessage && (
                        <span className="text-xs text-muted-foreground">
                          Will send via iMessage
                        </span>
                      )}
                    </div>
                    <Button type="submit" disabled={sendMessage.isPending || !messageText.trim()}>
                      <Send className="mr-2 h-4 w-4" />
                      {sendMessage.isPending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Contact Info Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Contact Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">
                  {conversation.contact?.firstName} {conversation.contact?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{conversation.contact?.phone}</p>
              </div>
              <Link href={`/contacts/${conversation.contactId}`}>
                <Button variant="outline" className="w-full">
                  View Full Profile
                </Button>
              </Link>
            </CardContent>
          </Card>

          {conversation.campaignId && (
            <Card>
              <CardHeader>
                <CardTitle>Campaign</CardTitle>
              </CardHeader>
              <CardContent>
                <Link href={`/campaigns/${conversation.campaignId}`}>
                  <Button variant="outline" className="w-full">
                    View Campaign
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* AI Chatbot */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                AI Chatbot
              </CardTitle>
              <CardDescription>Enable AI-powered automated responses</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiChatbotEnabled ? (
                <>
                  <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Power className="h-4 w-4 text-success" />
                      <span className="text-sm font-medium">AI Chatbot Active</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAiChatbotEnabled(false);
                        setSelectedAiTemplateId('');
                        toast.success('AI Chatbot disabled');
                      }}
                    >
                      <PowerOff className="h-4 w-4" />
                    </Button>
                  </div>
                  {selectedAiTemplateId && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Active Template</p>
                      <p className="text-sm font-medium">
                        {aiTemplates.find((t) => t.id === selectedAiTemplateId)?.name || 'Unknown'}
                      </p>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setShowAiConfigDialog(true)}
                  >
                    Configure Settings
                  </Button>
                </>
              ) : (
                <>
                  <div className="text-center py-4">
                    <Bot className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-4">
                      Enable AI chatbot to automatically respond to messages
                    </p>
                    <Button
                      variant="default"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (aiTemplates.length === 0) {
                          toast.error('No AI templates available. Please create one in Templates.');
                          return;
                        }
                        setShowAiConfigDialog(true);
                      }}
                    >
                      <Power className="h-4 w-4 mr-2" />
                      Enable AI Chatbot
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* AI Configuration Dialog */}
          <Dialog open={showAiConfigDialog} onOpenChange={setShowAiConfigDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configure AI Chatbot</DialogTitle>
                <DialogDescription>
                  Select an AI template to use for automated responses
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">AI Template *</label>
                  <select
                    value={selectedAiTemplateId}
                    onChange={(e) => setSelectedAiTemplateId(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <option value="">Select an AI template...</option>
                    {aiTemplates
                      .filter((t) => t.isActive)
                      .map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.name}
                          {template.description && ` - ${template.description}`}
                        </option>
                      ))}
                  </select>
                  {aiTemplates.length === 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      No AI templates available.{' '}
                      <Link href="/templates" className="text-primary hover:underline">
                        Create one here
                      </Link>
                    </p>
                  )}
                </div>
                {selectedAiTemplateId && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-medium mb-1">Template Details</p>
                    {(() => {
                      const template = aiTemplates.find((t) => t.id === selectedAiTemplateId);
                      if (!template) return null;
                      return (
                        <div className="space-y-2 text-xs text-muted-foreground">
                          {template.config.businessName && (
                            <p>
                              <span className="font-medium">Business:</span> {template.config.businessName}
                            </p>
                          )}
                          {template.config.welcomeMessage && (
                            <p>
                              <span className="font-medium">Welcome:</span> {template.config.welcomeMessage}
                            </p>
                          )}
                          {template.config.purpose && template.config.purpose.length > 0 && (
                            <p>
                              <span className="font-medium">Purpose:</span>{' '}
                              {template.config.purpose.map((p: string) => p.replace(/_/g, ' ')).join(', ')}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => setShowAiConfigDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedAiTemplateId) {
                      toast.error('Please select an AI template');
                      return;
                    }
                    setAiChatbotEnabled(true);
                    setShowAiConfigDialog(false);
                    toast.success('AI Chatbot enabled');
                  }}
                  disabled={!selectedAiTemplateId}
                >
                  {aiChatbotEnabled ? 'Update' : 'Enable'} Chatbot
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Notification Preferences Dialog */}
      <NotificationPreferencesDialog
        open={showNotificationPrefs}
        onOpenChange={setShowNotificationPrefs}
        conversationId={params.id}
      />
    </motion.div>
  );
}

