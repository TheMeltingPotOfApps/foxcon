'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  useCampaign,
  useLaunchCampaign,
  usePauseCampaign,
  useUpdateCampaign,
} from '@/lib/hooks/use-campaigns';
import { ArrowLeft, Play, Pause, Settings, BarChart3, Edit2, Save, X, Volume2, Bell } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { NotificationPreferencesDialog } from '@/components/notifications/notification-preferences';
import {
  useVoiceTemplates,
  useCalculateCampaignCost,
  useGenerateVoiceCampaign,
} from '@/lib/hooks/use-voice-messages';
import { useSegments } from '@/lib/hooks/use-segments';
import { Loader2 } from 'lucide-react';

const statusColors = {
  DRAFT: 'outline',
  SCHEDULED: 'secondary',
  RUNNING: 'success',
  PAUSED: 'warning',
  COMPLETED: 'secondary',
  CANCELLED: 'destructive',
} as const;

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params.id as string;
  const { data: campaign, isLoading } = useCampaign(campaignId);
  const launchCampaign = useLaunchCampaign();
  const pauseCampaign = usePauseCampaign();
  const updateCampaign = useUpdateCampaign();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isVoiceDialogOpen, setIsVoiceDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    name: '',
    messageContent: '',
    speed: 10,
    aiEnabled: false,
  });
  const { data: voiceTemplates = [] } = useVoiceTemplates();
  const { data: segments = [] } = useSegments();
  const calculateCost = useCalculateCampaignCost();
  const generateVoiceCampaign = useGenerateVoiceCampaign();
  const [voiceConfig, setVoiceConfig] = useState({
    segmentId: '',
    voiceTemplateId: '',
  });
  const [showNotificationPrefs, setShowNotificationPrefs] = useState(false);

  const handleLaunch = async () => {
    if (!campaignId) return;
    try {
      await launchCampaign.mutateAsync(campaignId);
      toast.success('Campaign launched successfully!');
    } catch (error: any) {
      console.error('Failed to launch campaign:', error);
      let errorMessage = 'Failed to launch campaign';
      if (error?.response?.data?.message) {
        errorMessage = typeof error.response.data.message === 'string' 
          ? error.response.data.message 
          : JSON.stringify(error.response.data.message);
      } else if (error?.message) {
        errorMessage = typeof error.message === 'string' ? error.message : String(error.message);
      }
      toast.error(errorMessage);
    }
  };

  const handlePause = async () => {
    if (!campaignId) return;
    try {
      await pauseCampaign.mutateAsync(campaignId);
      toast.success('Campaign paused successfully!');
    } catch (error: any) {
      console.error('Failed to pause campaign:', error);
      let errorMessage = 'Failed to pause campaign';
      if (error?.response?.data?.message) {
        errorMessage = typeof error.response.data.message === 'string' 
          ? error.response.data.message 
          : JSON.stringify(error.response.data.message);
      } else if (error?.message) {
        errorMessage = typeof error.message === 'string' ? error.message : String(error.message);
      }
      toast.error(errorMessage);
    }
  };

  const handleEdit = () => {
    if (!campaign) return;
    const campaignAny = campaign as any;
    const speedConfig = campaignAny.speedConfig || {};
    setEditData({
      name: campaign.name,
      messageContent: campaignAny.messageContent || '',
      speed: speedConfig.messagesPerMinute || campaignAny.speed || 10,
      aiEnabled: campaign.aiEnabled || false,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!campaignId) return;
    try {
      // Convert speed to speedConfig
      const updateData: any = {
        name: editData.name,
        messageContent: editData.messageContent,
        speedConfig: {
          messagesPerMinute: editData.speed,
        },
        aiEnabled: editData.aiEnabled,
      };
      
      await updateCampaign.mutateAsync({
        id: campaignId,
        data: updateData,
      });
      setIsEditDialogOpen(false);
      toast.success('Campaign updated successfully');
    } catch (error: any) {
      console.error('Failed to update campaign:', error);
      let errorMessage = 'Failed to update campaign';
      if (error?.response?.data?.message) {
        errorMessage = typeof error.response.data.message === 'string' 
          ? error.response.data.message 
          : JSON.stringify(error.response.data.message);
      } else if (error?.message) {
        errorMessage = typeof error.message === 'string' ? error.message : String(error.message);
      }
      toast.error(errorMessage);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading campaign...</p>
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Campaign not found</p>
          <Link href="/campaigns">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground">
              Created {formatDistanceToNow(new Date(campaign.createdAt), { addSuffix: true })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {campaign.status === 'DRAFT' && (
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={handleEdit}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Campaign
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Campaign</DialogTitle>
                  <DialogDescription>
                    Update campaign details. You can only edit campaigns in DRAFT status.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Campaign Name</label>
                    <Input
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Message Content</label>
                    <Textarea
                      value={editData.messageContent}
                      onChange={(e) =>
                        setEditData({ ...editData, messageContent: e.target.value })
                      }
                      rows={6}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Speed (msg/min)</label>
                      <Input
                        type="number"
                        value={editData.speed}
                        onChange={(e) =>
                          setEditData({ ...editData, speed: parseInt(e.target.value) || 10 })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">AI Enabled</label>
                      <Select
                        value={editData.aiEnabled ? 'true' : 'false'}
                        onChange={(e) =>
                          setEditData({ ...editData, aiEnabled: e.target.value === 'true' })
                        }
                      >
                        <option value="false">No</option>
                        <option value="true">Yes</option>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setIsEditDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} disabled={updateCampaign.isPending}>
                      <Save className="mr-2 h-4 w-4" />
                      {updateCampaign.isPending ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {campaign.status === 'DRAFT' || campaign.status === 'PAUSED' ? (
            <Button onClick={handleLaunch} disabled={launchCampaign.isPending}>
              <Play className="mr-2 h-4 w-4" />
              Launch Campaign
            </Button>
          ) : campaign.status === 'RUNNING' ? (
            <Button variant="outline" onClick={handlePause} disabled={pauseCampaign.isPending}>
              <Pause className="mr-2 h-4 w-4" />
              Pause Campaign
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => setIsVoiceDialogOpen(true)}>
            <Volume2 className="mr-2 h-4 w-4" />
            Send Voice Messages
          </Button>
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </div>
      </div>

      {/* Voice Messages Dialog */}
      <Dialog open={isVoiceDialogOpen} onOpenChange={setIsVoiceDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send Voice Messages</DialogTitle>
            <DialogDescription>
              Select a segment and voice template to send personalized voice messages
            </DialogDescription>
          </DialogHeader>
          <VoiceMessageDialog
            campaignId={campaignId}
            voiceTemplates={voiceTemplates}
            segments={segments}
            onClose={() => setIsVoiceDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={
                statusColors[campaign.status as keyof typeof statusColors] || 'outline'
              }
              className="text-sm"
            >
              {campaign.status}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="outline">{campaign.type}</Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Messages Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaign.messageCount || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {campaign.deliveredCount && campaign.messageCount
                ? Math.round((campaign.deliveredCount / campaign.messageCount) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Campaign Stats
            </CardTitle>
            <CardDescription>Real-time performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Messages Sent</span>
                <span className="font-semibold">{campaign.messageCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Delivered</span>
                <span className="font-semibold">{campaign.deliveredCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Replies</span>
                <span className="font-semibold">{campaign.repliedCount || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Speed</span>
                <span className="font-semibold">
                  {(campaign as any).speedConfig?.messagesPerMinute || (campaign as any).speed || 10} msg/min
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">AI Enabled</span>
                <Badge variant={campaign.aiEnabled ? 'success' : 'outline'}>
                  {campaign.aiEnabled ? 'Yes' : 'No'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>Configuration and settings</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">Campaign Name</span>
                <p className="font-medium">{campaign.name}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p className="font-medium">{campaign.type}</p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p className="font-medium">
                  <Badge
                    variant={
                      statusColors[campaign.status as keyof typeof statusColors] || 'outline'
                    }
                  >
                    {campaign.status}
                  </Badge>
                </p>
              </div>
              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="font-medium">
                  {new Date(campaign.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Preferences Dialog */}
      <NotificationPreferencesDialog
        open={showNotificationPrefs}
        onOpenChange={setShowNotificationPrefs}
        campaignId={campaignId}
      />
    </motion.div>
  );
}

function VoiceMessageDialog({
  campaignId,
  voiceTemplates,
  segments,
  onClose,
}: {
  campaignId: string;
  voiceTemplates: any[];
  segments: any[];
  onClose: () => void;
}) {
  const [selectedSegment, setSelectedSegment] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const calculateCost = useCalculateCampaignCost();
  const generateVoiceCampaign = useGenerateVoiceCampaign();
  const [costData, setCostData] = useState<any>(null);

  const handleCalculateCost = async () => {
    if (!selectedSegment || !selectedTemplate) {
      toast.error('Please select both a segment and voice template');
      return;
    }

    try {
      const result = await calculateCost.mutateAsync({
        campaignId,
        segmentId: selectedSegment,
        voiceTemplateId: selectedTemplate,
      });
      setCostData(result);
      setShowConfirmation(true);
    } catch (error: any) {
      let errorMessage = 'Failed to calculate cost';
      if (error?.response?.data?.message) {
        errorMessage = typeof error.response.data.message === 'string' 
          ? error.response.data.message 
          : JSON.stringify(error.response.data.message);
      } else if (error?.message) {
        errorMessage = typeof error.message === 'string' ? error.message : String(error.message);
      }
      toast.error(errorMessage);
    }
  };

  const handleConfirm = async () => {
    if (!selectedSegment || !selectedTemplate) return;

    try {
      await generateVoiceCampaign.mutateAsync({
        campaignId,
        segmentId: selectedSegment,
        voiceTemplateId: selectedTemplate,
      });
      toast.success('Voice message generation started!');
      onClose();
    } catch (error: any) {
      let errorMessage = 'Failed to generate voice campaign';
      if (error?.response?.data?.message) {
        errorMessage = typeof error.response.data.message === 'string' 
          ? error.response.data.message 
          : JSON.stringify(error.response.data.message);
      } else if (error?.message) {
        errorMessage = typeof error.message === 'string' ? error.message : String(error.message);
      }
      toast.error(errorMessage);
    }
  };

  const selectedTemplateData = Array.isArray(voiceTemplates) ? voiceTemplates.find((t) => t.id === selectedTemplate) : undefined;
  const selectedSegmentData = Array.isArray(segments) ? segments.find((s) => s.id === selectedSegment) : undefined;

  return (
    <div className="space-y-6">
      {!showConfirmation ? (
        <>
          <div>
            <label className="text-sm font-medium mb-2 block">Select Segment *</label>
            <Select
              value={selectedSegment}
              onChange={(e) => setSelectedSegment(e.target.value)}
            >
              <option value="">Choose a segment...</option>
              {segments.map((segment) => (
                <option key={segment.id} value={segment.id}>
                  {segment.name} ({segment.contactCount || 0} contacts)
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Select Voice Template *</label>
            <Select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
            >
              <option value="">Choose a voice template...</option>
              {voiceTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.elevenLabsVoiceName || template.elevenLabsVoiceId})
                </option>
              ))}
            </Select>
          </div>

          {selectedTemplateData && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Template Preview</p>
              <p className="text-sm text-muted-foreground">{selectedTemplateData.messageContent}</p>
              {selectedTemplateData.variables.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium mb-1">Variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTemplateData.variables.map((variable: string) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handleCalculateCost}
              disabled={!selectedSegment || !selectedTemplate || calculateCost.isPending}
            >
              {calculateCost.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Calculating...
                </>
              ) : (
                'Calculate Cost'
              )}
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-3">Campaign Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Segment:</span>
                  <span className="font-medium">{selectedSegmentData?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Voice Template:</span>
                  <span className="font-medium">{selectedTemplateData?.name}</span>
                </div>
              </div>
            </div>

            {costData && (
              <div className="p-4 border rounded-lg bg-primary/5">
                <h3 className="font-medium mb-3">Cost Breakdown</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Contacts:</span>
                    <span className="font-medium">{costData.totalContacts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Unique Audio Files:</span>
                    <span className="font-medium">{costData.uniqueAudioFiles.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-medium">Estimated Credits:</span>
                    <span className="font-bold text-lg">{costData.estimatedCredits.toLocaleString()}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  Audio files will be reused for contacts with matching variable values, reducing
                  generation costs.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowConfirmation(false)}>
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={generateVoiceCampaign.isPending}
            >
              {generateVoiceCampaign.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Confirm & Generate'
              )}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

