'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  useGenerateIntegration,
  useGenerateServiceIntegration,
  useSupportedServices,
  useEnhanceIntegration,
  type IntegrationConfig,
} from '@/lib/hooks/use-integration-builder';
import { toast } from 'sonner';
import {
  Loader2,
  Sparkles,
  Wand2,
  CheckCircle2,
  Copy,
  RefreshCw,
  Zap,
  Globe,
  Key,
  Code,
  Settings,
} from 'lucide-react';

interface AiIntegrationBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integrationType: 'lead_ingestion' | 'webhook';
  onConfigGenerated?: (config: IntegrationConfig, nodeConfig?: any) => void;
  context?: {
    contactFields?: string[];
    journeyData?: any;
    existingIntegrations?: string[];
  };
}

export function AiIntegrationBuilder({
  open,
  onOpenChange,
  integrationType,
  onConfigGenerated,
  context,
}: AiIntegrationBuilderProps) {
  const [description, setDescription] = useState('');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [generatedConfig, setGeneratedConfig] = useState<IntegrationConfig | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const generateIntegration = useGenerateIntegration();
  const generateServiceIntegration = useGenerateServiceIntegration();
  const enhanceIntegration = useEnhanceIntegration();
  const { data: supportedServices } = useSupportedServices();

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast.error('Please describe what you want to integrate with');
      return;
    }

    try {
      let config: IntegrationConfig;

      if (selectedService) {
        config = await generateServiceIntegration.mutateAsync({
          serviceName: selectedService,
          integrationType,
        });
      } else {
        config = await generateIntegration.mutateAsync({
          description,
          integrationType,
          context,
        });
      }

      setGeneratedConfig(config);
      toast.success('Integration configuration generated successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to generate integration configuration');
    }
  };

  const handleEnhance = async () => {
    if (!generatedConfig) return;

    try {
      const enhanced = await enhanceIntegration.mutateAsync({
        config: generatedConfig,
      });
      setGeneratedConfig(enhanced);
      toast.success('Configuration enhanced successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to enhance configuration');
    }
  };

  const handleUseConfig = () => {
    if (generatedConfig && onConfigGenerated) {
      onConfigGenerated(generatedConfig);
      onOpenChange(false);
      setDescription('');
      setGeneratedConfig(null);
      setSelectedService(null);
    }
  };

  const handleCopyConfig = () => {
    if (generatedConfig) {
      navigator.clipboard.writeText(JSON.stringify(generatedConfig, null, 2));
      toast.success('Configuration copied to clipboard');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Integration Builder
          </DialogTitle>
          <DialogDescription>
            Describe what you want to integrate with, and our AI will configure everything for you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Service Selection */}
          {!generatedConfig && (
            <div>
              <Label className="mb-2 block">Quick Start - Select a Service</Label>
              <div className="grid grid-cols-3 gap-2 mb-4">
                {supportedServices?.slice(0, 9).map((service) => (
                  <Button
                    key={service}
                    variant={selectedService === service ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setSelectedService(service);
                      setDescription(`Integrate with ${service}`);
                    }}
                    className="capitalize"
                  >
                    {service === 'google-sheets' ? 'Google Sheets' : service}
                  </Button>
                ))}
              </div>
              {selectedService && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedService(null);
                    setDescription('');
                  }}
                >
                  Clear selection
                </Button>
              )}
            </div>
          )}

          {/* Description Input */}
          {!generatedConfig && (
            <div>
              <Label htmlFor="description">
                {selectedService
                  ? `Describe how you want to use ${selectedService}`
                  : 'Describe your integration'}
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={
                  selectedService
                    ? `e.g., "Send leads from my website form to ${selectedService}"`
                    : 'e.g., "I want to send contact data to Zapier when a lead comes in" or "Integrate with HubSpot to create contacts"'
                }
                rows={4}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Be as specific as possible. Include details about authentication, data format, and any special requirements.
              </p>
            </div>
          )}

          {/* Generate Button */}
          {!generatedConfig && (
            <Button
              onClick={handleGenerate}
              disabled={!description.trim() || generateIntegration.isPending}
              className="w-full"
              size="lg"
            >
              {generateIntegration.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Configuration...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generate Integration Configuration
                </>
              )}
            </Button>
          )}

          {/* Generated Configuration */}
          <AnimatePresence>
            {generatedConfig && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold">Configuration Generated</h3>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyConfig}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEnhance}
                      disabled={enhanceIntegration.isPending}
                    >
                      {enhanceIntegration.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Enhance
                    </Button>
                  </div>
                </div>

                {/* Configuration Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{generatedConfig.name}</CardTitle>
                    <CardDescription>{generatedConfig.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Service Type */}
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {generatedConfig.serviceType}
                      </Badge>
                      {generatedConfig.httpMethod && (
                        <Badge variant="outline">{generatedConfig.httpMethod}</Badge>
                      )}
                    </div>

                    {/* Webhook URL */}
                    {generatedConfig.webhookUrl && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Webhook URL</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                            {generatedConfig.webhookUrl}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedConfig.webhookUrl!);
                              toast.success('URL copied');
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Authentication */}
                    {generatedConfig.authentication && generatedConfig.authentication.type !== 'none' && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Authentication</Label>
                        <div className="flex items-center gap-2 mt-1">
                          <Key className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm capitalize">
                            {generatedConfig.authentication.type.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Headers */}
                    {generatedConfig.headers && Object.keys(generatedConfig.headers).length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Headers</Label>
                        <div className="mt-1 space-y-1">
                          {Object.entries(generatedConfig.headers).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2 text-xs">
                              <code className="bg-muted px-2 py-1 rounded">{key}:</code>
                              <code className="bg-muted px-2 py-1 rounded flex-1">{value}</code>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Parameter Mappings */}
                    {generatedConfig.parameterMappings && generatedConfig.parameterMappings.length > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Parameter Mappings</Label>
                        <div className="mt-1 space-y-1">
                          {generatedConfig.parameterMappings.map((mapping, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 text-xs bg-muted p-2 rounded"
                            >
                              <span className="font-medium">{mapping.sourceField}</span>
                              <span>→</span>
                              <span>{mapping.targetField}</span>
                              {mapping.required && (
                                <Badge variant="destructive" className="text-xs">Required</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Body Template */}
                    {generatedConfig.bodyTemplate && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Body Template</Label>
                        <div className="mt-1">
                          <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                            <code>{JSON.stringify(JSON.parse(generatedConfig.bodyTemplate), null, 2)}</code>
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Retry Config */}
                    {generatedConfig.retryConfig && (
                      <div>
                        <Label className="text-xs text-muted-foreground">Retry Configuration</Label>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {generatedConfig.retryConfig.maxRetries} retries with{' '}
                          {generatedConfig.retryConfig.retryDelay}ms delay
                        </div>
                      </div>
                    )}

                    {/* Advanced Options Toggle */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                    </Button>

                    {showAdvanced && (
                      <div className="space-y-2 pt-2 border-t">
                        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto max-h-64">
                          <code>{JSON.stringify(generatedConfig, null, 2)}</code>
                        </pre>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGeneratedConfig(null);
                      setDescription('');
                      setSelectedService(null);
                    }}
                  >
                    Start Over
                  </Button>
                  <Button onClick={handleUseConfig} className="flex-1">
                    Use This Configuration
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

