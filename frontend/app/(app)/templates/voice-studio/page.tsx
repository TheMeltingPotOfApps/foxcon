'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  useVoicePresets,
  useCreateVoicePreset,
  useUpdateVoicePreset,
  useDeleteVoicePreset,
  useSetDefaultVoicePreset,
  type CreateVoicePresetDto,
} from '@/lib/hooks/use-voice-presets';
import {
  useKokoroVoices,
  usePreviewKokoroAudio,
} from '@/lib/hooks/use-voice-messages';
import { Plus, Play, Loader2, Volume2, Star, Edit2, Trash2, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const AVAILABLE_TAGS = [
  'breathe',
  'excited',
  'whisper',
  'loud',
  'slow',
  'fast',
  'calm',
  'energetic',
  'sad',
  'happy',
  'serious',
  'casual',
  'professional',
  'friendly',
];

export default function VoiceStudioPage() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingPreset, setEditingPreset] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState('Hello, this is a preview of your voice preset.');
  const [previewingPreset, setPreviewingPreset] = useState<string | null>(null);
  const [previewingInDialog, setPreviewingInDialog] = useState(false);
  
  const { data: presets = [], isLoading } = useVoicePresets();
  const { data: voices = [], isLoading: voicesLoading, error: voicesError } = useKokoroVoices();
  const createPreset = useCreateVoicePreset();
  const updatePreset = useUpdateVoicePreset();
  const deletePreset = useDeleteVoicePreset();
  const setDefault = useSetDefaultVoicePreset();
  const previewAudio = usePreviewKokoroAudio();

  const [formData, setFormData] = useState<CreateVoicePresetDto>({
    name: '',
    description: '',
    kokoroVoiceId: '',
    kokoroVoiceName: '',
    customVoiceName: '',
    voiceConfig: {
      stability: 0.5,
      similarityBoost: 0.75,
      style: 0.0,
      useSpeakerBoost: true,
      speed: 1.0,
      speedVariance: 0.0,
      pitch: 0.0,
      volume: 1.0,
      pauseDuration: 0.5,
      emphasisStrength: 0.5,
      prosodyLevel: 0.5,
    },
    tags: [],
    isDefault: false,
    isActive: true,
  });

  const handleOpenCreate = () => {
    setFormData({
      name: '',
      description: '',
      kokoroVoiceId: '',
      kokoroVoiceName: '',
      customVoiceName: '',
      voiceConfig: {
        stability: 0.5,
        similarityBoost: 0.75,
        style: 0.0,
        useSpeakerBoost: true,
        speed: 1.0,
        speedVariance: 0.0,
        pitch: 0.0,
        volume: 1.0,
        pauseDuration: 0.5,
        emphasisStrength: 0.5,
        prosodyLevel: 0.5,
      },
      tags: [],
      isDefault: false,
      isActive: true,
    });
    setEditingPreset(null);
    setShowCreateDialog(true);
  };

  const handleOpenEdit = (preset: any) => {
    setFormData({
      name: preset.name,
      description: preset.description || '',
      kokoroVoiceId: preset.kokoroVoiceId,
      kokoroVoiceName: preset.kokoroVoiceName || '',
      customVoiceName: preset.customVoiceName || '',
      voiceConfig: {
        stability: preset.voiceConfig?.stability ?? 0.5,
        similarityBoost: preset.voiceConfig?.similarityBoost ?? 0.75,
        style: preset.voiceConfig?.style ?? 0.0,
        useSpeakerBoost: preset.voiceConfig?.useSpeakerBoost ?? true,
        speed: preset.voiceConfig?.speed ?? 1.0,
        speedVariance: preset.voiceConfig?.speedVariance ?? 0.0,
        pitch: preset.voiceConfig?.pitch ?? 0.0,
        volume: preset.voiceConfig?.volume ?? 1.0,
        pauseDuration: preset.voiceConfig?.pauseDuration ?? 0.5,
        emphasisStrength: preset.voiceConfig?.emphasisStrength ?? 0.5,
        prosodyLevel: preset.voiceConfig?.prosodyLevel ?? 0.5,
      },
      tags: preset.tags || [],
      isDefault: preset.isDefault,
      isActive: preset.isActive,
    });
    setEditingPreset(preset.id);
    setShowCreateDialog(true);
  };

  const handleSubmit = async () => {
    try {
      if (editingPreset) {
        await updatePreset.mutateAsync({ id: editingPreset, data: formData });
        toast.success('Voice preset updated successfully!');
      } else {
        await createPreset.mutateAsync(formData);
        toast.success('Voice preset created successfully!');
      }
      setShowCreateDialog(false);
      setEditingPreset(null);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save voice preset');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this voice preset?')) return;
    try {
      await deletePreset.mutateAsync(id);
      toast.success('Voice preset deleted successfully!');
    } catch (error: any) {
      toast.error('Failed to delete voice preset');
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefault.mutateAsync(id);
      toast.success('Default preset updated!');
    } catch (error: any) {
      toast.error('Failed to set default preset');
    }
  };

  const handlePreview = async (preset: any, text?: string) => {
    const textToUse = text || previewText;
    setPreviewingPreset(preset.id);
    try {
      // Process tags in text (e.g., [breathe], [excited])
      let processedText = textToUse;
      preset.tags?.forEach((tag: string) => {
        processedText = processedText.replace(new RegExp(`\\[${tag}\\]`, 'gi'), '');
      });

      const result = await previewAudio.mutateAsync({
        text: processedText,
        voiceId: preset.kokoroVoiceId,
        voiceConfig: {
          stability: preset.voiceConfig?.stability,
          similarity_boost: preset.voiceConfig?.similarityBoost,
          style: preset.voiceConfig?.style,
          use_speaker_boost: preset.voiceConfig?.useSpeakerBoost,
          speed: preset.voiceConfig?.speed,
          speed_variance: preset.voiceConfig?.speedVariance,
          pitch: preset.voiceConfig?.pitch,
          volume: preset.voiceConfig?.volume,
          pause_duration: preset.voiceConfig?.pauseDuration,
          emphasis_strength: preset.voiceConfig?.emphasisStrength,
          prosody_level: preset.voiceConfig?.prosodyLevel,
        },
      });

      // Play audio - prefer data URL, fallback to constructing full URL
      let audioSource = result.audioDataUrl;
      if (!audioSource && result.audioUrl) {
        // Construct full URL if we only have a relative path
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        audioSource = result.audioUrl.startsWith('http') 
          ? result.audioUrl 
          : `${baseUrl}${result.audioUrl}`;
      }
      
      if (!audioSource) {
        throw new Error('No audio source available');
      }

      const audio = new Audio(audioSource);
      audio.play().catch((err) => {
        console.error('Failed to play audio:', err);
        toast.error('Failed to play audio. Please check your browser audio settings.');
      });
      toast.success('Playing preview...');
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error(error?.response?.data?.message || 'Failed to generate preview');
    } finally {
      setPreviewingPreset(null);
    }
  };

  const handlePreviewFromDialog = async () => {
    if (!formData.kokoroVoiceId) {
      toast.error('Please select a voice first');
      return;
    }
    if (!previewText.trim()) {
      toast.error('Please enter some text to preview');
      return;
    }
    setPreviewingInDialog(true);
    try {
      const result = await previewAudio.mutateAsync({
        text: previewText,
        voiceId: formData.kokoroVoiceId,
        voiceConfig: {
          stability: formData.voiceConfig?.stability,
          similarity_boost: formData.voiceConfig?.similarityBoost,
          style: formData.voiceConfig?.style,
          use_speaker_boost: formData.voiceConfig?.useSpeakerBoost,
          speed: formData.voiceConfig?.speed,
          speed_variance: formData.voiceConfig?.speedVariance,
          pitch: formData.voiceConfig?.pitch,
          volume: formData.voiceConfig?.volume,
          pause_duration: formData.voiceConfig?.pauseDuration,
          emphasis_strength: formData.voiceConfig?.emphasisStrength,
          prosody_level: formData.voiceConfig?.prosodyLevel,
        },
      });

      // Play audio - use data URL if available, otherwise use file URL
      const audioSource = result.audioDataUrl || result.audioUrl;
      const audio = new Audio(audioSource);
      audio.play().catch((err) => {
        console.error('Failed to play audio:', err);
        toast.error('Failed to play audio. Please check your browser audio settings.');
      });
      toast.success('Playing preview...');
    } catch (error: any) {
      console.error('Preview error:', error);
      toast.error(error?.response?.data?.message || 'Failed to generate preview');
    } finally {
      setPreviewingInDialog(false);
    }
  };

  const toggleTag = (tag: string) => {
    const currentTags = formData.tags || [];
    if (currentTags.includes(tag)) {
      setFormData({
        ...formData,
        tags: currentTags.filter((t) => t !== tag),
      });
    } else {
      setFormData({
        ...formData,
        tags: [...currentTags, tag],
      });
    }
  };

  const selectedVoice = Array.isArray(voices) ? voices.find((v: any) => v.voice_id === formData.kokoroVoiceId) : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8" />
            AI Voice Studio
          </h1>
          <p className="text-muted-foreground">
            Create and fine-tune voice presets with custom parameters and tags
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Preset
        </Button>
      </div>

      {voicesError && (
        <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="py-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              ⚠️ Unable to load voices. Please ensure the Kokoro API is running and accessible.
            </p>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        </div>
      ) : presets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Volume2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No voice presets created yet</p>
            <Button variant="outline" onClick={handleOpenCreate}>
              Create Your First Preset
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((preset) => (
            <Card key={preset.id} className={preset.isDefault ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {preset.name}
                      {preset.isDefault && <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />}
                    </CardTitle>
                    {preset.description && (
                      <CardDescription className="mt-1">{preset.description}</CardDescription>
                    )}
                  </div>
                  <Badge variant={preset.isActive ? 'default' : 'secondary'}>
                    {preset.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-1">Voice</p>
                  <p className="text-sm text-muted-foreground">
                    {preset.kokoroVoiceName || preset.kokoroVoiceId}
                  </p>
                  {preset.customVoiceName && (
                    <p className="text-xs text-muted-foreground mt-1">
                      AI Name: <span className="font-medium">{preset.customVoiceName}</span>
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Tags</p>
                  <div className="flex flex-wrap gap-1">
                    {preset.tags && preset.tags.length > 0 ? (
                      preset.tags.map((tag: string) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          [{tag}]
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No tags</span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-1">Voice Config</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>Stability: {preset.voiceConfig?.stability?.toFixed(2) || '0.50'}</div>
                    <div>Similarity: {preset.voiceConfig?.similarityBoost?.toFixed(2) || '0.75'}</div>
                    <div>Style: {preset.voiceConfig?.style?.toFixed(2) || '0.00'}</div>
                    <div>Speed: {preset.voiceConfig?.speed?.toFixed(2) || '1.00'}</div>
                    {preset.voiceConfig?.pitch !== undefined && preset.voiceConfig.pitch !== 0 && (
                      <div>Pitch: {preset.voiceConfig.pitch > 0 ? '+' : ''}{preset.voiceConfig.pitch.toFixed(1)}</div>
                    )}
                    {preset.voiceConfig?.volume !== undefined && preset.voiceConfig.volume !== 1.0 && (
                      <div>Volume: {preset.voiceConfig.volume.toFixed(2)}x</div>
                    )}
                    {preset.voiceConfig?.prosodyLevel !== undefined && preset.voiceConfig.prosodyLevel !== 0.5 && (
                      <div>Prosody: {preset.voiceConfig.prosodyLevel.toFixed(2)}</div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreview(preset)}
                    disabled={previewingPreset === preset.id}
                  >
                    {previewingPreset === preset.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(preset)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  {!preset.isDefault && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSetDefault(preset.id)}
                    >
                      <Star className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(preset.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPreset ? 'Edit Voice Preset' : 'Create Voice Preset'}</DialogTitle>
            <DialogDescription>
              Configure voice parameters and tags for your AI voice preset
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Professional Voice, Casual Voice"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe when to use this preset..."
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Voice</label>
              <Select
                value={formData.kokoroVoiceId}
                onChange={(e) => {
                  const voice = Array.isArray(voices) ? voices.find((v: any) => v.voice_id === e.target.value) : undefined;
                  setFormData({
                    ...formData,
                    kokoroVoiceId: e.target.value,
                    kokoroVoiceName: voice?.name || '',
                    // Auto-populate custom voice name if empty, extracting just the name part
                    customVoiceName: formData.customVoiceName || (voice?.name ? voice.name.split(' - ')[0].split(' – ')[0].trim() : ''),
                  });
                }}
              >
                <option value="">Select a voice...</option>
                {Array.isArray(voices) && voices.length > 0 ? (
                  voices.map((voice: any) => (
                    <option key={voice.voice_id} value={voice.voice_id}>
                      {voice.name} ({voice.category})
                    </option>
                  ))
                ) : (
                  <option value="" disabled>Loading voices...</option>
                )}
              </Select>
              {Array.isArray(voices) && voices.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1">No voices available. Please check your Kokoro API connection.</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">
                AI Agent Name <span className="text-xs text-muted-foreground">(Used in templates/journeys)</span>
              </label>
              <Input
                value={formData.customVoiceName || ''}
                onChange={(e) => setFormData({ ...formData, customVoiceName: e.target.value })}
                placeholder="e.g., Sarah, Tiffany, Michael"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is the name that will be used when the AI introduces itself in calls and templates. Leave empty to use the voice name.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Preview Text</label>
              <Textarea
                value={previewText}
                onChange={(e) => setPreviewText(e.target.value)}
                placeholder="Enter text to preview with this voice preset... Use tags like [breathe] or [excited] if enabled."
                rows={4}
                className="font-mono text-sm"
              />
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">
                  {previewText.length} characters
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handlePreviewFromDialog}
                  disabled={previewingInDialog || !formData.kokoroVoiceId || previewText.trim().length === 0}
                >
                  {previewingInDialog ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Preview Voice
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Stability: {formData.voiceConfig?.stability?.toFixed(2) || '0.50'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
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
                  Controls voice consistency (0 = more variation, 1 = more consistent)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Similarity Boost: {formData.voiceConfig?.similarityBoost?.toFixed(2) || '0.75'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
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
                  How closely the voice matches the original (0-1)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Style: {formData.voiceConfig?.style?.toFixed(2) || '0.00'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
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
                  Voice style variation (0-1)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Speed: {formData.voiceConfig?.speed?.toFixed(2) || '1.00'}
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={formData.voiceConfig?.speed || 1.0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      voiceConfig: {
                        ...formData.voiceConfig,
                        speed: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Speech speed multiplier (0.5 = slow, 2.0 = fast)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pitch: {formData.voiceConfig?.pitch !== undefined ? (formData.voiceConfig.pitch > 0 ? '+' : '') + formData.voiceConfig.pitch.toFixed(1) : '0.0'} semitones
                </label>
                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={formData.voiceConfig?.pitch || 0.0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      voiceConfig: {
                        ...formData.voiceConfig,
                        pitch: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Adjust voice pitch (-12 = lower, +12 = higher, 0 = normal)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Volume: {formData.voiceConfig?.volume?.toFixed(2) || '1.00'}x
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={formData.voiceConfig?.volume || 1.0}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      voiceConfig: {
                        ...formData.voiceConfig,
                        volume: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Audio output volume (0.0 = silent, 2.0 = 2x louder)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Pause Duration: {formData.voiceConfig?.pauseDuration?.toFixed(2) || '0.50'}s
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={formData.voiceConfig?.pauseDuration || 0.5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      voiceConfig: {
                        ...formData.voiceConfig,
                        pauseDuration: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pause length between phrases (0.0 = no pause, 2.0 = long pause)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Emphasis Strength: {formData.voiceConfig?.emphasisStrength?.toFixed(2) || '0.50'}
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={formData.voiceConfig?.emphasisStrength || 0.5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      voiceConfig: {
                        ...formData.voiceConfig,
                        emphasisStrength: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  How strongly emphasis tags are applied (0.0 = subtle, 1.0 = strong)
                </p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Prosody Level: {formData.voiceConfig?.prosodyLevel?.toFixed(2) || '0.50'}
                </label>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.01"
                  value={formData.voiceConfig?.prosodyLevel || 0.5}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      voiceConfig: {
                        ...formData.voiceConfig,
                        prosodyLevel: parseFloat(e.target.value),
                      },
                    })
                  }
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Overall expressiveness and prosody (0.0 = flat, 1.0 = very expressive)
                </p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tags</label>
              <p className="text-xs text-muted-foreground mb-2">
                Select tags that can be used in your text (e.g., [breathe], [excited])
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag: string) => (
                  <Badge
                    key={tag}
                    variant={formData.tags?.includes(tag) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    [{tag}]
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDefault || false}
                  onChange={(e) =>
                    setFormData({ ...formData, isDefault: e.target.checked })
                  }
                />
                <span className="text-sm">Set as default preset</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive ?? true}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                />
                <span className="text-sm">Active</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={!formData.name || !formData.kokoroVoiceId}>
              {editingPreset ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
