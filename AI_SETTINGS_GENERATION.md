# AI Settings Generation Guide

## Overview

This document explains how to generate AI chatbot settings programmatically using the same AI-powered configuration generation system used in the demo chatbot pages (`/demo-cards`). The system uses Claude AI to analyze an industry or product description and automatically generate comprehensive chatbot configuration settings.

---

## How It Works

The demo chatbot page (`/demo-cards`) uses an AI-powered endpoint that takes a simple industry description and generates a complete chatbot configuration including:

- **Product Information**: Industry-specific product descriptions
- **Service Information**: How services work and typical processes
- **Qualification Guidelines**: Ideal customer profiles and qualification criteria
- **Brand Tonality**: Appropriate communication style for the industry
- **Welcome Message**: Engaging greeting that starts conversations
- **Common Fields**: Typical form fields needed for that industry

---

## API Endpoint

### Endpoint Details

```
POST /api/v1/ai/generate-chatbot-config
```

**Base URL**: Your API gateway URL (e.g., `https://api.yourdomain.com` or `http://localhost:3000`)

**Content-Type**: `application/json`

### Request

```json
{
  "industry": "Real Estate"
}
```

**Request Parameters:**
- `industry` (required, string): Industry name or product description
  - Examples: `"Real Estate"`, `"SaaS"`, `"E-commerce"`, `"Healthcare"`, `"Marketing Agency"`, `"Fitness Coaching"`

### Response

**Success Response (200 OK):**
```json
{
  "success": true,
  "config": {
    "productInfo": "We specialize in residential and commercial real estate services...",
    "serviceInfo": "Our services include property listings, market analysis, buyer representation...",
    "qualificationGuidelines": "Ideal customers are individuals or families looking to buy, sell, or rent properties...\n\nCommon fields to collect:\n- Property Type (MULTIPLE_CHOICE) - Options: Single Family, Condo, Townhouse, Commercial\n- Budget Range (MULTIPLE_CHOICE) - Options: Under $200k, $200k-$500k, $500k-$1M, Over $1M\n- Timeline (MULTIPLE_CHOICE) - Options: Immediate, 1-3 months, 3-6 months, 6+ months",
    "brandTonality": "Professional, trustworthy, and approachable. Use clear language and be helpful in guiding clients through the real estate process.",
    "welcomeMessage": "Hi! I'm here to help you with your real estate needs. Are you looking to buy, sell, or rent a property?",
    "commonFields": [
      {
        "fieldName": "Property Type",
        "fieldType": "MULTIPLE_CHOICE",
        "commonValues": ["Single Family", "Condo", "Townhouse", "Commercial"],
        "isRequired": true
      },
      {
        "fieldName": "Budget Range",
        "fieldType": "MULTIPLE_CHOICE",
        "commonValues": ["Under $200k", "$200k-$500k", "$500k-$1M", "Over $1M"],
        "isRequired": true
      },
      {
        "fieldName": "Timeline",
        "fieldType": "MULTIPLE_CHOICE",
        "commonValues": ["Immediate", "1-3 months", "3-6 months", "6+ months"],
        "isRequired": false
      }
    ]
  }
}
```

**Error Responses:**

```json
// Missing industry parameter
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Industry description is required"
  }
}

// Claude API not configured
{
  "success": false,
  "error": {
    "code": "CLAUDE_NOT_CONFIGURED",
    "message": "Claude API is not configured. Please set ANTHROPIC_API_KEY environment variable."
  }
}

// Generation error
{
  "success": false,
  "error": {
    "code": "GENERATION_ERROR",
    "message": "Failed to generate chatbot configuration"
  }
}
```

---

## Usage Examples

### JavaScript/TypeScript (Frontend)

