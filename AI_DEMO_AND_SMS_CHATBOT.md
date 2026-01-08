# AI Demo Page Configuration & SMS Chatbot Implementation

## Overview

This document describes the AI configuration used for the demo page (`/demo-cards`) and provides complete code implementation for using the same AI configuration settings with an SMS-based chatbot.

---

## Part 1: AI Configuration for Demo Page

### AI Model Details

The demo page uses **Anthropic Claude AI** with the following configuration:

- **Model**: `claude-3-5-haiku-20241022` (default) or configurable via `CLAUDE_MODEL` environment variable
- **Provider**: Anthropic Claude API
- **SDK**: `@anthropic-ai/sdk` (Node.js)
- **Max Tokens**: 1024 per chat response, 1500 for config generation
- **Session Storage**: Redis (24-hour expiration)

### API Endpoint

The demo page calls the following endpoint to generate chatbot configuration:

```
POST /api/v1/ai/generate-chatbot-config
```

**Request Body:**
```json
{
  "industry": "Real Estate" // or any industry/product description
}
```

**Response:**
```json
{
  "success": true,
  "config": {
    "productInfo": "Description of products/services...",
    "serviceInfo": "How services work, processes, timelines...",
    "qualificationGuidelines": "Ideal customer profiles, questions to ask, common values...",
    "brandTonality": "Professional and friendly tone description...",
    "welcomeMessage": "Greeting message ending with a question...",
    "commonFields": [
      {
        "fieldName": "Company Size",
        "fieldType": "MULTIPLE_CHOICE",
        "commonValues": ["1-10", "11-50", "51-200", "201+"],
        "isRequired": true
      }
    ]
  }
}
```

### System Prompt Generation

The AI service builds a comprehensive system prompt from the configuration that includes:

1. **Purpose Instructions**: Based on chatbot purposes (provide_information, drive_lead_submissions, schedule_calendar, drive_phone_calls)
2. **Product/Service Information**: Details about what the business offers
3. **Qualification Guidelines**: Ideal customer profiles and qualification criteria
4. **Brand Tonality**: Communication style and voice
5. **Welcome Message**: Initial greeting
6. **Custom Instructions**: Additional business-specific guidance
7. **Form Context**: Information about form fields and user progress (if applicable)

### Environment Variables

```env
# Required
ANTHROPIC_API_KEY=your-anthropic-api-key-here
REDIS_URL=redis://localhost:6379

# Optional
CLAUDE_MODEL=claude-3-5-haiku-20241022  # Default model
AI_SERVICE_URL=http://localhost:8000
```

### Chat Endpoint Configuration

The chat endpoint (`POST /chatbot/chat`) uses:

- **Model**: `claude-3-5-haiku-20241022` (or `CLAUDE_MODEL` env var)
- **Max Tokens**: 1024
- **System Prompt**: Dynamically built from chatbot configuration
- **Session Management**: Redis with key format `chat_session:{sessionId}`
- **Session Expiration**: 24 hours (86400 seconds)

---

## Part 2: SMS Chatbot Implementation

The following code provides a complete implementation for using the same AI configuration settings with an SMS-based chatbot using Twilio.

### Prerequisites

- Twilio Account SID and Auth Token
- Twilio Phone Number
- Anthropic Claude API Key
- Redis instance
- Node.js runtime

### Installation

```bash
npm install @anthropic-ai/sdk twilio ioredis express dotenv
```

### Environment Variables

```env
# Anthropic Claude (same as demo)
ANTHROPIC_API_KEY=your-anthropic-api-key-here
CLAUDE_MODEL=claude-3-5-haiku-20241022

# Twilio SMS
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio phone number

# Redis (same as demo)
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
```

### Complete SMS Chatbot Service Code

