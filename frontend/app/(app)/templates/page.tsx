'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
// Tabs component - using buttons for now
import { Search, FileText, Copy, Edit2, Trash2, Eye, Bot, Check, X, Rocket, Users as UsersIcon, Heart, ShoppingCart, HeadphonesIcon, ArrowRight, Workflow, Phone, CheckCircle } from 'lucide-react';
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
} from '@/lib/hooks/use-templates';
import {
  useVoiceTemplates,
  useCreateVoiceTemplate,
  useElevenLabsVoices,
  type CreateVoiceTemplateDto,
} from '@/lib/hooks/use-voice-messages';
import { useVoicePresets } from '@/lib/hooks/use-voice-presets';
import {
  useAiTemplates,
  useCreateAiTemplate,
  useUpdateAiTemplate,
  useDeleteAiTemplate,
  type CreateAiTemplateDto,
} from '@/lib/hooks/use-ai-templates';
import {
  useGenerateAiTemplateConfig,
  useGenerateSmsVariations,
} from '@/lib/hooks/use-ai-generation';
import {
  useContentAiTemplates,
  useCreateContentAiTemplate,
  useUpdateContentAiTemplate,
  useDeleteContentAiTemplate,
  useGenerateContentAiVariations,
  type CreateContentAiTemplateDto,
  type ContentAiTemplate,
} from '@/lib/hooks/use-content-ai';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Sparkles, Wand2, Volume2, Plus, X as XIcon, Sparkles as SparklesIcon } from 'lucide-react';
import {
  useJourneyTemplates,
  usePublicJourneyTemplates,
  useCreateJourneyFromTemplate,
  useDeleteJourneyTemplate,
  useGenerateAiPoweredJourneyTemplate,
  useGeneratePreviewScript,
  useGenerationJobStatus,
} from '@/lib/hooks/use-journey-templates';
import { useEventTypes } from '@/lib/hooks/use-event-types';
import { MARKETING_ANGLES, SENTIMENTS } from './tonalities';
import dynamic from 'next/dynamic';

const VoiceStudioPage = dynamic(() => import('./voice-studio/page'), {
  ssr: false,
});

const templateTypes = [
  { value: '', label: 'All Templates' },
  { value: 'OUTREACH', label: 'Outreach' },
  { value: 'REPLY', label: 'Reply' },
  { value: 'AI_PROMPT', label: 'AI Prompt' },
  { value: 'SYSTEM', label: 'System' },
];

type TabType = 'message' | 'voice' | 'ai' | 'content-ai' | 'journey' | 'voice-studio';

// GuideCard component for displaying helpful tips
interface GuideCardProps {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  tips: string[];
}

