'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useCreateCampaign } from '@/lib/hooks/use-campaigns';
import { useAiTemplates } from '@/lib/hooks/use-ai-templates';
import { useVoiceTemplates } from '@/lib/hooks/use-voice-messages';
import { useTemplates } from '@/lib/hooks/use-templates';
import { useNumberPools } from '@/lib/hooks/use-twilio';
import { useSegments } from '@/lib/hooks/use-segments';
import { useContentAiTemplates, useGenerateUniqueMessage } from '@/lib/hooks/use-content-ai';
import { apiClient } from '@/lib/api/client';
import { toast } from 'sonner';

const steps = [
  { id: 1, title: 'Details', description: 'Campaign name and type' },
  { id: 2, title: 'Audience', description: 'Select contacts or segments' },
  { id: 3, title: 'Message', description: 'Write your message content' },
  { id: 4, title: 'Speed', description: 'Configure sending speed' },
  { id: 5, title: 'Numbers', description: 'Select number pool' },
  { id: 6, title: 'AI', description: 'Configure AI behavior' },
  { id: 7, title: 'Review', description: 'Review and launch' },
];

export default function NewCampaignPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    type: 'OUTBOUND' as 'OUTBOUND' | 'CONVERSATIONAL',
    message: '',
    templateId: '',
    contentAiTemplateId: '',
    speed: 10,
    aiEnabled: false,
    aiTemplateId: '',
    voiceTemplateId: '',
    numberPoolId: '',
    audienceType: 'all' as 'all' | 'segment' | 'csv',
    segmentId: '',
    csvFile: null as File | null,
  });
  const [previewMessage, setPreviewMessage] = useState<string>('');
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const createCampaign = useCreateCampaign();
  const { data: aiTemplates = [] } = useAiTemplates();
  const { data: voiceTemplates = [] } = useVoiceTemplates();
  const { data: templates = [] } = useTemplates('OUTREACH');
  const { data: contentAiTemplates = [] } = useContentAiTemplates();
  const { data: numberPools = [] } = useNumberPools();
  const { data: segments = [] } = useSegments();
  const generateUniqueMessage = useGenerateUniqueMessage();

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    try {
      // Parse CSV if provided
      let contactIds: string[] = [];
      if (formData.audienceType === 'csv' && formData.csvFile) {
        try {
          const text = await formData.csvFile.text();
          const lines = text.split('\n').filter((line) => line.trim());
          if (lines.length > 1) {
            const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
            const phoneIndex = headers.findIndex((h) => h === 'phone' || h === 'phonenumber');
            
            if (phoneIndex !== -1) {
              // Parse phone numbers and create/find contacts
              const phoneNumbers: string[] = [];
              for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(',').map((v) => v.trim());
                const phone = values[phoneIndex];
                if (phone) {
                  phoneNumbers.push(phone);
                }
              }
              
              // Import contacts and get their IDs
              if (phoneNumbers.length > 0) {
                const contactsData = phoneNumbers.map((phone) => ({ phone }));
                const importResponse = await apiClient.post('/contacts/import', { contacts: contactsData });
                if (importResponse.data?.contacts) {
                  contactIds = importResponse.data.contacts.map((c: any) => c.id).filter(Boolean);
                }
              }
            }
          }
        } catch (error) {
          console.error('Failed to parse CSV:', error);
          toast.error('Failed to parse CSV file');
          return;
        }
      }
      
      // Prepare campaign data
      const campaignData: any = {
        name: formData.name,
        type: formData.type,
        messageContent: formData.type === 'OUTBOUND' && formData.message ? formData.message : undefined,
        templateId: formData.type === 'OUTBOUND' && formData.templateId ? formData.templateId : undefined,
        contentAiTemplateId: formData.type === 'OUTBOUND' && formData.contentAiTemplateId ? formData.contentAiTemplateId : undefined,
        speedConfig: {
          messagesPerMinute: formData.speed,
        },
        aiEnabled: formData.aiEnabled || formData.type === 'CONVERSATIONAL',
        aiTemplateId: formData.type === 'CONVERSATIONAL' && formData.aiTemplateId ? formData.aiTemplateId : undefined,
        numberPoolId: formData.numberPoolId || undefined,
        audienceType: formData.audienceType,
      };
      
      // Add segment or contact IDs based on audience type
      if (formData.audienceType === 'segment' && formData.segmentId) {
        campaignData.segmentId = formData.segmentId;
      } else if (contactIds.length > 0) {
        campaignData.contactIds = contactIds;
      }
      
      const campaign = await createCampaign.mutateAsync(campaignData);
      router.push(`/campaigns/${campaign.id}`);
    } catch (error: any) {
      console.error('Failed to create campaign:', error);
      let errorMessage = 'Failed to create campaign';
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

  const isStepComplete = (step: number) => {
    switch (step) {
      case 1:
        return formData.name.length > 0;
      case 2:
        return formData.audienceType === 'all' ||
          (formData.audienceType === 'segment' && formData.segmentId) ||
          (formData.audienceType === 'csv' && formData.csvFile);
      case 3:
        if (formData.type === 'CONVERSATIONAL') {
          return !!formData.aiTemplateId;
        }
        // For OUTBOUND campaigns, either message, templateId, or contentAiTemplateId is required
        return formData.message.length > 0 || formData.templateId.length > 0 || formData.contentAiTemplateId.length > 0;
      case 4:
        return formData.speed > 0;
      case 5:
        return true; // Number pool is optional
      case 6:
        return true; // AI config
      case 7:
        return true; // Review
      default:
        return false;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/campaigns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Create Campaign</h1>
            <p className="text-muted-foreground">Step {currentStep} of {steps.length}</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                      currentStep > step.id
                        ? 'bg-primary border-primary text-primary-foreground'
                        : currentStep === step.id
                        ? 'border-primary text-primary'
                        : 'border-muted text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`text-xs font-medium ${
                        currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{step.description}</p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-0.5 flex-1 mx-2 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>{steps[currentStep - 1].title}</CardTitle>
              <CardDescription>{steps[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Campaign Name</label>
                    <Input
                      placeholder="e.g., Summer Sale Campaign"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Campaign Type</label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={formData.type === 'OUTBOUND' ? 'default' : 'outline'}
                          onClick={() => setFormData({ ...formData, type: 'OUTBOUND', aiTemplateId: '' })}
                          className="flex-1"
                        >
                          Outreach
                        </Button>
                        <Button
                          type="button"
                          variant={formData.type === 'CONVERSATIONAL' ? 'default' : 'outline'}
                          onClick={() => setFormData({ ...formData, type: 'CONVERSATIONAL' })}
                          className="flex-1"
                        >
                          Conversational
                        </Button>
                      </div>
                      {formData.type === 'CONVERSATIONAL' && (
                        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                          <p className="text-sm font-medium mb-2">AI Messenger Required</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            Select an AI Messenger template to power your conversational campaign
                          </p>
                          <Select
                            value={formData.aiTemplateId}
                            onChange={(e) => setFormData({ ...formData, aiTemplateId: e.target.value })}
                          >
                            <option value="">Select AI Messenger Template...</option>
                            {aiTemplates
                              .filter((t) => t.isActive)
                              .map((template) => (
                                <option key={template.id} value={template.id}>
                                  {template.name}
                                </option>
                              ))}
                          </Select>
                          {!formData.aiTemplateId && (
                            <p className="text-xs text-muted-foreground mt-2">
                              <Link href="/templates" className="text-primary hover:underline">
                                Create an AI Messenger template
                              </Link>{' '}
                              to get started
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Audience Type</label>
                    <div className="flex gap-2 mb-4">
                      <Button
                        type="button"
                        variant={formData.audienceType === 'all' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, audienceType: 'all' })}
                        className="flex-1"
                      >
                        All Contacts
                      </Button>
                      <Button
                        type="button"
                        variant={formData.audienceType === 'segment' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, audienceType: 'segment' })}
                        className="flex-1"
                      >
                        Segment
                      </Button>
                      <Button
                        type="button"
                        variant={formData.audienceType === 'csv' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, audienceType: 'csv' })}
                        className="flex-1"
                      >
                        Upload CSV
                      </Button>
                    </div>
                    {formData.audienceType === 'segment' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Select Segment</label>
                        <Select
                          value={formData.segmentId || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, segmentId: e.target.value })
                          }
                        >
                          <option value="">Select a segment...</option>
                          {segments.map((segment) => (
                            <option key={segment.id} value={segment.id}>
                              {segment.name} ({segment.contactCount || 0} contacts)
                            </option>
                          ))}
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                          <Link href="/segments" className="text-primary hover:underline">
                            Create a segment
                          </Link>{' '}
                          to target specific contacts
                        </p>
                      </div>
                    )}
                    {formData.audienceType === 'csv' && (
                      <div>
                        <label className="text-sm font-medium mb-2 block">Upload CSV</label>
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setFormData({ ...formData, csvFile: file });
                            }
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-2">
                          CSV should contain phone numbers. Other fields are optional.
                        </p>
                        <Link href="/contacts/import" className="text-xs text-primary hover:underline">
                          View import guide
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  {formData.type === 'OUTBOUND' ? (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Use Content AI Template (Generates Unique Messages)</label>
                        <Select
                          value={formData.contentAiTemplateId}
                          onChange={(e) => {
                            const contentAiTemplateId = e.target.value;
                            setFormData({ 
                              ...formData, 
                              contentAiTemplateId,
                              templateId: contentAiTemplateId ? '' : formData.templateId, // Clear regular template if Content AI selected
                              message: contentAiTemplateId ? '' : formData.message, // Clear message if Content AI selected
                            });
                            setPreviewMessage(''); // Clear preview
                          }}
                        >
                          <option value="">Select a Content AI template...</option>
                          {contentAiTemplates
                            .filter((t) => t.isActive)
                            .map((template) => (
                              <option key={template.id} value={template.id}>
                                {template.name} {template.unique ? '(Unique)' : '(Variations)'}
                              </option>
                            ))}
                        </Select>
                        <p className="text-xs text-muted-foreground mt-2">
                          {formData.contentAiTemplateId ? (
                            <>
                              Using Content AI template: <strong>{Array.isArray(contentAiTemplates) ? contentAiTemplates.find((t) => t.id === formData.contentAiTemplateId)?.name : ''}</strong>
                              {' '}
                              <button
                                type="button"
                                onClick={() => {
                                  setFormData({ ...formData, contentAiTemplateId: '', message: '' });
                                  setPreviewMessage('');
                                }}
                                className="text-primary hover:underline"
                              >
                                Clear
                              </button>
                            </>
                          ) : (
                            <>
                              Content AI templates generate unique messages for each contact.{' '}
                              <Link href="/templates" className="text-primary hover:underline">
                                Create Content AI templates
                              </Link>
                            </>
                          )}
                        </p>
                      </div>
                      {formData.contentAiTemplateId && (
                        <div className="space-y-2">
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium">AI Generated Message Preview</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  setIsGeneratingPreview(true);
                                  try {
                                    const selectedTemplate = contentAiTemplates.find((t) => t.id === formData.contentAiTemplateId);
                                    if (selectedTemplate?.unique) {
                                      const message = await generateUniqueMessage.mutateAsync({
                                        id: formData.contentAiTemplateId,
                                        context: {
                                          contact: {
                                            firstName: 'John',
                                            lastName: 'Doe',
                                            phoneNumber: '+1234567890',
                                            email: 'john@example.com',
                                          },
                                        },
                                      });
                                      setPreviewMessage(message);
                                    } else {
                                      toast.info('Preview available for unique templates only');
                                    }
                                  } catch (error: any) {
                                    toast.error('Failed to generate preview');
                                  } finally {
                                    setIsGeneratingPreview(false);
                                  }
                                }}
                                disabled={isGeneratingPreview || !(Array.isArray(contentAiTemplates) ? contentAiTemplates.find((t) => t.id === formData.contentAiTemplateId)?.unique : false)}
                              >
                                {isGeneratingPreview ? 'Generating...' : 'Generate Preview'}
                              </Button>
                            </div>
                            {previewMessage ? (
                              <p className="text-sm text-foreground whitespace-pre-wrap">{previewMessage}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                {contentAiTemplates.find((t) => t.id === formData.contentAiTemplateId)?.unique
                                  ? 'Click "Generate Preview" to see an example message'
                                  : 'This template uses variations. Each contact will receive a random variation.'}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {(Array.isArray(contentAiTemplates) ? contentAiTemplates.find((t) => t.id === formData.contentAiTemplateId)?.unique : false)
                                ? 'Each contact will receive a unique AI-generated message based on their data.'
                                : 'Each contact will receive a random variation from the generated set.'}
                            </p>
                          </div>
                        </div>
                      )}
                      {!formData.contentAiTemplateId && (
                        <>
                          <div>
                            <label className="text-sm font-medium mb-2 block">Use Template (Optional)</label>
                            <Select
                              value={formData.templateId}
                              onChange={(e) => {
                                const templateId = e.target.value;
                                setFormData({ 
                                  ...formData, 
                                  templateId,
                                  message: templateId ? '' : formData.message, // Clear message if template selected
                                });
                              }}
                            >
                              <option value="">Select a template or write custom message...</option>
                              {Array.isArray(templates) ? templates
                                .filter((t) => t.isActive && t.type === 'OUTREACH')
                                .map((template) => (
                                  <option key={template.id} value={template.id}>
                                    {template.name} {template.category ? `(${template.category})` : ''}
                                  </option>
                                )) : []}
                            </Select>
                            <p className="text-xs text-muted-foreground mt-2">
                              {formData.templateId ? (
                                <>
                                  Using template: <strong>{templates.find((t) => t.id === formData.templateId)?.name}</strong>
                                  {' '}
                                  <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, templateId: '', message: '' })}
                                    className="text-primary hover:underline"
                                  >
                                    Clear
                                  </button>
                                </>
                              ) : (
                                <>
                                  Select a template or write a custom message below.{' '}
                                  <Link href="/templates" className="text-primary hover:underline">
                                    Create templates
                                  </Link>
                                </>
                              )}
                            </p>
                          </div>
                          {formData.templateId && (
                            <div className="p-4 bg-muted rounded-lg">
                              <p className="text-sm font-medium mb-2">Template Preview</p>
                              <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                {(Array.isArray(templates) ? templates.find((t) => t.id === formData.templateId)?.content : null) || 'Loading...'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-2">
                                Variables like {'{'}{'{'}firstName{'}'}{'}'} will be replaced with contact data.
                              </p>
                            </div>
                          )}
                          {!formData.templateId && (
                            <div>
                              <label className="text-sm font-medium mb-2 block">Message Content</label>
                              <Textarea
                                className="min-h-[200px]"
                                placeholder="Enter your message here... Use {{firstName}}, {{lastName}}, etc. for variables"
                                value={formData.message}
                                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                              />
                              <p className="text-xs text-muted-foreground mt-2">
                                {formData.message.length} characters
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Use variables like {'{'}{'{'}firstName{'}'}{'}'}, {'{'}{'{'}lastName{'}'}{'}'}, {'{'}{'{'}email{'}'}{'}'}, {'{'}{'{'}appointmentTime{'}'}{'}'}, {'{'}{'{'}appointmentDate{'}'}{'}'}, {'{'}{'{'}appointmentDateTime{'}'}{'}'} for personalization. Appointment variables are formatted in the contact&apos;s timezone.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-2">AI Messenger Template Selected</p>
                      <p className="text-xs text-muted-foreground">
                        Your conversational campaign will use the AI Messenger template to handle
                        conversations automatically. No manual message content is needed.
                      </p>
                      {formData.aiTemplateId && (
                        <div className="mt-3">
                          <p className="text-xs font-medium mb-1">Selected Template:</p>
                          <p className="text-sm">
                            {Array.isArray(aiTemplates) ? aiTemplates.find((t) => t.id === formData.aiTemplateId)?.name || 'Unknown' : 'Unknown'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Voice Message Template (Optional)</label>
                    <Select
                      value={formData.voiceTemplateId}
                      onChange={(e) => setFormData({ ...formData, voiceTemplateId: e.target.value })}
                    >
                      <option value="">No voice message</option>
                      {Array.isArray(voiceTemplates) ? voiceTemplates
                        .filter((t) => t.isActive)
                        .map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        )) : []}
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Optionally send voice messages using ElevenLabs TTS
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Messages per Minute: {formData.speed}
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={formData.speed}
                      onChange={(e) =>
                        setFormData({ ...formData, speed: parseInt(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Slow (1/min)</span>
                      <span>Fast (100/min)</span>
                    </div>
                  </div>
                </div>
              )}

              {currentStep === 5 && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Number Pool</label>
                    <Select
                      value={formData.numberPoolId}
                      onChange={(e) => setFormData({ ...formData, numberPoolId: e.target.value })}
                    >
                      <option value="">Use default pool</option>
                      {Array.isArray(numberPools) ? numberPools
                        .filter((p) => p.isActive)
                        .map((pool) => (
                          <option key={pool.id} value={pool.id}>
                            {pool.name}
                            {pool.maxMessagesPerDay && ` (Max: ${pool.maxMessagesPerDay}/day)`}
                            {pool.numbers && ` (${pool.numbers.length} numbers)`}
                          </option>
                        )) : []}
                    </Select>
                    <p className="text-xs text-muted-foreground mt-2">
                      Select a number pool to use for sending messages. Leave empty to use the default pool.
                    </p>
                  </div>
                </div>
              )}

              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <p className="font-medium">AI-Enabled Replies</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically respond to incoming messages using AI
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant={formData.aiEnabled ? 'default' : 'outline'}
                      onClick={() =>
                        setFormData({ ...formData, aiEnabled: !formData.aiEnabled })
                      }
                    >
                      {formData.aiEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                </div>
              )}

              {currentStep === 7 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Campaign Name</span>
                      <span className="font-medium">{formData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge>{formData.type}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Speed</span>
                      <span className="font-medium">{formData.speed} msg/min</span>
                    </div>
                    {formData.type === 'CONVERSATIONAL' && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">AI Template</span>
                        <span className="font-medium">
                          {Array.isArray(aiTemplates) ? aiTemplates.find((t) => t.id === formData.aiTemplateId)?.name || 'None' : 'None'}
                        </span>
                      </div>
                    )}
                    {formData.voiceTemplateId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Voice Template</span>
                        <span className="font-medium">
                          {Array.isArray(voiceTemplates) ? voiceTemplates.find((t) => t.id === formData.voiceTemplateId)?.name || 'None' : 'None'}
                        </span>
                      </div>
                    )}
                    {formData.numberPoolId && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Number Pool</span>
                        <span className="font-medium">
                          {numberPools.find((p) => p.id === formData.numberPoolId)?.name || 'Default'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">AI Enabled</span>
                      <Badge variant={formData.aiEnabled ? 'success' : 'outline'}>
                        {formData.aiEnabled ? 'Yes' : 'No'}
                      </Badge>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 1}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        {currentStep < steps.length ? (
          <Button onClick={handleNext} disabled={!isStepComplete(currentStep)}>
            Next
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={createCampaign.isPending}>
            {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
          </Button>
        )}
      </div>
    </div>
  );
}