```typescript
// sms-chatbot-service.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import Redis from 'ioredis';
import twilio from 'twilio';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Initialize Claude client
let claudeClient: Anthropic | null = null;
const apiKey = process.env.ANTHROPIC_API_KEY;
if (apiKey) {
  claudeClient = new Anthropic({ apiKey });
  console.log('✅ Claude API client initialized');
} else {
  console.warn('⚠️  ANTHROPIC_API_KEY not set. SMS chatbot will not work.');
}

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Types
interface ChatbotConfiguration {
  enabled: boolean;
  purpose: string[];
  productInfo?: string;
  serviceInfo?: string;
  qualificationGuidelines?: string;
  brandTonality?: string;
  welcomeMessage?: string;
  customInstructions?: string;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatSession {
  phoneNumber: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  config?: ChatbotConfiguration;
}

// Helper function to build system prompt (same as demo)
function buildSystemPrompt(
  config: ChatbotConfiguration,
  phoneNumber: string,
  context?: {
    currentAnswers?: Record<string, unknown>;
    businessName?: string;
  }
): string {
  const promptParts: string[] = [];

  promptParts.push('You are a helpful assistant chatbot accessible via SMS text messaging.');
  promptParts.push('Your goal is to assist users through text messages and answer their questions.');
  promptParts.push('IMPORTANT: Keep responses SHORT and CONCISE - SMS messages should be under 160 characters when possible.');
  promptParts.push('Break longer responses into multiple messages if needed, but keep each message focused.');

  // Purpose-specific instructions
  const purposes = config.purpose || [];
  if (purposes.includes('provide_information')) {
    promptParts.push('Your primary role is to provide helpful information about the product or service.');
  }
  if (purposes.includes('drive_lead_submissions')) {
    promptParts.push('You should encourage users to provide their information. Be helpful and persuasive but not pushy.');
  }
  if (purposes.includes('schedule_calendar')) {
    promptParts.push('You can help users schedule appointments or meetings. Guide them through the scheduling process.');
  }
  if (purposes.includes('drive_phone_calls')) {
    promptParts.push('Encourage users to call the business for immediate assistance when appropriate.');
  }

  // Product/Service information
  if (config.productInfo) {
    promptParts.push(`\nProduct Information:\n${config.productInfo}`);
  }

  if (config.serviceInfo) {
    promptParts.push(`\nService Information:\n${config.serviceInfo}`);
  }

  // Qualification guidelines
  if (config.qualificationGuidelines) {
    promptParts.push(`\nQualification Guidelines:\n${config.qualificationGuidelines}`);
    promptParts.push('Use these guidelines to help qualify leads and ask appropriate follow-up questions.');
  }

  // Brand tonality
  if (config.brandTonality) {
    promptParts.push(`\nBrand Tonality:\n${config.brandTonality}`);
    promptParts.push('Match this tone and style in all your responses.');
  }

  // Business name
  if (context?.businessName && context.businessName.trim()) {
    promptParts.push(`\n=== BUSINESS NAME ===`);
    promptParts.push(`The business name is: "${context.businessName.trim()}"`);
    promptParts.push('CRITICAL INSTRUCTIONS:');
    promptParts.push('- ALWAYS refer to the business by its name throughout the conversation');
    promptParts.push('- Use phrases like "at [business name]", "with [business name]", etc.');
  }

  // Custom instructions
  if (config.customInstructions) {
    promptParts.push(`\nAdditional Instructions:\n${config.customInstructions}`);
  }

  // SMS-specific guidelines
  promptParts.push('\n=== SMS-SPECIFIC GUIDELINES ===');
  promptParts.push('- Keep messages SHORT - aim for 1-2 sentences maximum');
  promptParts.push('- Break complex information into multiple short messages');
  promptParts.push('- Use abbreviations sparingly - maintain professionalism');
  promptParts.push('- Number lists when providing options: "1. Option A 2. Option B"');
  promptParts.push('- Be conversational but concise');
  promptParts.push('- If a response exceeds 160 characters, consider splitting it');

  return promptParts.join('\n');
}

// Process incoming SMS message
async function processSMSMessage(
  from: string,
  body: string,
  config: ChatbotConfiguration
): Promise<string> {
  if (!claudeClient) {
    return 'Sorry, the AI service is currently unavailable. Please try again later.';
  }

  try {
    const sessionKey = `sms_chat_session:${from}`;

    // Retrieve conversation history from Redis
    let messages: ChatMessage[] = [];
    const historyJson = await redis.get(sessionKey);

    if (historyJson) {
      const history: ChatSession = JSON.parse(historyJson);
      messages = history.messages || [];
    } else {
      // Initialize with system message
      const systemPrompt = buildSystemPrompt(config, from);
      messages.push({
        role: 'system',
        content: systemPrompt,
      });

      // Add welcome message if configured
      if (config.welcomeMessage) {
        messages.push({
          role: 'assistant',
          content: config.welcomeMessage,
        });
      }
    }

    // Add user message
    messages.push({
      role: 'user',
      content: body.trim(),
    });

    // Separate system message from conversation messages
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    // Call Claude API
    const modelName = process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022';
    const response = await claudeClient.messages.create({
      model: modelName,
      max_tokens: 1024,
      system: systemMessage?.content || '',
      messages: conversationMessages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    });

    // Extract assistant response
    let assistantMessage = '';
    if (response.content && Array.isArray(response.content)) {
      for (const contentBlock of response.content) {
        if (contentBlock.type === 'text') {
          assistantMessage += contentBlock.text;
        }
      }
    }

    // Truncate if too long (SMS limit is 1600 chars, but keep shorter)
    if (assistantMessage.length > 320) {
      assistantMessage = assistantMessage.substring(0, 317) + '...';
    }

    // Add assistant response to history
    messages.push({
      role: 'assistant',
      content: assistantMessage,
    });

    // Store updated history in Redis (expire after 24 hours)
    const sessionData: ChatSession = {
      phoneNumber: from,
      messages,
      createdAt: historyJson ? JSON.parse(historyJson).createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      config,
    };

    await redis.setex(sessionKey, 86400, JSON.stringify(sessionData)); // 24 hours

    return assistantMessage;
  } catch (error: any) {
    console.error('SMS chat error:', error);
    return 'Sorry, I encountered an error processing your message. Please try again.';
  }
}

// Twilio webhook endpoint for incoming SMS
app.post('/sms/webhook', async (req, res) => {
  try {
    const { From, Body } = req.body;

    if (!From || !Body) {
      return res.status(400).send('Missing required fields');
    }

    // Load chatbot configuration
    // In production, you'd load this from your database based on the phone number
    // For this example, we'll use a default configuration
    const chatbotConfig: ChatbotConfiguration = {
      enabled: true,
      purpose: ['provide_information', 'drive_lead_submissions'],
      productInfo: process.env.CHATBOT_PRODUCT_INFO || 'We offer comprehensive solutions for your business needs.',
      serviceInfo: process.env.CHATBOT_SERVICE_INFO || 'Our services are designed to help you achieve your goals efficiently.',
      qualificationGuidelines: process.env.CHATBOT_QUALIFICATION_GUIDELINES || 'Ideal customers are businesses looking for solutions.',
      brandTonality: process.env.CHATBOT_BRAND_TONALITY || 'Professional and friendly. Use clear, helpful language.',
      welcomeMessage: process.env.CHATBOT_WELCOME_MESSAGE || 'Hi! Thanks for reaching out. How can I help you today?',
    };

    // Process the message
    const response = await processSMSMessage(From, Body, chatbotConfig);

    // Send response via Twilio
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(response);

    res.type('text/xml');
    res.send(twiml.toString());
  } catch (error: any) {
    console.error('SMS webhook error:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, I encountered an error. Please try again later.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// API endpoint to send SMS (for testing or programmatic sending)
app.post('/sms/send', async (req, res) => {
  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: to, message',
      });
    }

    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to,
    });

    res.json({
      success: true,
      messageSid: result.sid,
      status: result.status,
    });
  } catch (error: any) {
    console.error('Send SMS error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'sms-chatbot-service',
    claudeConfigured: !!claudeClient,
    twilioConfigured: !!process.env.TWILIO_ACCOUNT_SID,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`📱 SMS Chatbot Service running on port ${PORT}`);
  console.log(`🔗 Claude API: ${claudeClient ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`📞 Twilio: ${process.env.TWILIO_ACCOUNT_SID ? '✅ Configured' : '❌ Not configured'}`);
});

