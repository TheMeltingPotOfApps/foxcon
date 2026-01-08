import { Injectable, Logger, BadRequestException, UnauthorizedException } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '../config/config.service';
import { ANTHROPIC_API_KEY } from '../config/anthropic-api-key.constants';

@Injectable()
export class AiGenerationService {
  private readonly logger = new Logger(AiGenerationService.name);
  private claudeClient: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeClient();
  }

  private initializeClient() {
    // Use hard-coded API key - non-configurable for all tenants
    this.claudeClient = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    this.logger.log('Anthropic Claude client initialized with hard-coded API key');
  }

  async generateAiTemplateConfig(businessCategory: string): Promise<any> {
    if (!this.claudeClient) {
      this.initializeClient();
    }

    const prompt = `You are an expert at analyzing businesses and determining what information they typically need to collect from customers.

Business Category: ${businessCategory}

Your task:
1. Analyze this business category and determine what chatbot configuration would be most effective
2. Generate comprehensive AI Messenger template configuration

Based on the business category "${businessCategory}", generate chatbot configuration:
- Product Information: Describe what businesses in this category typically offer, including common features/benefits
- Service Information: How services work, common processes, typical timelines
- Qualification Guidelines: Ideal customer profiles, questions the chatbot should ask, common values for fields
- Brand Tonality: What tone fits this category? (e.g., SaaS = professional/technical, E-commerce = friendly/casual, B2B = consultative)
- Welcome Message: A greeting that naturally leads into conversation. CRITICAL: The welcome message MUST end with a question to engage the user. Keep it SHORT for SMS (under 160 characters).
- Custom Instructions: Additional guidance for the chatbot behavior

Format your response as JSON with these keys: productInfo, serviceInfo, qualificationGuidelines, brandTonality, welcomeMessage, customInstructions.

Keep each field concise but informative (2-4 sentences for productInfo/serviceInfo, detailed qualificationGuidelines, 1-2 sentences for brandTonality).`;

    try {
      const model = (await this.configService.get('CLAUDE_MODEL')) || 'claude-3-5-haiku-20241022';
      const response = await this.claudeClient.messages.create({
        model,
        max_tokens: 1500,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      let responseText = '';
      if (response.content && Array.isArray(response.content)) {
        for (const contentBlock of response.content) {
          if (contentBlock.type === 'text') {
            responseText += contentBlock.text;
          }
        }
      }

      // Parse JSON from response
      let config: any = {};
      try {
        const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        if (jsonMatch) {
          config = JSON.parse(jsonMatch[1]);
        } else {
          config = JSON.parse(responseText);
        }
      } catch (parseError) {
        // Fallback parsing
        config = {
          productInfo: `We offer ${businessCategory} services designed to meet your needs.`,
          serviceInfo: `Our services include comprehensive support and solutions tailored to your requirements.`,
          qualificationGuidelines: `Ideal customers are businesses or individuals looking for ${businessCategory} solutions.`,
          brandTonality: 'Professional and friendly. Use clear, helpful language.',
          welcomeMessage: `Hi! I'm here to help with ${businessCategory}. How can I assist you today?`,
          customInstructions: `Be helpful, concise, and professional. Keep responses under 160 characters when possible.`,
        };
      }

      // Ensure welcome message is SMS-friendly
      if (config.welcomeMessage && config.welcomeMessage.length > 160) {
        config.welcomeMessage = config.welcomeMessage.substring(0, 157) + '...';
      }

      return {
        productInfo: config.productInfo || '',
        serviceInfo: config.serviceInfo || '',
        qualificationGuidelines: config.qualificationGuidelines || '',
        brandTonality: config.brandTonality || '',
        welcomeMessage: config.welcomeMessage || `Hi! I'm here to help with ${businessCategory}. How can I assist you today?`,
        customInstructions: config.customInstructions || '',
      };
    } catch (error: any) {
      throw new Error(`Failed to generate AI config: ${error.message}`);
    }
  }

  async generateSmsVariations(sampleSms: string): Promise<string[]> {
    if (!this.claudeClient) {
      this.initializeClient();
    }

    const prompt = `You are an expert SMS copywriter. Generate 5 different variations of the following SMS message. Each variation should:
1. Maintain the core message and intent
2. Use different wording, tone, or structure
3. Be optimized for SMS (under 160 characters each)
4. Be engaging and action-oriented
5. Vary in formality, urgency, or approach

Original SMS:
"${sampleSms}"

Generate 5 variations. Return ONLY a JSON array of strings, no other text. Example format:
["Variation 1 text", "Variation 2 text", "Variation 3 text", "Variation 4 text", "Variation 5 text"]`;

    try {
      const model = (await this.configService.get('CLAUDE_MODEL')) || 'claude-3-5-haiku-20241022';
      const response = await this.claudeClient.messages.create({
        model,
        max_tokens: 800,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      let responseText = '';
      if (response.content && Array.isArray(response.content)) {
        for (const contentBlock of response.content) {
          if (contentBlock.type === 'text') {
            responseText += contentBlock.text;
          }
        }
      }

      // Parse JSON array from response
      let variations: string[] = [];
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          variations = JSON.parse(jsonMatch[0]);
        } else {
          variations = JSON.parse(responseText);
        }
      } catch (parseError) {
        // Fallback: generate simple variations
        variations = [
          sampleSms,
          sampleSms.replace(/\./g, '!'),
          sampleSms.replace(/Hi/g, 'Hey'),
          sampleSms.replace(/you/g, 'u'),
          sampleSms + ' Reply STOP to opt out.',
        ];
      }

      // Ensure all variations are strings and trim
      variations = variations
        .filter((v) => typeof v === 'string')
        .map((v) => v.trim())
        .slice(0, 5);

      // Ensure we have exactly 5 variations
      while (variations.length < 5) {
        variations.push(sampleSms);
      }

      return variations.slice(0, 5);
    } catch (error: any) {
      throw new Error(`Failed to generate SMS variations: ${error.message}`);
    }
  }

  async generateContentAiVariations(exampleMessages: string[], creativity: number = 0.7): Promise<string[]> {
    if (!this.claudeClient) {
      this.initializeClient();
    }

    if (exampleMessages.length < 3 || exampleMessages.length > 10) {
      throw new Error('Please provide 3-10 example messages');
    }

    const creativityLevel = creativity < 0.3 ? 'low' : creativity < 0.7 ? 'medium' : 'high';
    
    const examplesText = exampleMessages.map((msg, idx) => `Example ${idx + 1}: "${msg}"`).join('\n');

    const prompt = `You are an expert SMS copywriter. Analyze the following ${exampleMessages.length} example SMS messages and generate 5 new variations that:
1. Match the style, tone, and messaging patterns of the examples
2. Maintain similar intent and call-to-action
3. Be optimized for SMS (under 160 characters each)
4. Be engaging and action-oriented
5. Show ${creativityLevel} creativity level (${creativityLevel === 'low' ? 'stay very close to examples' : creativityLevel === 'medium' ? 'moderate variation' : 'be more creative while maintaining style'})

Example Messages:
${examplesText}

Generate 5 variations. Return ONLY a JSON array of strings, no other text. Example format:
["Variation 1 text", "Variation 2 text", "Variation 3 text", "Variation 4 text", "Variation 5 text"]`;

    try {
      const model = (await this.configService.get('CLAUDE_MODEL')) || 'claude-3-5-haiku-20241022';
      const temperature = Math.min(0.3 + creativity * 0.7, 1.0); // Map creativity 0-1 to temperature 0.3-1.0
      
      const response = await this.claudeClient.messages.create({
        model,
        max_tokens: 1000,
        temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      let responseText = '';
      if (response.content && Array.isArray(response.content)) {
        for (const contentBlock of response.content) {
          if (contentBlock.type === 'text') {
            responseText += contentBlock.text;
          }
        }
      }

      // Parse JSON array from response
      let variations: string[] = [];
      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          variations = JSON.parse(jsonMatch[0]);
        } else {
          variations = JSON.parse(responseText);
        }
      } catch (parseError) {
        // Fallback: use first example as base
        const baseMessage = exampleMessages[0];
        variations = [
          baseMessage,
          baseMessage.replace(/\./g, '!'),
          baseMessage.replace(/Hi/g, 'Hey'),
          baseMessage.replace(/you/g, 'u'),
          baseMessage + ' Reply STOP to opt out.',
        ];
      }

      // Ensure all variations are strings and trim
      variations = variations
        .filter((v) => typeof v === 'string')
        .map((v) => v.trim())
        .slice(0, 5);

      // Ensure we have exactly 5 variations
      while (variations.length < 5) {
        variations.push(exampleMessages[0]);
      }

      return variations.slice(0, 5);
    } catch (error: any) {
      // Provide more helpful error messages for common issues with proper HTTP status codes
      if (error.message && (error.message.includes('401') || error.message.includes('authentication_error'))) {
        throw new UnauthorizedException('Content AI API key is invalid or expired. Please update the API key in Settings > API Keys.');
      }
      if (error.message && error.message.includes('403')) {
        throw new UnauthorizedException('Content AI API key does not have permission to access this resource.');
      }
      if (error.message && error.message.includes('429')) {
        throw new BadRequestException('Content AI API rate limit exceeded. Please try again later.');
      }
      throw new BadRequestException(`Failed to generate Content AI variations: ${error.message}`);
    }
  }

  async generateUniqueMessage(
    exampleMessages: string[],
    creativity: number = 0.7,
    context?: { contact?: any; journey?: any; previousMessages?: string[] },
  ): Promise<string> {
    if (!this.claudeClient) {
      this.initializeClient();
    }

    if (exampleMessages.length < 3 || exampleMessages.length > 10) {
      throw new Error('Please provide 3-10 example messages');
    }

    const creativityLevel = creativity < 0.3 ? 'low' : creativity < 0.7 ? 'medium' : 'high';
    
    const examplesText = exampleMessages.map((msg, idx) => `Example ${idx + 1}: "${msg}"`).join('\n');

    let contextText = '';
    if (context) {
      if (context.contact) {
        contextText += `\nContact Information:\n- Name: ${context.contact.firstName || ''} ${context.contact.lastName || ''}\n- Phone: ${context.contact.phoneNumber || ''}\n`;
      }
      if (context.previousMessages && context.previousMessages.length > 0) {
        contextText += `\nPrevious Messages:\n${context.previousMessages.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n`;
      }
    }

    const prompt = `You are an expert SMS copywriter. Generate a UNIQUE SMS message based on these ${exampleMessages.length} example messages.

Example Messages:
${examplesText}
${contextText}

Requirements:
1. Generate a completely unique message (not identical to any example)
2. Match the style, tone, and messaging patterns of the examples
3. Maintain similar intent and call-to-action
4. Be optimized for SMS (under 160 characters)
5. Be engaging and action-oriented
6. Show ${creativityLevel} creativity level
${context?.contact ? '7. Personalize using the contact information provided' : ''}
${context?.previousMessages ? '8. Consider the conversation context' : ''}

Return ONLY the message text, no other text, no quotes, no JSON.`;

    try {
      const model = (await this.configService.get('CLAUDE_MODEL')) || 'claude-3-5-haiku-20241022';
      const temperature = Math.min(0.3 + creativity * 0.7, 1.0);
      
      const response = await this.claudeClient.messages.create({
        model,
        max_tokens: 200,
        temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      let message = '';
      if (response.content && Array.isArray(response.content)) {
        for (const contentBlock of response.content) {
          if (contentBlock.type === 'text') {
            message += contentBlock.text;
          }
        }
      }

      // Clean up the message (remove quotes, trim)
      message = message.trim().replace(/^["']|["']$/g, '').trim();

      // Ensure it's not too long
      if (message.length > 160) {
        message = message.substring(0, 157) + '...';
      }

      return message || exampleMessages[0];
    } catch (error: any) {
      throw new Error(`Failed to generate unique message: ${error.message}`);
    }
  }

  async generateJourneyAudioContent(
    journeyDescription: string,
    day: number,
    callNumber: number,
    characterIndex?: number,
    totalCharacters?: number,
  ): Promise<string> {
    if (!this.claudeClient) {
      this.initializeClient();
    }

    const characterContext = totalCharacters && characterIndex !== undefined
      ? `Character ${characterIndex + 1} of ${totalCharacters}. Each character should have a distinct voice and personality.`
      : '';

    const prompt = `You are an expert voice script writer for phone call IVRs (Interactive Voice Response systems).

Journey Description: ${journeyDescription}

Generate a natural, conversational voice script for:
- Day ${day} of the journey
- Call number ${callNumber} on this day
${characterContext ? `- ${characterContext}` : ''}

Requirements:
1. The script should be appropriate for a phone call (not SMS)
2. Keep it conversational and natural (30-90 seconds when spoken)
3. Match the journey description's tone and escalation level
4. If multiple characters are specified, give this character a distinct voice/personality
5. The content should escalate appropriately based on the day number
6. Include natural pauses and conversational flow
7. Make it personal and engaging

Return ONLY the script text, no stage directions, no notes, just the natural spoken words.`;

    try {
      const model = (await this.configService.get('CLAUDE_MODEL')) || 'claude-3-5-haiku-20241022';
      
      const response = await this.claudeClient.messages.create({
        model,
        max_tokens: 500,
        temperature: 0.8, // Higher creativity for varied content
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      let script = '';
      if (response.content && Array.isArray(response.content)) {
        for (const contentBlock of response.content) {
          if (contentBlock.type === 'text') {
            script += contentBlock.text;
          }
        }
      }

      // Clean up the script (remove quotes, trim)
      script = script.trim().replace(/^["']|["']$/g, '').trim();

      // Ensure it's reasonable length (roughly 30-90 seconds of speech = ~75-225 words)
      const words = script.split(/\s+/).length;
      if (words > 250) {
        // Truncate if too long
        const sentences = script.match(/[^.!?]+[.!?]+/g) || [];
        script = sentences.slice(0, Math.floor(sentences.length * 0.8)).join(' ').trim();
      }

      return script || 'Hello, this is an important message for you.';
    } catch (error: any) {
      throw new Error(`Failed to generate journey audio content: ${error.message}`);
    }
  }

  async generateAiReply(
    aiTemplateConfig: {
      purpose?: string[];
      productInfo?: string;
      serviceInfo?: string;
      qualificationGuidelines?: string;
      brandTonality?: string;
      welcomeMessage?: string;
      customInstructions?: string;
      businessName?: string;
      phoneNumber?: string;
    },
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
    contactInfo?: { firstName?: string; lastName?: string; phoneNumber?: string; email?: string; leadStatus?: string; attributes?: any },
  ): Promise<string> {
    if (!this.claudeClient) {
      this.initializeClient();
    }

    // Build system prompt from AI template config
    let systemPrompt = `You are an SMS chatbot assistant for ${aiTemplateConfig.businessName || 'a business'}. `;
    
    if (aiTemplateConfig.brandTonality) {
      systemPrompt += `Brand tonality: ${aiTemplateConfig.brandTonality}. `;
    }
    
    if (aiTemplateConfig.productInfo) {
      systemPrompt += `Product Information: ${aiTemplateConfig.productInfo}. `;
    }
    
    if (aiTemplateConfig.serviceInfo) {
      systemPrompt += `Service Information: ${aiTemplateConfig.serviceInfo}. `;
    }
    
    if (aiTemplateConfig.qualificationGuidelines) {
      systemPrompt += `Qualification Guidelines: ${aiTemplateConfig.qualificationGuidelines}. `;
    }
    
    if (aiTemplateConfig.purpose && aiTemplateConfig.purpose.length > 0) {
      const purposes = aiTemplateConfig.purpose.map(p => p.replace(/_/g, ' ')).join(', ');
      systemPrompt += `Your primary purposes are: ${purposes}. `;
      
      // If driving phone calls is a purpose, include phone number information
      if (aiTemplateConfig.purpose.includes('drive_phone_calls') && aiTemplateConfig.phoneNumber) {
        systemPrompt += `\n\nIMPORTANT: When users express interest in speaking with someone or want to call, provide them with this phone number: ${aiTemplateConfig.phoneNumber}. Always include this number when offering to connect them via phone call. `;
      }
    }
    
    if (aiTemplateConfig.customInstructions) {
      systemPrompt += `Additional Instructions: ${aiTemplateConfig.customInstructions}. `;
    }
    
    systemPrompt += `\n\nCRITICAL RULES:
- Keep responses SHORT for SMS (under 160 characters when possible, max 320 characters)
- Be conversational, friendly, and helpful
- Ask clarifying questions when needed
- If the user says STOP, UNSUBSCRIBE, or similar, acknowledge and stop messaging
- Use the contact's name when available: ${contactInfo?.firstName || 'there'}
- Match the brand tonality specified above`;
    
    // Add phone number rule if drive_phone_calls is enabled
    if (aiTemplateConfig.purpose?.includes('drive_phone_calls') && aiTemplateConfig.phoneNumber) {
      systemPrompt += `\n- When offering phone calls or when users ask to speak with someone, ALWAYS include the phone number: ${aiTemplateConfig.phoneNumber}`;
    }

    // Build conversation messages with proper types
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
      content: msg.content,
    }));

    try {
      const model = (await this.configService.get('CLAUDE_MODEL')) || 'claude-3-5-haiku-20241022';
      const response = await this.claudeClient.messages.create({
        model,
        max_tokens: 320, // Limit to SMS-friendly length
        system: systemPrompt,
        messages: messages.slice(-10) as any, // Keep last 10 messages for context
      });

      let reply = '';
      if (response.content && Array.isArray(response.content)) {
        for (const contentBlock of response.content) {
          if (contentBlock.type === 'text') {
            reply += contentBlock.text;
          }
        }
      }

      // Clean and truncate reply
      reply = reply.trim();
      
      // Truncate if too long (SMS limit is 1600 chars, but keep shorter for better UX)
      if (reply.length > 320) {
        reply = reply.substring(0, 317) + '...';
      }

      return reply || "Thanks for your message! How can I help you today?";
    } catch (error: any) {
      this.logger.error(`Failed to generate AI reply: ${error.message}`, error.stack);
      throw new Error(`Failed to generate AI reply: ${error.message}`);
    }
  }

  /**
   * Generic method to generate content with Claude AI
   */
  async generateWithClaude(prompt: string, systemPrompt?: string, maxTokens: number = 2000): Promise<string> {
    if (!this.claudeClient) {
      this.initializeClient();
    }

    try {
      const model = (await this.configService.get('CLAUDE_MODEL')) || 'claude-3-5-haiku-20241022';
      const response = await this.claudeClient.messages.create({
        model,
        max_tokens: maxTokens,
        ...(systemPrompt && { system: systemPrompt }),
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      let responseText = '';
      if (response.content && Array.isArray(response.content)) {
        for (const contentBlock of response.content) {
          if (contentBlock.type === 'text') {
            responseText += contentBlock.text;
          }
        }
      }

      return responseText.trim();
    } catch (error: any) {
      this.logger.error(`Failed to generate with Claude: ${error.message}`, error.stack);
      throw new Error(`Failed to generate content: ${error.message}`);
    }
  }
}