```typescript
async function generateChatbotConfig(industry: string) {
  try {
    const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
    const response = await fetch(`${API_URL}/api/v1/ai/generate-chatbot-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry: industry.trim() }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.config) {
      // Process the generated configuration
      const config = data.config;
      
      // Ensure welcome message ends with a question
      let welcomeMessage = config.welcomeMessage || '';
      if (welcomeMessage && !welcomeMessage.trim().endsWith('?') && !welcomeMessage.trim().endsWith('!')) {
        welcomeMessage = welcomeMessage.trim() + ' How can I help you today?';
      }

      // Handle qualificationGuidelines (may be object or string)
      let qualificationGuidelines = config.qualificationGuidelines || '';
      if (typeof qualificationGuidelines === 'object') {
        qualificationGuidelines = JSON.stringify(qualificationGuidelines);
      }

      return {
        productInfo: config.productInfo || '',
        serviceInfo: config.serviceInfo || '',
        qualificationGuidelines: qualificationGuidelines,
        brandTonality: config.brandTonality || '',
        welcomeMessage: welcomeMessage,
        commonFields: config.commonFields || [],
      };
    } else {
      throw new Error(data.error?.message || 'Failed to generate config');
    }
  } catch (error) {
    console.error('Error generating config:', error);
    throw error;
  }
}

// Usage
const config = await generateChatbotConfig('Real Estate');
console.log('Generated config:', config);
```

### Node.js (Backend)

```javascript
const axios = require('axios');