export default app;
```

### Configuration API Endpoint

To dynamically load chatbot configuration (similar to the demo page), add this endpoint:

```typescript
// Get chatbot configuration (similar to demo page generation)
app.post('/api/v1/ai/generate-chatbot-config', async (req, res) => {
  if (!claudeClient) {
    return res.status(503).json({
      success: false,
      error: {
        code: 'CLAUDE_NOT_CONFIGURED',
        message: 'Claude API is not configured.',
      },
    });
  }

  try {
    const { industry } = req.body;

    if (!industry || !industry.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Industry description is required',
        },
      });
    }

    const prompt = `You are an expert at analyzing businesses and determining what information they typically need to collect from customers.

Industry/Product Description: ${industry}

Your task:
1. Analyze this industry/product and determine what form fields are MOST COMMON for businesses in this industry
2. Identify the most likely values/options for each common field
3. Generate chatbot configuration that reflects these common fields and values

Based on the industry "${industry}", analyze:
1. What are the 5-8 most common form fields this type of business would need?
2. What are the most likely values/options for each field?
3. What questions would a chatbot need to ask to collect this information?

Then generate chatbot configuration:
- Product Information: Describe what they offer based on the industry, including common features/benefits
- Service Information: How their service works, common processes, typical timelines
- Qualification Guidelines: Based on the common fields identified, what are ideal customer profiles? What questions should the chatbot ask? What are common values for each field?
- Brand Tonality: What tone fits this industry? (e.g., SaaS = professional/technical, E-commerce = friendly/casual, B2B = consultative)
- Welcome Message: A greeting that naturally leads into collecting the common fields. CRITICAL: The welcome message MUST end with a question to engage the user and start the conversation. Keep it SHORT for SMS (under 160 characters).

Format your response as JSON with these keys: productInfo, serviceInfo, qualificationGuidelines, brandTonality, welcomeMessage, commonFields.

Keep each field concise but informative (2-4 sentences for productInfo/serviceInfo, detailed qualificationGuidelines that reference the common fields, 1-2 sentences for brandTonality).`;

    const response = await claudeClient.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-haiku-20241022',
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract response
    let responseText = '';
    if (response.content && Array.isArray(response.content)) {
      for (const contentBlock of response.content) {
        if (contentBlock.type === 'text') {
          responseText += contentBlock.text;
        }
      }
    }

    // Parse JSON from response (same logic as demo page)
    let config: any = {};
    try {
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        config = JSON.parse(jsonMatch[1]);
      } else {
        config = JSON.parse(responseText);
      }
    } catch (parseError) {
      // Fallback parsing logic (same as demo page)
      config = {
        productInfo: `We offer ${industry}. Our products/services are designed to meet your needs.`,
        serviceInfo: `Our services include comprehensive support and solutions tailored to your requirements.`,
        qualificationGuidelines: `Ideal customers are businesses or individuals looking for ${industry} solutions.`,
        brandTonality: 'Professional and friendly. Use clear, helpful language.',
        welcomeMessage: `Hi! I'm here to help with ${industry}. How can I assist you today?`,
      };
    }

    // Ensure welcome message is SMS-friendly (short)
    if (config.welcomeMessage && config.welcomeMessage.length > 160) {
      config.welcomeMessage = config.welcomeMessage.substring(0, 157) + '...';
    }

    res.json({
      success: true,
      config: {
        productInfo: config.productInfo || `We offer ${industry}. Our products/services are designed to meet your needs.`,
        serviceInfo: config.serviceInfo || `Our services include comprehensive support and solutions tailored to your requirements.`,
        qualificationGuidelines: config.qualificationGuidelines || `Ideal customers are businesses or individuals looking for ${industry} solutions.`,
        brandTonality: config.brandTonality || 'Professional and friendly. Use clear, helpful language.',
        welcomeMessage: config.welcomeMessage || `Hi! I'm here to help with ${industry}. How can I assist you today?`,
        commonFields: config.commonFields || [],
      },
    });
  } catch (error: any) {
    console.error('Generate chatbot config error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'GENERATION_ERROR',
        message: error.message || 'Failed to generate chatbot configuration',
      },
    });
  }
});
```

### Twilio Webhook Configuration

1. **Set up Twilio Webhook**:
   - Log into your Twilio Console
   - Go to Phone Numbers → Manage → Active Numbers
   - Select your Twilio phone number
   - Under "Messaging", set the webhook URL to: `https://your-domain.com/sms/webhook`
   - Set HTTP method to `POST`

