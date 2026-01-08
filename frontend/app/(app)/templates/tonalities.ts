// Expanded tonality options for journey template builder

export const MARKETING_ANGLES = [
  { value: 'corporate', label: 'Corporate', description: 'Professional and formal', icon: '🏢' },
  { value: 'personable', label: 'Personable', description: 'Friendly and conversational', icon: '👋' },
  { value: 'psa', label: 'PSA Style', description: 'Public service announcement style', icon: '📢' },
  { value: 'consultative', label: 'Consultative', description: 'Advisory and solution-focused', icon: '💼' },
  { value: 'educational', label: 'Educational', description: 'Informative and teaching-oriented', icon: '📚' },
  { value: 'storytelling', label: 'Storytelling', description: 'Narrative-driven and engaging', icon: '📖' },
  { value: 'direct', label: 'Direct', description: 'Straightforward and to-the-point', icon: '🎯' },
  { value: 'empathetic', label: 'Empathetic', description: 'Understanding and compassionate', icon: '❤️' },
  { value: 'authoritative', label: 'Authoritative', description: 'Confident and expert', icon: '👑' },
  { value: 'casual', label: 'Casual', description: 'Relaxed and informal', icon: '😊' },
  { value: 'urgent', label: 'Urgent', description: 'Time-sensitive and action-oriented', icon: '⏰' },
  { value: 'reassuring', label: 'Reassuring', description: 'Calming and confidence-building', icon: '🤗' },
  { value: 'motivational', label: 'Motivational', description: 'Inspiring and energizing', icon: '🚀' },
  { value: 'humorous', label: 'Humorous', description: 'Light-hearted and witty', icon: '😄' },
  { value: 'serious', label: 'Serious', description: 'Solemn and weighty', icon: '😐' },
  { value: 'warm', label: 'Warm', description: 'Inviting and welcoming', icon: '🔥' },
  { value: 'professional', label: 'Professional', description: 'Business-like and polished', icon: '💼' },
  { value: 'friendly', label: 'Friendly', description: 'Approachable and amiable', icon: '🤝' },
  { value: 'persuasive', label: 'Persuasive', description: 'Convincing and compelling', icon: '💡' },
  { value: 'supportive', label: 'Supportive', description: 'Encouraging and helpful', icon: '🤲' },
  { value: 'innovative', label: 'Innovative', description: 'Forward-thinking and modern', icon: '✨' },
  { value: 'traditional', label: 'Traditional', description: 'Classic and time-tested', icon: '🏛️' },
  { value: 'bold', label: 'Bold', description: 'Daring and assertive', icon: '💪' },
  { value: 'subtle', label: 'Subtle', description: 'Gentle and understated', icon: '🌙' },
];

export const SENTIMENTS = [
  { value: 'kind', label: 'Kind', description: 'Gentle and considerate', icon: '💝' },
  { value: 'caring', label: 'Caring', description: 'Nurturing and attentive', icon: '🤗' },
  { value: 'concerned', label: 'Concerned', description: 'Worried and attentive', icon: '😟' },
  { value: 'excited', label: 'Excited', description: 'Enthusiastic and energetic', icon: '🎉' },
  { value: 'grateful', label: 'Grateful', description: 'Thankful and appreciative', icon: '🙏' },
  { value: 'hopeful', label: 'Hopeful', description: 'Optimistic and positive', icon: '🌟' },
  { value: 'sympathetic', label: 'Sympathetic', description: 'Understanding and compassionate', icon: '💙' },
  { value: 'enthusiastic', label: 'Enthusiastic', description: 'Passionate and eager', icon: '🔥' },
  { value: 'empathetic', label: 'Empathetic', description: 'Deeply understanding', icon: '💜' },
  { value: 'supportive', label: 'Supportive', description: 'Encouraging and helpful', icon: '🤲' },
  { value: 'reassuring', label: 'Reassuring', description: 'Comforting and calming', icon: '🕊️' },
  { value: 'confident', label: 'Confident', description: 'Self-assured and certain', icon: '💪' },
  { value: 'optimistic', label: 'Optimistic', description: 'Positive and hopeful', icon: '☀️' },
  { value: 'sincere', label: 'Sincere', description: 'Genuine and authentic', icon: '💎' },
  { value: 'passionate', label: 'Passionate', description: 'Intense and fervent', icon: '❤️' },
  { value: 'calm', label: 'Calm', description: 'Peaceful and composed', icon: '🧘' },
  { value: 'energetic', label: 'Energetic', description: 'Vibrant and lively', icon: '⚡' },
  { value: 'thoughtful', label: 'Thoughtful', description: 'Considerate and reflective', icon: '🤔' },
  { value: 'warm', label: 'Warm', description: 'Friendly and inviting', icon: '🔥' },
  { value: 'professional', label: 'Professional', description: 'Business-like and polished', icon: '💼' },
  { value: 'friendly', label: 'Friendly', description: 'Approachable and amiable', icon: '👋' },
  { value: 'urgent', label: 'Urgent', description: 'Time-sensitive and pressing', icon: '⏰' },
  { value: 'gentle', label: 'Gentle', description: 'Soft and tender', icon: '🌸' },
  { value: 'assertive', label: 'Assertive', description: 'Confident and direct', icon: '🎯' },
];

export type MarketingAngle = typeof MARKETING_ANGLES[number]['value'];
export type Sentiment = typeof SENTIMENTS[number]['value'];

