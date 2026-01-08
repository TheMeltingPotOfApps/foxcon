-- Update all existing voice templates to use the "Heart" voice preset
-- Heart voice ID: 21m00Tcm4TlvDq8ikWAM

UPDATE voice_templates
SET 
  "kokoroVoiceId" = '21m00Tcm4TlvDq8ikWAM',
  "kokoroVoiceName" = 'Heart',
  "elevenLabsVoiceId" = COALESCE("elevenLabsVoiceId", '21m00Tcm4TlvDq8ikWAM'),
  "elevenLabsVoiceName" = COALESCE("elevenLabsVoiceName", 'Heart'),
  "voiceConfig" = COALESCE("voiceConfig", '{"stability":0.5,"similarityBoost":0.75,"style":0,"useSpeakerBoost":true}')::jsonb,
  "updatedAt" = NOW()
WHERE 
  "kokoroVoiceId" IS NULL 
  OR "kokoroVoiceId" != '21m00Tcm4TlvDq8ikWAM'
  OR "kokoroVoiceName" IS NULL
  OR "kokoroVoiceName" != 'Heart';

-- Set default voice config for all templates if not set
UPDATE voice_templates
SET 
  "voiceConfig" = '{"stability":0.5,"similarityBoost":0.75,"style":0,"useSpeakerBoost":true}'::jsonb,
  "updatedAt" = NOW()
WHERE 
  "voiceConfig" IS NULL;