2. **For Local Development**:
   - Use ngrok or similar tool to expose your local server
   - Set Twilio webhook to your ngrok URL: `https://your-ngrok-url.ngrok.io/sms/webhook`

### Usage Example

1. **Start the service**:
   ```bash
   npm run dev
   # or
   node sms-chatbot-service.js
   ```

2. **Send a test SMS**:
   - Text your Twilio phone number
   - The chatbot will respond using the same AI configuration as the demo page

3. **Programmatically send SMS**:
   ```bash
   curl -X POST http://localhost:3000/sms/send \
     -H "Content-Type: application/json" \
     -d '{
       "to": "+1234567890",
       "message": "Hello!"
     }'
   ```

### Key Differences from Web Chatbot

1. **Message Length**: SMS messages are limited to 160 characters per segment (320 for concatenated messages). The system prompt includes instructions to keep responses short.

2. **Session Management**: Uses phone number as session identifier instead of session ID.

3. **Response Format**: Uses TwiML (Twilio Markup Language) to send responses.

4. **No Rich Media**: SMS doesn't support images, buttons, or formatting - only plain text.

5. **Character Limits**: Responses are truncated if they exceed 320 characters.

### Testing

```bash
# Health check
curl http://localhost:3000/health

# Generate config (same as demo page)
curl -X POST http://localhost:3000/api/v1/ai/generate-chatbot-config \
  -H "Content-Type: application/json" \
  -d '{"industry": "Real Estate"}'

# Send test SMS (requires Twilio credentials)
curl -X POST http://localhost:3000/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "message": "Test message"
  }'
```

---

## Summary

The demo page uses **Claude 3.5 Haiku** with dynamically generated chatbot configurations based on industry input. The SMS chatbot implementation uses the **same AI model and configuration structure**, adapted for SMS messaging with:

- Shorter response lengths
- Phone number-based session management
- Twilio integration for SMS delivery
- Same system prompt generation logic
- Same configuration API endpoint

Both implementations share the core AI configuration and system prompt building logic, ensuring consistent behavior across web and SMS channels.

