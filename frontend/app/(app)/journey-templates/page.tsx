'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Sparkles,
  Users,
  ShoppingCart,
  Heart,
  Rocket,
  HeadphonesIcon,
  Plus,
  ArrowRight,
  Copy,
  Trash2,
} from 'lucide-react';
import {
  useJourneyTemplates,
  usePublicJourneyTemplates,
  useCreateJourneyFromTemplate,
  useDeleteJourneyTemplate,
} from '@/lib/hooks/use-journey-templates';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const categoryIcons = {
  LEAD_NURTURE: Rocket,
  ONBOARDING: Users,
  RETENTION: Heart,
  SALES: ShoppingCart,
  SUPPORT: HeadphonesIcon,
  CUSTOM: Sparkles,
};

const categoryColors = {
  LEAD_NURTURE: 'bg-primary/10 text-primary',
  ONBOARDING: 'bg-success/10 text-success',
  RETENTION: 'bg-warning/10 text-warning',
  SALES: 'bg-info/10 text-info',
  SUPPORT: 'bg-accent/10 text-accent',
  CUSTOM: 'bg-muted text-muted-foreground',
};

export default function JourneyTemplatesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [journeyName, setJourneyName] = useState('');

  const { data: templates = [], isLoading } = useJourneyTemplates({
    search: searchQuery || undefined,
    category: selectedCategory,
  });

  const { data: publicTemplates = [] } = usePublicJourneyTemplates({
    search: searchQuery || undefined,
    category: selectedCategory,
  });

  const createJourney = useCreateJourneyFromTemplate();
  const deleteTemplate = useDeleteJourneyTemplate();

  const allTemplates = [...templates, ...publicTemplates.filter(t => !templates.find(tt => tt.id === t.id))];

  const handleCreateJourney = async () => {
    if (!selectedTemplate) return;

    try {
      const journey = await createJourney.mutateAsync({
        templateId: selectedTemplate.id,
        name: journeyName || selectedTemplate.name,
      });

      setShowCreateDialog(false);
      setSelectedTemplate(null);
      setJourneyName('');
      router.push(`/journeys/${journey.id}/edit`);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this template?')) {
      await deleteTemplate.mutateAsync(templateId);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Journey Templates</h1>
            <p className="text-muted-foreground">
              Start with a proven template or create your own
            </p>
          </div>
          <Button onClick={() => router.push('/journeys/new')}>
            <Plus className="mr-2 h-4 w-4" />
            Create Custom Journey
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={selectedCategory === undefined ? 'default' : 'outline'}
              onClick={() => setSelectedCategory(undefined)}
              size="sm"
            >
              All
            </Button>
            {Object.keys(categoryIcons).map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(category)}
                size="sm"
              >
                {category.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary mx-auto"></div>
          </div>
        ) : allTemplates.length === 0 ? (
          <Card className="border-2">
            <CardContent className="p-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No templates found</h3>
              <p className="text-muted-foreground">
                {searchQuery ? 'Try a different search term' : 'Create your first journey template'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {allTemplates.map((template, idx) => {
              const Icon = categoryIcons[template.category as keyof typeof categoryIcons] || Sparkles;
              const colorClass = categoryColors[template.category as keyof typeof categoryColors] || 'bg-muted';

              return (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="h-full hover-lift border-2 cursor-pointer group">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className={`w-12 h-12 rounded-xl ${colorClass} flex items-center justify-center`}>
                          <Icon className="h-6 w-6" />
                        </div>
                        {template.isPublic && (
                          <Badge variant="secondary">Public</Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl mb-1">{template.name}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {template.description || 'No description'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {template.metadata?.estimatedDuration && (
                          <div className="text-sm text-muted-foreground">
                            Duration: {template.metadata.estimatedDuration}
                          </div>
                        )}
                        {template.metadata?.useCase && (
                          <div className="text-sm text-muted-foreground">
                            Use Case: {template.metadata.useCase}
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2">
                          <span className="text-xs text-muted-foreground">
                            Used {template.usageCount} times
                          </span>
                          <div className="flex gap-2">
                            {!template.isPublic && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => handleDeleteTemplate(template.id, e)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedTemplate(template);
                                setJourneyName(template.name);
                                setShowCreateDialog(true);
                              }}
                              className="group-hover:bg-primary/90"
                            >
                              Use Template
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Journey Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Journey from Template</DialogTitle>
            <DialogDescription>
              Give your new journey a name. You can customize it after creation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Journey Name</label>
              <Input
                value={journeyName}
                onChange={(e) => setJourneyName(e.target.value)}
                placeholder="Enter journey name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateJourney}
              disabled={!journeyName.trim() || createJourney.isPending}
            >
              {createJourney.isPending ? 'Creating...' : 'Create Journey'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