async function generateChatbotConfig(industry) {
  try {
    const API_URL = process.env.API_URL || 'http://localhost:3000';
    const response = await axios.post(
      `${API_URL}/api/v1/ai/generate-chatbot-config`,
      { industry: industry.trim() },
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (response.data.success && response.data.config) {
      return response.data.config;
    } else {
      throw new Error(response.data.error?.message || 'Failed to generate config');
    }
  } catch (error) {
    console.error('Error generating config:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
(async () => {
  try {
    const config = await generateChatbotConfig('SaaS');
    console.log('Product Info:', config.productInfo);
    console.log('Welcome Message:', config.welcomeMessage);
    console.log('Common Fields:', config.commonFields);
  } catch (error) {
    console.error('Failed:', error);
  }
})();
```

### Python

```python
import requests
import json

def generate_chatbot_config(industry):
    """
    Generate chatbot configuration for a given industry.
    
    Args:
        industry (str): Industry name or product description
        
    Returns:
        dict: Generated chatbot configuration
    """
    api_url = os.getenv('API_URL', 'http://localhost:3000')
    endpoint = f"{api_url}/api/v1/ai/generate-chatbot-config"
    
    payload = {
        "industry": industry.strip()
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(endpoint, json=payload, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        
        if data.get('success') and data.get('config'):
            config = data['config']
            
            # Ensure welcome message ends with a question
            welcome_message = config.get('welcomeMessage', '')
            if welcome_message and not welcome_message.strip().endswith(('?', '!')):
                welcome_message = welcome_message.strip() + ' How can I help you today?'
            
            # Handle qualificationGuidelines (may be object or string)
            qualification_guidelines = config.get('qualificationGuidelines', '')
            if isinstance(qualification_guidelines, dict):
                qualification_guidelines = json.dumps(qualification_guidelines)
            
            return {
                'productInfo': config.get('productInfo', ''),
                'serviceInfo': config.get('serviceInfo', ''),
                'qualificationGuidelines': qualification_guidelines,
                'brandTonality': config.get('brandTonality', ''),
                'welcomeMessage': welcome_message,
                'commonFields': config.get('commonFields', [])
            }
        else:
            error_msg = data.get('error', {}).get('message', 'Failed to generate config')
            raise Exception(error_msg)
            
    except requests.exceptions.RequestException as e:
        print(f"Request error: {e}")
        raise
    except Exception as e:
        print(f"Error generating config: {e}")
        raise

# Usage
if __name__ == "__main__":
    import os
    config = generate_chatbot_config("E-commerce")
    print(json.dumps(config, indent=2))
```

### cURL

```bash
# Basic request
curl -X POST http://localhost:3000/api/v1/ai/generate-chatbot-config \
  -H "Content-Type: application/json" \
  -d '{"industry": "Real Estate"}'

# With authentication (if required)
curl -X POST https://api.yourdomain.com/api/v1/ai/generate-chatbot-config \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"industry": "SaaS"}'
```

---

## AI Prompt Structure

The system uses Claude AI (`claude-3-5-haiku-20241022`) with the following prompt structure:

### System Prompt Template

```
You are an expert at analyzing businesses and determining what information they typically need to collect from customers.

Industry/Product Description: {industry}

Your task:
1. Analyze this industry/product and determine what form fields are MOST COMMON for businesses in this industry
2. Identify the most likely values/options for each common field
3. Generate chatbot configuration that reflects these common fields and values

For example:
- SaaS businesses commonly collect: Company name, Email, Company size (1-10, 11-50, 51-200, 201+), Use case, Budget range, Current tools used
- E-commerce businesses commonly collect: Name, Email, Product interest, Shipping address, Payment method, Order preferences
- Service businesses commonly collect: Name, Email, Phone, Service needed, Budget, Timeline, Location

Based on the industry "{industry}", analyze:
1. What are the 5-8 most common form fields this type of business would need?
2. What are the most likely values/options for each field?
3. What questions would a chatbot need to ask to collect this information?

Then generate chatbot configuration:
- Product Information: Describe what they offer based on the industry, including common features/benefits
- Service Information: How their service works, common processes, typical timelines
- Qualification Guidelines: Based on the common fields identified, what are ideal customer profiles? What questions should the chatbot ask? What are common values for each field?
- Brand Tonality: What tone fits this industry? (e.g., SaaS = professional/technical, E-commerce = friendly/casual, B2B = consultative)
- Welcome Message: A greeting that naturally leads into collecting the common fields. CRITICAL: The welcome message MUST end with a question to engage the user and start the conversation. Examples: "Hi! I'm here to help you get started. What's your name?" or "Welcome! I'd love to help you today. What brings you here?"

Format your response as JSON with these keys: productInfo, serviceInfo, qualificationGuidelines, brandTonality, welcomeMessage, commonFields.

For commonFields, provide an array of objects with: { fieldName: string, fieldType: string, commonValues: string[], isRequired: boolean }

Keep each field concise but informative (2-4 sentences for productInfo/serviceInfo, detailed qualificationGuidelines that reference the common fields, 1-2 sentences for brandTonality).
```

### AI Model Configuration

- **Model**: `claude-3-5-haiku-20241022` (configurable via `CLAUDE_MODEL` environment variable)
- **Max Tokens**: 1500 for config generation
- **Temperature**: Default (not explicitly set)
- **Response Format**: JSON

---

## Response Field Descriptions

### `productInfo` (string)
Description of products or services offered by businesses in this industry. Typically 2-4 sentences covering common features and benefits.

**Example:**
```
"We specialize in cloud-based software solutions for small to medium-sized businesses. Our platform offers project management, team collaboration, and analytics tools designed to streamline operations and boost productivity."
```

### `serviceInfo` (string)
How services work, common processes, typical timelines, and service delivery methods.

**Example:**
```
"Our services include comprehensive onboarding, ongoing support, and regular feature updates. Implementation typically takes 1-2 weeks, with dedicated account managers available throughout the process. We offer 24/7 customer support and monthly training sessions."
```

### `qualificationGuidelines` (string)
Ideal customer profiles, qualification criteria, questions the chatbot should ask, and common values for form fields. This field includes a summary of common fields to collect.

**Example:**
```
"Ideal customers are small to medium-sized businesses (10-200 employees) looking to improve team collaboration and project management. The chatbot should ask about company size, current tools used, specific pain points, budget range, and implementation timeline.

Common fields to collect:
- Company Size (MULTIPLE_CHOICE) - Options: 1-10, 11-50, 51-200, 201+
- Current Tools (MULTIPLE_CHOICE) - Options: None, Slack, Asana, Trello, Other
- Budget Range (MULTIPLE_CHOICE) - Options: Under $100/month, $100-$500/month, $500-$1000/month, Custom"
```

### `brandTonality` (string)
Communication style and tone appropriate for the industry. Typically 1-2 sentences.

**Example:**
```
"Professional and technical, yet approachable. Use clear, jargon-free language and focus on solving business problems. Be consultative and helpful."
```

### `welcomeMessage` (string)
Engaging greeting that starts conversations. Must end with a question to engage users.

**Example:**
```
"Hi! I'm here to help you find the perfect software solution for your business. What challenges are you currently facing with team collaboration?"
```

### `commonFields` (array)
Array of objects representing typical form fields for the industry.

**Field Object Structure:**
```typescript
{
  fieldName: string;        // e.g., "Company Size"
  fieldType: string;        // e.g., "MULTIPLE_CHOICE", "SHORT_TEXT", "EMAIL"
  commonValues: string[];   // Array of common values/options
  isRequired: boolean;      // Whether field is typically required
}
```

**Example:**
```json
[
  {
    "fieldName": "Company Size",
    "fieldType": "MULTIPLE_CHOICE",
    "commonValues": ["1-10", "11-50", "51-200", "201+"],
    "isRequired": true
  },
  {
    "fieldName": "Budget Range",
    "fieldType": "MULTIPLE_CHOICE",
    "commonValues": ["Under $100/month", "$100-$500/month", "$500-$1000/month", "Custom"],
    "isRequired": false
  }
]
```

---

## Use Cases

### 1. Form Builder Integration

Generate chatbot settings when a user selects an industry in the form builder:

```typescript
// In ChatbotPanel component
const generateFromIndustry = async () => {
  if (!industryInput.trim()) {
    toast.error('Please enter your industry or product description');
    return;
  }

  setGenerating(true);
  try {
    const API_URL = import.meta.env.VITE_API_URL || window.location.origin;
    const response = await fetch(`${API_URL}/api/v1/ai/generate-chatbot-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ industry: industryInput }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.success && data.config) {
        // Populate form fields with generated config
        setConfig({
          productInfo: data.config.productInfo,
          serviceInfo: data.config.serviceInfo,
          qualificationGuidelines: data.config.qualificationGuidelines,
          brandTonality: data.config.brandTonality,
          welcomeMessage: data.config.welcomeMessage,
        });
        toast.success('Chatbot configuration generated!');
      }
    }
  } catch (error) {
    console.error('Error generating config:', error);
    toast.error('Failed to generate configuration');
  } finally {
    setGenerating(false);
  }
};
```

### 2. Bulk Configuration Generation

Generate configurations for multiple industries:

```javascript
const industries = ['Real Estate', 'SaaS', 'E-commerce', 'Healthcare', 'Fitness'];

async function generateConfigsForIndustries(industries) {
  const configs = {};
  
  for (const industry of industries) {
    try {
      const config = await generateChatbotConfig(industry);
      configs[industry] = config;
      console.log(`Generated config for ${industry}`);
    } catch (error) {
      console.error(`Failed to generate config for ${industry}:`, error);
    }
  }
  
  return configs;
}

// Usage
const allConfigs = await generateConfigsForIndustries(industries);
```

### 3. API Integration

Create a wrapper API endpoint that generates and stores configurations:

```typescript
// Express.js example
app.post('/api/v1/forms/:formId/generate-chatbot-config', async (req, res) => {
  try {
    const { formId } = req.params;
    const { industry } = req.body;
    
    // Generate configuration
    const config = await generateChatbotConfig(industry);
    
    // Save to database
    await prisma.form.update({
      where: { id: formId },
      data: {
        metadata: {
          chatbot: {
            enabled: true,
            purpose: ['provide_information', 'drive_lead_submissions'],
            ...config,
          },
        },
      },
    });
    
    res.json({ success: true, config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### 4. Testing and Development

Generate test configurations for different scenarios:

```javascript
// Test different industry types
const testIndustries = [
  'B2B SaaS',
  'B2C E-commerce',
  'Service-based business',
  'Healthcare provider',
  'Real estate agency',
];

testIndustries.forEach(async (industry) => {
  const config = await generateChatbotConfig(industry);
  console.log(`\n=== ${industry} ===`);
  console.log('Welcome:', config.welcomeMessage);
  console.log('Tone:', config.brandTonality);
  console.log('Fields:', config.commonFields.length);
});
```

---

## Best Practices

### 1. Input Validation

Always validate and sanitize the industry input:

```typescript
function validateIndustryInput(industry: string): string {
  // Trim whitespace
  const trimmed = industry.trim();
  
  // Check minimum length
  if (trimmed.length < 2) {
    throw new Error('Industry description must be at least 2 characters');
  }
  
  // Check maximum length (prevent abuse)
  if (trimmed.length > 200) {
    throw new Error('Industry description must be less than 200 characters');
  }
  
  return trimmed;
}
```

### 2. Error Handling

Implement comprehensive error handling:

```typescript
async function generateConfigWithRetry(industry: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await generateChatbotConfig(industry);
    } catch (error) {
      if (attempt === maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
}
```

### 3. Caching

Cache generated configurations to reduce API calls:

```typescript
const configCache = new Map<string, any>();

async function generateConfigCached(industry: string) {
  const cacheKey = industry.toLowerCase().trim();
  
  if (configCache.has(cacheKey)) {
    return configCache.get(cacheKey);
  }
  
  const config = await generateChatbotConfig(industry);
  configCache.set(cacheKey, config);
  
  return config;
}
```

### 4. Response Processing

Always process the response to handle edge cases:

```typescript
function processGeneratedConfig(rawConfig: any) {
  // Ensure welcome message ends with question
  let welcomeMessage = rawConfig.welcomeMessage || '';
  if (welcomeMessage && !welcomeMessage.trim().endsWith('?') && !welcomeMessage.trim().endsWith('!')) {
    welcomeMessage = welcomeMessage.trim() + ' How can I help you today?';
  }

  // Handle qualificationGuidelines (may be object or string)
  let qualificationGuidelines = rawConfig.qualificationGuidelines || '';
  if (typeof qualificationGuidelines === 'object') {
    if (Array.isArray(qualificationGuidelines)) {
      qualificationGuidelines = qualificationGuidelines.join('\n');
    } else {
      qualificationGuidelines = JSON.stringify(qualificationGuidelines);
    }
  }

  return {
    productInfo: rawConfig.productInfo || '',
    serviceInfo: rawConfig.serviceInfo || '',
    qualificationGuidelines: qualificationGuidelines,
    brandTonality: rawConfig.brandTonality || '',
    welcomeMessage: welcomeMessage,
    commonFields: Array.isArray(rawConfig.commonFields) ? rawConfig.commonFields : [],
  };
}
```

---

## Environment Variables

Required environment variables for the AI service:

```env
# Required
ANTHROPIC_API_KEY=your-anthropic-api-key-here

# Optional
CLAUDE_MODEL=claude-3-5-haiku-20241022  # Default model
AI_SERVICE_URL=http://localhost:8000   # AI service URL
REDIS_URL=redis://localhost:6379        # Redis for caching (optional)
```

---

## Rate Limiting Considerations

- The endpoint uses Claude API which has rate limits based on your plan
- Consider implementing rate limiting on your API gateway
- Cache frequently requested industry configurations
- Batch requests when possible

---

## Troubleshooting

### Common Issues

1. **"Claude API is not configured"**
   - Ensure `ANTHROPIC_API_KEY` is set in environment variables
   - Verify the API key is valid

2. **"Industry description is required"**
   - Ensure the `industry` field is included in the request body
   - Check that the industry string is not empty after trimming

3. **JSON parsing errors**
   - The AI may sometimes return non-JSON responses
   - The service includes fallback parsing logic
   - Check server logs for parsing errors

4. **Timeout errors**
   - Claude API calls can take 2-5 seconds
   - Increase timeout settings if needed
   - Consider implementing async processing for long-running requests

### Debug Mode

Enable debug logging:

```typescript
// Add to your request
const response = await fetch(`${API_URL}/api/v1/ai/generate-chatbot-config`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ industry: industry.trim() }),
});

// Log full response for debugging
console.log('Response status:', response.status);
const data = await response.json();
console.log('Response data:', JSON.stringify(data, null, 2));
```

---

## Summary

The AI settings generation system provides a powerful way to automatically create chatbot configurations based on industry descriptions. By leveraging Claude AI, it analyzes industry patterns and generates comprehensive settings including product information, service details, qualification guidelines, brand tonality, welcome messages, and common form fields.

This system is used in the demo chatbot pages (`/demo-cards`) and can be integrated into any application that needs to generate chatbot configurations programmatically.

