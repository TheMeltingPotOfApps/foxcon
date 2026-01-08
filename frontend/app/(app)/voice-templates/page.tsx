'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  useVoiceTemplates,
  useCreateVoiceTemplate,
  useKokoroVoices,
  usePreviewKokoroAudio,
  type CreateVoiceTemplateDto,
} from '@/lib/hooks/use-voice-messages';
import { useVoicePresets } from '@/lib/hooks/use-voice-presets';
import { Plus, Play, Loader2, Volume2, Pause, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function VoiceTemplatesPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: templates = [], isLoading } = useVoiceTemplates();
  const createTemplate = useCreateVoiceTemplate();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Voice Templates</h1>
          <p className="text-muted-foreground">
            Create and manage voice message templates
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : templates.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No voice templates created yet</p>
            <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
              Create Your First Template
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((template) => (
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
      )}

      {showCreateDialog && (
        <CreateVoiceTemplateDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={async (data) => {
            try {
              await createTemplate.mutateAsync(data);
              toast.success('Voice template created successfully');
              setShowCreateDialog(false);
            } catch (error: any) {
              toast.error(error?.response?.data?.message || 'Failed to create template');
            }
          }}
        />
      )}
    </div>
  );
}

function CreateVoiceTemplateDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: CreateVoiceTemplateDto) => Promise<void>;
}) {
  const { data: voices = [], isLoading: voicesLoading } = useKokoroVoices();
  const { data: presets = [] } = useVoicePresets();
  const previewAudio = usePreviewKokoroAudio();
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewAudioElement, setPreviewAudioElement] = useState<HTMLAudioElement | null>(null);
  
  const [formData, setFormData] = useState<CreateVoiceTemplateDto>({
    name: '',
    description: '',
    messageContent: '',
    kokoroVoiceId: '',
    kokoroVoiceName: '',
    voicePresetId: '',
    voiceConfig: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
    },
    audioEffects: {
      distance: 'medium',
      backgroundNoise: {
        enabled: false,
        volume: 0.3,
      },
      volume: 1.0,
      coughEffects: [],
    },
    isActive: true,
  });

  const selectedVoice = Array.isArray(voices) ? voices.find((v: any) => v.voice_id === formData.kokoroVoiceId) : undefined;
  const selectedPreset = Array.isArray(presets) ? presets.find((p: any) => p.id === formData.voicePresetId) : undefined;

  // When preset is selected, apply its settings
  const handlePresetChange = (presetId: string) => {
    const preset = Array.isArray(presets) ? presets.find((p: any) => p.id === presetId) : undefined;
    if (preset) {
      setFormData({
        ...formData,
        voicePresetId: presetId,
        kokoroVoiceId: preset.kokoroVoiceId,
        kokoroVoiceName: preset.kokoroVoiceName || '',
        voiceConfig: {
          ...preset.voiceConfig,
          ...formData.voiceConfig, // Keep any manual overrides
        },
      });
    } else {
      setFormData({
        ...formData,
        voicePresetId: '',
      });
    }
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.messageContent) {
      toast.error('Please fill in name and message content');
      return;
    }
    // Voice ID is required unless preset is selected
    if (!formData.voicePresetId && !formData.kokoroVoiceId) {
      toast.error('Please select a voice preset or a voice');
      return;
    }
    onCreate(formData);
  };

  const handlePreview = async () => {
    if (!formData.messageContent || !formData.kokoroVoiceId) {
      toast.error('Please enter message content and select a voice');
      return;
    }

    try {
      // Stop any currently playing audio
      if (previewAudioElement) {
        previewAudioElement.pause();
        previewAudioElement.currentTime = 0;
        setIsPlayingPreview(false);
      }

      // Generate preview audio
      const result = await previewAudio.mutateAsync({
        text: formData.messageContent,
        voiceId: formData.kokoroVoiceId,
        voiceConfig: {
          stability: formData.voiceConfig?.stability ?? 0.5,
          similarity_boost: formData.voiceConfig?.similarityBoost ?? 0.75,
          style: formData.voiceConfig?.style ?? 0.0,
          use_speaker_boost: formData.voiceConfig?.useSpeakerBoost ?? true,
        },
        audioEffects: formData.audioEffects,
      });

      // Create audio URL from the backend response
      const audioUrl = result.audioUrl.startsWith('http') 
        ? result.audioUrl 
        : `${window.location.origin}${result.audioUrl}`;
      
      setPreviewAudioUrl(audioUrl);
      
      // Play the audio
      const audio = new Audio(audioUrl);
      setPreviewAudioElement(audio);
      setIsPlayingPreview(true);
      
      audio.onended = () => {
        setIsPlayingPreview(false);
      };
      
      audio.onerror = () => {
        toast.error('Failed to play preview audio');
        setIsPlayingPreview(false);
      };
      
      await audio.play();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate preview');
    }
  };

  const stopPreview = () => {
    if (previewAudioElement) {
      previewAudioElement.pause();
      previewAudioElement.currentTime = 0;
      setIsPlayingPreview(false);
    }
  };

  // Extract variables from message content
  const variables = formData.messageContent.match(/\{(\w+)\}/g) || [];
  const uniqueVariables = Array.from(
    new Set(variables.map((v) => v.replace(/[{}]/g, ''))),
  );

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
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
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                Voice Preset
                <Sparkles className="h-4 w-4 text-muted-foreground" />
              </label>
              <Select
                value={formData.voicePresetId || ''}
                onChange={(e) => handlePresetChange(e.target.value)}
              >
                <option value="">None (Manual Configuration)</option>
                {Array.isArray(presets) ? presets
                  .filter((p: any) => p.isActive)
                  .map((preset: any) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} {preset.isDefault && '⭐'}
                    </option>
                  )) : []}
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select a preset from AI Voice Studio to auto-configure voice settings
              </p>
            </div>
          </div>

          {selectedPreset && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Using Preset: {selectedPreset.name}
                  </p>
                  {selectedPreset.description && (
                    <p className="text-xs text-muted-foreground mt-1">{selectedPreset.description}</p>
                  )}
                  {selectedPreset.tags && selectedPreset.tags.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium mb-1">Available Tags:</p>
                      <div className="flex flex-wrap gap-1">
                        {selectedPreset.tags.map((tag: string) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            [{tag}]
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use these tags in your message (e.g., [breathe], [excited]). They will be processed as instructions, not spoken.
                      </p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handlePresetChange('')}
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Voice *</label>
            {voicesLoading ? (
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
                disabled={!!selectedPreset}
              >
                <option value="">Select a voice...</option>
                {Array.isArray(voices) ? voices.map((voice: any) => (
                  <option key={voice.voice_id} value={voice.voice_id}>
                    {voice.name} {voice.category && `(${voice.category})`}
                  </option>
                )) : []}
              </Select>
            )}
            {selectedPreset && (
              <p className="text-xs text-muted-foreground mt-1">
                Voice is set by the preset. Clear preset to select manually.
              </p>
            )}
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
            {selectedPreset && selectedPreset.tags && selectedPreset.tags.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                <strong>Tags:</strong> You can use tags like {selectedPreset.tags.map((tag: string) => `[${tag}]`).join(', ')} in your message. 
                These tags are processed as instructions (pauses, tone changes, etc.) and are not spoken aloud.
              </p>
            )}
            {uniqueVariables.length > 0 && (
              <div className="mt-2">
                <p className="text-xs font-medium mb-1">Detected Variables:</p>
                <div className="flex flex-wrap gap-1">
                  {uniqueVariables.map((variable: string) => (
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
            <p className="text-xs text-muted-foreground mb-4">
              Adjust these settings to customize the voice output. Lower stability = faster speech, higher similarity boost = more consistent voice.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Stability ({formData.voiceConfig?.stability?.toFixed(1) || '0.5'})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
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
                <p className="text-xs text-muted-foreground mt-1">
                  Controls speed variation. Lower = faster, Higher = slower
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Similarity Boost ({formData.voiceConfig?.similarityBoost?.toFixed(1) || '0.8'})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
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
                <p className="text-xs text-muted-foreground mt-1">
                  Controls voice consistency. Higher = less variation
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Style ({formData.voiceConfig?.style?.toFixed(1) || '0.0'})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
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
                <p className="text-xs text-muted-foreground mt-1">
                  Voice style parameter (currently unused)
                </p>
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
              {/* Distance Effect */}
              <div>
                <label className="text-sm font-medium mb-2 block">Distance</label>
                <select
                  value={formData.audioEffects?.distance || 'medium'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      audioEffects: {
                        ...formData.audioEffects,
                        distance: e.target.value as 'close' | 'medium' | 'far',
                      },
                    })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="close">Close (Clear, minimal reverb)</option>
                  <option value="medium">Medium (Moderate reverb)</option>
                  <option value="far">Far (Strong reverb, distant sound)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  Simulates the distance of the speaker from the microphone
                </p>
              </div>

              {/* Background Noise */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.audioEffects?.backgroundNoise?.enabled || false}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        audioEffects: {
                          ...formData.audioEffects,
                          backgroundNoise: {
                            ...formData.audioEffects?.backgroundNoise,
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
                  <div className="ml-6 space-y-2">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Noise Volume ({((formData.audioEffects?.backgroundNoise?.volume || 0.3) * 100).toFixed(0)}%)
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={formData.audioEffects?.backgroundNoise?.volume || 0.3}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            audioEffects: {
                              ...formData.audioEffects,
                              backgroundNoise: {
                                ...formData.audioEffects?.backgroundNoise,
                                enabled: true,
                                volume: parseFloat(e.target.value),
                              },
                            },
                          })
                        }
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Volume of background office ambience relative to speech
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Overall Volume */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Overall Volume ({((formData.audioEffects?.volume || 1.0) * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={formData.audioEffects?.volume || 1.0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      audioEffects: {
                        ...formData.audioEffects,
                        volume: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust the overall volume of the final audio output
                </p>
              </div>

              {/* Cough Effects */}
              <div>
                <label className="text-sm font-medium mb-2 block">Cough Sound Effects</label>
                <div className="space-y-2">
                  {(formData.audioEffects?.coughEffects || []).map((cough, index) => (
                    <div key={index} className="flex gap-2 items-end p-2 border rounded-md">
                      <div className="flex-1">
                        <label className="text-xs font-medium mb-1 block">Cough Type</label>
                        <select
                          value={cough.file}
                          onChange={(e) => {
                            const newCoughs = [...(formData.audioEffects?.coughEffects || [])];
                            newCoughs[index].file = e.target.value as any;
                            setFormData({
                              ...formData,
                              audioEffects: {
                                ...formData.audioEffects,
                                coughEffects: newCoughs,
                              },
                            });
                          }}
                          className="w-full px-2 py-1 border rounded text-sm"
                        >
                          <option value="stifled-cough">Stifled Cough</option>
                          <option value="coughing-woman">Coughing Woman</option>
                          <option value="coughing-woman-2">Coughing Woman 2</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium mb-1 block">
                          Timestamp (seconds)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={cough.timestamp}
                          onChange={(e) => {
                            const newCoughs = [...(formData.audioEffects?.coughEffects || [])];
                            newCoughs[index].timestamp = parseFloat(e.target.value);
                            setFormData({
                              ...formData,
                              audioEffects: {
                                ...formData.audioEffects,
                                coughEffects: newCoughs,
                              },
                            });
                          }}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-medium mb-1 block">
                          Volume ({((cough.volume || 0.5) * 100).toFixed(0)}%)
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={cough.volume || 0.5}
                          onChange={(e) => {
                            const newCoughs = [...(formData.audioEffects?.coughEffects || [])];
                            newCoughs[index].volume = parseFloat(e.target.value);
                            setFormData({
                              ...formData,
                              audioEffects: {
                                ...formData.audioEffects,
                                coughEffects: newCoughs,
                              },
                            });
                          }}
                          className="w-full"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const newCoughs = [...(formData.audioEffects?.coughEffects || [])];
                          newCoughs.splice(index, 1);
                          setFormData({
                            ...formData,
                            audioEffects: {
                              ...formData.audioEffects,
                              coughEffects: newCoughs,
                            },
                          });
                        }}
                      >
                        Remove
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
                            {
                              file: 'stifled-cough' as const,
                              timestamp: 0,
                              volume: 0.5,
                            },
                          ],
                        },
                      });
                    }}
                  >
                    + Add Cough Effect
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Add cough sound effects at specific timestamps in your audio
                </p>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Preview</p>
              <div className="flex gap-2">
                {previewAudioUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={isPlayingPreview ? stopPreview : () => {
                      if (previewAudioElement) {
                        previewAudioElement.play();
                        setIsPlayingPreview(true);
                      }
                    }}
                    disabled={previewAudio.isPending}
                  >
                    {isPlayingPreview ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreview}
                    disabled={previewAudio.isPending || !formData.messageContent || !formData.kokoroVoiceId}
                >
                  {previewAudio.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Volume2 className="h-4 w-4 mr-1" />
                      Generate Preview
                    </>
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Generate a preview of your voice template with the current settings. Use sample text or your actual message content.
            </p>
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
      </DialogContent>
    </Dialog>
  );
}