function GuideCard({ title, icon: Icon, tips }: GuideCardProps) {
  return (
    <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="text-blue-600 dark:text-blue-400 mt-0.5">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              {title}
            </p>
            <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
              {tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplatesPage() {
  const [activeTab, setActiveTab] = useState<TabType>('message');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateVoiceDialogOpen, setIsCreateVoiceDialogOpen] = useState(false);
  const [isCreateAiDialogOpen, setIsCreateAiDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [editingAiTemplate, setEditingAiTemplate] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const { data: templates, isLoading } = useTemplates(selectedType || undefined);
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const { data: voiceTemplates = [], isLoading: voiceTemplatesLoading } = useVoiceTemplates();
  const createVoiceTemplate = useCreateVoiceTemplate();
  const { data: aiTemplates = [], isLoading: aiTemplatesLoading } = useAiTemplates();
  const createAiTemplate = useCreateAiTemplate();
  const updateAiTemplate = useUpdateAiTemplate();
  const deleteAiTemplate = useDeleteAiTemplate();
  const { data: contentAiTemplates = [], isLoading: contentAiTemplatesLoading } = useContentAiTemplates();
  const createContentAiTemplate = useCreateContentAiTemplate();
  const updateContentAiTemplate = useUpdateContentAiTemplate();
  const deleteContentAiTemplate = useDeleteContentAiTemplate();
  const [isCreateContentAiDialogOpen, setIsCreateContentAiDialogOpen] = useState(false);
  const [editingContentAiTemplate, setEditingContentAiTemplate] = useState<string | null>(null);
  const [previewContentAiTemplate, setPreviewContentAiTemplate] = useState<string | null>(null);

  const filteredTemplates =
    templates?.filter(
      (template) =>
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createTemplate.mutateAsync({
        name: formData.get('name') as string,
        type: formData.get('type') as any,
        content: formData.get('content') as string,
        category: formData.get('category') as string,
        isActive: true,
      });
      setIsCreateDialogOpen(false);
      e.currentTarget.reset();
    } catch (error) {
      console.error('Failed to create template:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await deleteTemplate.mutateAsync(id);
      } catch (error) {
        console.error('Failed to delete template:', error);
      }
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'OUTREACH':
        return 'default';
      case 'REPLY':
        return 'secondary';
      case 'AI_PROMPT':
        return 'outline';
      case 'SYSTEM':
        return 'success';
      default:
        return 'outline';
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
        <div>
          <h1 className="text-3xl font-bold">Templates</h1>
          <p className="text-muted-foreground">Manage message templates and voice templates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('message')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'message'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <FileText className="inline h-4 w-4 mr-2" />
          Message Templates
        </button>
        <button
          onClick={() => setActiveTab('voice')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'voice'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Volume2 className="inline h-4 w-4 mr-2" />
          Voice Templates
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'ai'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Bot className="inline h-4 w-4 mr-2" />
          AI Messenger
        </button>
        <button
          onClick={() => setActiveTab('content-ai')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'content-ai'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Wand2 className="inline h-4 w-4 mr-2" />
          Content AI
        </button>
        <button
          onClick={() => setActiveTab('journey')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'journey'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Workflow className="inline h-4 w-4 mr-2" />
          Journey Templates
        </button>
        <button
          onClick={() => setActiveTab('voice-studio')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'voice-studio'
              ? 'border-primary text-primary'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <SparklesIcon className="inline h-4 w-4 mr-2" />
          AI Voice Studio
        </button>
      </div>

      {activeTab === 'message' && (
        <>
          <div className="flex items-center justify-between">
            <div></div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Template
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Template</DialogTitle>
              <DialogDescription>
                Create a reusable message template with variables
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Template Name</label>
                <Input name="name" required placeholder="e.g., Welcome Message" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Type</label>
                    <Select
                      name="type"
                      required
                    >
                      <option value="OUTREACH">Outreach</option>
                      <option value="REPLY">Reply</option>
                      <option value="AI_PROMPT">AI Prompt</option>
                      <option value="SYSTEM">System</option>
                    </Select>
                  </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Category</label>
                  <Input name="category" placeholder="e.g., Sales, Support" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Content</label>
                <Textarea
                  name="content"
                  required
                  rows={6}
                  placeholder="Hi {{first_name}}, welcome to our service! Use {{variable}} for dynamic content."
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Use {'{'}{'{'}variable{'}'}{'}'} for dynamic content
                </p>
                <div className="mt-3 border-t pt-3">
                  <p className="text-xs font-medium mb-2">AI SMS Variations</p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Enter a sample SMS and generate 5 variations
                  </p>
                  <div className="flex gap-2">
                    <Input
                      id="sampleSms"
                      placeholder="Enter sample SMS message..."
                      className="flex-1"
                    />
                    <GenerateSmsVariationsButton />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Template Library</CardTitle>
              <CardDescription>
                {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-64"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex gap-2">
            {templateTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedType === type.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type.value)}
              >
                {type.label}
              </Button>
            ))}
          </div>
          <div>
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Loading templates...</p>
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'No templates found' : 'No templates yet'}
                </p>
                {!searchQuery && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Your First Template
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">{template.name}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(template.type)}>
                          {template.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{template.category || '—'}</TableCell>
                      <TableCell className="max-w-xs truncate text-muted-foreground">
                        {template.content.substring(0, 50)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={template.isActive ? 'success' : 'outline'}>
                          {template.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setPreviewTemplate(template.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingTemplate(template.id)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(template.id)}
                            disabled={deleteTemplate.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Template Preview</DialogTitle>
          </DialogHeader>
          {previewTemplate && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {templates?.find((t) => t.id === previewTemplate)?.content}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      {editingTemplate && (
        <Dialog open={!!editingTemplate} onOpenChange={() => setEditingTemplate(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Template</DialogTitle>
              <DialogDescription>
                Update your message template
              </DialogDescription>
            </DialogHeader>
            {editingTemplate && (() => {
              const template = templates?.find((t) => t.id === editingTemplate);
              if (!template) return null;
              
              return (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  try {
                    await updateTemplate.mutateAsync({
                      id: editingTemplate,
                      data: {
                        name: formData.get('name') as string,
                        type: formData.get('type') as 'OUTREACH' | 'REPLY' | 'AI_PROMPT' | 'SYSTEM',
                        category: formData.get('category') as string,
                        content: formData.get('content') as string,
                        isActive: formData.get('isActive') === 'true',
                      },
                    });
                    toast.success('Template updated successfully');
                    setEditingTemplate(null);
                  } catch (error: any) {
                    toast.error(error?.response?.data?.message || 'Failed to update template');
                  }
                }} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Template Name</label>
                    <Input name="name" defaultValue={template.name} required />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Type</label>
                      <Select name="type" defaultValue={template.type} required>
                        <option value="OUTREACH">Outreach</option>
                        <option value="REPLY">Reply</option>
                        <option value="AI_PROMPT">AI Prompt</option>
                        <option value="SYSTEM">System</option>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Category</label>
                      <Input name="category" defaultValue={template.category || ''} placeholder="e.g., Sales, Support" />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Content</label>
                    <Textarea
                      name="content"
                      defaultValue={template.content}
                      required
                      rows={6}
                      placeholder="Hi {{first_name}}, welcome to our service!"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="isActive"
                        value="true"
                        defaultChecked={template.isActive}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm font-medium">Active</span>
                    </label>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditingTemplate(null)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateTemplate.isPending}>
                      {updateTemplate.isPending ? 'Updating...' : 'Update Template'}
                    </Button>
                  </DialogFooter>
                </form>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
        </>
      )}

      {/* Voice Templates Tab */}
      {activeTab === 'voice' && (
        <>
          <div className="flex items-center justify-between">
            <div></div>
            <Dialog open={isCreateVoiceDialogOpen} onOpenChange={setIsCreateVoiceDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Voice Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <CreateVoiceTemplateDialog
                  onClose={() => setIsCreateVoiceDialogOpen(false)}
                  onCreate={async (data) => {
                    try {
                      await createVoiceTemplate.mutateAsync(data);
                      toast.success('Voice template created successfully');
                      setIsCreateVoiceDialogOpen(false);
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || 'Failed to create template');
                    }
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Voice Template Library</CardTitle>
                  <CardDescription>
                    {voiceTemplates.length} voice template{voiceTemplates.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search voice templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {voiceTemplatesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : voiceTemplates.filter((t) =>
                  t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.messageContent.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-12">
                  <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'No voice templates found' : 'No voice templates yet'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsCreateVoiceDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Voice Template
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Filter out journey-specific templates from main list */}
                  {(() => {
                    const journeyTemplates = voiceTemplates.filter((t) => 
                      t.name.includes(' - Day ') && t.name.includes(' Call ')
                    );
                    const regularTemplates = voiceTemplates.filter((t) => 
                      !(t.name.includes(' - Day ') && t.name.includes(' Call '))
                    );
                    
                    // Group journey templates by brand name
                    const journeyGroups: Record<string, typeof journeyTemplates> = {};
                    journeyTemplates.forEach((t) => {
                      const brandName = t.name.split(' - Day ')[0];
                      if (!journeyGroups[brandName]) {
                        journeyGroups[brandName] = [];
                      }
                      journeyGroups[brandName].push(t);
                    });
                    
                    // Sort journey templates within each group
                    Object.keys(journeyGroups).forEach((brand) => {
                      journeyGroups[brand].sort((a, b) => {
                        const aMatch = a.name.match(/Day (\d+) Call (\d+)/);
                        const bMatch = b.name.match(/Day (\d+) Call (\d+)/);
                        if (aMatch && bMatch) {
                          const aDay = parseInt(aMatch[1]);
                          const bDay = parseInt(bMatch[1]);
                          if (aDay !== bDay) return aDay - bDay;
                          return parseInt(aMatch[2]) - parseInt(bMatch[2]);
                        }
                        return a.name.localeCompare(b.name);
                      });
                    });
                    
                    return (
                      <>
                        {/* Regular Templates */}
                        {regularTemplates.filter((t) =>
                          t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.messageContent.toLowerCase().includes(searchQuery.toLowerCase())
                        ).length > 0 ? (
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Regular Voice Templates</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {regularTemplates
                                .filter((t) =>
                                  t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  t.messageContent.toLowerCase().includes(searchQuery.toLowerCase())
                                )
                                .map((template) => (
                                  <Card key={template.id}>
                                    <CardHeader>
                                      <div className="flex items-start justify-between">
                                        <div>
                                          <CardTitle className="text-lg">{template.name}</CardTitle>
                                          {template.description && (
                                            <CardDescription className="mt-1">{template.description}</CardDescription>
                                          )}
                                        </div>
                                        <Badge variant={template.isActive ? 'default' : 'secondary'}>
                                          {template.isActive ? 'Active' : 'Inactive'}
                                        </Badge>
                                      </div>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                      <div>
                                        <p className="text-sm font-medium mb-1">Voice</p>
                                        <p className="text-sm text-muted-foreground">
                                          {template.kokoroVoiceName || template.kokoroVoiceId || template.elevenLabsVoiceName || template.elevenLabsVoiceId}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium mb-1">Variables</p>
                                        <div className="flex flex-wrap gap-1">
                                          {template.variables.length > 0 ? (
                                            template.variables.map((variable: string) => (
                                              <Badge key={variable} variant="outline" className="text-xs">
                                                {`{${variable}}`}
                                              </Badge>
                                            ))
                                          ) : (
                                            <span className="text-xs text-muted-foreground">No variables</span>
                                          )}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium mb-1">Preview</p>
                                        <p className="text-sm text-muted-foreground line-clamp-2">
                                          {template.messageContent}
                                        </p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          </div>
                        ) : null}
                        
                        {/* Journey Templates (Collapsible Groups) */}
                        {Object.keys(journeyGroups).length > 0 ? (
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Journey-Specific Templates</h3>
                            <div className="space-y-4">
                              {Object.entries(journeyGroups)
                                .filter(([brand]) => 
                                  brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                  journeyGroups[brand].some((t) => 
                                    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                    t.messageContent.toLowerCase().includes(searchQuery.toLowerCase())
                                  )
                                )
                                .map(([brand, templates]) => (
                                  <Card key={brand} className="border-2">
                                    <CardHeader>
                                      <CardTitle className="text-base">{brand} Journey Templates</CardTitle>
                                      <CardDescription>{templates.length} template{templates.length !== 1 ? 's' : ''}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {templates
                                          .filter((t) =>
                                            searchQuery === '' ||
                                            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                            t.messageContent.toLowerCase().includes(searchQuery.toLowerCase())
                                          )
                                          .map((template) => (
                                            <Card key={template.id} className="border">
                                              <CardHeader className="pb-2">
                                                <CardTitle className="text-sm">{template.name.replace(`${brand} - `, '')}</CardTitle>
                                                {template.description && (
                                                  <CardDescription className="text-xs mt-1">{template.description}</CardDescription>
                                                )}
                                              </CardHeader>
                                              <CardContent className="space-y-2">
                                                <div>
                                                  <p className="text-xs font-medium mb-1">Variables</p>
                                                  <div className="flex flex-wrap gap-1">
                                                    {template.variables.length > 0 ? (
                                                      template.variables.map((variable: string) => (
                                                        <Badge key={variable} variant="outline" className="text-xs">
                                                          {`{${variable}}`}
                                                        </Badge>
                                                      ))
                                                    ) : (
                                                      <span className="text-xs text-muted-foreground">No variables</span>
                                                    )}
                                                  </div>
                                                </div>
                                                <div>
                                                  <p className="text-xs font-medium mb-1">Preview</p>
                                                  <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {template.messageContent}
                                                  </p>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* AI Messenger Tab */}
      {activeTab === 'ai' && (
        <>
          <div className="flex items-center justify-between">
            <div></div>
            <Dialog open={isCreateAiDialogOpen} onOpenChange={setIsCreateAiDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create AI Messenger
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <CreateAiTemplateDialog
                  onClose={() => setIsCreateAiDialogOpen(false)}
                  onCreate={async (data) => {
                    try {
                      await createAiTemplate.mutateAsync(data);
                      toast.success('AI Messenger template created successfully');
                      setIsCreateAiDialogOpen(false);
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || 'Failed to create template');
                    }
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Messenger Templates</CardTitle>
                  <CardDescription>
                    {aiTemplates.length} AI messenger template{aiTemplates.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search AI templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {aiTemplatesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : aiTemplates.filter((t) =>
                  t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.description?.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'No AI templates found' : 'No AI messenger templates yet'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsCreateAiDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First AI Messenger
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {aiTemplates
                    .filter((t) =>
                      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((template) => (
                      <Card key={template.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{template.name}</CardTitle>
                              {template.description && (
                                <CardDescription className="mt-1">{template.description}</CardDescription>
                              )}
                            </div>
                            <Badge variant={template.isActive ? 'default' : 'secondary'}>
                              {template.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {template.config.businessName && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Business</p>
                              <p className="text-sm">{template.config.businessName}</p>
                            </div>
                          )}
                          {template.config.purpose && template.config.purpose.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Purposes</p>
                              <div className="flex flex-wrap gap-1">
                                {template.config.purpose.map((p: string) => (
                                  <Badge key={p} variant="outline" className="text-xs">
                                    {p.replace(/_/g, ' ')}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                          {template.config.welcomeMessage && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-1">Welcome Message</p>
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {template.config.welcomeMessage}
                              </p>
                            </div>
                          )}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
                            </span>
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingAiTemplate(template.id);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={async () => {
                                  if (confirm('Are you sure you want to delete this template?')) {
                                    try {
                                      await deleteAiTemplate.mutateAsync(template.id);
                                      toast.success('Template deleted');
                                    } catch (error: any) {
                                      toast.error(error?.response?.data?.message || 'Failed to delete');
                                    }
                                  }
                                }}
                                disabled={deleteAiTemplate.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit AI Template Dialog */}
          {editingAiTemplate && (
            <Dialog open={!!editingAiTemplate} onOpenChange={() => setEditingAiTemplate(null)}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                {editingAiTemplate && (() => {
                  const template = aiTemplates.find((t) => t.id === editingAiTemplate);
                  if (!template) return null;
                  
                  return (
                    <EditAiTemplateDialog
                      template={template}
                      onClose={() => setEditingAiTemplate(null)}
                      onUpdate={async (data: Partial<CreateAiTemplateDto>) => {
                        try {
                          await updateAiTemplate.mutateAsync({
                            id: editingAiTemplate,
                            data,
                          });
                          toast.success('AI template updated successfully');
                          setEditingAiTemplate(null);
                        } catch (error: any) {
                          toast.error(error?.response?.data?.message || 'Failed to update template');
                        }
                      }}
                    />
                  );
                })()}
              </DialogContent>
            </Dialog>
          )}
        </>
      )}

      {/* Content AI Tab */}
      {activeTab === 'content-ai' && (
        <>
          <div className="flex items-center justify-between">
            <div></div>
            <Dialog open={isCreateContentAiDialogOpen} onOpenChange={setIsCreateContentAiDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Content AI Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <CreateContentAiTemplateDialog
                  onClose={() => setIsCreateContentAiDialogOpen(false)}
                  onCreate={async (data) => {
                    try {
                      await createContentAiTemplate.mutateAsync(data);
                      toast.success('Content AI template created successfully');
                      setIsCreateContentAiDialogOpen(false);
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || 'Failed to create template');
                    }
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Content AI Templates</CardTitle>
                  <CardDescription>
                    {contentAiTemplates.length} Content AI template{contentAiTemplates.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search Content AI templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 w-64"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {contentAiTemplatesLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                </div>
              ) : contentAiTemplates.filter((t) =>
                  t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.description?.toLowerCase().includes(searchQuery.toLowerCase())
                ).length === 0 ? (
                <div className="text-center py-12">
                  <Wand2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'No Content AI templates found' : 'No Content AI templates yet'}
                  </p>
                  {!searchQuery && (
                    <Button onClick={() => setIsCreateContentAiDialogOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Content AI Template
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {contentAiTemplates
                    .filter((t) =>
                      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      t.description?.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((template) => (
                      <ContentAiTemplateCard
                        key={template.id}
                        template={template}
                        onDelete={async () => {
                          if (confirm('Are you sure you want to delete this template?')) {
                            try {
                              await deleteContentAiTemplate.mutateAsync(template.id);
                              toast.success('Template deleted');
                            } catch (error: any) {
                              toast.error(error?.response?.data?.message || 'Failed to delete');
                            }
                          }
                        }}
                        onPreview={() => setPreviewContentAiTemplate(template.id)}
                        onEdit={() => setEditingContentAiTemplate(template.id)}
                        onGenerateVariations={async () => {
                          // This will be handled by ContentAiTemplateCard component
                        }}
                      />
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview Dialog */}
          <Dialog open={!!previewContentAiTemplate} onOpenChange={() => setPreviewContentAiTemplate(null)}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Content AI Template Preview</DialogTitle>
                <DialogDescription>
                  {previewContentAiTemplate && contentAiTemplates.find((t) => t.id === previewContentAiTemplate)?.name}
                </DialogDescription>
              </DialogHeader>
              {previewContentAiTemplate && (() => {
                const template = contentAiTemplates.find((t) => t.id === previewContentAiTemplate);
                if (!template) return null;
                return (
                  <div className="space-y-6 mt-4">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">SMS Generation</Badge>
                    </div>
                    {template.description && (
                      <div>
                        <p className="text-sm font-medium mb-2">Description</p>
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium mb-3">Example Messages ({template.exampleMessages.length})</p>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {template.exampleMessages.map((msg: string, idx: number) => (
                          <Card key={idx}>
                            <CardContent className="p-3">
                              <p className="text-sm">{msg}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                    {template.generatedVariations && template.generatedVariations.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-3">
                          Generated Variations ({template.generatedVariations.length})
                        </p>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto">
                          {template.generatedVariations.map((variation: string, idx: number) => (
                            <Card key={idx} className="border-primary/20">
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="text-sm flex-1">{variation}</p>
                                  <Badge variant="outline" className="text-xs shrink-0">
                                    {variation.length} chars
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm font-medium mb-2">Creativity</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${template.creativity * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {Math.round(template.creativity * 100)}%
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium mb-2">Settings</p>
                        <div className="space-y-1">
                          {template.unique && (
                            <Badge variant="outline" className="text-xs">
                              Unique Messages Enabled
                            </Badge>
                          )}
                          {template.config?.maxLength && (
                            <p className="text-xs text-muted-foreground">
                              Max Length: {template.config.maxLength} chars
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editingContentAiTemplate} onOpenChange={() => setEditingContentAiTemplate(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              {editingContentAiTemplate && (
                <EditContentAiTemplateDialog
                  template={contentAiTemplates.find((t) => t.id === editingContentAiTemplate)!}
                  onClose={() => setEditingContentAiTemplate(null)}
                  onUpdate={async (data) => {
                    try {
                      await updateContentAiTemplate.mutateAsync({
                        id: editingContentAiTemplate,
                        data,
                      });
                      toast.success('Content AI template updated successfully');
                      setEditingContentAiTemplate(null);
                    } catch (error: any) {
                      toast.error(error?.response?.data?.message || 'Failed to update template');
                    }
                  }}
                />
              )}
            </DialogContent>
          </Dialog>
        </>
      )}

      {/* Voice Studio Tab */}
      {activeTab === 'voice-studio' && (
        <VoiceStudioPage />
      )}

      {/* Journey Templates Tab */}
      {activeTab === 'journey' && (
        <JourneyTemplatesTab
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      )}
    </motion.div>
  );
}

// Journey Templates Tab Component - AI-Powered Step-by-Step Wizard
function JourneyTemplatesTab({
  searchQuery,
  setSearchQuery,
}: {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}) {
  const router = useRouter();
  const [showWizard, setShowWizard] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    industry: '',
    brandName: '',
    totalDays: 15,
    callsPerDay: 2,
    restPeriods: false,
    restPeriodDays: [] as number[],
    includeSms: true,
    marketingAngles: [] as string[], // Support multiple selections
    customMarketingAngle: '', // Custom input
    sentiments: [] as string[], // Support multiple selections
    customSentiment: '', // Custom input
    voiceTemplateId: '',
    voicePresetId: '', // For AI Studio presets
    voiceSelectionMode: 'existing' as 'existing' | 'preset' | 'create', // Track which option is selected
    createNewVoiceTemplate: false, // Flag to show create template dialog
    newVoiceTemplateData: null as CreateVoiceTemplateDto | null, // Data for new template
    numberOfVoices: 1,
    includeContactName: true,
    audioEffects: {
      distance: 'close' as 'close' | 'medium' | 'far',
      backgroundNoise: {
        enabled: false,
        volume: 0.3,
      },
      coughEffects: [],
    },
    previewScript: '', // Store the preview script
    editedScript: '', // Store the edited script
    temperature: 0.7, // AI temperature (0-1)
    journeyName: '', // Journey name
    smsCta: {
      type: 'none' as 'none' | 'event' | 'phone' | 'ai',
      eventTypeId: '',
      phoneNumber: '',
      aiTemplateId: '',
    },
    delayConfig: {
      betweenCalls: [
        { value: 10, unit: 'MINUTES' }, // First delay: 10 minutes
        { value: 30, unit: 'MINUTES' }, // Second delay: 30 minutes
        { value: 1, unit: 'HOURS' },    // Third delay: 1 hour
      ],
      betweenCallAndSms: { value: 1, unit: 'HOURS' }, // Delay before SMS
    },
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationJobId, setGenerationJobId] = useState<string | null>(null);
  const { data: voiceTemplates = [] } = useVoiceTemplates();
  const { data: voicePresets = [] } = useVoicePresets();
  const { data: eventTypes = [] } = useEventTypes();
  const { data: aiTemplates = [] } = useAiTemplates();
  const { data: previousTemplates = [] } = useJourneyTemplates({ category: 'CUSTOM' });
  const generateTemplate = useGenerateAiPoweredJourneyTemplate();
  const generatePreview = useGeneratePreviewScript();
  const createJourney = useCreateJourneyFromTemplate();
  const createVoiceTemplate = useCreateVoiceTemplate();
  const { data: jobStatus } = useGenerationJobStatus(generationJobId);

  const totalSteps = 14; // Added audio effects step

  const handleNext = async () => {
    // If moving to step 13 (preview), generate preview script first
    if (currentStep === 12 && !wizardData.previewScript) {
      try {
        const preview = await generatePreview.mutateAsync({
          industry: wizardData.industry,
          brandName: wizardData.brandName,
          marketingAngle: (wizardData.marketingAngles[0] || 'corporate') as 'corporate' | 'personable' | 'psa',
          sentiment: (wizardData.sentiments[0] || 'kind') as 'kind' | 'caring' | 'concerned' | 'excited',
          voiceTemplateId: wizardData.voiceTemplateId || undefined,
          voicePresetId: wizardData.voicePresetId || undefined,
          includeContactName: wizardData.includeContactName,
        });
        setWizardData(prev => ({
          ...prev,
          previewScript: preview.script,
          editedScript: preview.script, // Initialize edited script with preview
        }));
      } catch (error) {
        // Error handled by mutation hook
        return; // Don't proceed to next step if preview generation fails
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Handle job status updates
  useEffect(() => {
    if (jobStatus) {
      if (jobStatus.progress?.currentStep) {
        setGenerationStatus(jobStatus.progress.currentStep);
      }
      
      if (jobStatus.status === 'COMPLETED' && jobStatus.journeyId) {
        setGenerationStatus('Journey created successfully! Redirecting...');
        setTimeout(() => {
          setShowWizard(false);
          setCurrentStep(1);
          setIsGenerating(false);
          setGenerationStatus('');
          setGenerationJobId(null);
          router.push(`/journeys/${jobStatus.journeyId}/edit`);
        }, 1000);
      } else if (jobStatus.status === 'FAILED') {
        setIsGenerating(false);
        setGenerationStatus('');
        setGenerationJobId(null);
        toast.error(jobStatus.errorMessage || 'Journey generation failed');
      }
    }
  }, [jobStatus, router]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGenerationStatus('Initializing journey generation...');
    
    try {
      // Generate template and create journey automatically
      // Use edited script as reference if available
      const result = await generateTemplate.mutateAsync({
        industry: wizardData.industry,
        brandName: wizardData.brandName,
        totalDays: wizardData.totalDays,
        callsPerDay: wizardData.callsPerDay,
        restPeriodDays: wizardData.restPeriodDays,
        includeSms: wizardData.includeSms,
        marketingAngle: (wizardData.marketingAngles[0] || 'corporate') as 'corporate' | 'personable' | 'psa',
        sentiment: (wizardData.sentiments[0] || 'kind') as 'kind' | 'caring' | 'concerned' | 'excited',
          voiceTemplateId: wizardData.voiceTemplateId || undefined,
          voicePresetId: wizardData.voicePresetId || undefined,
          numberOfVoices: wizardData.numberOfVoices,
          includeContactName: wizardData.includeContactName,
          audioEffects: wizardData.audioEffects,
        referenceScript: wizardData.editedScript || undefined, // Pass edited script as reference
        temperature: wizardData.temperature,
        journeyName: wizardData.journeyName,
        smsCta: wizardData.smsCta,
        delayConfig: {
          betweenCalls: wizardData.delayConfig.betweenCalls.map(d => ({
            value: d.value,
            unit: d.unit as 'MINUTES' | 'HOURS',
          })),
          betweenCallAndSms: {
            value: wizardData.delayConfig.betweenCallAndSms.value,
            unit: wizardData.delayConfig.betweenCallAndSms.unit as 'MINUTES' | 'HOURS',
          },
        },
      });
      
      // Check if result is a job ID (background generation) or direct result
      if ('jobId' in result) {
        // Background generation - start polling
        setGenerationJobId(result.jobId);
        setGenerationStatus('Generation started in background. Processing...');
      } else {
        // Synchronous generation - redirect immediately
        setGenerationStatus('Journey created successfully! Redirecting...');
        setTimeout(() => {
          setShowWizard(false);
          setCurrentStep(1);
          setIsGenerating(false);
          setGenerationStatus('');
          router.push(`/journeys/${result.journey.id}/edit`);
        }, 1000);
      }
    } catch (error: any) {
      setIsGenerating(false);
      setGenerationStatus('');
      setGenerationJobId(null);
      // Error handled by mutation
    }
  };

  // Calculate schedule preview
  const schedulePreview = useMemo(() => {
    const schedule: Array<{ day: number; calls: number; sms: number; rest: boolean }> = [];
    for (let day = 1; day <= wizardData.totalDays; day++) {
      const isRestDay = wizardData.restPeriods && wizardData.restPeriodDays.includes(day);
      schedule.push({
        day,
        calls: isRestDay ? 0 : wizardData.callsPerDay,
        sms: isRestDay ? 0 : (wizardData.includeSms ? 1 : 0),
        rest: isRestDay,
      });
    }
    return schedule;
  }, [wizardData.totalDays, wizardData.callsPerDay, wizardData.restPeriods, wizardData.restPeriodDays, wizardData.includeSms]);

  if (showWizard) {
    return (
      <JourneyWizard
        currentStep={currentStep}
        totalSteps={totalSteps}
        wizardData={wizardData}
        setWizardData={setWizardData}
        voiceTemplates={voiceTemplates}
        voicePresets={voicePresets}
        createVoiceTemplate={createVoiceTemplate}
        eventTypes={eventTypes}
        aiTemplates={aiTemplates}
        schedulePreview={schedulePreview}
        onNext={handleNext}
        onBack={handleBack}
        onGenerate={handleGenerate}
        onClose={() => {
          setShowWizard(false);
          setCurrentStep(1);
          setWizardData({
            industry: '',
            brandName: '',
            totalDays: 15,
            callsPerDay: 2,
            restPeriods: false,
            restPeriodDays: [],
            includeSms: true,
            marketingAngles: [] as string[],
            customMarketingAngle: '',
            sentiments: [] as string[],
            customSentiment: '',
            voiceTemplateId: '',
            voicePresetId: '',
            voiceSelectionMode: 'existing' as 'existing' | 'preset' | 'create',
            createNewVoiceTemplate: false,
            newVoiceTemplateData: null,
            numberOfVoices: 1,
            includeContactName: true,
            audioEffects: {
              distance: 'close' as 'close' | 'medium' | 'far',
              backgroundNoise: {
                enabled: false,
                volume: 0.3,
              },
              coughEffects: [],
            },
            previewScript: '',
            editedScript: '',
            temperature: 0.7,
            journeyName: '',
            smsCta: {
              type: 'none' as 'none' | 'event' | 'phone' | 'ai',
              eventTypeId: '',
              phoneNumber: '',
              aiTemplateId: '',
            },
            delayConfig: {
              betweenCalls: [
                { value: 10, unit: 'MINUTES' },
                { value: 30, unit: 'MINUTES' },
                { value: 1, unit: 'HOURS' },
              ],
              betweenCallAndSms: { value: 1, unit: 'HOURS' },
            },
          });
          setIsGenerating(false);
          setGenerationStatus('');
        }}
        isGenerating={isGenerating || generateTemplate.isPending || generatePreview.isPending}
        generationStatus={generationStatus}
      />
    );
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Journey Templates</h2>
          <p className="text-muted-foreground">Create AI-powered journeys with custom audio and SMS</p>
        </div>
        <Button onClick={() => setShowWizard(true)} size="lg">
          <Wand2 className="mr-2 h-5 w-5" />
          Create AI-Powered Journey
        </Button>
      </div>

      {previousTemplates.filter(t => t.metadata?.generationParams).length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Previously Generated Templates</CardTitle>
            <CardDescription>
              Use a previous template as a starting point for generating a new journey
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {previousTemplates
                .filter(t => t.metadata?.generationParams) // Only show templates with generation params
                .slice(0, 9) // Show up to 9 templates
                .map((template) => {
                  const params = template.metadata?.generationParams;
                  return (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => {
                        // Pre-populate wizard with template data
                        if (params) {
                          setWizardData({
                            industry: params.industry || '',
                            brandName: params.brandName || '',
                            totalDays: params.totalDays || 15,
                            callsPerDay: params.callsPerDay || 2,
                            restPeriods: params.restPeriodDays?.length > 0,
                            restPeriodDays: params.restPeriodDays || [],
                            includeSms: params.includeSms ?? true,
                            marketingAngles: params.marketingAngle ? [params.marketingAngle] : [],
                            customMarketingAngle: '',
                            sentiments: params.sentiment ? [params.sentiment] : [],
                            customSentiment: '',
                            voiceTemplateId: params.voiceTemplateId || '',
                            voicePresetId: params.voicePresetId || '',
                            voiceSelectionMode: params.voicePresetId ? 'preset' : (params.voiceTemplateId ? 'existing' : 'existing'),
                            createNewVoiceTemplate: false,
                            newVoiceTemplateData: null,
                            numberOfVoices: params.numberOfVoices || 1,
                            includeContactName: params.includeContactName ?? true,
                            audioEffects: params.audioEffects || {
                              distance: 'close',
                              backgroundNoise: { enabled: false, volume: 0.3 },
                              coughEffects: [],
                            },
                            previewScript: '',
                            editedScript: '',
                            temperature: params.temperature || 0.7,
                            journeyName: '',
                            smsCta: params.smsCta || {
                              type: 'none',
                              eventTypeId: '',
                              phoneNumber: '',
                              aiTemplateId: '',
                            },
                            delayConfig: params.delayConfig || {
                              betweenCalls: [
                                { value: 10, unit: 'MINUTES' },
                                { value: 30, unit: 'MINUTES' },
                                { value: 1, unit: 'HOURS' },
                              ],
                              betweenCallAndSms: { value: 1, unit: 'HOURS' },
                            },
                          });
                          setShowWizard(true);
                          setCurrentStep(1);
                        }
                      }}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{template.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {params?.totalDays || 'N/A'} days
                          </Badge>
                        </div>
                        <CardDescription className="text-xs mt-1">
                          {params?.industry && (
                            <span className="inline-block mr-2">
                              {params.industry}
                            </span>
                          )}
                          {params?.marketingAngle && (
                            <span className="inline-block mr-2 text-muted-foreground">
                              • {params.marketingAngle}
                            </span>
                          )}
                          {params?.sentiment && (
                            <span className="inline-block text-muted-foreground">
                              • {params.sentiment}
                            </span>
                          )}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-xs text-muted-foreground space-y-1">
                          {params?.callsPerDay && (
                            <div>{params.callsPerDay} calls/day</div>
                          )}
                          {params?.includeSms && (
                            <div>Includes SMS</div>
                          )}
                          {template.usageCount > 0 && (
                            <div className="text-xs text-muted-foreground mt-2">
                              Used {template.usageCount} time{template.usageCount !== 1 ? 's' : ''}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Create New Template</CardTitle>
          <CardDescription>Start from scratch with the AI-powered journey wizard</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              Use the button above to create a new AI-powered journey template
            </p>
            <Button onClick={() => setShowWizard(true)} size="lg" variant="outline">
              <Wand2 className="mr-2 h-5 w-5" />
              Start New Journey Template
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// Journey Wizard Component
function JourneyWizard({
  currentStep,
  totalSteps,
  wizardData,
  setWizardData,
  voiceTemplates,
  voicePresets,
  createVoiceTemplate,
  eventTypes,
  aiTemplates,
  schedulePreview,
  onNext,
  onBack,
  onGenerate,
  onClose,
  isGenerating,
  generationStatus,
}: {
  currentStep: number;
  totalSteps: number;
  wizardData: any;
  setWizardData: (data: any) => void;
  voiceTemplates: any[];
  voicePresets: any[];
  createVoiceTemplate: any;
  eventTypes: any[];
  aiTemplates: any[];
  schedulePreview: Array<{ day: number; calls: number; sms: number; rest: boolean }>;
  onNext: () => void | Promise<void>;
  onBack: () => void;
  onGenerate: () => void;
  onClose: () => void;
  isGenerating: boolean;
  generationStatus: string;
}) {
  const [showCreateVoiceDialog, setShowCreateVoiceDialog] = useState(false);
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return wizardData.industry && wizardData.brandName;
      case 2:
        return wizardData.totalDays > 0 && wizardData.callsPerDay > 0;
      case 3:
        return true; // CTA step, always can proceed
      case 4:
        return true; // Preview step, always can proceed
      case 5:
        return true; // Delay config step, always can proceed
      case 6:
        return wizardData.marketingAngles.length > 0;
      case 7:
        return wizardData.sentiments.length > 0;
      case 8:
        return true; // Temperature step, always can proceed
      case 9:
        if (wizardData.voiceSelectionMode === 'existing') {
          return !!wizardData.voiceTemplateId;
        } else if (wizardData.voiceSelectionMode === 'preset') {
          return !!wizardData.voicePresetId;
        } else if (wizardData.voiceSelectionMode === 'create') {
          return !!wizardData.newVoiceTemplateData && !!wizardData.voiceTemplateId;
        }
        return false;
      case 10:
        return true; // Audio effects step, always can proceed
      case 11:
        return wizardData.numberOfVoices >= 1 && wizardData.numberOfVoices <= 2;
      case 12:
        return true; // Yes/No question, always can proceed
      case 13:
        return !!wizardData.editedScript; // Preview/edit step - must have edited script
      case 14:
        return !!wizardData.journeyName?.trim(); // Generate step - must have journey name
      default:
        return false;
    }
  };

  return (
    <>
      {/* Loading Overlay */}
      {isGenerating && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop with fade */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          {/* Loading Content */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative z-10 bg-card border-2 border-primary/20 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4"
          >
            <div className="text-center space-y-6">
              {/* Animated Spinner */}
              <div className="flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full"
                />
              </div>
              
              {/* Status Text */}
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  Creating Your Journey
                </h3>
                <motion.p
                  key={generationStatus}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-muted-foreground min-h-[24px]"
                >
                  {generationStatus || 'Please wait while we generate your journey...'}
                </motion.p>
              </div>
              
              {/* Progress Dots */}
              <div className="flex justify-center gap-2">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.2,
                    }}
                    className="w-2 h-2 bg-primary rounded-full"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: isGenerating ? 0.3 : 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className={`min-h-screen bg-gradient-to-br from-background via-background to-muted/20 p-8 ${isGenerating ? 'pointer-events-none' : ''}`}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="max-w-4xl mx-auto shadow-2xl border-2">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b">
            <div className="flex items-center justify-between">
              <motion.div
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <CardTitle className="text-2xl">Create AI-Powered Journey</CardTitle>
                <CardDescription className="text-base mt-1">Step {currentStep} of {totalSteps}</CardDescription>
              </motion.div>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
              >
                <Button variant="ghost" onClick={onClose} className="rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
            <div className="mt-6">
              <div className="flex gap-2">
                {Array.from({ length: totalSteps }).map((_, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.5, delay: idx * 0.05 }}
                    className={`h-2 rounded-full ${
                      idx + 1 <= currentStep ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="min-h-[500px] p-8">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
            >
          {/* Step 1: Industry and Brand Name */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Tell us about your business</h3>
                <p className="text-muted-foreground mb-2">We&apos;ll use this to personalize your journey content</p>
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                        <Rocket className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Getting Started
                        </p>
                        <p className="text-xs text-blue-800 dark:text-blue-200">
                          Provide your industry and brand name so our AI can generate content that matches your business style and tone. This information helps create more relevant and personalized messages for your contacts.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">What industry are you in?</label>
                <Input
                  value={wizardData.industry}
                  onChange={(e) => setWizardData({ ...wizardData, industry: e.target.value })}
                  placeholder="e.g., Healthcare, Real Estate, E-commerce"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Marketing Brand Name</label>
                <Input
                  value={wizardData.brandName}
                  onChange={(e) => setWizardData({ ...wizardData, brandName: e.target.value })}
                  placeholder="Your brand or company name"
                />
              </div>
            </div>
          )}

          {/* Step 2: Journey Details */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Journey Details</h3>
                <p className="text-muted-foreground mb-2">Configure the structure of your journey</p>
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                        <Workflow className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Journey Structure Guide
                        </p>
                        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                          <li><strong>Total Days:</strong> How long your journey will run (typically 7-30 days)</li>
                          <li><strong>Calls Per Day:</strong> Number of voice calls to make each active day</li>
                          <li><strong>Rest Periods:</strong> Optional days when no calls are made (e.g., weekends)</li>
                          <li><strong>SMS Messages:</strong> Include text messages alongside voice calls for better engagement</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">How many days is this journey?</label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={wizardData.totalDays}
                  onChange={(e) => setWizardData({ ...wizardData, totalDays: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">How many calls on average per day?</label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={wizardData.callsPerDay}
                  onChange={(e) => setWizardData({ ...wizardData, callsPerDay: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Would you like any rest periods?</label>
                <div className="flex items-center gap-4">
                  <Button
                    variant={wizardData.restPeriods ? 'default' : 'outline'}
                    onClick={() => setWizardData({ ...wizardData, restPeriods: !wizardData.restPeriods })}
                  >
                    {wizardData.restPeriods ? 'Yes' : 'No'}
                  </Button>
                </div>
                {wizardData.restPeriods && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Select rest days (e.g., weekends)</label>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: wizardData.totalDays }).map((_, idx) => {
                        const day = idx + 1;
                        const isSelected = wizardData.restPeriodDays.includes(day);
                        return (
                          <Button
                            key={day}
                            variant={isSelected ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              const newDays = isSelected
                                ? wizardData.restPeriodDays.filter((d: number) => d !== day)
                                : [...wizardData.restPeriodDays, day];
                              setWizardData({ ...wizardData, restPeriodDays: newDays });
                            }}
                          >
                            Day {day}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Add SMS messages?</label>
                <div className="flex items-center gap-4">
                  <Button
                    variant={wizardData.includeSms ? 'default' : 'outline'}
                    onClick={() => setWizardData({ ...wizardData, includeSms: !wizardData.includeSms })}
                  >
                    {wizardData.includeSms ? 'Yes' : 'No'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: SMS Call To Action */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">SMS Call To Action</h3>
                <p className="text-muted-foreground mb-6">Choose what action recipients can take when they receive your SMS messages</p>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Card
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                      wizardData.smsCta.type === 'none'
                        ? 'border-primary border-2 shadow-md bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setWizardData({ ...wizardData, smsCta: { type: 'none', eventTypeId: '', phoneNumber: '', aiTemplateId: '' } })}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl mb-2">📱</div>
                      <div className="text-sm font-medium mb-1">No CTA</div>
                      <div className="text-xs text-muted-foreground">Just informational messages</div>
                    </CardContent>
                  </Card>
                  
                  <Card
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                      wizardData.smsCta.type === 'event'
                        ? 'border-primary border-2 shadow-md bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setWizardData({ ...wizardData, smsCta: { ...wizardData.smsCta, type: 'event' } })}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl mb-2">📅</div>
                      <div className="text-sm font-medium mb-1">Schedule Event</div>
                      <div className="text-xs text-muted-foreground">Include booking link</div>
                    </CardContent>
                  </Card>
                  
                  <Card
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                      wizardData.smsCta.type === 'phone'
                        ? 'border-primary border-2 shadow-md bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setWizardData({ ...wizardData, smsCta: { ...wizardData.smsCta, type: 'phone' } })}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl mb-2">☎️</div>
                      <div className="text-sm font-medium mb-1">Phone Number</div>
                      <div className="text-xs text-muted-foreground">Call to action</div>
                    </CardContent>
                  </Card>
                  
                  <Card
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                      wizardData.smsCta.type === 'ai'
                        ? 'border-primary border-2 shadow-md bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setWizardData({ ...wizardData, smsCta: { ...wizardData.smsCta, type: 'ai' } })}
                  >
                    <CardContent className="p-6 text-center">
                      <div className="text-2xl mb-2">🤖</div>
                      <div className="text-sm font-medium mb-1">AI Messenger</div>
                      <div className="text-xs text-muted-foreground">Enable AI replies</div>
                    </CardContent>
                  </Card>
                </div>
                
                {wizardData.smsCta.type === 'event' && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Select Event Type</label>
                    <select
                      value={wizardData.smsCta.eventTypeId}
                      onChange={(e) => setWizardData({ ...wizardData, smsCta: { ...wizardData.smsCta, eventTypeId: e.target.value } })}
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
                    <p className="text-xs text-muted-foreground mt-1">
                      Recipients will receive a booking link in their SMS messages
                    </p>
                  </div>
                )}
                
                {wizardData.smsCta.type === 'phone' && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">Phone Number</label>
                    <Input
                      value={wizardData.smsCta.phoneNumber}
                      onChange={(e) => setWizardData({ ...wizardData, smsCta: { ...wizardData.smsCta, phoneNumber: e.target.value } })}
                      placeholder="e.g., (555) 123-4567"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This phone number will be included in SMS messages as a call-to-action
                    </p>
                  </div>
                )}
                
                {wizardData.smsCta.type === 'ai' && (
                  <div className="mt-4">
                    <label className="text-sm font-medium mb-2 block">AI Template</label>
                    <select
                      value={wizardData.smsCta.aiTemplateId}
                      onChange={(e) => setWizardData({ ...wizardData, smsCta: { ...wizardData.smsCta, aiTemplateId: e.target.value } })}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select an AI template...</option>
                      {aiTemplates
                        .filter((t) => t.isActive)
                        .map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recipients can reply to SMS messages and receive AI-powered responses
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Schedule Preview */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Schedule Preview</h3>
                <p className="text-muted-foreground mb-6">Here&apos;s what your journey will look like</p>
              </div>
              <div className="grid grid-cols-7 gap-2 max-h-[400px] overflow-y-auto">
                {schedulePreview.map((item) => (
                  <Card key={item.day} className={`p-3 ${item.rest ? 'bg-muted' : ''}`}>
                    <div className="text-sm font-medium mb-2">Day {item.day}</div>
                    {item.rest ? (
                      <Badge variant="secondary">Rest</Badge>
                    ) : (
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {item.calls} call{item.calls !== 1 ? 's' : ''}
                        </div>
                        {item.sms > 0 && (
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {item.sms} SMS
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 5: Delay Configuration */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Time Between Actions</h3>
                <p className="text-muted-foreground mb-6">Configure delays between calls on the same day</p>
              </div>
              <Card>
                <CardContent className="p-6 space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-4 block">Delays Between Calls (Day 1 example)</label>
                    <div className="space-y-4">
                      {wizardData.delayConfig.betweenCalls.map((delay: { value: number; unit: 'MINUTES' | 'HOURS' }, index: number) => (
                        <div key={index} className="flex items-center gap-4">
                          <div className="flex-1">
                            <label className="text-xs text-muted-foreground mb-1 block">
                              Delay {index + 1} (after call {index + 1})
                            </label>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                min="1"
                                value={delay.value}
                                onChange={(e) => {
                                  const newDelays = [...wizardData.delayConfig.betweenCalls];
                                  newDelays[index] = { ...delay, value: parseInt(e.target.value) || 1 };
                                  setWizardData({
                                    ...wizardData,
                                    delayConfig: { ...wizardData.delayConfig, betweenCalls: newDelays },
                                  });
                                }}
                                className="w-24"
                              />
                              <select
                                value={delay.unit}
                                onChange={(e) => {
                                  const newDelays = [...wizardData.delayConfig.betweenCalls];
                                  newDelays[index] = { ...delay, unit: e.target.value as 'MINUTES' | 'HOURS' };
                                  setWizardData({
                                    ...wizardData,
                                    delayConfig: { ...wizardData.delayConfig, betweenCalls: newDelays },
                                  });
                                }}
                                className="px-3 py-2 border rounded-md"
                              >
                                <option value="MINUTES">Minutes</option>
                                <option value="HOURS">Hours</option>
                              </select>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">
                      Example: Day 1 with 3 calls = 10 min delay, then 30 min delay, then 1 hour delay
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Delay Before SMS (after last call)</label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={wizardData.delayConfig.betweenCallAndSms.value}
                        onChange={(e) => {
                          setWizardData({
                            ...wizardData,
                            delayConfig: {
                              ...wizardData.delayConfig,
                              betweenCallAndSms: {
                                ...wizardData.delayConfig.betweenCallAndSms,
                                value: parseInt(e.target.value) || 1,
                              },
                            },
                          });
                        }}
                        className="w-24"
                      />
                      <select
                        value={wizardData.delayConfig.betweenCallAndSms.unit}
                        onChange={(e) => {
                          setWizardData({
                            ...wizardData,
                            delayConfig: {
                              ...wizardData.delayConfig,
                              betweenCallAndSms: {
                                ...wizardData.delayConfig.betweenCallAndSms,
                                unit: e.target.value as 'MINUTES' | 'HOURS',
                              },
                            },
                          });
                        }}
                        className="px-3 py-2 border rounded-md"
                      >
                        <option value="MINUTES">Minutes</option>
                        <option value="HOURS">Hours</option>
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Step 6: Marketing Angle */}
          {currentStep === 6 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-semibold mb-2">Marketing Angle</h3>
                <p className="text-muted-foreground mb-6">Select one or more styles for your messaging (you can select multiple)</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-2">
                {MARKETING_ANGLES.map((angle, index) => {
                  const isSelected = wizardData.marketingAngles.includes(angle.value);
                  return (
                    <motion.div
                      key={angle.value}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                          isSelected
                            ? 'border-primary border-2 shadow-md bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          const newAngles = isSelected
                            ? wizardData.marketingAngles.filter((a: string) => a !== angle.value)
                            : [...wizardData.marketingAngles, angle.value];
                          setWizardData({ ...wizardData, marketingAngles: newAngles });
                        }}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl mb-2">{angle.icon}</div>
                          <div className="text-sm font-medium mb-1">{angle.label}</div>
                          <div className="text-xs text-muted-foreground">{angle.description}</div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="mt-2"
                            >
                              <Badge variant="default" className="text-xs">Selected</Badge>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm font-medium mb-2 block">Or add a custom marketing angle:</label>
                <div className="flex gap-2">
                  <Input
                    value={wizardData.customMarketingAngle}
                    onChange={(e) => setWizardData({ ...wizardData, customMarketingAngle: e.target.value })}
                    placeholder="e.g., Playful, Serious, Inspirational"
                    className="flex-1"
                  />
                  {wizardData.customMarketingAngle && (
                    <Button
                      onClick={() => {
                        if (wizardData.customMarketingAngle && !wizardData.marketingAngles.includes(wizardData.customMarketingAngle.toLowerCase())) {
                          setWizardData({
                            ...wizardData,
                            marketingAngles: [...wizardData.marketingAngles, wizardData.customMarketingAngle.toLowerCase()],
                            customMarketingAngle: '',
                          });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {wizardData.marketingAngles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2 mt-4"
                >
                  {wizardData.marketingAngles.map((angle: string) => (
                    <Badge
                      key={angle}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onClick={() => {
                        setWizardData({
                          ...wizardData,
                          marketingAngles: wizardData.marketingAngles.filter((a: string) => a !== angle),
                        });
                      }}
                    >
                      {angle}
                      <XIcon className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 7: Sentiment */}
          {currentStep === 7 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h3 className="text-xl font-semibold mb-2">Sentiment</h3>
                <p className="text-muted-foreground mb-6">Select one or more emotional tones (you can select multiple)</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[500px] overflow-y-auto pr-2">
                {SENTIMENTS.map((sentiment, index) => {
                  const isSelected = wizardData.sentiments.includes(sentiment.value);
                  return (
                    <motion.div
                      key={sentiment.value}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.02 }}
                    >
                      <Card
                        className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                          isSelected
                            ? 'border-primary border-2 shadow-md bg-primary/5'
                            : 'border-border hover:border-primary/50'
                        }`}
                        onClick={() => {
                          const newSentiments = isSelected
                            ? wizardData.sentiments.filter((s: string) => s !== sentiment.value)
                            : [...wizardData.sentiments, sentiment.value];
                          setWizardData({ ...wizardData, sentiments: newSentiments });
                        }}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="text-2xl mb-2">{sentiment.icon}</div>
                          <div className="text-sm font-medium mb-1">{sentiment.label}</div>
                          <div className="text-xs text-muted-foreground">{sentiment.description}</div>
                          {isSelected && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="mt-2"
                            >
                              <Badge variant="default" className="text-xs">Selected</Badge>
                            </motion.div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm font-medium mb-2 block">Or add a custom sentiment:</label>
                <div className="flex gap-2">
                  <Input
                    value={wizardData.customSentiment}
                    onChange={(e) => setWizardData({ ...wizardData, customSentiment: e.target.value })}
                    placeholder="e.g., Mysterious, Bold, Gentle"
                    className="flex-1"
                  />
                  {wizardData.customSentiment && (
                    <Button
                      onClick={() => {
                        if (wizardData.customSentiment && !wizardData.sentiments.includes(wizardData.customSentiment.toLowerCase())) {
                          setWizardData({
                            ...wizardData,
                            sentiments: [...wizardData.sentiments, wizardData.customSentiment.toLowerCase()],
                            customSentiment: '',
                          });
                        }
                      }}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {wizardData.sentiments.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap gap-2 mt-4"
                >
                  {wizardData.sentiments.map((sentiment: string) => (
                    <Badge
                      key={sentiment}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                      onClick={() => {
                        setWizardData({
                          ...wizardData,
                          sentiments: wizardData.sentiments.filter((s: string) => s !== sentiment),
                        });
                      }}
                    >
                      {sentiment}
                      <XIcon className="h-3 w-3 ml-1" />
                    </Badge>
                  ))}
                </motion.div>
              )}
            </motion.div>
          )}

          {/* Step 8: Temperature */}
          {currentStep === 8 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">AI Creativity Level</h3>
                <p className="text-muted-foreground mb-6">Adjust how creative the AI should be when generating content (0.0 = more consistent, 1.0 = more creative)</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Temperature: {wizardData.temperature.toFixed(1)}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={wizardData.temperature}
                    onChange={(e) => setWizardData({ ...wizardData, temperature: parseFloat(e.target.value) })}
                    className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>More Consistent (0.0)</span>
                    <span>More Creative (1.0)</span>
                  </div>
                </div>
                <div className="mt-6">
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        <strong>Lower values (0.0-0.5):</strong> More predictable, consistent content that follows patterns closely.
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        <strong>Higher values (0.6-1.0):</strong> More varied, creative content with greater diversity in messaging.
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          )}

          {/* Step 9: Voice Template */}
          {currentStep === 9 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Voice Template</h3>
                <p className="text-muted-foreground mb-2">
                  Choose how you want to handle voice for your journey. You can use an existing template, select from AI Studio presets, or create a new one.
                </p>
                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 mt-4">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-blue-600 dark:text-blue-400 mt-0.5">
                        <HeadphonesIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Quick Guide: Choosing Your Voice
                        </p>
                        <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                          <li><strong>Existing Template:</strong> Use a voice template you&apos;ve already created</li>
                          <li><strong>AI Studio Preset:</strong> Choose from pre-configured voice presets with optimized settings</li>
                          <li><strong>Create New:</strong> Build a custom voice template with your preferred voice and settings</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Option Selection */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                    wizardData.voiceSelectionMode === 'existing'
                      ? 'border-primary border-2 shadow-md bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setWizardData({ 
                    ...wizardData, 
                    voiceSelectionMode: 'existing',
                    voicePresetId: '',
                    createNewVoiceTemplate: false,
                    newVoiceTemplateData: null
                  })}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl mb-2">📋</div>
                    <div className="text-sm font-medium mb-1">Existing Template</div>
                    <div className="text-xs text-muted-foreground">Use a saved template</div>
                  </CardContent>
                </Card>
                
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                    wizardData.voiceSelectionMode === 'preset'
                      ? 'border-primary border-2 shadow-md bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setWizardData({ 
                    ...wizardData, 
                    voiceSelectionMode: 'preset',
                    voiceTemplateId: '',
                    createNewVoiceTemplate: false,
                    newVoiceTemplateData: null
                  })}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl mb-2">✨</div>
                    <div className="text-sm font-medium mb-1">AI Studio Preset</div>
                    <div className="text-xs text-muted-foreground">Pre-configured voices</div>
                  </CardContent>
                </Card>
                
                <Card
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${
                    wizardData.voiceSelectionMode === 'create'
                      ? 'border-primary border-2 shadow-md bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setWizardData({ 
                    ...wizardData, 
                    voiceSelectionMode: 'create',
                    voiceTemplateId: '',
                    voicePresetId: ''
                  })}
                >
                  <CardContent className="p-6 text-center">
                    <div className="text-3xl mb-2">➕</div>
                    <div className="text-sm font-medium mb-1">Create New</div>
                    <div className="text-xs text-muted-foreground">Build custom template</div>
                  </CardContent>
                </Card>
              </div>

              {/* Existing Template Selection */}
              {wizardData.voiceSelectionMode === 'existing' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select Existing Voice Template</label>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {voiceTemplates
                        .filter(t => t.isActive)
                        .filter(t => !(t.name.includes(' - Day ') && t.name.includes(' Call ')))
                        .map((template) => (
                        <Card
                          key={template.id}
                          className={`cursor-pointer hover:border-primary transition-colors ${
                            wizardData.voiceTemplateId === template.id ? 'border-primary border-2' : ''
                          }`}
                          onClick={() => setWizardData({ 
                            ...wizardData, 
                            voiceTemplateId: template.id,
                            voicePresetId: '',
                            createNewVoiceTemplate: false,
                            voiceSelectionMode: 'existing',
                            newVoiceTemplateData: null
                          })}
                        >
                          <CardContent className="p-4">
                            <div className="font-medium">{template.name}</div>
                            {template.description && (
                              <div className="text-sm text-muted-foreground mt-1">{template.description}</div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      {voiceTemplates.filter(t => t.isActive && !(t.name.includes(' - Day ') && t.name.includes(' Call '))).length === 0 && (
                        <Card className="border-dashed">
                          <CardContent className="p-6 text-center text-muted-foreground">
                            <p className="text-sm">No voice templates available. Create one or use an AI Studio preset.</p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Voice Preset Selection */}
              {wizardData.voiceSelectionMode === 'preset' ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Select AI Studio Voice Preset</label>
                    <Select
                      value={wizardData.voicePresetId || ''}
                      onChange={(e) => setWizardData({ 
                        ...wizardData, 
                        voicePresetId: e.target.value,
                        voiceTemplateId: '',
                        createNewVoiceTemplate: false,
                        voiceSelectionMode: 'preset',
                        newVoiceTemplateData: null
                      })}
                    >
                      <option value="">Select a preset...</option>
                      {voicePresets
                        .filter((p: any) => p.isActive)
                        .map((preset: any) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.name} {preset.isDefault && '⭐'}
                          </option>
                        ))}
                    </Select>
                    {wizardData.voicePresetId && (
                      <Card className="mt-3 bg-muted/50">
                        <CardContent className="p-4">
                          {(() => {
                            const selectedPreset = voicePresets.find((p: any) => p.id === wizardData.voicePresetId);
                            return selectedPreset ? (
                              <div>
                                <p className="font-medium text-sm">{selectedPreset.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Voice: {selectedPreset.kokoroVoiceName || selectedPreset.kokoroVoiceId}
                                </p>
                                {selectedPreset.tags && selectedPreset.tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {selectedPreset.tags.map((tag: string) => (
                                      <Badge key={tag} variant="outline" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : null;
                          })()}
                        </CardContent>
                      </Card>
                    )}
                    {voicePresets.filter((p: any) => p.isActive).length === 0 && (
                      <Card className="border-dashed mt-3">
                        <CardContent className="p-6 text-center text-muted-foreground">
                          <p className="text-sm">No voice presets available. Create one in Voice Studio or use an existing template.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </div>
              ) : null}

              {/* Create New Template */}
              {wizardData.voiceSelectionMode === 'create' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Create New Voice Template</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateVoiceDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Open Template Builder
                    </Button>
                  </div>
                  {wizardData.newVoiceTemplateData ? (
                    <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-green-900 dark:text-green-100">
                              {wizardData.newVoiceTemplateData.name}
                            </p>
                            <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                              Template ready to use
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setWizardData({ 
                              ...wizardData, 
                              newVoiceTemplateData: null 
                            })}
                          >
                            <XIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-4">
                          Click &quot;Open Template Builder&quot; to create a new voice template with your preferred voice and settings.
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Create Voice Template Dialog */}
              <Dialog open={showCreateVoiceDialog} onOpenChange={setShowCreateVoiceDialog}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <CreateVoiceTemplateDialog
                    onClose={() => setShowCreateVoiceDialog(false)}
                    onCreate={async (data) => {
                      try {
                        const created = await createVoiceTemplate.mutateAsync(data);
                        toast.success('Voice template created successfully');
                        setWizardData({ 
                          ...wizardData, 
                          newVoiceTemplateData: data,
                          voiceTemplateId: created.id, // Use the created template ID
                          createNewVoiceTemplate: true,
                          voiceSelectionMode: 'create',
                          voicePresetId: '' // Clear preset ID when using created template
                        });
                        setShowCreateVoiceDialog(false);
                      } catch (error: any) {
                        toast.error(error?.response?.data?.message || 'Failed to create template');
                      }
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}

          {/* Step 10: Audio Effects */}
          {currentStep === 10 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Audio Effects</h3>
                <p className="text-muted-foreground mb-6">Configure audio effects for your voice messages (optional)</p>
              </div>
              
              <div className="space-y-4">
                {/* Distance */}
                <div>
                  <label className="text-sm font-medium mb-2 block">Distance</label>
                  <Select
                    value={wizardData.audioEffects?.distance || 'close'}
                    onChange={(e) =>
                      setWizardData({
                        ...wizardData,
                        audioEffects: {
                          ...wizardData.audioEffects,
                          distance: e.target.value as 'close' | 'medium' | 'far',
                        },
                      })
                    }
                  >
                    <option value="close">Close</option>
                    <option value="medium">Medium</option>
                    <option value="far">Far</option>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adjust the perceived distance of the voice
                  </p>
                </div>

                {/* Background Noise */}
                <div className="border-t pt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="checkbox"
                      checked={wizardData.audioEffects?.backgroundNoise?.enabled || false}
                      onChange={(e) =>
                        setWizardData({
                          ...wizardData,
                          audioEffects: {
                            ...wizardData.audioEffects,
                            backgroundNoise: {
                              enabled: e.target.checked,
                              volume: wizardData.audioEffects?.backgroundNoise?.volume || 0.3,
                            },
                          },
                        })
                      }
                      className="rounded"
                    />
                    <label className="text-sm font-medium">Enable Background Noise</label>
                  </div>

                  {wizardData.audioEffects?.backgroundNoise?.enabled && (
                    <div className="space-y-4 pl-6 border-l-2">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Background Noise Volume ({wizardData.audioEffects?.backgroundNoise?.volume || 0.3})
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={wizardData.audioEffects?.backgroundNoise?.volume || 0.3}
                          onChange={(e) =>
                            setWizardData({
                              ...wizardData,
                              audioEffects: {
                                ...wizardData.audioEffects,
                                backgroundNoise: {
                                  enabled: true,
                                  volume: parseFloat(e.target.value),
                                },
                              },
                            })
                          }
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Cough Effects */}
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-3">Cough Effects</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Add cough sound effects at specific timestamps in your audio
                  </p>
                  <div className="space-y-2">
                    {(wizardData.audioEffects?.coughEffects || []).map((cough: any, index: number) => (
                      <div key={index} className="flex items-center gap-2 p-2 border rounded">
                        <Select
                          value={cough.file}
                          onChange={(e) => {
                            const updated = [...(wizardData.audioEffects?.coughEffects || [])];
                            updated[index] = { ...updated[index], file: e.target.value as any };
                            setWizardData({
                              ...wizardData,
                              audioEffects: {
                                ...wizardData.audioEffects,
                                coughEffects: updated,
                              },
                            });
                          }}
                        >
                          <option value="stifled-cough">Stifled Cough</option>
                          <option value="coughing-woman">Coughing Woman</option>
                          <option value="coughing-woman-2">Coughing Woman 2</option>
                        </Select>
                        <Input
                          type="number"
                          placeholder="Timestamp (seconds)"
                          value={cough.timestamp}
                          onChange={(e) => {
                            const updated = [...(wizardData.audioEffects?.coughEffects || [])];
                            updated[index] = { ...updated[index], timestamp: parseFloat(e.target.value) || 0 };
                            setWizardData({
                              ...wizardData,
                              audioEffects: {
                                ...wizardData.audioEffects,
                                coughEffects: updated,
                              },
                            });
                          }}
                          className="w-32"
                        />
                        <Input
                          type="number"
                          placeholder="Volume (0-1)"
                          min="0"
                          max="1"
                          step="0.1"
                          value={cough.volume || 0.5}
                          onChange={(e) => {
                            const updated = [...(wizardData.audioEffects?.coughEffects || [])];
                            updated[index] = { ...updated[index], volume: parseFloat(e.target.value) || 0.5 };
                            setWizardData({
                              ...wizardData,
                              audioEffects: {
                                ...wizardData.audioEffects,
                                coughEffects: updated,
                              },
                            });
                          }}
                          className="w-32"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = (wizardData.audioEffects?.coughEffects || []).filter((_: any, i: number) => i !== index);
                            setWizardData({
                              ...wizardData,
                              audioEffects: {
                                ...wizardData.audioEffects,
                                coughEffects: updated,
                              },
                            });
                          }}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setWizardData({
                          ...wizardData,
                          audioEffects: {
                            ...wizardData.audioEffects,
                            coughEffects: [
                              ...(wizardData.audioEffects?.coughEffects || []),
                              { file: 'stifled-cough', timestamp: 0, volume: 0.5 },
                            ],
                          },
                        });
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Cough Effect
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 11: Number of Voices */}
          {currentStep === 11 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Number of Voices</h3>
                <p className="text-muted-foreground mb-6">How many different voices should your contact interact with? Typical is 1-2</p>
              </div>
              <div className="flex gap-4 justify-center">
                {[1, 2].map((num) => (
                  <Card
                    key={num}
                    className={`cursor-pointer hover:border-primary transition-colors ${
                      wizardData.numberOfVoices === num ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => setWizardData({ ...wizardData, numberOfVoices: num })}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="text-3xl font-bold">{num}</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {num === 1 ? 'Single Voice' : 'Two Voices'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 12: Include Contact Name */}
          {currentStep === 12 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Personalization</h3>
                <p className="text-muted-foreground mb-6">Should we include the contact&apos;s name in messages?</p>
              </div>
              <div className="flex gap-4 justify-center">
                {[true, false].map((include) => (
                  <Card
                    key={String(include)}
                    className={`cursor-pointer hover:border-primary transition-colors ${
                      wizardData.includeContactName === include ? 'border-primary border-2' : ''
                    }`}
                    onClick={() => setWizardData({ ...wizardData, includeContactName: include })}
                  >
                    <CardContent className="p-8 text-center">
                      <div className="text-lg font-medium">{include ? 'Yes' : 'No'}</div>
                      <div className="text-sm text-muted-foreground mt-2">
                        {include ? 'Include name' : 'Generic messages'}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Step 13: Preview/Edit Script */}
          {currentStep === 13 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Preview & Edit Script</h3>
                <p className="text-muted-foreground mb-6">
                  Review and edit the preview script for Day 1, Call 1. Your edits will guide the AI in generating all remaining scripts.
                </p>
              </div>
              <GuideCard
                title="Script Editing Tips"
                icon={FileText}
                tips={[
                  'This preview script represents Day 1, Call 1 of your journey. The AI will use your edits as a style guide for all other scripts.',
                  'Make sure your script ends with a clear call-to-action like "Press 1 to get connected" or "Reply YES to schedule a call".',
                  'Keep the tone consistent with your selected marketing angle and sentiment.',
                  'You can reset to the original AI-generated script at any time if you want to start over.',
                ]}
              />
              {!wizardData.previewScript ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Generating preview script...</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Script Preview (Day 1, Call 1)</label>
                      <textarea
                        className="w-full min-h-[200px] p-4 border rounded-md font-mono text-sm"
                        value={wizardData.editedScript}
                        onChange={(e) => setWizardData({ ...wizardData, editedScript: e.target.value })}
                        placeholder="Edit the script here..."
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        Make sure the script ends with &quot;Press 1 to get connected&quot; or similar. Your edits will be used as a style guide for all other scripts.
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setWizardData({ ...wizardData, editedScript: wizardData.previewScript });
                        }}
                      >
                        Reset to Original
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 14: Generate */}
          {currentStep === 14 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Name Your Journey</h3>
                <p className="text-muted-foreground mb-6">Give your journey a name, then review your settings and generate</p>
              </div>
              <GuideCard
                title="Final Review"
                icon={CheckCircle}
                tips={[
                  'Review all your settings below to ensure everything is correct before generating.',
                  'Once you click "Generate Journey Template", the AI will create all scripts, voice messages, and journey nodes.',
                  'This process may take a few minutes. You can navigate away and come back later.',
                  'After generation, you can activate the journey template and assign it to contacts or segments.',
                ]}
              />
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Journey Name</label>
                  <Input
                    value={wizardData.journeyName}
                    onChange={(e) => setWizardData({ ...wizardData, journeyName: e.target.value })}
                    placeholder="e.g., Q1 Lead Nurture Campaign"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This name will be used to identify your journey in the dashboard
                  </p>
                </div>
              </div>
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Industry</div>
                      <div>{wizardData.industry}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Brand</div>
                      <div>{wizardData.brandName}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Duration</div>
                      <div>{wizardData.totalDays} days</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Calls per Day</div>
                      <div>{wizardData.callsPerDay}</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Marketing Angle{wizardData.marketingAngles.length > 1 ? 's' : ''}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wizardData.marketingAngles.map((angle: string) => (
                          <Badge key={angle} variant="secondary" className="capitalize">
                            {angle}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Sentiment{wizardData.sentiments.length > 1 ? 's' : ''}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {wizardData.sentiments.map((sentiment: string) => (
                          <Badge key={sentiment} variant="secondary" className="capitalize">
                            {sentiment}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
            </motion.div>
          </CardContent>
          <CardContent className={`border-t pt-6 bg-gradient-to-r from-muted/30 to-transparent ${isGenerating ? 'opacity-30' : ''}`}>
            <div className="flex justify-between">
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button variant="outline" onClick={onBack} disabled={currentStep === 1} className="rounded-lg">
                  Back
                </Button>
              </motion.div>
              {currentStep < totalSteps ? (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button onClick={onNext} disabled={!canProceed()} className="rounded-lg">
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button onClick={onGenerate} disabled={!canProceed() || isGenerating} className="rounded-lg">
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Generate Journey
                      </>
                    )}
                  </Button>
                </motion.div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
    </>
  );
}

// Import the CreateVoiceTemplateDialog component
function CreateVoiceTemplateDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: CreateVoiceTemplateDto) => Promise<void>;
}) {
  const { data: voices = [], isLoading: voicesLoading } = useElevenLabsVoices();
  const { data: voicePresets = [] } = useVoicePresets();
  const [usePreset, setUsePreset] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState('');
  const [formData, setFormData] = useState<CreateVoiceTemplateDto>({
    name: '',
    description: '',
    messageContent: '',
    kokoroVoiceId: '',
    kokoroVoiceName: '',
    voicePresetId: undefined,
    voiceConfig: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
    },
    audioEffects: {
      distance: 'close' as 'close' | 'medium' | 'far',
      backgroundNoise: {
        enabled: false,
        volume: 0.3,
      },
      coughEffects: [],
    },
    isActive: true,
  });

  const selectedVoice = Array.isArray(voices) ? voices.find((v: any) => v.voice_id === formData.kokoroVoiceId) : undefined;
  const selectedPreset = voicePresets.find((p: any) => p.id === selectedPresetId);

  // When preset is selected, update formData
  React.useEffect(() => {
    if (usePreset && selectedPreset) {
      setFormData(prev => ({
        ...prev,
        voicePresetId: selectedPreset.id,
        kokoroVoiceId: selectedPreset.kokoroVoiceId,
        kokoroVoiceName: selectedPreset.kokoroVoiceName,
        voiceConfig: {
          ...selectedPreset.voiceConfig,
          ...prev.voiceConfig, // Template config overrides preset config
        },
      }));
    } else if (!usePreset) {
      setFormData(prev => ({
        ...prev,
        voicePresetId: undefined,
      }));
    }
  }, [usePreset, selectedPresetId, selectedPreset]);

  const handleSubmit = () => {
    if (!formData.name || !formData.messageContent) {
      toast.error('Please fill in name and message content');
      return;
    }
    if (!usePreset && !formData.kokoroVoiceId) {
      toast.error('Please select a voice or preset');
      return;
    }
    if (usePreset && !formData.voicePresetId) {
      toast.error('Please select a voice preset');
      return;
    }
    onCreate(formData);
  };

  // Extract variables from message content
  const variables = formData.messageContent.match(/\{(\w+)\}/g) || [];
  const uniqueVariables = Array.from(
    new Set(variables.map((v) => v.replace(/[{}]/g, ''))),
  );

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Voice Template</DialogTitle>
        <DialogDescription>
          Configure a voice message template
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="My Voice Template"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Voice Source *</label>
            <div className="flex gap-2 mb-2">
              <Button
                type="button"
                variant={!usePreset ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setUsePreset(false);
                  setSelectedPresetId('');
                }}
              >
                Direct Voice
              </Button>
              <Button
                type="button"
                variant={usePreset ? 'default' : 'outline'}
                size="sm"
                onClick={() => setUsePreset(true)}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                AI Studio Preset
              </Button>
            </div>
            {!usePreset ? (
              voicesLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading voices...
                </div>
              ) : (
                <Select
                  value={formData.kokoroVoiceId}
                  onChange={(e) => {
                    const voice = Array.isArray(voices) ? voices.find((v: any) => v.voice_id === e.target.value) : undefined;
                    setFormData({
                      ...formData,
                      kokoroVoiceId: e.target.value,
                      kokoroVoiceName: voice?.name || '',
                    });
                  }}
                >
                  <option value="">Select a voice...</option>
                  {Array.isArray(voices) ? voices.map((voice: any) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} {voice.category && `(${voice.category})`}
                    </option>
                  )) : []}
                </Select>
              )
            ) : (
              <Select
                value={selectedPresetId}
                onChange={(e) => setSelectedPresetId(e.target.value)}
              >
                <option value="">Select a preset...</option>
                {voicePresets
                  .filter((p: any) => p.isActive)
                  .map((preset: any) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} {preset.isDefault && '⭐'}
                    </option>
                  ))}
              </Select>
            )}
            {usePreset && selectedPreset && (
              <div className="mt-2 p-2 bg-muted rounded text-xs text-muted-foreground">
                Preset: {selectedPreset.name} - {selectedPreset.kokoroVoiceName || selectedPreset.kokoroVoiceId}
                {selectedPreset.tags && selectedPreset.tags.length > 0 && (
                  <div className="mt-1">
                    Tags: {selectedPreset.tags.map((tag: string) => `[${tag}]`).join(' ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {selectedVoice && (
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="font-medium">{selectedVoice.name}</p>
                {selectedVoice.description && (
                  <p className="text-sm text-muted-foreground">{selectedVoice.description}</p>
                )}
              </div>
              {selectedVoice.preview_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const audio = new Audio(selectedVoice.preview_url);
                    audio.play();
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  Preview
                </Button>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block">Description</label>
          <Input
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Message Content *</label>
          <Textarea
            value={formData.messageContent}
            onChange={(e) => setFormData({ ...formData, messageContent: e.target.value })}
            placeholder="Hello {firstName}, this is a message for you..."
            rows={6}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Use variables like {'{firstName}'}, {'{lastName}'}, {'{email}'}, {'{appointmentTime}'}, {'{appointmentDate}'}, {'{appointmentDateTime}'}, etc. These will be
            replaced with contact data. Appointment variables are formatted in the contact&apos;s timezone.
          </p>
          {uniqueVariables.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium mb-1">Detected Variables:</p>
              <div className="flex flex-wrap gap-1">
                {uniqueVariables.map((variable) => (
                  <Badge key={variable} variant="outline" className="text-xs">
                    {`{${variable}}`}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Voice Configuration</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Stability ({formData.voiceConfig?.stability || 0.5})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.voiceConfig?.stability || 0.5}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    voiceConfig: {
                      ...formData.voiceConfig,
                      stability: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Similarity Boost ({formData.voiceConfig?.similarityBoost || 0.75})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.voiceConfig?.similarityBoost || 0.75}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    voiceConfig: {
                      ...formData.voiceConfig,
                      similarityBoost: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                Style ({formData.voiceConfig?.style || 0.0})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.voiceConfig?.style || 0.0}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    voiceConfig: {
                      ...formData.voiceConfig,
                      style: parseFloat(e.target.value),
                    },
                  })
                }
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                checked={formData.voiceConfig?.useSpeakerBoost ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    voiceConfig: {
                      ...formData.voiceConfig,
                      useSpeakerBoost: e.target.checked,
                    },
                  })
                }
                className="rounded"
              />
              <label className="text-sm font-medium">Use Speaker Boost</label>
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Audio Effects</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add distance effects, background noise, volume control, and sound effects to your voice template.
          </p>

          <div className="space-y-4">
            {/* Distance */}
            <div>
              <label className="text-sm font-medium mb-2 block">Distance</label>
              <Select
                value={formData.audioEffects?.distance || 'close'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    audioEffects: {
                      ...formData.audioEffects,
                      distance: e.target.value as 'close' | 'medium' | 'far',
                    },
                  })
                }
              >
                <option value="close">Close</option>
                <option value="medium">Medium</option>
                <option value="far">Far</option>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Adjust the perceived distance of the voice
              </p>
            </div>

            {/* Background Noise */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={formData.audioEffects?.backgroundNoise?.enabled || false}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      audioEffects: {
                        ...formData.audioEffects,
                        backgroundNoise: {
                          enabled: e.target.checked,
                          volume: formData.audioEffects?.backgroundNoise?.volume || 0.3,
                        },
                      },
                    })
                  }
                  className="rounded"
                />
                <label className="text-sm font-medium">Enable Background Noise</label>
              </div>

              {formData.audioEffects?.backgroundNoise?.enabled && (
                <div className="space-y-4 pl-6 border-l-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Background Noise Volume ({formData.audioEffects?.backgroundNoise?.volume || 0.3})
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={formData.audioEffects?.backgroundNoise?.volume || 0.3}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                      audioEffects: {
                        ...formData.audioEffects,
                        backgroundNoise: {
                          enabled: formData.audioEffects?.backgroundNoise?.enabled ?? false,
                          ...formData.audioEffects?.backgroundNoise,
                          volume: parseFloat(e.target.value),
                        },
                      },
                        })
                      }
                      className="w-full"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Cough Effects */}
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-3">Cough Effects</p>
              <p className="text-xs text-muted-foreground mb-3">
                Add cough sound effects at specific timestamps in your audio
              </p>
              <div className="space-y-2">
                {(formData.audioEffects?.coughEffects || []).map((cough, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border rounded">
                    <Select
                      value={cough.file}
                      onChange={(e) => {
                        const updated = [...(formData.audioEffects?.coughEffects || [])];
                        updated[index] = { ...updated[index], file: e.target.value as any };
                        setFormData({
                          ...formData,
                          audioEffects: {
                            ...formData.audioEffects,
                            coughEffects: updated,
                          },
                        });
                      }}
                    >
                      <option value="stifled-cough">Stifled Cough</option>
                      <option value="coughing-woman">Coughing Woman</option>
                      <option value="coughing-woman-2">Coughing Woman 2</option>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Timestamp (seconds)"
                      value={cough.timestamp}
                      onChange={(e) => {
                        const updated = [...(formData.audioEffects?.coughEffects || [])];
                        updated[index] = { ...updated[index], timestamp: parseFloat(e.target.value) || 0 };
                        setFormData({
                          ...formData,
                          audioEffects: {
                            ...formData.audioEffects,
                            coughEffects: updated,
                          },
                        });
                      }}
                      className="w-32"
                    />
                    <Input
                      type="number"
                      placeholder="Volume (0-1)"
                      min="0"
                      max="1"
                      step="0.1"
                      value={cough.volume || 0.5}
                      onChange={(e) => {
                        const updated = [...(formData.audioEffects?.coughEffects || [])];
                        updated[index] = { ...updated[index], volume: parseFloat(e.target.value) || 0.5 };
                        setFormData({
                          ...formData,
                          audioEffects: {
                            ...formData.audioEffects,
                            coughEffects: updated,
                          },
                        });
                      }}
                      className="w-32"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        const updated = (formData.audioEffects?.coughEffects || []).filter((_, i) => i !== index);
                        setFormData({
                          ...formData,
                          audioEffects: {
                            ...formData.audioEffects,
                            coughEffects: updated,
                          },
                        });
                      }}
                    >
                      <XIcon className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFormData({
                      ...formData,
                      audioEffects: {
                        ...formData.audioEffects,
                        coughEffects: [
                          ...(formData.audioEffects?.coughEffects || []),
                          { file: 'stifled-cough', timestamp: 0, volume: 0.5 },
                        ],
                      },
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Cough Effect
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive ?? true}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="rounded"
          />
          <label className="text-sm font-medium">Active</label>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>
          Create Template
        </Button>
      </div>
    </>
  );
}

// Create AI Template Dialog Component
function GenerateAiConfigButton({
  businessCategory,
  onGenerate,
}: {
  businessCategory?: string;
  onGenerate: (config: any) => void;
}) {
  const generateConfig = useGenerateAiTemplateConfig();

  const handleGenerate = async () => {
    const categoryInput = businessCategory || (document.getElementById('businessCategory') as HTMLInputElement)?.value;
    if (!categoryInput?.trim()) {
      toast.error('Please enter a business category');
      return;
    }

    try {
      const result = await generateConfig.mutateAsync(categoryInput.trim());
      if (result.success && result.config) {
        onGenerate(result.config);
        toast.success('AI configuration generated successfully!');
      } else {
        toast.error(result.error?.message || 'Failed to generate configuration');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to generate configuration');
    }
  };

  return (
    <Button
      type="button"
      onClick={handleGenerate}
      disabled={generateConfig.isPending}
      variant="outline"
    >
      {generateConfig.isPending ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          Generate
        </>
      )}
    </Button>
  );
}

function GenerateSmsVariationsButton() {
  const generateVariations = useGenerateSmsVariations();
  const [showVariations, setShowVariations] = useState(false);
  const [variations, setVariations] = useState<string[]>([]);

  const handleGenerate = async () => {
    const sampleInput = (document.getElementById('sampleSms') as HTMLInputElement)?.value;
    if (!sampleInput?.trim()) {
      toast.error('Please enter a sample SMS message');
      return;
    }

    try {
      const result = await generateVariations.mutateAsync(sampleInput.trim());
      if (result.success && result.variations) {
        setVariations(result.variations);
        setShowVariations(true);
        toast.success('Generated 5 SMS variations!');
      } else {
        toast.error(result.error?.message || 'Failed to generate variations');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error?.message || 'Failed to generate variations');
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={handleGenerate}
        disabled={generateVariations.isPending}
        variant="outline"
        size="sm"
      >
        {generateVariations.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-1" />
            Generate 5
          </>
        )}
      </Button>
      {showVariations && variations.length > 0 && (
        <Dialog open={showVariations} onOpenChange={setShowVariations}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Generated SMS Variations</DialogTitle>
              <DialogDescription>Select a variation to use</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {variations.map((variation, index) => (
                <Card key={index} className="cursor-pointer hover:bg-muted/50" onClick={() => {
                  const contentInput = document.querySelector('textarea[name="content"]') as HTMLTextAreaElement;
                  if (contentInput) {
                    contentInput.value = variation;
                    contentInput.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                  setShowVariations(false);
                  toast.success('Variation applied to content field');
                }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <p className="text-sm flex-1">{variation}</p>
                      <Badge variant="outline" className="ml-2">
                        {variation.length} chars
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowVariations(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// Edit AI Template Dialog Component
function EditAiTemplateDialog({
  template,
  onClose,
  onUpdate,
}: {
  template: any;
  onClose: () => void;
  onUpdate: (data: Partial<CreateAiTemplateDto>) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CreateAiTemplateDto>({
    name: template.name,
    description: template.description || '',
    config: {
      purpose: template.config.purpose || [],
      productInfo: template.config.productInfo || '',
      serviceInfo: template.config.serviceInfo || '',
      qualificationGuidelines: template.config.qualificationGuidelines || '',
      brandTonality: template.config.brandTonality || '',
      welcomeMessage: template.config.welcomeMessage || '',
      customInstructions: template.config.customInstructions || '',
      businessName: template.config.businessName || '',
      phoneNumber: template.config.phoneNumber || '',
    },
    isActive: template.isActive,
  });

  const purposeOptions = [
    { value: 'provide_information', label: 'Provide Information' },
    { value: 'drive_lead_submissions', label: 'Drive Lead Submissions' },
    { value: 'schedule_calendar', label: 'Schedule Calendar' },
    { value: 'drive_phone_calls', label: 'Drive Phone Calls' },
  ];

  const handlePurposeToggle = (value: string) => {
    const current = formData.config.purpose || [];
    const updated = current.includes(value)
      ? current.filter((p) => p !== value)
      : [...current, value];
    setFormData({
      ...formData,
      config: { ...formData.config, purpose: updated },
    });
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.config.welcomeMessage) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Validate phone number if drive_phone_calls is selected
    if (formData.config.purpose?.includes('drive_phone_calls') && !formData.config.phoneNumber) {
      toast.error('Phone number is required when "Drive Phone Calls" is selected');
      return;
    }
    onUpdate(formData);
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit AI Messenger Template</DialogTitle>
        <DialogDescription>
          Update your AI-powered conversational messenger configuration
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Template Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My AI Messenger"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Business Name</label>
              <Input
                value={formData.config.businessName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, businessName: e.target.value },
                  })
                }
                placeholder="Your Business Name"
              />
            </div>
            <div className="border-t pt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Purpose Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Purpose</CardTitle>
            <CardDescription>Select what this AI messenger should do</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {purposeOptions.map((option) => (
                <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.config.purpose?.includes(option.value)}
                    onChange={() => handlePurposeToggle(option.value)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
            {formData.config.purpose?.includes('drive_phone_calls') && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm font-medium mb-2 block">
                  Phone Number for Calls *
                </label>
                <Input
                  type="tel"
                  value={formData.config.phoneNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, phoneNumber: e.target.value },
                    })
                  }
                  placeholder="+1234567890"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This phone number will be provided to contacts when they want to call. Include country code (e.g., +1 for US).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Configuration Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Configuration</CardTitle>
            <CardDescription>Configure how the AI should behave</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Product Information</label>
              <Textarea
                value={formData.config.productInfo || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, productInfo: e.target.value },
                  })
                }
                placeholder="Describe your products/services..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Service Information</label>
              <Textarea
                value={formData.config.serviceInfo || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, serviceInfo: e.target.value },
                  })
                }
                placeholder="How your services work..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Qualification Guidelines</label>
              <Textarea
                value={formData.config.qualificationGuidelines || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, qualificationGuidelines: e.target.value },
                  })
                }
                placeholder="Ideal customer profiles, questions to ask..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Brand Tonality *</label>
              <Textarea
                value={formData.config.brandTonality || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, brandTonality: e.target.value },
                  })
                }
                placeholder="Professional and friendly. Use clear, helpful language."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Welcome Message *</label>
              <Textarea
                value={formData.config.welcomeMessage || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, welcomeMessage: e.target.value },
                  })
                }
                placeholder="Hi! I'm here to help. How can I assist you today?"
                rows={2}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Keep under 160 characters. Should end with a question to engage users.
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Custom Instructions</label>
              <Textarea
                value={formData.config.customInstructions || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, customInstructions: e.target.value },
                  })
                }
                placeholder="Additional guidance for chatbot behavior..."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Update Template</Button>
      </div>
    </>
  );
}

function CreateAiTemplateDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: CreateAiTemplateDto) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CreateAiTemplateDto>({
    name: '',
    description: '',
    config: {
      purpose: [],
      productInfo: '',
      serviceInfo: '',
      qualificationGuidelines: '',
      brandTonality: '',
      welcomeMessage: '',
      customInstructions: '',
      businessName: '',
      phoneNumber: '',
    },
    isActive: true,
  });
  const [businessCategory, setBusinessCategory] = useState('');

  // Reset form function
  const resetForm = React.useCallback(() => {
    setFormData({
      name: '',
      description: '',
      config: {
        purpose: [],
        productInfo: '',
        serviceInfo: '',
        qualificationGuidelines: '',
        brandTonality: '',
        welcomeMessage: '',
        customInstructions: '',
        businessName: '',
        phoneNumber: '',
      },
      isActive: true,
    });
    setBusinessCategory('');
  }, []);

  // Reset form when dialog closes
  React.useEffect(() => {
    return () => {
      // Reset form state when component unmounts
      resetForm();
    };
  }, [resetForm]);

  // Handle close with reset
  const handleClose = React.useCallback(() => {
    resetForm();
    onClose();
  }, [resetForm, onClose]);

  const purposeOptions = [
    { value: 'provide_information', label: 'Provide Information' },
    { value: 'drive_lead_submissions', label: 'Drive Lead Submissions' },
    { value: 'schedule_calendar', label: 'Schedule Calendar' },
    { value: 'drive_phone_calls', label: 'Drive Phone Calls' },
  ];

  const handlePurposeToggle = (value: string) => {
    const current = formData.config.purpose || [];
    const updated = current.includes(value)
      ? current.filter((p) => p !== value)
      : [...current, value];
    setFormData({
      ...formData,
      config: { ...formData.config, purpose: updated },
    });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.config.welcomeMessage) {
      toast.error('Please fill in all required fields');
      return;
    }
    // Validate phone number if drive_phone_calls is selected
    if (formData.config.purpose?.includes('drive_phone_calls') && !formData.config.phoneNumber) {
      toast.error('Phone number is required when "Drive Phone Calls" is selected');
      return;
    }
    try {
      await onCreate(formData);
      // Reset form after successful creation
      resetForm();
    } catch (error) {
      // Error is already handled by the parent onCreate callback
      // Don't reset form on error so user can fix and retry
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create AI Messenger Template</DialogTitle>
        <DialogDescription>
          Configure an AI-powered conversational messenger for your campaigns
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        {/* Basic Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Template Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="My AI Messenger"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Business Name</label>
              <Input
                value={formData.config.businessName || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, businessName: e.target.value },
                  })
                }
                placeholder="Your Business Name"
              />
            </div>
            <div className="border-t pt-4">
              <label className="text-sm font-medium mb-2 block">AI Generation</label>
              <p className="text-xs text-muted-foreground mb-3">
                Enter your business category and let AI generate the configuration automatically
              </p>
              <div className="flex gap-2">
                <Input
                  id="businessCategory"
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  placeholder="e.g., Real Estate, SaaS, E-commerce"
                  className="flex-1"
                />
                <GenerateAiConfigButton
                  businessCategory={businessCategory}
                  onGenerate={(config) => {
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        productInfo: config.productInfo,
                        serviceInfo: config.serviceInfo,
                        qualificationGuidelines: config.qualificationGuidelines,
                        brandTonality: config.brandTonality,
                        welcomeMessage: config.welcomeMessage,
                        customInstructions: config.customInstructions,
                      },
                    });
                    setBusinessCategory(''); // Clear after generation
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Purpose Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Chatbot Purpose</CardTitle>
            <CardDescription>Select what your AI messenger should do</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {purposeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handlePurposeToggle(option.value)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    formData.config.purpose?.includes(option.value)
                      ? 'border-primary bg-primary/5'
                      : 'border-muted hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                        formData.config.purpose?.includes(option.value)
                          ? 'border-primary bg-primary'
                          : 'border-muted-foreground'
                      }`}
                    >
                      {formData.config.purpose?.includes(option.value) && (
                        <Check className="h-3 w-3 text-primary-foreground" />
                      )}
                    </div>
                    <span className="text-sm font-medium">{option.label}</span>
                  </div>
                </button>
              ))}
            </div>
            {formData.config.purpose?.includes('drive_phone_calls') && (
              <div className="mt-4 pt-4 border-t">
                <label className="text-sm font-medium mb-2 block">
                  Phone Number for Calls *
                </label>
                <Input
                  type="tel"
                  value={formData.config.phoneNumber || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: { ...formData.config, phoneNumber: e.target.value },
                    })
                  }
                  placeholder="+1234567890"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  This phone number will be provided to contacts when they want to call. Include country code (e.g., +1 for US).
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Product & Service Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Product & Service Information</CardTitle>
            <CardDescription>What your business offers</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Product Information</label>
              <Textarea
                value={formData.config.productInfo || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, productInfo: e.target.value },
                  })
                }
                placeholder="Describe your products and services..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Service Information</label>
              <Textarea
                value={formData.config.serviceInfo || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, serviceInfo: e.target.value },
                  })
                }
                placeholder="How your services work, processes, timelines..."
                rows={4}
              />
            </div>
          </CardContent>
        </Card>

        {/* Qualification & Brand Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Qualification & Brand</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Qualification Guidelines</label>
              <Textarea
                value={formData.config.qualificationGuidelines || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, qualificationGuidelines: e.target.value },
                  })
                }
                placeholder="Ideal customer profiles, questions to ask, common values..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Brand Tonality</label>
              <Textarea
                value={formData.config.brandTonality || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    config: { ...formData.config, brandTonality: e.target.value },
                  })
                }
                placeholder="Professional and friendly. Use clear, helpful language."
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Welcome Message Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Welcome Message *</CardTitle>
            <CardDescription>Initial greeting message (keep under 160 characters for SMS)</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.config.welcomeMessage || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, welcomeMessage: e.target.value },
                })
              }
              placeholder="Hi! Thanks for reaching out. How can I help you today?"
              rows={3}
              maxLength={160}
            />
            <p className="text-xs text-muted-foreground mt-2">
              {formData.config.welcomeMessage?.length || 0}/160 characters
            </p>
          </CardContent>
        </Card>

        {/* Custom Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom Instructions</CardTitle>
            <CardDescription>Additional business-specific guidance</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.config.customInstructions || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  config: { ...formData.config, customInstructions: e.target.value },
                })
              }
              placeholder="Any additional instructions for the AI..."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.isActive ?? true}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="rounded"
          />
          <label className="text-sm font-medium">Active</label>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={handleClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Create Template</Button>
      </div>
    </>
  );
}

// Content AI Template Card Component
function ContentAiTemplateCard({
  template,
  onDelete,
  onPreview,
  onEdit,
  onGenerateVariations,
}: {
  template: any;
  onDelete: () => void;
  onPreview: () => void;
  onEdit: () => void;
  onGenerateVariations: () => void;
}) {
  const generateVariations = useGenerateContentAiVariations();
  const updateTemplate = useUpdateContentAiTemplate();

  const handleGenerateVariations = async () => {
    try {
      const variations = await generateVariations.mutateAsync(template.id);
      await updateTemplate.mutateAsync({
        id: template.id,
        data: { generatedVariations: variations } as any,
      });
      toast.success('Generated 5 variations!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate variations');
    }
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg">{template.name}</CardTitle>
            {template.description && (
              <CardDescription className="mt-1">{template.description}</CardDescription>
            )}
          </div>
          <Badge variant={template.isActive ? 'default' : 'secondary'}>
            {template.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge variant="secondary" className="text-xs">
            SMS Generation
          </Badge>
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Example Messages</p>
          <p className="text-sm text-muted-foreground">
            {template.exampleMessages.length} example{template.exampleMessages.length !== 1 ? 's' : ''}
          </p>
        </div>
        {template.generatedVariations && template.generatedVariations.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Generated Variations</p>
            <p className="text-sm text-muted-foreground">
              {template.generatedVariations.length} variation{template.generatedVariations.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Creativity</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary"
                style={{ width: `${template.creativity * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(template.creativity * 100)}%
            </span>
          </div>
        </div>
        {template.unique && (
          <div>
            <Badge variant="outline" className="text-xs">
              Unique Messages Enabled
            </Badge>
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(template.updatedAt), { addSuffix: true })}
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={onPreview}
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onEdit}
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            {!template.generatedVariations || template.generatedVariations.length === 0 ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleGenerateVariations}
                disabled={generateVariations.isPending}
              >
                {generateVariations.isPending ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Generate
                  </>
                )}
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>

    </Card>
  );
}

// Create Content AI Template Dialog Component
function CreateContentAiTemplateDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: CreateContentAiTemplateDto) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CreateContentAiTemplateDto>({
    name: '',
    description: '',
    exampleMessages: [''],
    creativity: 0.7,
    unique: false,
    config: {
      maxUniqueGenerationsPerHour: 100,
      maxUniqueGenerationsPerDay: 1000,
      maxLength: 160,
      preserveVariables: true,
    },
  });
  const { data: templates = [] } = useTemplates();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  const handleAddExampleMessage = () => {
    if (formData.exampleMessages.length < 10) {
      setFormData({
        ...formData,
        exampleMessages: [...formData.exampleMessages, ''],
      });
    }
  };

  const handleRemoveExampleMessage = (index: number) => {
    if (formData.exampleMessages.length > 3) {
      setFormData({
        ...formData,
        exampleMessages: formData.exampleMessages.filter((_, i) => i !== index),
      });
    }
  };

  const handleExampleMessageChange = (index: number, value: string) => {
    const newMessages = [...formData.exampleMessages];
    newMessages[index] = value;
    setFormData({ ...formData, exampleMessages: newMessages });
  };

  const handleSelectFromTemplates = () => {
    const selectedTemplates = templates.filter((t) => selectedTemplateIds.includes(t.id));
    const templateContents = selectedTemplates.map((t) => t.content).filter(Boolean);
    if (templateContents.length > 0) {
      setFormData({
        ...formData,
        exampleMessages: templateContents.slice(0, 10),
      });
      setSelectedTemplateIds([]);
      setShowTemplateSelector(false);
      toast.success(`Added ${templateContents.length} template${templateContents.length !== 1 ? 's' : ''} as examples`);
    }
  };

  const handleSubmit = () => {
    const validMessages = formData.exampleMessages.filter((msg) => msg.trim().length > 0);
    if (!formData.name || validMessages.length < 3) {
      toast.error('Please provide a name and at least 3 example messages');
      return;
    }
    onCreate({ ...formData, exampleMessages: validMessages });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create Content AI Template</DialogTitle>
        <DialogDescription>
          Create templates for SMS content generation and/or journey audio/IVR generation. Provide 3-10 example SMS messages for SMS generation.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Template Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Content AI Template"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Description</label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={2}
          />
        </div>


        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Example Messages * (3-10)</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateSelector(true)}
              >
                Select from Templates
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExampleMessage}
                disabled={formData.exampleMessages.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Message
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {formData.exampleMessages.map((message, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => handleExampleMessageChange(index, e.target.value)}
                  placeholder={`Example message ${index + 1}...`}
                  rows={2}
                  className="flex-1"
                />
                {formData.exampleMessages.length > 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveExampleMessage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {formData.exampleMessages.filter((m) => m.trim().length > 0).length} of {formData.exampleMessages.length} messages provided
          </p>
        </div>

        {showTemplateSelector && (
          <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Templates</DialogTitle>
                <DialogDescription>Choose templates to use as examples</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {templates.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTemplateIds.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTemplateIds([...selectedTemplateIds, t.id]);
                        } else {
                          setSelectedTemplateIds(selectedTemplateIds.filter((id) => id !== t.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowTemplateSelector(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSelectFromTemplates}>Add Selected</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block">
            Creativity: {Math.round((formData.creativity || 0.7) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.creativity || 0.7}
            onChange={(e) => setFormData({ ...formData, creativity: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Conservative</span>
            <span>Balanced</span>
            <span>Creative</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.unique || false}
            onChange={(e) => setFormData({ ...formData, unique: e.target.checked })}
            className="rounded"
          />
          <div className="flex-1">
            <label className="text-sm font-medium">Enable Unique Messages</label>
            <p className="text-xs text-muted-foreground">
              Generate a unique message for each send (subject to rate limits)
            </p>
          </div>
        </div>

        {formData.unique && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rate Limiting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Max per Hour</label>
                <Input
                  type="number"
                  value={formData.config?.maxUniqueGenerationsPerHour || 100}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        maxUniqueGenerationsPerHour: parseInt(e.target.value) || 100,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max per Day</label>
                <Input
                  type="number"
                  value={formData.config?.maxUniqueGenerationsPerDay || 1000}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        maxUniqueGenerationsPerDay: parseInt(e.target.value) || 1000,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Create Template</Button>
      </div>
    </>
  );
}

// Edit Content AI Template Dialog Component
function EditContentAiTemplateDialog({
  template,
  onClose,
  onUpdate,
}: {
  template: ContentAiTemplate;
  onClose: () => void;
  onUpdate: (data: Partial<CreateContentAiTemplateDto>) => Promise<void>;
}) {
  const [formData, setFormData] = useState<CreateContentAiTemplateDto>({
    name: template.name,
    description: template.description || '',
    exampleMessages: [...template.exampleMessages],
    creativity: template.creativity,
    unique: template.unique,
    config: template.config || {
      maxUniqueGenerationsPerHour: 100,
      maxUniqueGenerationsPerDay: 1000,
      maxLength: 160,
      preserveVariables: true,
    },
  });
  const { data: templates = [] } = useTemplates();
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  const handleAddExampleMessage = () => {
    if (formData.exampleMessages.length < 10) {
      setFormData({
        ...formData,
        exampleMessages: [...formData.exampleMessages, ''],
      });
    }
  };

  const handleRemoveExampleMessage = (index: number) => {
    if (formData.exampleMessages.length > 3) {
      setFormData({
        ...formData,
        exampleMessages: formData.exampleMessages.filter((_, i) => i !== index),
      });
    }
  };

  const handleExampleMessageChange = (index: number, value: string) => {
    const newMessages = [...formData.exampleMessages];
    newMessages[index] = value;
    setFormData({ ...formData, exampleMessages: newMessages });
  };

  const handleSelectFromTemplates = () => {
    const selectedTemplates = templates.filter((t) => selectedTemplateIds.includes(t.id));
    const templateContents = selectedTemplates.map((t) => t.content).filter(Boolean);
    if (templateContents.length > 0) {
      setFormData({
        ...formData,
        exampleMessages: [...formData.exampleMessages, ...templateContents].slice(0, 10),
      });
      setSelectedTemplateIds([]);
      setShowTemplateSelector(false);
      toast.success(`Added ${templateContents.length} template${templateContents.length !== 1 ? 's' : ''} as examples`);
    }
  };

  const handleSubmit = () => {
    const validMessages = formData.exampleMessages.filter((msg) => msg.trim().length > 0);
    if (!formData.name || validMessages.length < 3) {
      toast.error('Please provide a name and at least 3 example messages');
      return;
    }
    onUpdate({ ...formData, exampleMessages: validMessages });
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Content AI Template</DialogTitle>
        <DialogDescription>
          Update your Content AI template settings
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-6 mt-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Template Name *</label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="My Content AI Template"
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Description</label>
          <Textarea
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Optional description"
            rows={2}
          />
        </div>


        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium">Example Messages * (3-10)</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTemplateSelector(true)}
              >
                Select from Templates
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddExampleMessage}
                disabled={formData.exampleMessages.length >= 10}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Message
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            {formData.exampleMessages.map((message, index) => (
              <div key={index} className="flex gap-2">
                <Textarea
                  value={message}
                  onChange={(e) => handleExampleMessageChange(index, e.target.value)}
                  placeholder={`Example message ${index + 1}...`}
                  rows={2}
                  className="flex-1"
                />
                {formData.exampleMessages.length > 3 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveExampleMessage(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {formData.exampleMessages.filter((m) => m.trim().length > 0).length} of {formData.exampleMessages.length} messages provided
          </p>
        </div>

        {showTemplateSelector && (
          <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Select Templates</DialogTitle>
                <DialogDescription>Choose templates to use as examples</DialogDescription>
              </DialogHeader>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {templates.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedTemplateIds.includes(t.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTemplateIds([...selectedTemplateIds, t.id]);
                        } else {
                          setSelectedTemplateIds(selectedTemplateIds.filter((id) => id !== t.id));
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm">{t.name}</span>
                  </label>
                ))}
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setShowTemplateSelector(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSelectFromTemplates}>Add Selected</Button>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <div>
          <label className="text-sm font-medium mb-2 block">
            Creativity: {Math.round((formData.creativity || 0.7) * 100)}%
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={formData.creativity || 0.7}
            onChange={(e) => setFormData({ ...formData, creativity: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>Conservative</span>
            <span>Balanced</span>
            <span>Creative</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.unique || false}
            onChange={(e) => setFormData({ ...formData, unique: e.target.checked })}
            className="rounded"
          />
          <div className="flex-1">
            <label className="text-sm font-medium">Enable Unique Messages</label>
            <p className="text-xs text-muted-foreground">
              Generate a unique message for each send (subject to rate limits)
            </p>
          </div>
        </div>

        {formData.unique && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Rate Limiting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Max per Hour</label>
                <Input
                  type="number"
                  value={formData.config?.maxUniqueGenerationsPerHour || 100}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        maxUniqueGenerationsPerHour: parseInt(e.target.value) || 100,
                      },
                    })
                  }
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Max per Day</label>
                <Input
                  type="number"
                  value={formData.config?.maxUniqueGenerationsPerDay || 1000}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      config: {
                        ...formData.config,
                        maxUniqueGenerationsPerDay: parseInt(e.target.value) || 1000,
                      },
                    })
                  }
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Update Template</Button>
      </div>
    </>
  );
}

