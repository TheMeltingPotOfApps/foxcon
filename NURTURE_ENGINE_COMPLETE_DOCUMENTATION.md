# Complete Nurture Engine Application Documentation

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Features Documentation](#core-features-documentation)
   - [2.1 Journeys System](#21-journeys-system)
   - [2.2 AI Template Builder (Journey Templates)](#22-ai-template-builder-journey-templates)
   - [2.3 Campaigns](#23-campaigns)
   - [2.4 Contacts & Segments](#24-contacts--segments)
   - [2.5 Lead Statuses & Automations](#25-lead-statuses--automations)
   - [2.6 AI Features](#26-ai-features)
   - [2.7 TTS (Text-to-Speech) & Voice](#27-tts-text-to-speech--voice)
   - [2.8 PBX (Private Branch Exchange) System](#28-pbx-private-branch-exchange-system)
   - [2.9 Lead Marketplace](#29-lead-marketplace)
   - [2.10 Billing & Pricing](#210-billing--pricing)
   - [2.11 Calendar & Scheduling](#211-calendar--scheduling)
   - [2.12 Compliance & TCPA](#212-compliance--tcpa)
   - [2.13 Execution Rules](#213-execution-rules)
   - [2.14 Templates](#214-templates)
   - [2.15 Conversations](#215-conversations)
   - [2.16 Analytics & Dashboard](#216-analytics--dashboard)
   - [2.17 Webhooks](#217-webhooks)
   - [2.18 Notifications](#218-notifications)
   - [2.19 Super Admin](#219-super-admin)
   - [2.20 Onboarding](#220-onboarding)
3. [Technical Architecture](#technical-architecture)
4. [API Reference](#api-reference)
5. [Integration Points](#integration-points)

---

## Executive Summary

### Application Overview

The Nurture Engine is a comprehensive, multi-tenant SaaS platform designed for businesses to automate customer journeys, manage SMS campaigns, handle voice communications, and orchestrate lead nurturing workflows. The platform combines AI-powered automation, cloud PBX capabilities, lead marketplace functionality, and comprehensive compliance features to provide a complete solution for customer engagement and lead management.

### Technology Stack

- **Backend**: NestJS (TypeScript), Node.js
- **Frontend**: Next.js, React, TypeScript, Tailwind CSS, shadcn/ui
- **Database**: PostgreSQL (Cloud SQL)
- **Caching**: Redis
- **Message Queue**: RabbitMQ
- **SMS/Voice Provider**: Twilio
- **AI Provider**: Anthropic Claude AI (claude-3-5-haiku-20241022)
- **TTS Provider**: Kokoro TTS (self-hosted)
- **PBX**: Asterisk (AMI, PJSIP, WebRTC)
- **Billing**: Stripe
- **Cloud**: GCP

### Architecture Overview

The application follows a microservices-oriented architecture with clear separation of concerns:

- **Multi-tenant Architecture**: Logical multi-tenancy via `tenant_id` on all database records
- **Role-Based Access Control**: OWNER, ADMIN, MANAGER, AGENT, VIEWER roles
- **JWT Authentication**: Access token + refresh token with tenant context
- **Event-Driven Processing**: RabbitMQ for async job processing
- **Real-time Updates**: WebSocket connections for live updates
- **Background Jobs**: Cron-based schedulers for journey execution, status automations, and reminders

### Multi-Tenancy Model

- Each tenant has isolated data via `tenant_id` foreign keys
- Tenant-specific configurations (Twilio settings, billing, limits, compliance)
- Tenant-level feature flags and restrictions
- Cross-tenant isolation enforced at database and application layers

---

## Core Features Documentation

### 2.1 Journeys System

**Bullet Point**: Control and orchestrate client and lead content journey and their touchpoints

#### Overview

The Journeys system is the core automation engine that allows businesses to create sophisticated, multi-step customer engagement workflows. Journeys orchestrate SMS messages, voice calls, campaign management, webhooks, and conditional logic to create personalized customer experiences.

#### Journey Builder

The visual node-based journey builder provides a drag-and-drop interface for creating complex automation workflows:

- **Visual Editor**: Canvas-based interface with nodes and connections
- **Node Positioning**: X/Y coordinates for visual layout
- **Connection Management**: Link nodes with conditional or weighted paths
- **Real-time Validation**: Validate journey structure before launch
- **Template Support**: Start from pre-built journey templates

#### Journey Node Types

##### SEND_SMS Node

Send SMS messages to contacts with template support and variable substitution.

**Configuration**:
- `messageContent`: Direct message text or template content
- `templateId`: Reference to a message template
- `contentAiTemplateId`: Reference to Content AI template for unique message generation
- `numberPoolId`: Twilio number pool for round-robin routing
- `eventTypeId`: Optional event type ID for calendar booking links in SMS

**Execution Outcomes**:
- `success`: Message sent successfully
- `failed`: Message failed to send
- `opted_out`: Contact opted out during send
- `reply`: Contact replied to message (handled asynchronously)

**Features**:
- Variable substitution ({firstName}, {lastName}, {phone}, etc.)
- Template integration
- Content AI for personalized messages
- Number pool rotation
- Delivery status tracking
- Opt-out detection

##### ADD_TO_CAMPAIGN Node

Add contacts to SMS campaigns for bulk messaging.

**Configuration**:
- `campaignId`: Target campaign ID

**Execution Outcomes**:
- `success`: Contact added successfully
- `failed`: Failed to add contact

**Features**:
- Automatic campaign enrollment
- Campaign status validation
- Duplicate prevention
- Campaign contact tracking

##### REMOVE_FROM_CAMPAIGN Node

Remove contacts from SMS campaigns.

**Configuration**:
- `campaignId`: Target campaign ID

**Execution Outcomes**:
- `success`: Contact removed successfully
- `failed`: Failed to remove contact

**Features**:
- Campaign exit handling
- Status update on removal
- Prevents further campaign messages

##### EXECUTE_WEBHOOK Node

Trigger external webhooks for third-party integrations.

**Configuration**:
- `webhookId`: Reference to tenant webhook configuration
- `webhookUrl`: Direct webhook URL (if not using webhookId)
- `webhookMethod`: HTTP method (GET, POST, PUT, PATCH, DELETE)
- `webhookHeaders`: Custom headers (JSON object)
- `webhookBody`: Request body (supports variables)
- `webhookRetries`: Number of retry attempts (default: 3)
- `webhookRetryDelay`: Delay between retries in ms (default: 1000)
- `webhookTimeout`: Request timeout in ms (default: 30000)
- `webhookResponseHandling`: Configuration for response processing
  - `successField`: Field in response indicating success
  - `errorField`: Field containing error message
  - `extractFields`: Fields to extract and store in contact attributes

**Execution Outcomes**:
- `success`: Webhook executed successfully
- `failed`: Webhook execution failed

**Features**:
- Variable substitution in headers and body
- Retry logic with exponential backoff
- Response field extraction
- Contact attribute updates from responses
- Error handling and logging

##### TIME_DELAY Node

Wait for a specified time period before continuing the journey.

**Configuration**:
- `delayValue`: Numeric delay value
- `delayUnit`: Unit (MINUTES, HOURS, DAYS)
- `delayAtTime`: Specific time in HH:mm format (optional)

**Execution Outcomes**:
- `completed`: Delay completed

**Features**:
- Timezone-aware delays
- Specific time scheduling
- Business hours consideration (via execution rules)
- After-hours rescheduling

##### CONDITION Node

Branch the journey based on contact attributes, message history, or journey status.

**Configuration**:
- `branches`: Array of conditional branches
  - `id`: Unique branch identifier
  - `label`: Human-readable label
  - `condition`: Condition object
    - `field`: Field path (e.g., 'contact.firstName', 'contact.attributes.city', 'message.received', 'journey.status')
    - `operator`: Comparison operator (equals, contains, not_equals, greater_than, less_than, exists, not_exists)
    - `value`: Comparison value
    - `campaignId`: For 'message.receivedInCampaign' conditions
  - `nextNodeId`: Target node if condition matches
- `defaultBranch`: Fallback branch if no conditions match
  - `nextNodeId`: Default target node

**Supported Field Paths**:
- `contact.*`: Contact attributes (firstName, lastName, email, phone, attributes.*)
- `message.received`: Whether contact has received messages
- `message.receivedInCampaign`: Whether contact received message in specific campaign
- `journey.status`: Current journey status
- `contact.leadStatus`: Contact's current lead status

**Execution Outcomes**:
- Routes to `nextNodeId` based on matching branch or default branch

**Features**:
- Multiple condition branches
- Complex field path evaluation
- Campaign-specific message checks
- Default branch fallback
- Dynamic journey routing

##### WEIGHTED_PATH Node

Split leads by percentage distribution across multiple paths.

**Configuration**:
- `paths`: Array of weighted paths
  - `id`: Unique path identifier
  - `label`: Human-readable label
  - `percentage`: Distribution percentage (0-100, must sum to 100)
  - `nextNodeId`: Target node for this path

**Execution Outcomes**:
- Routes to `nextNodeId` based on weighted random selection

**Features**:
- Percentage-based distribution
- A/B testing support
- Random path selection
- Percentage validation

##### MAKE_CALL Node

Make voice calls with voice messages using Asterisk or Twilio.

**Configuration**:
- `audioFile`: Asterisk audio file name (ivr_file) - for pre-uploaded files
- `voiceTemplateId`: Voice template ID for TTS-generated audio
- `didPoolType`: DID pool type ('MC' for Asterisk, 'Twilio' for Twilio)
- `didId`: Specific Asterisk DID ID
- `didSegment`: DID segment name (e.g., "twilio-main") - selects from segment if didId not specified
- `transferNumber`: Transfer destination number (for press-1 transfers)
- `enableVmFile`: Enable voicemail file (ivr_vm_file)
- `recordCall`: Whether to record the call

**Execution Outcomes**:
- `success`: Call initiated successfully
- `failed`: Call failed to initiate
- `answered`: Call was answered
- `no_answer`: Call was not answered
- `busy`: Call received busy signal
- `transferred`: Call was transferred (press-1)

**Features**:
- TTS voice message generation
- Pre-recorded audio file support
- DID rotation and segmentation
- Press-1 transfer functionality
- Call recording
- Voicemail detection
- Call status tracking
- Transfer handling

##### UPDATE_CONTACT_STATUS Node

Update the contact's lead status.

**Configuration**:
- `leadStatus`: Lead status value (SOLD, DNC, CONTACT_MADE, PAUSED, etc.)

**Execution Outcomes**:
- `success`: Status updated successfully
- `failed`: Failed to update status

**Features**:
- Lead status management
- Status automation triggers
- Status history tracking

#### Journey Statuses

- **DRAFT**: Journey is being created/edited, not yet active
- **ACTIVE**: Journey is running and executing nodes
- **PAUSED**: Journey is temporarily paused (contacts remain enrolled)
- **ARCHIVED**: Journey is archived and no longer active

#### Entry Criteria

Journeys can automatically enroll contacts based on criteria:

- **Segment-based**: Enroll contacts from specific segments
- **Tag-based**: Enroll contacts with specific tags
- **Attribute-based**: Enroll contacts matching attribute filters
- **Auto-enrollment**: Automatic enrollment when criteria are met

**Configuration**:
```json
{
  "segmentIds": ["uuid1", "uuid2"],
  "tags": ["tag1", "tag2"],
  "attributes": {
    "city": "New York",
    "age": { "greater_than": 25 }
  }
}
```

#### Removal Criteria

Journeys can automatically remove contacts based on conditions:

- **Webhook-based**: Remove when webhook endpoint is called
- **Call duration-based**: Remove after minimum call duration
- **Call status-based**: Remove based on specific call statuses
- **Custom conditions**: Custom condition evaluation

**Configuration**:
```json
{
  "enabled": true,
  "webhookToken": "unique-token-for-webhook",
  "webhookPayloadField": "phoneNumber",
  "conditions": [
    {
      "type": "call_transferred",
      "config": {}
    },
    {
      "type": "call_duration",
      "config": {
        "minDurationSeconds": 30
      }
    },
    {
      "type": "webhook",
      "config": {
        "webhookUrl": "https://example.com/webhook",
        "webhookPayloadField": "phone"
      }
    },
    {
      "type": "call_status",
      "config": {
        "callStatuses": ["ANSWERED", "COMPLETED"]
      }
    }
  ]
}
```

**Webhook Endpoint**: `/api/webhooks/journeys/removal-webhook/{journeyId}/{webhookToken}`

#### Schedule Configuration

Control when journey nodes execute:

- **Timezone**: Timezone for schedule calculations
- **Allowed Days**: Days of week when messages can be sent (0-6, Sunday-Saturday)
- **Allowed Hours**: Time window for sending (start hour, end hour, 0-23)
- **Max Messages Per Day**: Rate limiting per journey

**Configuration**:
```json
{
  "enabled": true,
  "timezone": "America/New_York",
  "allowedDays": [1, 2, 3, 4, 5], // Monday-Friday
  "allowedHours": { "start": 9, "end": 17 }, // 9 AM - 5 PM
  "maxMessagesPerDay": 100
}
```

#### Journey Execution Engine

The journey execution engine processes journey nodes on a schedule:

- **Cron Scheduler**: Runs every minute to process pending executions
- **Execution Status**: PENDING → EXECUTING → COMPLETED/FAILED/SKIPPED
- **Node Execution Tracking**: Detailed logs for each node execution
- **Outcome Routing**: Routes to next node based on execution outcome
- **Execution Rules Integration**: Checks after-hours, TCPA, resubmission rules
- **Timezone Handling**: Respects contact and tenant timezones
- **Retry Logic**: Automatic retries for failed executions

**Execution Flow**:
1. Journey launched → contacts enrolled
2. Entry node scheduled for each contact
3. Cron scheduler picks up pending executions
4. Execution rules checked (after-hours, TCPA, etc.)
5. Node executed based on type
6. Outcome determined (success, failed, answered, etc.)
7. Next node scheduled based on outcome routing
8. Process repeats until journey completion or removal

#### Contact Journey Tracking

Track each contact's progress through a journey:

- **Journey Contact Status**: ACTIVE, PAUSED, COMPLETED, REMOVED
- **Current Node**: Track which node the contact is currently on
- **Enrollment Date**: When contact was enrolled
- **Completion Date**: When journey was completed
- **Pause Date**: When journey was paused for contact
- **Removal Date**: When contact was removed
- **Execution History**: Complete log of all node executions

#### Execution Logging

Detailed execution logs for debugging and analytics:

- **Execution Status**: PENDING, EXECUTING, COMPLETED, FAILED, SKIPPED
- **Scheduled At**: When execution was scheduled
- **Executed At**: When execution started
- **Completed At**: When execution finished
- **Result Object**: Detailed execution results
  - `success`: Boolean success indicator
  - `action`: Action performed
  - `message`: Human-readable message
  - `error`: Error message if failed
  - `messageSid`: Twilio message SID (for SMS)
  - `callUniqueId`: Asterisk call unique ID (for calls)
  - `callStatus`: Call status (ANSWERED, NO_ANSWER, etc.)
  - `didUsed`: DID phone number used
  - `ivrFilePath`: Asterisk audio file path
  - `outcome`: Detailed outcome description
  - `outcomeDetails`: Additional outcome details

#### Journey Templates

Pre-built journey templates for common use cases:

- **AI-Generated Templates**: Generate templates using AI based on industry and requirements
- **Template Library**: Browse and use pre-built templates
- **Template Customization**: Modify templates to fit specific needs
- **Multi-day Templates**: Templates spanning multiple days with calls and SMS

#### API Endpoints

- `GET /journeys` - List all journeys
- `GET /journeys/:id` - Get journey details
- `POST /journeys` - Create new journey
- `PUT /journeys/:id` - Update journey
- `DELETE /journeys/:id` - Delete journey
- `POST /journeys/:id/launch` - Launch journey
- `POST /journeys/:id/pause` - Pause journey
- `POST /journeys/:id/nodes` - Add node to journey
- `PUT /journeys/:id/nodes/:nodeId` - Update journey node
- `DELETE /journeys/:id/nodes/:nodeId` - Delete journey node
- `POST /journeys/:id/enroll` - Enroll contact in journey
- `POST /journeys/:id/remove-contact/:contactId` - Remove contact from journey
- `GET /journeys/:id/contacts` - List contacts in journey
- `GET /journeys/:id/executions/:contactId` - Get execution history for contact
- `PUT /journeys/:id/removal-criteria` - Update removal criteria
- `POST /journeys/:id/removal-criteria/generate-webhook-token` - Generate webhook token
- `GET /journeys/:id/removal-criteria/webhook-url` - Get webhook URL

---

### 2.2 AI Template Builder (Journey Templates)

**Bullet Point**: AI-powered journey template generation using Claude AI

#### Overview

The AI Template Builder generates complete multi-day journey templates using Claude AI. It creates voice scripts, SMS messages, and journey node structures based on business requirements, industry, brand voice, and marketing objectives.

#### Template Generation Process

1. **Input Collection**: Gather industry, brand, requirements
2. **AI Analysis**: Claude AI analyzes requirements and generates content
3. **Script Generation**: Generate voice scripts for each call
4. **SMS Generation**: Generate SMS messages (if enabled)
5. **Voice Template Creation**: Create voice templates for each script
6. **Journey Structure**: Build complete journey with nodes and connections
7. **Template Storage**: Save as reusable journey template

#### Generation Parameters

**Industry**: Business industry or category (e.g., "Real Estate", "SaaS", "E-commerce")

**Brand Name**: Company or brand name for personalization

**Total Days**: Number of days the journey spans (e.g., 7, 14, 30)

**Calls Per Day**: Number of calls to make each day (e.g., 1, 2, 3)

**Rest Period Days**: Days without calls (e.g., weekends: [6, 0] for Saturday, Sunday)

**Include SMS**: Whether to include SMS messages between calls

**Marketing Angle**: 
- `corporate`: Professional, business-focused tone
- `personable`: Friendly, personal tone
- `psa`: Public service announcement style
- `storytelling`: Narrative-driven approach

**Sentiment**:
- `kind`: Warm, caring tone
- `caring`: Empathetic, understanding
- `concerned`: Worried, urgent
- `excited`: Enthusiastic, energetic
- `passionate`: Strong, committed
- `enthusiastic`: Positive, upbeat

**Voice Configuration**:
- `voiceTemplateId`: Existing voice template ID
- `voicePresetId`: Voice preset ID (alternative to voiceTemplateId)
- `numberOfVoices`: Number of different voices to use (for variety)
- `includeContactName`: Whether to include contact's name in scripts

**Audio Effects**:
- `distance`: 'close', 'medium', 'far' (affects audio processing)
- `backgroundNoise`: Optional background noise
  - `enabled`: Boolean
  - `volume`: 0.0-1.0
  - `file`: Noise file name
- `volume`: Overall volume multiplier (0.0-2.0)
- `coughEffects`: Array of cough effects at specific timestamps
  - `file`: 'stifled-cough', 'coughing-woman', 'coughing-woman-2'
  - `timestamp`: Time in seconds
  - `volume`: Effect volume

**Reference Script**: Optional edited preview script to use as style reference

**AI Temperature**: 0-1, controls creativity (default: 0.7)

**Journey Name**: Custom name for the generated journey

**SMS CTA Configuration**:
- `type`: 'none', 'event', 'phone', 'ai'
- `eventTypeId`: For 'event' type
- `phoneNumber`: For 'phone' type
- `aiTemplateId`: For 'ai' type

**Delay Configuration**:
- `betweenCalls`: Array of delays between calls
  - `value`: Delay value
  - `unit`: 'MINUTES' or 'HOURS'
- `betweenCallAndSms`: Delay between call and SMS
  - `value`: Delay value
  - `unit`: 'MINUTES' or 'HOURS'

#### Background Generation

For large templates (high totalDays × callsPerDay), generation runs in background:

- **Job-based Processing**: Async job queue for generation
- **Status Tracking**: Track generation progress
- **Progress Updates**: Real-time progress percentage
- **Error Handling**: Comprehensive error reporting

**Threshold**: Automatically uses background if totalDays × callsPerDay > threshold

#### Generated Template Structure

Each generated template includes:

1. **Journey Metadata**: Name, description, status
2. **Entry Criteria**: Auto-enrollment configuration
3. **Schedule Configuration**: Timezone, allowed days/hours
4. **Journey Nodes**:
   - **MAKE_CALL Nodes**: One per call with voice template
   - **TIME_DELAY Nodes**: Between calls and between call/SMS
   - **SEND_SMS Nodes**: SMS messages (if enabled)
   - **UPDATE_CONTACT_STATUS Nodes**: Status updates at journey end
5. **Voice Templates**: Generated for each unique script
6. **Node Connections**: Properly linked nodes with outcomes

#### Script Generation Details

**Press-1 Audio Scripts**: 
- Generated for each call
- Includes agent name (from voice template/preset)
- Includes contact name (if enabled)
- Press-1 transfer option (if transfer number configured)
- Natural, conversational tone matching marketing angle and sentiment

**SMS Messages**:
- Generated between calls (if enabled)
- Includes CTA based on configuration
- Matches brand voice and sentiment
- Variable substitution support

#### Template Customization

After generation, templates can be:
- **Edited**: Modify scripts, messages, delays
- **Extended**: Add additional nodes
- **Duplicated**: Create variations
- **Launched**: Start journey immediately

#### API Endpoints

- `POST /journey-templates/generate` - Generate AI-powered template
- `GET /journey-templates/generation-status/:jobId` - Check generation status
- `GET /journey-templates` - List all templates
- `GET /journey-templates/:id` - Get template details
- `POST /journey-templates/:id/create-journey` - Create journey from template
- `DELETE /journey-templates/:id` - Delete template

---

### 2.3 Campaigns

**Bullet Point**: Outbound and conversational SMS campaign management

#### Overview

Campaigns enable businesses to send bulk SMS messages to contacts with advanced features like AI-powered replies, speed throttling, number pool rotation, and comprehensive analytics.

#### Campaign Types

**OUTBOUND**: Traditional one-way SMS campaigns
- Send messages to contacts
- No automatic replies
- Best for announcements, promotions, reminders

**CONVERSATIONAL**: Two-way SMS campaigns with AI replies
- Send initial messages
- AI automatically replies to inbound messages
- Best for lead qualification, customer support, engagement

#### Campaign Statuses

- **DRAFT**: Campaign being created, not yet launched
- **SCHEDULED**: Campaign scheduled for future launch
- **ACTIVE**: Campaign is running and sending messages
- **PAUSED**: Campaign temporarily paused
- **COMPLETED**: Campaign finished sending all messages
- **CANCELLED**: Campaign cancelled before completion

#### Speed Configuration

Control message sending rate to avoid spam detection and comply with carrier limits:

- **Messages Per Minute**: Maximum messages per minute
- **Messages Per Hour**: Maximum messages per hour
- **Messages Per Day**: Maximum messages per day

**Implementation**: Redis-based token bucket rate limiting

#### AI-Enabled Campaigns

Conversational campaigns use Claude AI for automatic replies:

- **AI Template Integration**: Link AI template for reply behavior
- **Conversation Context**: Maintains conversation history
- **Lead Qualification**: Extracts qualification data from conversations
- **Auto-reply Logic**: Intelligent reply generation based on context

#### Content AI Templates

Generate unique messages per contact using Content AI:

- **Personalization**: Each contact receives unique message
- **Variable Substitution**: Contact attributes in messages
- **AI Generation**: Claude AI generates message content
- **Template Configuration**: Configure generation parameters

#### Audience Selection

**All Contacts**: Send to all contacts in tenant

**Segments**: Send to contacts in specific segments
- Select one or more segments
- Dynamic segment updates respected

**CSV Upload**: Upload CSV file with contacts
- Background validation
- Phone number normalization
- Duplicate detection
- Consent verification

#### Number Pool Selection

Round-robin DID routing for message sending:

- **Number Pool**: Select Twilio number pool
- **Automatic Rotation**: DIDs rotate automatically
- **Load Balancing**: Distributes load across DIDs
- **Delivery Optimization**: Improves delivery rates

#### Template Support

Use message templates for campaign content:

- **Template Selection**: Choose from template library
- **Variable Substitution**: {firstName}, {lastName}, etc.
- **Template Preview**: Preview before sending
- **Version Management**: Track template versions

#### Campaign Wizard

7-step creation wizard:

1. **Details**: Name, type, description
2. **Audience**: All contacts, segments, or CSV upload
3. **Message Content**: Template or direct message
4. **Speed Configuration**: Messages per minute/hour/day
5. **Number Pool**: Select number pool
6. **AI Behavior**: AI template selection (for conversational)
7. **Review & Launch**: Review and launch campaign

#### Campaign Analytics

Track campaign performance:

- **Messages Sent**: Total messages sent
- **Messages Delivered**: Successfully delivered
- **Messages Failed**: Failed deliveries
- **Replies**: Inbound messages received
- **Delivery Rate**: Percentage delivered
- **Reply Rate**: Percentage replied

#### Campaign Contacts

Track contacts in campaigns:

- **Contact Status**: PENDING, SENT, DELIVERED, FAILED, REPLIED, OPTED_OUT
- **Message History**: All messages sent to contact
- **Delivery Status**: Twilio delivery status updates
- **Reply Thread**: Conversation thread with contact

#### CSV Import

Large CSV import with background processing:

- **File Upload**: Upload CSV file
- **Background Validation**: Async validation job
- **Phone Normalization**: Automatic E.164 formatting
- **Deduplication**: Remove duplicates
- **Consent Verification**: Check TCPA compliance
- **Error Reporting**: Detailed error report for invalid rows
- **Progress Tracking**: Track import progress

#### API Endpoints

- `GET /campaigns` - List all campaigns
- `GET /campaigns/:id` - Get campaign details
- `POST /campaigns` - Create new campaign
- `PUT /campaigns/:id` - Update campaign
- `DELETE /campaigns/:id` - Delete campaign
- `POST /campaigns/:id/launch` - Launch campaign
- `POST /campaigns/:id/pause` - Pause campaign
- `GET /campaigns/:id/contacts` - List campaign contacts
- `GET /campaigns/:id/analytics` - Get campaign analytics
- `POST /campaigns/:id/contacts/import` - Import contacts from CSV

---

### 2.4 Contacts & Segments

**Bullet Point**: Contact management and segmentation system

#### Overview

The Contacts system provides comprehensive contact management with custom attributes, lead status tracking, consent management, and segmentation capabilities for targeted messaging and journey enrollment.

#### Contact Management

##### Contact Attributes

**Standard Fields**:
- `firstName`: First name
- `lastName`: Last name
- `email`: Email address
- `phone`: Phone number (E.164 format)
- `company`: Company name
- `leadStatus`: Current lead status (SOLD, DNC, CONTACT_MADE, etc.)

**Custom Attributes**: JSON object for custom fields
- Any key-value pairs
- Supports nested objects
- Used in segmentation and personalization

**Tags**: Array of string tags for categorization

##### Lead Status Tracking

Track contact's current status in sales pipeline:

- **System Statuses**: SOLD, DNC, CONTACT_MADE, PAUSED, APPOINTMENT_SCHEDULED
- **Custom Statuses**: Tenant-defined statuses
- **Status History**: Track status changes over time
- **Status Automations**: Automatic status transitions

##### Consent Tracking

TCPA compliance consent management:

- **Express Consent**: Explicit written consent
- **Consent Type**: Automated messages, marketing messages
- **Consent Date**: When consent was given
- **Consent Expiration**: Optional expiration date
- **Consent Source**: Where consent was obtained
- **Consent History**: Track consent changes

##### Opt-out Management

- **Opt-out Status**: Track if contact opted out
- **Opt-out Date**: When opt-out occurred
- **Opt-out Method**: STOP keyword, webhook, manual
- **Opt-out Reason**: Reason for opt-out
- **Re-opt-in**: Allow contacts to opt back in

##### Contact Visits Tracking

Track website visits and booking page interactions:

- **Visit History**: All visits to booking pages
- **IP Address**: Visitor IP address
- **User Agent**: Browser/device information
- **Referrer**: Referring URL
- **Metadata**: Custom tracking data
- **Booking Conversion**: Track visit-to-booking conversion

##### Conversation History

All SMS conversations with contact:

- **Threaded Conversations**: Grouped by contact
- **Message Count**: Total messages exchanged
- **Last Message**: Most recent message timestamp
- **Conversation Status**: OPEN, CLOSED, ARCHIVED

##### Campaign History

All campaigns contact participated in:

- **Campaign List**: Campaigns contact was added to
- **Message Count**: Messages sent in each campaign
- **Campaign Status**: Current status in campaign
- **Last Activity**: Last campaign activity date

##### Journey Participation History

All journeys contact participated in:

- **Journey List**: Journeys contact was enrolled in
- **Current Status**: ACTIVE, PAUSED, COMPLETED, REMOVED
- **Current Node**: Current position in journey
- **Execution History**: All node executions
- **Enrollment Date**: When enrolled
- **Completion Date**: When completed (if applicable)

#### Segments

Dynamic or static contact groups for targeting:

##### Filter Criteria

**Tags**: Filter by contact tags
- Include contacts with any of specified tags
- Exclude contacts with specified tags

**Attributes**: Filter by custom attributes
- Exact match: `{ "city": "New York" }`
- Comparison: `{ "age": { "greater_than": 25 } }`
- Contains: `{ "interests": { "contains": "technology" } }`

**Consent Status**: Filter by consent
- `hasConsent`: Boolean
- `consentType`: Automated, marketing, etc.

**Lead Status**: Filter by lead status
- Include specific statuses
- Exclude specific statuses

##### Continuous Inclusion

**Dynamic Segments**: `continuousInclusion: true`
- Automatically add contacts as they meet criteria
- Contacts remain in segment while they meet criteria
- Updated via scheduled job

**Static Segments**: `continuousInclusion: false`
- Set audience at creation time
- Manual updates required
- Faster queries

##### Segment Usage

- **Journey Entry**: Auto-enroll contacts from segments
- **Campaign Targeting**: Send campaigns to segments
- **Analytics**: Analyze segment performance
- **Contact Count**: Real-time contact count

#### CSV Import

Bulk contact import with validation:

**File Format**:
- CSV with headers
- Required: phone number
- Optional: firstName, lastName, email, company, tags, attributes

**Import Process**:
1. Upload CSV file
2. Background validation job
3. Phone number normalization (E.164)
4. Duplicate detection
5. Consent verification
6. Import contacts
7. Error report generation

**Validation**:
- Phone number format validation
- Email format validation
- Duplicate detection (by phone)
- Required field validation
- Data type validation

**Error Handling**:
- Invalid rows skipped
- Error report with row numbers
- Partial import support
- Retry failed imports

#### Contact Deduplication

Automatic duplicate detection:

- **Phone-based**: Primary deduplication key
- **Email-based**: Secondary deduplication
- **Merge Strategy**: Update existing vs create new
- **Attribute Merging**: Merge custom attributes
- **Tag Merging**: Combine tags

#### Phone Number Normalization

Automatic E.164 format standardization:

- **Input Formats**: Various formats accepted
- **Output Format**: E.164 (+1234567890)
- **Country Code Detection**: Auto-detect country
- **Validation**: Validate phone number format
- **Storage**: Store in normalized format

#### API Endpoints

**Contacts**:
- `GET /contacts` - List contacts
- `GET /contacts/:id` - Get contact details
- `POST /contacts` - Create contact
- `PUT /contacts/:id` - Update contact
- `DELETE /contacts/:id` - Delete contact
- `POST /contacts/import` - Import contacts from CSV
- `GET /contacts/:id/conversations` - Get contact conversations
- `GET /contacts/:id/campaigns` - Get contact campaigns
- `GET /contacts/:id/journeys` - Get contact journeys

**Segments**:
- `GET /segments` - List segments
- `GET /segments/:id` - Get segment details
- `POST /segments` - Create segment
- `PUT /segments/:id` - Update segment
- `DELETE /segments/:id` - Delete segment
- `POST /segments/count-matching` - Count matching contacts

---

### 2.5 Lead Statuses & Automations

**Bullet Point**: Custom lead status management with automated status transitions

#### Overview

Lead Statuses allow businesses to track contacts through custom sales pipeline stages. Status Automations enable automatic status transitions based on time, events, or conditions.

#### Custom Lead Statuses

##### Status Configuration

**Basic Fields**:
- `name`: Status name (e.g., "Qualified", "Meeting Scheduled")
- `description`: Status description
- `color`: Display color (hex code)
- `displayOrder`: Sort order for UI
- `isActive`: Whether status is active
- `isSystem`: Whether status is system-defined

**Metadata**: JSON object for custom data
- Custom fields for status
- Integration data
- Workflow configuration

##### System Statuses

Pre-defined system statuses:
- **SOLD**: Contact converted to customer
- **DNC**: Do Not Call - contact requested no contact
- **CONTACT_MADE**: Initial contact established
- **PAUSED**: Temporarily paused
- **APPOINTMENT_SCHEDULED**: Appointment booked

##### Status Management

- **Create**: Add custom statuses
- **Edit**: Modify status properties
- **Reorder**: Change display order
- **Activate/Deactivate**: Enable/disable statuses
- **Delete**: Remove statuses (with validation)

#### Status Automations

Automatically transition contacts between statuses:

##### Time-Based Automations

Transition contacts after a time period:

**Configuration**:
- `triggerType`: 'TIME_BASED'
- `fromStatusId`: Source status (optional, null = any status)
- `timeValue`: Time amount (number)
- `timeUnit`: 'MINUTES', 'HOURS', 'DAYS'
- `targetStatusId`: Destination status
- `conditions`: Optional conditions (campaigns, journeys, tags)

**Example**: Move contacts from "New Lead" to "Follow Up" after 24 hours

##### Status Change Triggers

Transition contacts when status changes:

**Configuration**:
- `triggerType`: 'STATUS_CHANGE'
- `triggerStatusId`: Status that triggers automation
- `targetStatusId`: Destination status
- `conditions`: Optional conditions

**Example**: Move contacts to "Contacted" when status changes to "CONTACT_MADE"

##### Condition-Based Automations

Apply automations only to contacts matching conditions:

**Conditions**:
- `campaignIds`: Only contacts in specified campaigns
- `journeyIds`: Only contacts in specified journeys
- `tags`: Only contacts with specified tags
- Custom attribute filters

**Example**: Move contacts to "Qualified" after 7 days, but only if they're in "Premium Campaign"

##### Automation Status

- **Active**: Automation is running
- **Inactive**: Automation is disabled
- **Enable/Disable**: Toggle automation on/off

#### Status Automation Scheduler

Cron-based scheduler processes automations:

- **Execution Frequency**: Runs periodically (every hour)
- **Batch Processing**: Processes multiple automations
- **Efficiency**: Only processes active automations
- **Error Handling**: Logs errors, continues processing
- **Performance**: Optimized queries for large datasets

#### Status History

Track all status changes:

- **Change Log**: Complete history of status changes
- **Timestamp**: When change occurred
- **Previous Status**: Previous status value
- **New Status**: New status value
- **Changed By**: User or automation that made change
- **Reason**: Optional reason for change

#### API Endpoints

**Lead Statuses**:
- `GET /lead-statuses` - List all statuses
- `GET /lead-statuses/:id` - Get status details
- `POST /lead-statuses` - Create status
- `PUT /lead-statuses/:id` - Update status
- `DELETE /lead-statuses/:id` - Delete status
- `POST /lead-statuses/reorder` - Reorder statuses

**Status Automations**:
- `GET /lead-statuses/automations` - List automations
- `GET /lead-statuses/automations/:id` - Get automation details
- `POST /lead-statuses/automations` - Create automation
- `PUT /lead-statuses/automations/:id` - Update automation
- `DELETE /lead-statuses/automations/:id` - Delete automation

---

### 2.6 AI Features

**Bullet Point**: Comprehensive AI integration using Claude AI

#### Overview

The AI Features system provides intelligent automation capabilities including chatbot configuration, conversational AI, content generation, and integration building. All AI features use Anthropic's Claude AI (claude-3-5-haiku-20241022) for natural language processing and generation.

#### AI Templates

AI Templates configure chatbot behavior for conversational campaigns and SMS interactions.

##### Purpose Configuration

Configure what the AI chatbot should accomplish:

- **provide_information**: Answer questions and provide information
- **drive_lead_submissions**: Collect lead information and qualify prospects
- **schedule_calendar**: Schedule appointments and meetings
- **drive_phone_calls**: Encourage phone calls and provide contact information

##### Template Configuration

**Product Information**: Description of products/services offered
- Industry-specific product descriptions
- Key features and benefits
- Use cases and applications

**Service Information**: How services work
- Service processes and workflows
- Typical timelines and expectations
- Common procedures

**Qualification Guidelines**: Lead qualification criteria
- Ideal customer profiles
- Qualification questions to ask
- Common field values
- Required vs optional information

**Brand Tonality**: Communication style
- Tone description (professional, friendly, casual, consultative)
- Voice and personality
- Communication approach

**Welcome Message**: Initial greeting message
- Must end with a question to engage users
- Under 160 characters for SMS
- Natural conversation starter

**Custom Instructions**: Additional behavior guidance
- Specific rules and constraints
- Response formatting preferences
- Edge case handling

**Business Information**:
- `businessName`: Company name
- `phoneNumber`: Contact phone number (for drive_phone_calls purpose)

##### AI Template Usage

- **Campaign Integration**: Link to conversational campaigns
- **Conversation Context**: Maintains context across messages
- **Lead Qualification**: Extracts structured data from conversations
- **Auto-reply**: Automatic replies to inbound messages

#### AI Generation Service

Core service for AI-powered content generation.

##### Chatbot Config Generation

Generate complete chatbot configuration from industry description:

**Input**: Industry name or description (e.g., "Real Estate", "SaaS", "E-commerce")

**Output**: Complete chatbot configuration including:
- Product information
- Service information
- Qualification guidelines
- Brand tonality
- Welcome message
- Common fields

**Process**:
1. Analyze industry description
2. Generate industry-specific configuration
3. Return structured JSON configuration

##### System Prompt Generation

Build comprehensive system prompts from AI template configuration:

**Components**:
1. Purpose instructions (based on purposes array)
2. Product/service information
3. Qualification guidelines
4. Brand tonality
5. Custom instructions
6. Response format guidelines

**Usage**: Used for Claude AI conversations to guide chatbot behavior

##### Conversation Context Management

Maintain conversation context for multi-turn conversations:

- **Session Storage**: Redis-based session storage (24-hour expiration)
- **Message History**: Track conversation history
- **Context Window**: Maintains relevant context
- **Session ID**: Unique session identifier per contact

##### SMS Variations Generation

Generate multiple variations of SMS messages:

**Input**: Sample SMS message

**Output**: 5 variations that:
- Maintain core message and intent
- Use different wording, tone, or structure
- Are optimized for SMS (under 160 characters)
- Are engaging and action-oriented
- Vary in formality, urgency, or approach

##### Content AI Variations Generation

Generate variations based on example messages:

**Input**: 3-10 example messages, creativity level (0-1)

**Output**: 5 variations matching style and tone

**Creativity Levels**:
- Low (0-0.3): Stay very close to examples
- Medium (0.3-0.7): Moderate variation
- High (0.7-1.0): More creative while maintaining style

##### Unique Message Generation

Generate unique messages per contact:

**Context Support**:
- Contact attributes
- Journey context
- Previous messages
- Custom variables

**Rate Limiting**:
- Max per hour: 100 (configurable)
- Max per day: 1000 (configurable)
- Throttling to prevent abuse

#### Content AI Templates

Generate unique, personalized messages for each contact.

##### Template Configuration

**Example Messages**: 3-10 example messages that define style
- Used as training examples
- Define tone, structure, and approach

**Creativity**: 0-1 value controlling variation level
- Lower = closer to examples
- Higher = more creative variations

**Unique Mode**: Enable unique message generation per contact
- Each contact gets unique message
- Context-aware generation
- Rate limited

**Configuration**:
- `maxUniqueGenerationsPerHour`: Rate limit per hour
- `maxUniqueGenerationsPerDay`: Rate limit per day
- `maxLength`: Maximum message length (default: 160)
- `preserveVariables`: Preserve template variables in output

##### Message Generation

**Variation Generation**: Generate 5 variations from examples
- Stored in template
- Random selection for contacts
- Regeneratable

**Unique Generation**: Generate unique message per contact
- Uses contact context
- Considers previous messages
- Personalized content

**Random Variation**: Get random variation from generated set
- Fast retrieval
- No AI call required
- Consistent with template style

##### Campaign Integration

- **Campaign Linking**: Link Content AI templates to campaigns
- **Per-Contact Generation**: Each contact receives unique message
- **Variable Substitution**: Support for contact variables
- **Usage Tracking**: Track template usage

#### AI Event Creation

Create calendar events from AI conversations:

- **Intent Detection**: Detect scheduling intent in conversation
- **Event Type Matching**: Match to appropriate event type
- **Date/Time Extraction**: Extract date and time from conversation
- **Contact Information**: Use contact details for event
- **Automatic Creation**: Create event automatically

#### Integration Builder

Build AI integrations with external systems:

- **Custom Integrations**: Create custom AI-powered integrations
- **API Connections**: Connect to external APIs
- **Data Mapping**: Map conversation data to external systems
- **Webhook Integration**: Trigger webhooks from conversations
- **Response Handling**: Process external system responses

#### API Endpoints

**AI Templates**:
- `GET /ai-templates` - List AI templates
- `GET /ai-templates/:id` - Get template details
- `POST /ai-templates` - Create template
- `PUT /ai-templates/:id` - Update template
- `DELETE /ai-templates/:id` - Delete template

**AI Generation**:
- `POST /ai/generate-chatbot-config` - Generate chatbot config from industry
- `POST /ai/generate-sms-variations` - Generate SMS variations
- `POST /ai/generate-content-ai-variations` - Generate Content AI variations
- `POST /ai/generate-unique-message` - Generate unique message

**Content AI**:
- `GET /content-ai` - List Content AI templates
- `GET /content-ai/:id` - Get template details
- `POST /content-ai` - Create template
- `PUT /content-ai/:id` - Update template
- `DELETE /content-ai/:id` - Delete template
- `POST /content-ai/:id/generate-variations` - Generate variations
- `POST /content-ai/:id/generate-unique` - Generate unique message
- `GET /content-ai/:id/random-variation` - Get random variation

---

### 2.7 TTS (Text-to-Speech) & Voice

**Bullet Point**: Kokoro TTS integration for voice message generation

#### Overview

The TTS system provides high-quality text-to-speech conversion using Kokoro TTS, a self-hosted TTS engine. The system supports voice templates, voice presets, audio effects, and comprehensive voice configuration for natural-sounding voice messages.

#### Kokoro TTS Service

Self-hosted Kokoro TTS API providing ElevenLabs-compatible interface.

##### Available Voices

**Female Voices** (20+ options):
- **Heart** ❤️ (Best Quality, Grade A) - Recommended for IVR
- **Bella** 🔥 (Grade A-)
- **Nicole** 🎧 (Grade B-)
- **Aoede** (Grade C+)
- **Kore** (Grade C+)
- **Sarah** (Grade C+)
- **Nova** (Grade C)
- **Sky** (Grade C-)
- **Alloy** (Grade C)
- **Jessica** (Grade D)
- **River** (Grade D)

**Male Voices**:
- **Michael** (Grade D)
- **Fenrir** (Grade D)
- **Puck** (Grade D)
- **Echo** (Grade D)
- **Eric** (Grade D)
- **Liam** (Grade D)
- **Onyx** (Grade D)
- **Santa** (Grade D)
- **Adam** (Grade F+)

##### Voice Settings

**Stability** (0-1): Controls speed variation
- Lower = faster, more variation
- Higher = slower, more consistent
- Default: 0.5
- Recommended for IVR: 0.7

**Similarity Boost** (0-1): Controls voice consistency
- Higher = less variation, more consistent
- Default: 0.75
- Recommended for IVR: 0.9

**Style** (0-1): Style parameter (currently for compatibility)

**Use Speaker Boost** (boolean): Enhance speaker clarity
- Default: true

**Speed** (number): Speech speed multiplier
- Default: 1.0
- Range: 0.5-2.0

**Speed Variance** (0-0.5): Natural speed variation
- Adds realism through slight speed variations
- Default: 0.0

**Pitch** (-12 to +12 semitones): Pitch shift
- Negative = lower pitch
- Positive = higher pitch
- Default: 0

**Volume** (0.0-2.0): Volume/gain multiplier
- Default: 1.0
- Range: 0.0-2.0

**Pause Duration** (0.0-2.0 seconds): Pause between phrases
- Default: 0.5
- Adds natural pauses

**Emphasis Strength** (0.0-1.0): Emphasis tag strength
- Default: 0.5
- Controls how emphasis tags are rendered

**Prosody Level** (0.0-1.0): Overall expressiveness
- Default: 0.5
- Higher = more expressive

##### Special Tokens

Support for special tokens in text:

- `[pause]`: Insert pause (replaced with newline)
- `[breath]`: Breathing sound
- `[excited]`: Excited tone
- `[whisper]`: Whispered speech
- `[slow]`: Slow speech
- `[fast]`: Fast speech
- `[emphasis]`: Emphasized text
- `[question]`: Question intonation
- `[happy]`: Happy tone
- `[sad]`: Sad tone
- `[angry]`: Angry tone
- `[surprised]`: Surprised tone

Most tokens are removed before TTS, with `[pause]` and `[breath]` being processed specially.

#### Voice Templates

Reusable voice message templates with variable substitution.

##### Template Configuration

**Message Content**: Template text with variables
- Variables: `{firstName}`, `{lastName}`, `{phone}`, etc.
- Variable extraction: Automatically extracted from template
- Variable validation: Ensures variables exist in contact data

**Voice Selection**:
- `kokoroVoiceId`: Kokoro voice ID
- `kokoroVoiceName`: Human-readable voice name
- `voicePresetId`: Reference to voice preset (alternative)

**Voice Config Override**: Override preset config if needed
- Stability, similarity boost, speed, pitch, volume, etc.
- Merged with preset config (template takes precedence)

**Audio Effects**:
- `distance`: 'close', 'medium', 'far'
- `backgroundNoise`: Optional background noise
  - `enabled`: Boolean
  - `volume`: 0.0-1.0
  - `file`: Noise file name
- `volume`: Overall volume multiplier
- `coughEffects`: Array of cough effects
  - `file`: 'stifled-cough', 'coughing-woman', 'coughing-woman-2'
  - `timestamp`: Time in seconds
  - `volume`: Effect volume

**Template Status**: Active/inactive
- Inactive templates not available for selection
- Can be reactivated

##### Template Usage

- **Journey Integration**: Used in MAKE_CALL nodes
- **Variable Substitution**: Variables replaced with contact data
- **Audio Generation**: Generates audio on-demand
- **Preview**: Preview audio before using

#### Voice Presets

Pre-configured voice settings for consistency across templates.

##### Preset Configuration

**Basic Info**:
- `name`: Preset name
- `description`: Preset description
- `kokoroVoiceId`: Kokoro voice ID
- `kokoroVoiceName`: Human-readable voice name
- `customVoiceName`: Custom name for AI agent (used in templates/journeys)

**Voice Config**: Complete voice configuration
- Stability, similarity boost, style, speaker boost
- Speed, speed variance, pitch, volume
- Pause duration, emphasis strength, prosody level

**Tags**: Supported special tags
- `['breathe', 'excited', 'whisper', 'loud', 'slow', 'fast']`
- Indicates which tags preset supports

**Default Preset**: One preset can be default per tenant
- Used when no preset specified
- Quick selection in UI

**Status**: Active/inactive
- Inactive presets not available

##### Preset Usage

- **Template Integration**: Link presets to templates
- **Consistency**: Maintain consistent voice across templates
- **Quick Setup**: Fast template creation with presets
- **Override Support**: Templates can override preset settings

#### Audio Processing

Advanced audio processing for natural-sounding voice messages.

##### Audio Normalization

- **Level Normalization**: Normalize audio levels
- **Peak Detection**: Detect and adjust peaks
- **Dynamic Range**: Optimize dynamic range
- **Format Conversion**: Convert between formats (WAV, MP3)

##### Background Noise

Add realistic background noise:

- **Noise Types**: Office, street, nature, etc.
- **Volume Control**: Adjustable noise volume
- **File Support**: Custom noise files
- **Mixing**: Blend noise with voice

##### Distance Effects

Simulate distance in audio:

- **Close**: Clear, present sound
- **Medium**: Moderate distance
- **Far**: Distant, slightly muffled
- **Processing**: EQ and reverb adjustments

##### Cough Effects

Add cough effects at specific timestamps:

- **Types**: Stifled cough, coughing woman (2 variants)
- **Timestamp**: Precise timing in seconds
- **Volume**: Adjustable effect volume
- **Realism**: Adds human-like imperfections

##### Volume Adjustment

- **Gain Control**: Adjust overall volume
- **Normalization**: Automatic level normalization
- **Limiting**: Prevent clipping
- **Dynamic Range**: Optimize for phone calls

#### Generated Audio Storage

Track and manage generated audio files:

- **File Storage**: Store generated audio files
- **Metadata**: Track generation parameters
- **URL Generation**: Generate preview URLs
- **Cleanup**: Automatic cleanup of old files
- **Caching**: Cache frequently used audio

#### API Endpoints

**Voice Templates**:
- `GET /voice-templates` - List voice templates
- `GET /voice-templates/:id` - Get template details
- `POST /voice-templates` - Create template
- `PUT /voice-templates/:id` - Update template
- `DELETE /voice-templates/:id` - Delete template
- `POST /voice-templates/:id/preview` - Generate preview audio

**Voice Presets**:
- `GET /voice-presets` - List voice presets
- `GET /voice-presets/:id` - Get preset details
- `POST /voice-presets` - Create preset
- `PUT /voice-presets/:id` - Update preset
- `DELETE /voice-presets/:id` - Delete preset

**Kokoro TTS**:
- `GET /kokoro/voices` - List available Kokoro voices
- `GET /kokoro/voices/:id` - Get voice details
- `POST /kokoro/text-to-speech/:voiceId` - Generate speech

---

### 2.8 PBX (Private Branch Exchange) System

**Bullet Point**: Complete cloud PBX system with Asterisk integration

#### Overview

The PBX system provides a complete cloud-based phone system with Asterisk integration, enabling agents to handle inbound and outbound calls through a web-based interface. The system includes call routing, queuing, agent management, and comprehensive reporting.

#### Asterisk Integration

##### AMI (Asterisk Manager Interface)

Control Asterisk via AMI:

- **Connection Management**: Maintain AMI connection
- **Command Execution**: Execute Asterisk commands
- **Event Listening**: Listen to Asterisk events
- **Call Control**: Originate, bridge, transfer calls
- **Channel Management**: Manage SIP channels

##### PJSIP Trunk Configuration

Configure SIP trunks for external connectivity:

- **Twilio Trunk**: Connect to Twilio SIP
- **Provider Trunks**: Connect to other SIP providers
- **Trunk Management**: Add, remove, configure trunks
- **Failover**: Automatic failover between trunks

##### WebRTC Bridge

Bridge WebRTC connections for agent softphones:

- **WebRTC Support**: Enable browser-based calling
- **SDP Handling**: Handle WebRTC SDP negotiation
- **ICE Candidates**: Manage ICE candidates
- **Bridge Creation**: Bridge WebRTC to SIP/PSTN

##### DID Management

Direct Inward Dialing number management:

- **DID Import**: Import DIDs from Twilio
- **DID Segmentation**: Organize DIDs into segments
- **DID Rotation**: Rotate DIDs for load balancing
- **DID Health**: Check DID capabilities and health
- **DID Assignment**: Assign DIDs to agents/campaigns

##### Call Routing & Queuing

Intelligent call routing:

- **Dialplan Configuration**: Configure Asterisk dialplan
- **Queue Management**: Manage call queues
- **Routing Rules**: Define routing logic
- **Priority Queues**: Priority-based routing

#### Agent Portal

Web-based softphone for agents.

##### WebRTC Softphone

Browser-based calling without hardware:

- **No Installation**: Works in modern browsers
- **WebRTC Audio**: High-quality audio
- **Microphone Access**: Browser microphone access
- **Speaker Access**: Browser speaker output

##### Inbound Call Handling

Answer incoming calls:

- **Call Notifications**: Visual and sound notifications
- **Caller ID Display**: Show caller information
- **Lead Data Display**: Display lead information during call
- **Answer Button**: Click to answer
- **Auto-Answer**: Optional auto-answer

##### Outbound Call Dialing

Make outbound calls:

- **Click-to-Call**: Click contact to call
- **Dial Pad**: Manual number entry
- **Call History**: Call from history
- **Contact Integration**: Call from contact list

##### Call Controls

During active calls:

- **Hold**: Put call on hold
- **Mute**: Mute microphone
- **Transfer**: Transfer to another agent/number
- **Hangup**: End call
- **Conference**: Add to conference call

##### Lead Data Display

View lead information during calls:

- **Contact Info**: Name, phone, email
- **Lead Status**: Current lead status
- **Notes**: Contact notes
- **History**: Previous interactions
- **Journey Status**: Current journey position

##### Call Notes & Disposition

Track call outcomes:

- **Call Notes**: Add notes during/after call
- **Disposition**: Select call disposition
  - ANSWERED: Call answered
  - NO_ANSWER: No answer
  - BUSY: Busy signal
  - VOICEMAIL: Left voicemail
  - TRANSFERRED: Transferred
- **Follow-up**: Schedule follow-up actions
- **Status Update**: Update lead status

##### Status Management

Agent availability status:

- **Available**: Ready to receive calls
- **Busy**: Currently on call
- **Away**: Temporarily unavailable
- **Offline**: Not available

##### Real-time Updates

WebSocket-based real-time updates:

- **Call State**: Real-time call state changes
- **Queue Updates**: Queue position updates
- **Status Changes**: Agent status changes
- **Notification**: Incoming call notifications

#### Manager Dashboard

Real-time monitoring and management.

##### Agent Status Grid

Monitor all agents:

- **Status Display**: Current status of each agent
- **Active Calls**: Number of active calls
- **Queue Position**: Position in queue
- **Availability**: Available/busy/away/offline
- **Performance**: Calls handled, average duration

##### Call Queue Monitoring

Monitor call queues:

- **Queue Length**: Number of calls waiting
- **Wait Times**: Average wait time
- **Longest Wait**: Longest waiting call
- **Service Level**: Percentage answered within SLA
- **Abandon Rate**: Percentage of abandoned calls

##### Live Metrics

Real-time performance metrics:

- **Calls in Queue**: Current queue length
- **Average Wait Time**: Current average wait
- **Service Level**: Current service level
- **Agent Utilization**: Agent busy percentage
- **Call Volume**: Calls per hour/day

##### Agent Performance Reports

Detailed agent analytics:

- **Calls Handled**: Total calls answered
- **Average Duration**: Average call length
- **Total Talk Time**: Total time on calls
- **Transfer Rate**: Percentage transferred
- **Disposition Breakdown**: Disposition distribution
- **Quality Scores**: Quality metrics

##### Historical Analytics

Historical performance data:

- **Time Range Selection**: Today, week, month, custom
- **Trend Analysis**: Performance trends
- **Comparison**: Compare periods
- **Export**: Export to CSV/Excel

##### Export Capabilities

Export data for analysis:

- **CSV Export**: Export call logs
- **Excel Export**: Formatted Excel reports
- **PDF Reports**: Formatted PDF reports
- **Scheduled Exports**: Automatic scheduled exports

#### Supervisor Dashboard

Advanced monitoring and intervention.

##### Live Call Monitoring

Monitor active calls:

- **Call List**: List of active calls
- **Call Details**: Detailed call information
- **Audio Stream**: Listen to call audio
- **Real-time Updates**: Live call state updates

##### Whisper Mode

Coach agents without caller hearing:

- **One-Way Audio**: Supervisor hears call, agent hears supervisor
- **Caller Isolation**: Caller doesn't hear supervisor
- **Coaching**: Provide real-time coaching
- **Discrete Support**: Help without disrupting call

##### Barge-in

Join active calls:

- **Three-Way**: Supervisor joins call
- **Full Participation**: Supervisor can speak
- **Intervention**: Intervene when needed
- **Escalation**: Escalate difficult calls

##### Call Recording Access

Access call recordings:

- **Recording List**: List of recorded calls
- **Playback**: Play recordings
- **Download**: Download recordings
- **Search**: Search recordings
- **Quality Review**: Review for quality assurance

##### Advanced Reporting

Comprehensive reporting:

- **Custom Reports**: Build custom reports
- **Advanced Filters**: Complex filtering
- **Data Visualization**: Charts and graphs
- **Scheduled Reports**: Automatic report generation

#### Call Routing

Intelligent call distribution.

##### Automatic Call Distribution (ACD)

Distribute calls to available agents:

- **Round-Robin**: Distribute evenly
- **Least Busy**: Route to least busy agent
- **Skill-Based**: Route based on skills
- **Priority-Based**: Route by priority

##### Agent Availability Management

Track and manage agent availability:

- **Real-time Status**: Current availability
- **Schedule Integration**: Respect agent schedules
- **Break Management**: Track breaks
- **Capacity Management**: Manage agent capacity

##### Queue Management

Manage call queues:

- **Queue Configuration**: Configure queue parameters
- **Priority Queues**: Multiple priority levels
- **Queue Overflow**: Overflow handling
- **Queue Announcements**: Custom announcements

##### Call Forwarding Rules

Configure call forwarding:

- **Forward on Busy**: Forward when busy
- **Forward on No Answer**: Forward after timeout
- **Forward to Voicemail**: Forward to voicemail
- **Custom Rules**: Custom forwarding logic

##### Round-Robin Assignment

Even distribution:

- **Fair Distribution**: Distribute calls evenly
- **Load Balancing**: Balance agent load
- **Rotation**: Rotate through agents
- **Tracking**: Track distribution

#### Call Sessions

Track active call sessions.

##### Session Tracking

Track all active calls:

- **Session ID**: Unique session identifier
- **Call State**: Current call state
- **Participants**: Call participants
- **Start Time**: Call start time
- **Duration**: Call duration

##### Call State Management

Manage call states:

- **INITIATED**: Call initiated
- **RINGING**: Call ringing
- **ANSWERED**: Call answered
- **ON_HOLD**: Call on hold
- **TRANSFERRING**: Call transferring
- **ENDED**: Call ended

##### Call Metadata Recording

Record call metadata:

- **Caller Information**: Caller details
- **Agent Information**: Agent details
- **Call Type**: Inbound/outbound
- **DID Used**: DID used for call
- **Transfer History**: Transfer chain

##### Call Duration Tracking

Track call duration:

- **Total Duration**: Total call time
- **Talk Time**: Actual talk time
- **Hold Time**: Time on hold
- **Wait Time**: Time waiting

##### Transfer Tracking

Track call transfers:

- **Transfer Count**: Number of transfers
- **Transfer Chain**: Complete transfer chain
- **Transfer Reasons**: Reasons for transfer
- **Final Destination**: Final recipient

#### DID Management

Comprehensive DID management.

##### DID Import

Import DIDs from Twilio:

- **Automatic Import**: Import all Twilio numbers
- **Capability Detection**: Detect SMS/Voice/MMS capabilities
- **Health Checking**: Check DID health
- **Status Tracking**: Track DID status

##### DID Segmentation

Organize DIDs into segments:

- **Segment Creation**: Create DID segments
- **Segment Assignment**: Assign DIDs to segments
- **Segment Filtering**: Filter by segment
- **Segment Analytics**: Segment performance

**Common Segments**:
- `twilio-main`: Primary Twilio DIDs
- `twilio-backup`: Backup Twilio DIDs
- `provider-a`: Other provider DIDs

##### DID Rotation

Rotate DIDs for load balancing:

- **Usage Tracking**: Track DID usage
- **Rotation Logic**: Rotate based on usage
- **Load Balancing**: Balance load across DIDs
- **Health-Based**: Rotate based on health

##### DID Health Checking

Monitor DID health:

- **Capability Check**: Check SMS/Voice capabilities
- **Status Check**: Check DID status
- **Health Score**: Calculate health score
- **Alerting**: Alert on health issues

##### DID Capabilities

Track DID capabilities:

- **SMS**: SMS messaging capability
- **Voice**: Voice calling capability
- **MMS**: MMS messaging capability
- **Fax**: Fax capability (if applicable)

#### Call Logs

Comprehensive call logging.

##### Call History

Complete call history:

- **All Calls**: All inbound and outbound calls
- **Filtering**: Filter by date, agent, status
- **Search**: Search call logs
- **Sorting**: Sort by various fields

##### Call Status Tracking

Track call status:

- **INITIATED**: Call initiated
- **RINGING**: Call ringing
- **ANSWERED**: Call answered
- **COMPLETED**: Call completed
- **FAILED**: Call failed
- **BUSY**: Busy signal
- **NO_ANSWER**: No answer

##### Call Disposition

Track call outcomes:

- **ANSWERED**: Call answered
- **NO_ANSWER**: No answer
- **BUSY**: Busy signal
- **FAILED**: Call failed
- **VOICEMAIL**: Left voicemail
- **TRANSFERRED**: Transferred

##### Call Duration Tracking

Track call duration:

- **Total Duration**: Total call time
- **Talk Time**: Actual talk time
- **Hold Time**: Time on hold
- **Recording Duration**: Recording length

##### Transfer Tracking

Track transfers:

- **Transfer Count**: Number of transfers
- **Transfer Chain**: Complete chain
- **Transfer Times**: Transfer timestamps
- **Final Destination**: Final recipient

##### Recording URLs

Access call recordings:

- **Recording Storage**: Store recordings
- **URL Generation**: Generate access URLs
- **Download**: Download recordings
- **Playback**: Play recordings

##### Call Metadata

Additional call information:

- **DID Used**: DID phone number used
- **Transfer Number**: Transfer destination
- **Caller ID**: Caller identification
- **Custom Fields**: Custom metadata

#### API Endpoints

**PBX**:
- `GET /pbx/agents` - List agents
- `GET /pbx/agents/:id` - Get agent details
- `PUT /pbx/agents/:id/status` - Update agent status
- `GET /pbx/queues` - List queues
- `GET /pbx/queues/:id` - Get queue details
- `GET /pbx/calls` - List calls
- `GET /pbx/calls/:id` - Get call details
- `POST /pbx/calls/dial` - Make outbound call
- `POST /pbx/calls/:id/answer` - Answer call
- `POST /pbx/calls/:id/hold` - Hold call
- `POST /pbx/calls/:id/transfer` - Transfer call
- `POST /pbx/calls/:id/hangup` - Hangup call

**DIDs**:
- `GET /asterisk-dids` - List DIDs
- `GET /asterisk-dids/:id` - Get DID details
- `POST /asterisk-dids/import` - Import from Twilio
- `GET /asterisk-dids/segments` - List segments
- `GET /asterisk-dids/next-available-by-segment` - Get next available DID

**Reporting**:
- `GET /pbx/reports/agent-performance` - Agent performance report
- `GET /pbx/reports/queue-metrics` - Queue metrics
- `GET /pbx/reports/call-logs` - Call logs

---

### 2.9 Lead Marketplace

**Bullet Point**: Complete lead marketplace platform for marketers and buyers

#### Overview

The Lead Marketplace is a comprehensive platform that enables marketers to sell leads and buyers to purchase real-time leads. The platform uses a Lead Reservation currency system, supports marketing platform integrations, and provides complete analytics and management tools.

#### Marketplace Users

##### User Types

**MARKETER**: Sells leads through listings
- Create and manage listings
- Set up marketing integrations
- Manage storefront
- Track sales and performance

**BUYER**: Purchases leads via subscriptions
- Browse listings
- Subscribe to listings
- Receive real-time leads
- Track purchases and conversions

**BOTH**: Can both sell and buy leads
- Full marketplace access
- Separate seller and buyer dashboards
- Manage both sides of marketplace

##### Marketer Verification

Marketers are verified if:
- Using native marketing platform integrations (Facebook, TikTok, Google)
- Integration status verified
- Storefront properly configured

Verified status displayed on listings and storefronts.

##### Company Profile

**Company Name**: Business name
**Storefront Slug**: Unique URL slug for storefront
- Format: `leads.nurtureengine.net/storefront/{slug}`
- Must be unique
- SEO-friendly

##### Storefront Settings

**Visual Customization**:
- Banner image
- Logo
- Brand colors
- Social media links

**Content**:
- Company description
- About section
- Terms and conditions
- Contact information

#### Marketplace Onboarding

Step-by-step onboarding wizard for new marketplace users.

##### Onboarding Steps

1. **Welcome**: Introduction to marketplace
2. **Choose Role**: Select Marketer, Buyer, or Both
3. **Marketer Profile**: Company name, storefront setup
4. **Marketer Integration**: Connect marketing platforms
5. **Marketer First Listing**: Create first listing
6. **Buyer Profile**: Buyer profile setup
7. **Buyer Purchase Reservations**: Purchase Lead Reservations
8. **Buyer First Subscription**: Subscribe to first listing
9. **Complete**: Onboarding finished

##### Progress Tracking

- **Step Completion**: Track completed steps
- **Auto-Validation**: Validate steps based on actual data
- **Progress Percentage**: Show completion percentage
- **Skip Option**: Skip onboarding steps

##### Step Validation

Steps auto-validate when requirements met:
- Profile setup: Validates company name, storefront
- Integration: Validates connected integrations
- Listing: Validates created listings
- Reservations: Validates purchased reservations
- Subscription: Validates active subscriptions

#### Listings

Lead offerings created by marketers.

##### Listing Configuration

**Basic Info**:
- Listing name
- Description
- Industry
- Brand
- Source (marketing platform)

**Pricing**:
- Price per lead (in Lead Reservations)
- Minimum purchase quantity
- Bulk pricing tiers

**Lead Parameters**:
- Fields included per lead
- Data quality indicators
- Lead source information
- Custom fields

**Campaign Linking**:
- Link to marketing campaigns
- Campaign performance tracking
- Cross-platform data sharing

##### Listing Status

- **DRAFT**: Being created
- **ACTIVE**: Available for purchase
- **PAUSED**: Temporarily unavailable
- **ARCHIVED**: No longer available

##### Listing Reviews

5-star rating system:
- **Rating**: 1-5 stars
- **Review Text**: Written review
- **Verified Purchase**: Badge for verified buyers
- **Review Moderation**: Admin moderation
- **Rating Statistics**: Average rating, total reviews

##### Listing Metrics

Public metrics displayed on listings:
- **Contact Rate**: Percentage of leads contacted
- **DNC Rate**: Do Not Call rate
- **Deals Closed**: Number of deals closed
- **Conversion Rate**: Overall conversion rate
- **Lead Quality Score**: Calculated quality score

##### Public Listing Pages

Public pages for each listing:
- Listing details
- Reviews and ratings
- Seller information
- Metrics and performance
- Subscribe button

#### Lead Reservations

Currency system for marketplace transactions.

##### Currency System

Lead Reservations instead of dollars:
- **Exchange Rate**: Managed by super admin
- **Rate Updates**: Historical rate tracking
- **Rate Application**: Applied to all transactions

##### Purchase Reservations

Buyers purchase Lead Reservations:
- **Purchase Amount**: USD amount
- **Reservation Amount**: Calculated reservations
- **Balance Tracking**: Track reservation balance
- **Usage Tracking**: Track reservation usage

##### Reservation Balance

Track available reservations:
- **Current Balance**: Available reservations
- **Used Reservations**: Spent reservations
- **Pending Reservations**: Reserved but not used
- **Transaction History**: Complete transaction log

##### Reservation Usage

Track reservation usage:
- **Per Lead**: Reservations per lead
- **Per Subscription**: Reservations per subscription
- **Usage Reports**: Detailed usage reports
- **Balance Alerts**: Low balance notifications

#### Subscriptions

Buyers subscribe to listings to receive leads.

##### Subscription Management

**Subscribe**: Subscribe to active listings
- Select listing
- Choose subscription plan
- Confirm subscription

**Pause**: Temporarily pause subscription
- Stop receiving leads
- Maintain subscription
- Resume anytime

**Resume**: Resume paused subscription
- Start receiving leads again
- Continue from where paused

**Cancel**: Cancel subscription
- Stop receiving leads
- End subscription
- No refunds (per terms)

##### Real-time Lead Delivery

Leads delivered in real-time:
- **Instant Delivery**: Leads delivered immediately
- **RabbitMQ Integration**: Message queue for delivery
- **Delivery Confirmation**: Confirm delivery
- **Retry Logic**: Retry failed deliveries

##### Subscription History

Track subscription activity:
- **Subscription Start**: When subscribed
- **Leads Received**: Total leads received
- **Subscription Status**: Active/paused/cancelled
- **Renewal Date**: Next renewal (if applicable)

#### Lead Distribution

Intelligent lead distribution to buyers.

##### Weighted Distribution

Percentage-based distribution:
- **Percentage Allocation**: Allocate percentages to buyers
- **Weighted Random**: Random selection weighted by percentage
- **Fair Distribution**: Ensures fair allocation
- **Distribution Tracking**: Track distribution

##### Round-Robin Distribution

Even distribution:
- **Sequential Distribution**: Distribute in order
- **Fair Rotation**: Rotate through buyers
- **Load Balancing**: Balance lead distribution
- **Tracking**: Track distribution

##### Real-time Distribution

RabbitMQ-based real-time distribution:
- **Message Queue**: RabbitMQ for distribution
- **Instant Delivery**: Immediate lead delivery
- **Scalability**: Handles high volume
- **Reliability**: Guaranteed delivery

##### Distribution Metrics

Track distribution performance:
- **Distribution Rate**: Leads per buyer
- **Distribution Fairness**: Measure fairness
- **Delivery Success**: Success rate
- **Delivery Time**: Average delivery time

#### Marketing Integrations

Connect to major marketing platforms.

##### Facebook Integration

- **Ad Account Connection**: Connect Facebook ad accounts
- **Lead Form Integration**: Integrate Facebook Lead Ads
- **Automatic Ingestion**: Auto-ingest leads
- **Campaign Tracking**: Track ad campaigns

##### TikTok Integration

- **TikTok Ads Connection**: Connect TikTok ad accounts
- **Lead Form Integration**: Integrate TikTok Lead Gen
- **Automatic Ingestion**: Auto-ingest leads
- **Campaign Tracking**: Track campaigns

##### Google Integration

- **Google Ads Connection**: Connect Google Ads accounts
- **Lead Form Integration**: Integrate Google Lead Forms
- **Automatic Ingestion**: Auto-ingest leads
- **Campaign Tracking**: Track campaigns

##### Custom Endpoint Generation

Generate custom ingestion endpoints:
- **Unique Endpoint**: Per-listing endpoint
- **Field Mapping**: Map fields to lead parameters
- **Authentication**: Token-based authentication
- **Webhook Support**: Webhook integration

##### Integration Status Tracking

Track integration health:
- **Connection Status**: Connected/disconnected
- **Last Sync**: Last successful sync
- **Error Tracking**: Track errors
- **Health Monitoring**: Monitor integration health

#### Lead Ingestion

Ingest leads from various sources.

##### Custom Ingestion Endpoints

Custom endpoints for lead ingestion:
- **Endpoint URL**: Unique URL per listing
- **Field Mapping**: Map incoming fields
- **Validation**: Validate lead data
- **Authentication**: Secure authentication

##### Field Mapping

Map incoming fields to lead parameters:
- **Brand**: Brand identifier
- **Source**: Lead source
- **Campaign ID**: Campaign identifier
- **Industry**: Industry classification
- **Listing ID**: Target listing
- **Custom Fields**: Additional fields

##### Lead Validation

Validate incoming leads:
- **Phone Validation**: Validate phone numbers
- **Email Validation**: Validate email addresses
- **Required Fields**: Check required fields
- **Data Quality**: Assess data quality

##### Duplicate Detection

Detect duplicate leads:
- **Phone-based**: Primary deduplication
- **Email-based**: Secondary deduplication
- **Fuzzy Matching**: Handle variations
- **Merge Strategy**: Update vs create new

##### Real-time Ingestion

Process leads in real-time:
- **Immediate Processing**: Process immediately
- **Queue Processing**: Queue for distribution
- **Scalability**: Handle high volume
- **Error Handling**: Comprehensive error handling

#### Lead Sources

Track and manage lead sources.

##### Source Tracking

Track lead sources:
- **Source Identification**: Identify source
- **Source Attribution**: Attribute leads to sources
- **Source Performance**: Track performance by source
- **Source Analytics**: Source-level analytics

##### Source Performance Metrics

Track source performance:
- **Leads Generated**: Total leads from source
- **Conversion Rate**: Source conversion rate
- **Quality Score**: Source quality score
- **ROI**: Return on investment

##### Source Attribution

Attribute leads to sources:
- **First Touch**: First source
- **Last Touch**: Last source
- **Multi-Touch**: Multiple sources
- **Attribution Models**: Various models

#### Campaign Linking

Link marketplace leads to campaigns.

##### Campaign Integration

Link leads to campaigns:
- **Campaign Selection**: Select target campaign
- **Automatic Addition**: Auto-add to campaigns
- **Campaign Tracking**: Track campaign performance
- **Cross-Platform Data**: Share data across platforms

##### Campaign Performance Tracking

Track campaign performance:
- **Lead Attribution**: Attribute leads to campaigns
- **Campaign Metrics**: Campaign-level metrics
- **Conversion Tracking**: Track conversions
- **ROI Analysis**: Analyze ROI

##### Cross-Platform Data Sharing

Share data between marketplace and engine:
- **Status Sync**: Sync lead status changes
- **Status Updates**: Update status across platforms
- **Webhook Integration**: Webhook-based sync
- **Real-time Sync**: Real-time data sync

#### Storefront Management

Manage public storefronts.

##### Storefront Customization

Customize storefront appearance:
- **Banner**: Upload banner image
- **Logo**: Upload logo
- **Colors**: Set brand colors
- **Layout**: Choose layout options

##### Public Storefront Pages

Public-facing storefront:
- **Storefront URL**: `leads.nurtureengine.net/storefront/{slug}`
- **Listing Display**: Show all listings
- **Seller Info**: Display seller information
- **Reviews**: Show reviews and ratings

##### Storefront Metrics

Track storefront performance:
- **Visits**: Storefront visits
- **Listing Views**: Listing view counts
- **Conversion Rate**: Visit-to-subscription rate
- **Revenue**: Total revenue

#### Reviews System

5-star rating and review system.

##### Rating System

5-star rating:
- **Star Rating**: 1-5 stars
- **Rating Distribution**: Show rating breakdown
- **Average Rating**: Calculate average
- **Total Ratings**: Count total ratings

##### Review Text

Written reviews:
- **Review Content**: Review text
- **Review Moderation**: Admin moderation
- **Review Guidelines**: Review policies
- **Review Filtering**: Filter inappropriate content

##### Verified Purchase Badges

Badge for verified purchases:
- **Purchase Verification**: Verify purchase
- **Badge Display**: Show badge on review
- **Trust Indicator**: Build trust
- **Verification Process**: Verification workflow

##### Review Moderation

Admin moderation:
- **Review Approval**: Approve reviews
- **Review Rejection**: Reject inappropriate reviews
- **Review Editing**: Edit reviews if needed
- **Review Reporting**: Report abuse

#### Marketplace Analytics

Comprehensive analytics for sellers and buyers.

##### Seller Analytics

Track seller performance:
- **Leads Sold**: Total leads sold
- **Revenue**: Total revenue (in reservations)
- **Conversion Rates**: Buyer conversion rates
- **Listing Performance**: Per-listing metrics
- **Storefront Traffic**: Storefront visits

##### Buyer Analytics

Track buyer performance:
- **Leads Purchased**: Total leads purchased
- **Reservations Spent**: Total reservations spent
- **Conversion Rates**: Lead conversion rates
- **ROI**: Return on investment
- **Subscription Performance**: Per-subscription metrics

##### Listing Performance Metrics

Track listing performance:
- **Views**: Listing view count
- **Subscriptions**: Number of subscriptions
- **Leads Sold**: Total leads sold
- **Revenue**: Total revenue
- **Rating**: Average rating

##### Lead Quality Metrics

Assess lead quality:
- **Contact Rate**: Percentage contacted
- **DNC Rate**: Do Not Call rate
- **Conversion Rate**: Conversion percentage
- **Quality Score**: Calculated quality score

#### Engine Sync

Synchronize data between marketplace and engine.

##### Status Sync

Sync lead status changes:
- **Status Updates**: Update status across platforms
- **Status Mapping**: Map statuses between systems
- **Real-time Sync**: Real-time synchronization
- **Sync History**: Track sync history

##### Cross-Platform Data Sharing

Share data between platforms:
- **Contact Data**: Share contact information
- **Status Data**: Share status changes
- **Campaign Data**: Share campaign data
- **Journey Data**: Share journey participation

##### Status Update Webhooks

Webhook-based status updates:
- **Webhook Configuration**: Configure webhooks
- **Status Events**: Trigger on status changes
- **Payload Format**: Standardized payload
- **Retry Logic**: Retry failed webhooks

#### API Endpoints

**Marketplace Users**:
- `POST /nurture-leads/register` - Register as marketer/buyer
- `GET /nurture-leads/profile` - Get marketplace profile
- `PUT /nurture-leads/profile` - Update profile

**Onboarding**:
- `GET /nurture-leads/onboarding/progress` - Get onboarding progress
- `POST /nurture-leads/onboarding/step` - Update onboarding step
- `POST /nurture-leads/onboarding/skip` - Skip onboarding

**Listings**:
- `GET /nurture-leads/listings` - List all listings
- `GET /nurture-leads/listings/:id` - Get listing details
- `POST /nurture-leads/listings` - Create listing
- `PUT /nurture-leads/listings/:id` - Update listing
- `DELETE /nurture-leads/listings/:id` - Delete listing

**Subscriptions**:
- `GET /nurture-leads/subscriptions` - List subscriptions
- `POST /nurture-leads/subscriptions` - Subscribe to listing
- `PUT /nurture-leads/subscriptions/:id/pause` - Pause subscription
- `PUT /nurture-leads/subscriptions/:id/resume` - Resume subscription
- `DELETE /nurture-leads/subscriptions/:id` - Cancel subscription

**Lead Reservations**:
- `GET /nurture-leads/reservations` - Get reservation balance
- `POST /nurture-leads/reservations/purchase` - Purchase reservations
- `GET /nurture-leads/reservations/history` - Get transaction history

**Storefront**:
- `GET /nurture-leads/storefront/:slug` - Get storefront (public)
- `PUT /nurture-leads/storefront` - Update storefront

**Reviews**:
- `GET /nurture-leads/listings/:id/reviews` - Get listing reviews
- `POST /nurture-leads/listings/:id/reviews` - Create review

---

### 2.10 Billing & Pricing

**Bullet Point**: Complete Stripe billing integration with usage tracking

#### Overview

The Billing system provides comprehensive subscription management, usage tracking, and payment processing through Stripe integration. The system tracks all billable actions and enforces tenant limits based on pricing plans.

#### Pricing Plans

##### Plan Tiers

**Free Plan**:
- 100 SMS messages/month
- Basic support
- Up to 100 contacts
- Limited features

**Starter Plan**:
- 1,000 SMS messages/month
- Email support
- Up to 1,000 contacts
- Basic analytics
- Monthly: $29, Yearly: $290

**Professional Plan**:
- 10,000 SMS messages/month
- Priority support
- Unlimited contacts
- Advanced analytics
- AI message generation
- Campaign automation
- Monthly: $99, Yearly: $990

**Enterprise Plan**:
- Unlimited SMS messages
- Dedicated support
- Unlimited contacts
- Advanced analytics
- AI message generation
- Campaign automation
- Custom integrations
- SLA guarantee
- Monthly: $299, Yearly: $2,990

##### Plan Configuration

**Feature Limits**:
- `smsLimit`: SMS messages per billing period
- `callLimit`: Voice calls per billing period
- `aiMessageLimit`: AI messages per billing period
- `aiVoiceLimit`: AI voice generations per billing period
- `aiTemplateLimit`: AI templates allowed
- `contentAiLimit`: Content AI generations per billing period

**Feature Restrictions**:
- `canSendSMS`: Allow SMS sending
- `canMakeCalls`: Allow voice calls
- `canUseAI`: Allow AI features
- `canUseVoiceAI`: Allow voice AI
- `canUseContentAI`: Allow Content AI
- `canCreateJourneys`: Allow journey creation
- `canCreateCampaigns`: Allow campaign creation
- `canUseScheduling`: Allow calendar scheduling

**Resource Limits**:
- `maxContacts`: Maximum contacts
- `maxSegments`: Maximum segments
- `maxTemplates`: Maximum templates
- `maxJourneys`: Maximum journeys
- `maxCampaigns`: Maximum campaigns

**Pricing**:
- `monthlyPrice`: Monthly subscription price
- `yearlyPrice`: Yearly subscription price (discounted)
- `trialDays`: Number of trial days

**Plan Status**:
- `isActive`: Plan is available
- `isDefault`: Default plan for new signups
- `sortOrder`: Display order

#### Stripe Integration

##### Customer Management

**Customer Creation**: Automatically create Stripe customers
- Created on first subscription
- Linked to tenant
- Stores Stripe customer ID

**Customer Updates**: Sync customer information
- Update email, name
- Update billing information
- Sync metadata

##### Checkout Sessions

Create Stripe checkout sessions:
- **Plan Selection**: Select pricing plan
- **Billing Period**: Monthly or yearly
- **Success URL**: Redirect after success
- **Cancel URL**: Redirect on cancel
- **Metadata**: Store tenant/user info

##### Billing Portal

Access Stripe customer portal:
- **Self-Service**: Customers manage subscriptions
- **Update Payment**: Update payment methods
- **View Invoices**: View invoice history
- **Cancel Subscription**: Cancel subscriptions

##### Subscription Management

Full subscription lifecycle:
- **Create**: Create new subscription
- **Update**: Update subscription (plan change)
- **Cancel**: Cancel subscription
- **Reactivate**: Reactivate cancelled subscription
- **Renewal**: Handle automatic renewals

##### Invoice Tracking

Track all invoices:
- **Invoice Creation**: Track created invoices
- **Invoice Finalization**: Track finalized invoices
- **Invoice Payment**: Track paid invoices
- **Invoice Failure**: Track failed payments
- **Invoice History**: Complete invoice history

##### Payment Method Management

Manage payment methods:
- **Add Payment Method**: Add new payment method
- **Update Payment Method**: Update existing
- **Set Default**: Set default payment method
- **Remove Payment Method**: Remove payment methods

##### Webhook Handling

Handle all Stripe webhook events:

**Subscription Events**:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Invoice Events**:
- `invoice.created`
- `invoice.finalized`
- `invoice.paid`
- `invoice.payment_failed`
- `invoice.payment_action_required`
- `invoice.upcoming`

**Payment Method Events**:
- `payment_method.attached`
- `payment_method.detached`

**Customer Events**:
- `customer.updated`

**Checkout Events**:
- `checkout.session.completed`

#### Usage Tracking

Comprehensive usage tracking for all billable actions.

##### Usage Types

Track different usage types:
- `SMS_SENT`: SMS messages sent
- `CALL_MADE`: Voice calls made
- `AI_MESSAGE`: AI messages generated
- `AI_VOICE`: AI voice generations
- `CONTENT_AI`: Content AI generations
- Custom usage types

##### Action Attribution

Every action attributed to:
- **Tenant ID**: Which tenant
- **User ID**: Which user (if applicable)
- **Resource ID**: Which resource (campaign, journey, etc.)
- **Resource Type**: Type of resource
- **Timestamp**: When action occurred
- **Metadata**: Additional data (SMS SID, Call SID, etc.)

##### Billing Period Tracking

Track usage by billing period:
- **Period Format**: YYYY-MM (e.g., "2024-01")
- **Period Calculation**: Based on subscription start date
- **Period Aggregation**: Aggregate usage per period
- **Period Reset**: Reset limits at period start

##### Stripe Billing Meter Sync

Sync usage to Stripe billing meters:
- **Meter Creation**: Create Stripe meters
- **Usage Reporting**: Report usage to Stripe
- **Real-time Sync**: Sync in real-time
- **Batch Sync**: Batch sync for efficiency

##### Usage Summaries

Get usage summaries:
- **Current Period**: Current billing period usage
- **Previous Periods**: Historical usage
- **By Type**: Usage by type
- **By Resource**: Usage by resource
- **Trends**: Usage trends over time

##### Detailed Reports

Detailed usage reports:
- **Time Range**: Custom time ranges
- **Filtering**: Filter by type, resource, user
- **Export**: Export to CSV/Excel
- **Visualization**: Charts and graphs

#### Tenant Limits

Real-time limit checking and enforcement.

##### Limit Checking

Check limits before actions:
- **Pre-Action Check**: Check before executing
- **Limit Validation**: Validate against plan limits
- **Real-time**: Real-time checking
- **Caching**: Cache limits for performance

##### Limit Enforcement

Enforce limits:
- **Block Actions**: Block if limit exceeded
- **Warning**: Warn when approaching limit
- **Grace Period**: Optional grace period
- **Over-limit Handling**: Handle over-limit scenarios

##### Over-limit Handling

Handle over-limit scenarios:
- **Block**: Block further actions
- **Allow with Warning**: Allow but warn
- **Auto-Upgrade**: Suggest upgrade
- **Notification**: Notify administrators

##### Limit Reset

Reset limits on billing period:
- **Period Start**: Reset at period start
- **Automatic**: Automatic reset
- **Notification**: Notify on reset
- **History**: Track reset history

#### Billing Usage Service

Core service for usage tracking.

##### Track Usage

Track usage for all actions:
- **Automatic Tracking**: Automatic tracking
- **Manual Tracking**: Manual tracking API
- **Batch Tracking**: Batch tracking
- **Error Handling**: Comprehensive error handling

##### Aggregate Usage

Aggregate usage by billing period:
- **Period Aggregation**: Aggregate by period
- **Type Aggregation**: Aggregate by type
- **Resource Aggregation**: Aggregate by resource
- **Efficient Queries**: Optimized queries

##### Sync to Stripe

Sync usage to Stripe:
- **Real-time Sync**: Immediate sync
- **Batch Sync**: Batch sync
- **Retry Logic**: Retry failed syncs
- **Error Handling**: Handle sync errors

##### Query Usage

Query usage data:
- **Summaries**: Get usage summaries
- **Details**: Get detailed usage
- **Reports**: Generate reports
- **Analytics**: Usage analytics

##### Export Reports

Export usage reports:
- **CSV Export**: Export to CSV
- **Excel Export**: Export to Excel
- **PDF Reports**: Generate PDF reports
- **Scheduled Exports**: Automatic exports

#### API Endpoints

**Billing**:
- `GET /billing/subscription` - Get current subscription
- `POST /billing/checkout` - Create checkout session
- `GET /billing/portal` - Get billing portal URL
- `GET /billing/invoices` - List invoices
- `GET /billing/invoices/:id` - Get invoice details

**Usage**:
- `GET /billing/usage` - Get usage summary
- `GET /billing/usage/:type` - Get usage by type
- `POST /billing/usage/sync` - Sync usage to Stripe
- `GET /billing/usage/report` - Get usage report

**Pricing Plans**:
- `GET /pricing-plans` - List pricing plans
- `GET /pricing-plans/:id` - Get plan details

---

### 2.11 Calendar & Scheduling

**Bullet Point**: Calendar event management and public booking system

#### Overview

The Calendar system provides comprehensive event management with timezone-aware scheduling, public booking pages, availability management, and event reminders. The system integrates with journeys to create events automatically.

#### Calendar Events

##### Event Types

- **SALES_CALL**: Sales calls and appointments
- **SUPPORT**: Customer support calls
- **INTERNAL**: Internal meetings

##### Event Statuses

- **SCHEDULED**: Event scheduled
- **CONFIRMED**: Event confirmed
- **CANCELLED**: Event cancelled
- **COMPLETED**: Event completed

##### Event Configuration

**Basic Info**:
- Title
- Description
- Start time (timezone-aware)
- End time (timezone-aware)
- Timezone

**Attendee Information**:
- Name
- Email
- Phone
- Company

**Meeting Details**:
- Meeting link (Zoom, Google Meet, etc.)
- Assigned user
- Event metadata (JSON)

**Relationships**:
- `eventTypeId`: Link to event type
- `contactId`: Link to contact
- `journeyId`: Link to journey (if created from journey)

##### Timezone Handling

- **Timezone Storage**: Store event timezone
- **UTC Conversion**: Convert to UTC for storage
- **Display Conversion**: Convert back for display
- **Contact Timezone**: Respect contact timezone
- **Tenant Timezone**: Fallback to tenant timezone

##### Conflict Detection

Prevent double-booking:
- **Time Overlap Check**: Check for overlapping events
- **User Availability**: Check user availability
- **Conflict Prevention**: Block conflicting bookings
- **Conflict Resolution**: Suggest alternative times

#### Event Types

Pre-configured event types for different use cases.

##### Event Type Configuration

**Basic Info**:
- Name
- Description
- Duration (minutes)

**Availability Windows**:
- Allowed days
- Allowed hours
- Timezone

**Actions on Booking**:
- Add to journey
- Send SMS
- Update lead status
- Custom webhooks

**Public Booking**:
- Enable public booking page
- Generate booking URL
- Customize booking form

#### Availability

Manage user availability for scheduling.

##### Availability Configuration

**Time Windows**:
- Start hour (0-23)
- End hour (0-23)
- Days of week
- Timezone

**Event Type Specific**:
- Different availability per event type
- Override default availability

**Recurring Patterns**:
- Weekly patterns
- Custom schedules
- Exception dates

#### Public Booking

Public booking pages for customers.

##### Booking Page

**URL Format**: `/book/[eventTypeId]`

**Features**:
- Available time slot display
- Timezone selection
- Booking form
- Conflict prevention
- Booking confirmation

##### Available Time Slots

Display available slots:
- **Slot Calculation**: Calculate based on availability
- **Conflict Filtering**: Filter out booked slots
- **Timezone Display**: Show in user's timezone
- **Real-time Updates**: Update as slots are booked

##### Booking Form

Collect booking information:
- Name (required)
- Email (required)
- Phone (optional)
- Company (optional)
- Custom fields (if configured)

##### Booking Process

1. Select time slot
2. Fill booking form
3. Submit booking
4. Create contact (if new)
5. Create calendar event
6. Track visit
7. Update lead status (APPOINTMENT_SCHEDULED)
8. Send confirmation

#### Event Reminders

Automated reminder system.

##### Reminder Configuration

**Reminder Times**: Configurable reminder times (e.g., 24 hours, 1 hour before)

**Reminder Types**:
- Email reminders
- SMS reminders
- In-app notifications

##### Reminder Scheduler

Cron-based reminder sending:
- **Scheduled Execution**: Runs periodically
- **Reminder Calculation**: Calculate which reminders to send
- **Reminder Tracking**: Track sent reminders
- **Prevent Duplicates**: Prevent duplicate reminders

#### Contact Visits

Track visits to booking pages.

##### Visit Tracking

**Visit Data**:
- IP address
- User agent
- Referrer
- Timestamp
- Metadata

**Visit-to-Booking Conversion**:
- Track conversion rate
- Identify high-converting sources
- Optimize booking pages

##### Visit Management

- **Visit History**: Complete visit history per contact
- **Visit Analytics**: Analyze visit patterns
- **Source Attribution**: Attribute visits to sources
- **Conversion Tracking**: Track conversions

#### API Endpoints

**Calendar Events**:
- `GET /calendar/events` - List events
- `GET /calendar/events/:id` - Get event details
- `POST /calendar/events` - Create event
- `PUT /calendar/events/:id` - Update event
- `DELETE /calendar/events/:id` - Delete event

**Event Types**:
- `GET /event-types` - List event types
- `GET /event-types/:id` - Get event type details
- `POST /event-types` - Create event type
- `PUT /event-types/:id` - Update event type
- `DELETE /event-types/:id` - Delete event type

**Availability**:
- `GET /availability` - Get availability
- `POST /availability` - Create availability
- `PUT /availability/:id` - Update availability
- `DELETE /availability/:id` - Delete availability
- `GET /availability/slots` - Get available slots

**Public Booking**:
- `GET /calendar/booking/event-types/:id` - Get event type (public)
- `GET /calendar/booking/event-types/:id/available-slots` - Get available slots
- `POST /calendar/booking` - Create booking (public)

---

### 2.12 Compliance & TCPA

**Bullet Point**: TCPA compliance system for legal message and call compliance

#### Overview

The Compliance system ensures all messaging and calling activities comply with TCPA (Telephone Consumer Protection Act) regulations. The system provides comprehensive compliance checking, violation tracking, and consent management.

#### TCPA Configuration

##### Compliance Modes

**STRICT**: Block all violations
- All TCPA violations block execution
- Maximum protection
- Recommended for most businesses

**MODERATE**: Block critical violations only
- Critical violations block execution
- Warnings logged for minor violations
- Balanced approach

**PERMISSIVE**: Log violations but allow execution
- All violations logged
- Execution continues
- For testing/development

##### Time Restrictions

Control when messages/calls can be sent:

**Allowed Hours**:
- `allowedStartHour`: Start hour (0-23, default: 8)
- `allowedEndHour`: End hour (0-23, default: 21)

**Allowed Days**:
- `allowedDaysOfWeek`: Array of allowed days
- Values: MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
- Null = all days allowed

**Timezone**: Respect contact timezone for restrictions

##### Consent Requirements

**Express Consent**: Require explicit written consent
- `requireExpressConsent`: Boolean (default: true)

**Consent Types**:
- `requireConsentForAutomated`: Consent for automated messages
- `requireConsentForMarketing`: Consent for marketing messages

**Consent Expiration**:
- `consentExpirationDays`: Days until consent expires
- Null = consent never expires

##### Opt-out Handling

**Honor Opt-outs**: Automatically honor opt-outs
- `honorOptOuts`: Boolean (default: true)
- `honorDncList`: Honor Do Not Call list (default: true)
- `autoOptOutOnStop`: Auto opt-out on STOP keyword (default: true)

##### Sender Identification

**Require Identification**: Require sender identification
- `requireSenderIdentification`: Boolean (default: true)
- `requiredSenderName`: Required sender name/company

##### Violation Actions

Actions when violations detected:

**BLOCK**: Block execution (default)
**LOG_ONLY**: Log violation, allow execution
**PAUSE_JOURNEY**: Pause journey for contact
**SKIP_NODE**: Skip current node

##### Violation Handling

**Violation Logging**: Log all violations
- `logViolations`: Boolean (default: true)

**Violation Notifications**: Notify on violations
- `notifyOnViolation`: Boolean (default: true)
- `violationNotificationEmails`: Email addresses to notify

**Block Non-Compliant Journeys**: Block journeys with violations
- `blockNonCompliantJourneys`: Boolean (default: true)

**Manual Override**: Allow manual override
- `allowManualOverride`: Boolean (default: true)
- `overrideReasons`: Required reasons for override

##### Custom Rules

**State-Specific Rules**: Rules for specific states
- `stateSpecificRules`: JSON object

**Industry-Specific Rules**: Rules for specific industries
- `industrySpecificRules`: JSON object

**Exemptions**: Exemptions from rules
- `exemptions`: Array of exemption types

#### TCPA Violations

Track and log all violations.

##### Violation Types

- **OPTED_OUT**: Contact has opted out
- **DNC_LIST**: Contact on Do Not Call list
- **NO_CONSENT**: No consent for message/call
- **TIME_RESTRICTION**: Outside allowed hours/days
- **EXPRESS_CONSENT_REQUIRED**: Express consent required
- **CONSENT_EXPIRED**: Consent has expired
- **SENDER_IDENTIFICATION**: Missing sender identification

##### Violation Severity

- **CRITICAL**: Blocks execution
- **WARNING**: Logged, may block depending on mode
- **INFO**: Informational only

##### Violation Tracking

**Violation Log**:
- Violation type
- Severity
- Description
- Timestamp
- Contact ID
- Journey/Campaign ID
- Node ID (if applicable)
- Action taken

**Violation History**: Complete violation history per contact

**Violation Reports**: Generate violation reports

#### Compliance Checking

Pre-execution compliance validation.

##### Journey Node Compliance

Check compliance before executing journey nodes:
- **Pre-execution Check**: Check before execution
- **Contact Compliance**: Check contact compliance status
- **Time Restrictions**: Check time restrictions
- **Consent Check**: Verify consent
- **Opt-out Check**: Check opt-out status

##### Campaign Compliance

Check compliance before sending campaign messages:
- **Bulk Compliance Check**: Check all contacts
- **Non-compliant Filtering**: Filter non-compliant contacts
- **Compliance Report**: Generate compliance report

##### Contact Compliance Status

Track contact compliance:
- **Consent Status**: Current consent status
- **Opt-out Status**: Opt-out status
- **DNC Status**: Do Not Call status
- **Compliance Score**: Overall compliance score

#### Consent Management

Comprehensive consent tracking.

##### Consent Tracking

**Per-Contact Consent**:
- Consent type (automated, marketing)
- Consent date
- Consent source
- Consent expiration
- Consent status

**Consent History**: Track all consent changes

**Consent Verification**: Verify consent before actions

##### Consent Expiration

**Expiration Tracking**: Track consent expiration
- **Expiration Date**: When consent expires
- **Expiration Notifications**: Notify before expiration
- **Automatic Expiration**: Automatically expire consent

##### Consent Record Maintenance

**Record Retention**: Maintain consent records
- `maintainConsentRecords`: Boolean (default: true)
- `consentRecordRetentionDays`: Days to retain (default: 7)

**Record Access**: Access consent records
- **Audit Trail**: Complete audit trail
- **Export**: Export consent records
- **Compliance Reports**: Generate compliance reports

#### API Endpoints

**TCPA Configuration**:
- `GET /tcpa/config` - Get TCPA configuration
- `PUT /tcpa/config` - Update TCPA configuration

**TCPA Violations**:
- `GET /tcpa/violations` - List violations
- `GET /tcpa/violations/:id` - Get violation details
- `GET /tcpa/violations/contact/:contactId` - Get contact violations

**Compliance**:
- `POST /compliance/check` - Check compliance
- `GET /compliance/report` - Generate compliance report

---

### 2.13 Execution Rules

**Bullet Point**: Rules engine for controlling journey execution behavior

#### Overview

Execution Rules control how journey nodes execute, handling after-hours scenarios, TCPA violations, and lead resubmissions. The rules ensure professional communication and compliance.

#### After Hours Handling

Control behavior when actions are scheduled outside business hours.

##### Business Hours Configuration

**Hours**:
- `startHour`: Start hour (0-23)
- `endHour`: End hour (0-23)

**Days**:
- `daysOfWeek`: Array of business days
- Values: MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY

**Timezone**: Timezone for business hours

##### After Hours Actions

**RESCHEDULE_NEXT_AVAILABLE**: Reschedule to next available time
**RESCHEDULE_NEXT_BUSINESS_DAY**: Reschedule to next business day
**RESCHEDULE_SPECIFIC_TIME**: Reschedule to specific time
- `afterHoursRescheduleTime`: Time in HH:mm format

**SKIP_NODE**: Skip the node
**PAUSE_JOURNEY**: Pause journey for contact
**DEFAULT_EVENT**: Create default calendar event
- `afterHoursDefaultEventTypeId`: Event type ID

##### Enable/Disable

- `enableAfterHoursHandling`: Boolean (default: true)

#### TCPA Violation Handling

Control behavior when TCPA violations are detected.

##### TCPA Violation Actions

**RESCHEDULE_NEXT_AVAILABLE**: Reschedule to next available time
**RESCHEDULE_NEXT_BUSINESS_DAY**: Reschedule to next business day
**RESCHEDULE_SPECIFIC_TIME**: Reschedule to specific time
- `tcpaRescheduleTime`: Time in HH:mm format
- `tcpaRescheduleDelayHours`: Hours to delay

**BLOCK**: Block execution
**SKIP_NODE**: Skip the node
**PAUSE_JOURNEY**: Pause journey
**DEFAULT_EVENT**: Create default event
- `tcpaDefaultEventTypeId`: Event type ID

**CONTINUE**: Continue execution (not recommended)

##### Enable/Disable

- `enableTcpaviolationHandling`: Boolean (default: true)

#### Lead Resubmission Handling

Handle duplicate lead submissions.

##### Detection Window

- `resubmissionDetectionWindowHours`: Hours to look back (default: 24)

##### Resubmission Actions

**SKIP_DUPLICATE**: Skip duplicate submission
**RESCHEDULE_DELAYED**: Reschedule with delay
- `resubmissionRescheduleDelayHours`: Hours to delay

**DEFAULT_EVENT**: Create default event
- `resubmissionDefaultEventTypeId`: Event type ID

**CONTINUE**: Continue execution

##### Enable/Disable

- `enableResubmissionHandling`: Boolean (default: true)

#### Execution Rule Service

Core service for rule evaluation.

##### Rule Evaluation

**Pre-Execution Check**: Check rules before node execution
- **After Hours Check**: Check if after hours
- **TCPA Check**: Check TCPA compliance
- **Resubmission Check**: Check for duplicates

**Timezone Awareness**: Respect contact and tenant timezones

**Rule Priority**: Priority order for rule evaluation

##### Rule Actions

**Rescheduling Logic**:
- Calculate next available time
- Respect business hours
- Respect timezone
- Schedule execution

**Skip Logic**:
- Skip node execution
- Continue to next node
- Log skip reason

**Pause Logic**:
- Pause journey for contact
- Resume when conditions met
- Notify administrators

#### API Endpoints

**Execution Rules**:
- `GET /execution-rules` - Get execution rules
- `PUT /execution-rules` - Update execution rules

---

### 2.14 Templates

**Bullet Point**: Message template system for SMS campaigns and journeys

#### Overview

The Templates system provides reusable message templates with variable substitution for SMS campaigns and journeys. Templates support multiple types and versioning.

#### Template Types

**Outreach Templates**: For outbound campaigns
**Reply Templates**: For replying to messages
**AI Prompt Templates**: For AI conversation prompts
**System Templates**: System-generated templates

#### Template Features

##### Variable Substitution

Support for variables in templates:
- `{firstName}`: Contact first name
- `{lastName}`: Contact last name
- `{email}`: Contact email
- `{phone}`: Contact phone
- `{company}`: Contact company
- `{attributes.*}`: Custom attributes
- `{journey.*}`: Journey variables
- `{campaign.*}`: Campaign variables

##### Template Versioning

Track template versions:
- **Version History**: Complete version history
- **Version Comparison**: Compare versions
- **Version Rollback**: Rollback to previous version
- **Version Notes**: Notes per version

##### Template Preview

Preview templates before use:
- **Variable Preview**: Preview with sample data
- **Length Check**: Check SMS length
- **Formatting Preview**: Preview formatting

##### Template Status

- **Active**: Available for use
- **Inactive**: Not available
- **Archived**: Archived templates

##### Template Library

Organized template library:
- **Search**: Search templates
- **Filter**: Filter by type, status
- **Categories**: Organize by category
- **Tags**: Tag templates

#### Template Variables

##### Contact Variables

- Standard fields: firstName, lastName, email, phone, company
- Custom attributes: attributes.*
- Lead status: leadStatus
- Tags: tags

##### Journey Variables

- Journey name: journey.name
- Journey status: journey.status
- Current node: journey.currentNode
- Journey day: journey.day

##### Campaign Variables

- Campaign name: campaign.name
- Campaign type: campaign.type
- Campaign status: campaign.status

##### Custom Variables

- User-defined variables
- System variables
- Dynamic variables

#### API Endpoints

**Templates**:
- `GET /templates` - List templates
- `GET /templates/:id` - Get template details
- `POST /templates` - Create template
- `PUT /templates/:id` - Update template
- `DELETE /templates/:id` - Delete template
- `POST /templates/:id/preview` - Preview template
- `GET /templates/:id/versions` - Get template versions

---

### 2.15 Conversations

**Bullet Point**: Inbox-style conversation management system

#### Overview

The Conversations system provides an inbox-style interface for managing SMS conversations with contacts. The system supports threaded conversations, AI replies, and comprehensive message tracking.

#### Conversation Management

##### Threaded Conversations

Group messages by contact:
- **Conversation Threading**: Group messages by contact
- **Message Ordering**: Chronological ordering
- **Unread Count**: Track unread messages
- **Last Message**: Show last message preview

##### Conversation Statuses

- **OPEN**: Active conversation
- **CLOSED**: Closed conversation
- **ARCHIVED**: Archived conversation

##### Conversation Linking

Link conversations to:
- **Contact**: Primary contact
- **Campaign**: Related campaign
- **Journey**: Related journey

#### Messages

##### Message Direction

- **INBOUND**: Received messages
- **OUTBOUND**: Sent messages

##### Message Status

- **SENT**: Message sent
- **DELIVERED**: Message delivered
- **FAILED**: Message failed
- **READ**: Message read (if supported)

##### Message Content

- **Text Content**: Message text
- **Media**: Attachments (MMS)
- **Message SID**: Twilio message SID

##### Message Tracking

- **Delivery Status**: Track delivery status
- **Read Receipts**: Track read receipts (if supported)
- **Error Tracking**: Track delivery errors
- **Status Updates**: Real-time status updates

#### AI Replies

Automatic AI-powered replies.

##### AI Reply Generation

- **Context Awareness**: Maintains conversation context
- **AI Template Integration**: Uses AI templates
- **Natural Responses**: Natural language responses
- **Lead Qualification**: Qualifies leads during conversation

##### Conversation Context

- **Message History**: Full conversation history
- **Context Window**: Maintains relevant context
- **Session Management**: Manages AI sessions
- **Context Updates**: Updates context with each message

##### Reply Generation

- **Automatic Generation**: Generate replies automatically
- **Manual Review**: Optional manual review
- **Reply Approval**: Approve before sending
- **Reply Customization**: Customize generated replies

#### Conversation Inbox

Inbox interface for managing conversations.

##### Filtering

- **By Status**: Filter by conversation status
- **By Contact**: Filter by contact
- **By Campaign**: Filter by campaign
- **By Journey**: Filter by journey
- **By Unread**: Show unread only

##### Search

- **Contact Search**: Search by contact name/phone
- **Message Search**: Search message content
- **Advanced Search**: Advanced search options

##### Real-time Updates

- **WebSocket Updates**: Real-time message updates
- **New Message Notifications**: Notify on new messages
- **Status Updates**: Real-time status updates

##### Conversation Detail View

- **Message Thread**: Full message thread
- **Contact Info**: Contact information sidebar
- **Message Sending**: Send new messages
- **AI Suggestions**: AI reply suggestions
- **Quick Actions**: Quick action buttons

#### API Endpoints

**Conversations**:
- `GET /conversations` - List conversations
- `GET /conversations/:id` - Get conversation details
- `POST /conversations/:id/messages` - Send message
- `PUT /conversations/:id/status` - Update conversation status
- `DELETE /conversations/:id` - Delete conversation

---

### 2.16 Analytics & Dashboard

**Bullet Point**: Comprehensive analytics and real-time dashboard

#### Overview

The Analytics & Dashboard system provides comprehensive metrics, real-time statistics, and detailed reporting for all platform activities.

#### Dashboard Stats

##### Message Statistics

- **Messages Sent**: Total messages sent
- **Messages Delivered**: Successfully delivered
- **Messages Failed**: Failed deliveries
- **Delivery Rate**: Percentage delivered
- **Replies**: Inbound messages received

##### AI Usage

- **AI Messages**: AI messages generated
- **AI Conversations**: AI conversations
- **AI Templates Used**: Templates used
- **Content AI**: Content AI generations

##### Lead Metrics

- **Qualified Leads**: Leads qualified
- **Total Contacts**: Total contacts
- **Opted Out**: Contacts opted out
- **Leads Ingested**: New leads ingested

##### Call Statistics

- **Calls Placed**: Total calls made
- **Calls Answered**: Calls answered
- **Calls Failed**: Failed calls
- **Call Answer Rate**: Percentage answered
- **Transfers**: Transfers attempted/completed
- **Transfer Rate**: Transfer success rate
- **Call Duration**: Total and average duration

##### Contact Rate by Lead Age

Track contact rates by lead age:
- **0-7 Days**: Contact rate for new leads
- **8-14 Days**: Contact rate for week-old leads
- **15-30 Days**: Contact rate for month-old leads
- **31+ Days**: Contact rate for older leads

##### Conversation Metrics

- **Open Conversations**: Active conversations
- **Closed Conversations**: Completed conversations
- **Average Response Time**: Average response time

#### Time Range Filtering

Filter statistics by time range:
- **Today**: Today's statistics
- **Week**: Last 7 days
- **Month**: Last 30 days
- **All Time**: All-time statistics
- **Custom Range**: Custom date range

#### Journey Activity Log

Track journey execution activity.

##### Execution Tracking

- **Node Execution**: Track each node execution
- **Contact Progress**: Track contact progress through journeys
- **Execution Status**: PENDING, EXECUTING, COMPLETED, FAILED, SKIPPED
- **Execution Results**: Detailed execution results

##### Journey Day Tracking

- **Journey Day**: Day in journey (calculated from enrollment)
- **Call Number**: Which call attempt this is
- **Day Progress**: Progress through journey days

##### Execution Results

Detailed results for each execution:
- **Success/Failure**: Execution outcome
- **Action Performed**: Action taken
- **Message SID**: Twilio message SID (for SMS)
- **Call Unique ID**: Asterisk call ID (for calls)
- **Call Status**: Call outcome
- **DID Used**: Phone number used
- **Outcome**: Detailed outcome description

#### Analytics Service

Comprehensive analytics service.

##### Campaign Analytics

- **Campaign Performance**: Performance metrics per campaign
- **Message Statistics**: Messages sent/delivered/failed
- **Reply Rates**: Reply rates per campaign
- **Conversion Rates**: Conversion rates
- **ROI**: Return on investment

##### Journey Analytics

- **Journey Performance**: Performance metrics per journey
- **Enrollment Rates**: Enrollment rates
- **Completion Rates**: Completion rates
- **Node Performance**: Performance per node type
- **Conversion Tracking**: Track conversions

##### Contact Analytics

- **Contact Growth**: Contact growth over time
- **Contact Sources**: Sources of contacts
- **Contact Engagement**: Engagement metrics
- **Contact Lifecycle**: Lifecycle analysis

##### Call Analytics

- **Call Volume**: Call volume trends
- **Call Performance**: Performance metrics
- **Call Duration**: Duration analysis
- **Call Outcomes**: Outcome distribution
- **Agent Performance**: Agent-level metrics

##### Conversion Tracking

- **Lead Conversion**: Track lead conversions
- **Conversion Funnels**: Analyze conversion funnels
- **Conversion Rates**: Calculate conversion rates
- **Attribution**: Attribute conversions to sources

##### Performance Metrics

- **Response Times**: Average response times
- **Delivery Times**: Message delivery times
- **Engagement Rates**: Engagement rates
- **Retention Rates**: Retention rates

#### API Endpoints

**Dashboard**:
- `GET /dashboard/stats` - Get dashboard statistics
- `GET /dashboard/journey-activity` - Get journey activity log

**Analytics**:
- `GET /analytics/campaigns` - Campaign analytics
- `GET /analytics/journeys` - Journey analytics
- `GET /analytics/contacts` - Contact analytics
- `GET /analytics/calls` - Call analytics
- `GET /analytics/conversions` - Conversion analytics

---

### 2.17 Webhooks

**Bullet Point**: Webhook system for external integrations

#### Overview

The Webhooks system enables external systems to receive real-time notifications about platform events. The system supports multiple webhook types, authentication, retry logic, and comprehensive event tracking.

#### Tenant Webhooks

Webhooks configured at tenant level.

##### Webhook Configuration

**URL**: Webhook endpoint URL
**Events**: Array of events to subscribe to
**Authentication**: HMAC signature authentication
**Headers**: Custom headers
**Status**: Active/inactive

##### Webhook Events

**Contact Events**:
- `CONTACT_CREATED`: Contact created
- `CONTACT_UPDATED`: Contact updated
- `CONTACT_OPTED_OUT`: Contact opted out

**Campaign Events**:
- `CAMPAIGN_LAUNCHED`: Campaign launched
- `CAMPAIGN_PAUSED`: Campaign paused
- `CAMPAIGN_COMPLETED`: Campaign completed

**Message Events**:
- `MESSAGE_SENT`: Message sent
- `MESSAGE_DELIVERED`: Message delivered
- `MESSAGE_FAILED`: Message failed

**Conversation Events**:
- `CONVERSATION_CREATED`: Conversation created
- `CONVERSATION_CLOSED`: Conversation closed

**Journey Events**:
- `JOURNEY_ENROLLED`: Contact enrolled in journey
- `JOURNEY_COMPLETED`: Journey completed

##### Webhook Authentication

**HMAC Signature**: SHA-256 HMAC signature
- **Secret**: Shared secret for signing
- **Header**: `X-Webhook-Signature` header
- **Verification**: Verify signature on receipt

##### Webhook Retry Logic

**Retry Configuration**:
- Number of retries
- Retry delay
- Exponential backoff

**Retry Tracking**: Track retry attempts

##### Webhook Payload

Standardized payload format:
```json
{
  "event": "MESSAGE_SENT",
  "timestamp": "2024-01-01T00:00:00Z",
  "tenantId": "uuid",
  "data": {
    // Event-specific data
  }
}
```

#### Journey Webhooks

Webhooks specific to journey removal criteria.

##### Removal Webhook

**Endpoint**: `/api/webhooks/journeys/removal-webhook/{journeyId}/{webhookToken}`

**Purpose**: Remove contacts from journeys via webhook

**Payload**: Contains phone number or contact identifier

**Token**: Unique token per journey for security

##### Webhook Token Generation

- **Automatic Generation**: Generated when webhook condition added
- **Manual Generation**: Can be regenerated
- **Token Security**: Secure random token
- **Token Rotation**: Support for token rotation

#### Webhook Execution

Execute webhooks from journey nodes.

##### Webhook Node

**EXECUTE_WEBHOOK Node**: Execute webhook in journey
- **Webhook Selection**: Select tenant webhook or custom URL
- **Method**: HTTP method (GET, POST, PUT, PATCH, DELETE)
- **Headers**: Custom headers
- **Body**: Request body with variable substitution
- **Response Handling**: Handle webhook response

##### Webhook Response Handling

**Success Detection**: Detect success from response
- **Success Field**: Field indicating success
- **Error Field**: Field containing error

**Field Extraction**: Extract fields from response
- **Extract Fields**: Fields to extract
- **Contact Attributes**: Store in contact attributes

##### Webhook Error Handling

**Error Logging**: Log webhook errors
**Retry Logic**: Retry failed webhooks
**Failure Handling**: Handle webhook failures
**Notification**: Notify on persistent failures

##### Webhook Logging

**Execution Log**: Log all webhook executions
**Success/Failure Tracking**: Track success/failure rates
**Response Logging**: Log webhook responses
**Performance Metrics**: Track webhook performance

#### API Endpoints

**Tenant Webhooks**:
- `GET /webhooks` - List webhooks
- `GET /webhooks/:id` - Get webhook details
- `POST /webhooks` - Create webhook
- `PUT /webhooks/:id` - Update webhook
- `DELETE /webhooks/:id` - Delete webhook
- `POST /webhooks/:id/test` - Test webhook

**Journey Webhooks**:
- `POST /journeys/:id/removal-criteria/generate-webhook-token` - Generate token
- `GET /journeys/:id/removal-criteria/webhook-url` - Get webhook URL
- `POST /webhooks/journeys/removal-webhook/:journeyId/:token` - Removal webhook endpoint

---

### 2.18 Notifications

**Bullet Point**: In-app notification system

#### Overview

The Notifications system provides in-app notifications for important events and activities. The system supports multiple notification types, user preferences, and notification channels.

#### Notification Types

##### SMS Reply Notifications

- **SMS_REPLY**: Contact replied to SMS
- **CAMPAIGN_REPLY**: Contact replied to campaign message
- **JOURNEY_REPLY**: Contact replied to journey message

##### Conversation Notifications

- **CONVERSATION_MESSAGE**: New message in conversation

##### Completion Notifications

- **CAMPAIGN_COMPLETED**: Campaign completed
- **JOURNEY_COMPLETED**: Journey completed

#### Notification Preferences

User-level notification preferences.

##### Preference Configuration

**Per-Type Preferences**:
- `smsReplyEnabled`: Enable SMS reply notifications
- `campaignReplyEnabled`: Enable campaign reply notifications
- `journeyReplyEnabled`: Enable journey reply notifications
- `conversationMessageEnabled`: Enable conversation notifications
- `campaignCompletedEnabled`: Enable campaign completion notifications
- `journeyCompletedEnabled`: Enable journey completion notifications

**Resource-Specific Preferences**:
- Per-campaign preferences
- Per-journey preferences
- Per-conversation preferences

**Channels**: Notification channels
- `IN_APP`: In-app notifications
- `EMAIL`: Email notifications
- `SMS`: SMS notifications

**Frequency**: Notification frequency settings

#### Notification Center

In-app notification center.

##### Notification List

- **Unread Notifications**: Show unread notifications
- **All Notifications**: Show all notifications
- **Filtering**: Filter by type, status
- **Sorting**: Sort by date, type

##### Notification Status

- **UNREAD**: Unread notification
- **READ**: Read notification
- **ARCHIVED**: Archived notification

##### Notification Actions

- **Mark as Read**: Mark notification as read
- **Archive**: Archive notification
- **Clear All**: Clear all notifications
- **Navigate**: Navigate to related resource

#### API Endpoints

**Notifications**:
- `GET /notifications` - List notifications
- `GET /notifications/:id` - Get notification details
- `PUT /notifications/:id/read` - Mark as read
- `PUT /notifications/:id/archive` - Archive notification
- `DELETE /notifications/:id` - Delete notification

**Notification Preferences**:
- `GET /notifications/preferences` - Get preferences
- `PUT /notifications/preferences` - Update preferences

---

### 2.19 Super Admin

**Bullet Point**: Super admin dashboard for platform management

#### Overview

The Super Admin system provides platform-wide management capabilities for administrators to manage tenants, compliance, marketplace, and system configuration.

#### Tenant Management

##### Tenant List

- **List All Tenants**: View all tenants
- **Search Tenants**: Search by name, email, domain
- **Filter Tenants**: Filter by status, plan, etc.
- **Sort Tenants**: Sort by various fields

##### Tenant Details

- **Tenant Information**: Complete tenant information
- **Subscription Details**: Current subscription
- **Usage Statistics**: Usage statistics
- **Billing History**: Billing history

##### Tenant Limits Management

- **Override Limits**: Override plan limits
- **Custom Limits**: Set custom limits
- **Limit History**: Track limit changes
- **Limit Notifications**: Notify on limit changes

##### Tenant Billing Management

- **Billing Overview**: Billing overview
- **Invoice Management**: Manage invoices
- **Payment Issues**: Handle payment issues
- **Subscription Changes**: Make subscription changes

#### Compliance Management

##### Compliance Violations Review

- **Violation List**: List all violations
- **Violation Details**: Detailed violation information
- **Violation Resolution**: Resolve violations
- **Violation Reports**: Generate violation reports

##### Compliance Reports

- **Tenant Compliance**: Per-tenant compliance reports
- **System Compliance**: System-wide compliance reports
- **Violation Trends**: Violation trend analysis
- **Compliance Scores**: Calculate compliance scores

##### Compliance Settings

- **System Settings**: System-wide compliance settings
- **Default Settings**: Default compliance settings
- **Policy Management**: Manage compliance policies

#### Marketplace Management

##### Marketplace User Management

- **User List**: List all marketplace users
- **User Details**: User details and activity
- **User Verification**: Verify/unverify users
- **User Suspension**: Suspend/unsuspend users

##### Listing Moderation

- **Listing Review**: Review listings
- **Listing Approval**: Approve listings
- **Listing Rejection**: Reject inappropriate listings
- **Listing Removal**: Remove listings

##### Review Moderation

- **Review Review**: Review user reviews
- **Review Approval**: Approve reviews
- **Review Removal**: Remove inappropriate reviews
- **Review Reporting**: Handle review reports

##### Lead Reservation Exchange Rate Management

- **Rate Configuration**: Set exchange rate
- **Rate History**: Track rate changes
- **Rate Application**: Apply rates to transactions
- **Rate Notifications**: Notify on rate changes

#### System Configuration

##### System-Wide Settings

- **Feature Flags**: Enable/disable features
- **System Limits**: Set system-wide limits
- **Configuration Management**: Manage system configuration
- **Settings Export/Import**: Export/import settings

##### Feature Flags

- **Feature Toggles**: Toggle features on/off
- **Rollout Management**: Gradual feature rollouts
- **A/B Testing**: A/B test features
- **Feature Analytics**: Track feature usage

##### System Limits

- **Global Limits**: Set global limits
- **Resource Limits**: Set resource limits
- **Rate Limits**: Set rate limits
- **Quota Management**: Manage quotas

#### API Endpoints

**Super Admin**:
- `GET /super-admin/tenants` - List tenants
- `GET /super-admin/tenants/:id` - Get tenant details
- `PUT /super-admin/tenants/:id/limits` - Update tenant limits
- `GET /super-admin/compliance/violations` - List violations
- `GET /super-admin/marketplace/users` - List marketplace users
- `PUT /super-admin/marketplace/exchange-rate` - Update exchange rate
- `GET /super-admin/system/config` - Get system config
- `PUT /super-admin/system/config` - Update system config

---

### 2.20 Onboarding

**Bullet Point**: User onboarding flow

#### Overview

The Onboarding system guides new users through platform setup, helping them configure their account, create their first campaigns and journeys, and understand platform features.

#### Onboarding Steps

##### Welcome

- **Introduction**: Welcome message
- **Platform Overview**: Platform features overview
- **Getting Started**: Getting started guide

##### Profile Setup

- **Company Information**: Company name, industry
- **Contact Information**: Contact details
- **Preferences**: User preferences

##### Integration Setup

- **Twilio Integration**: Connect Twilio account
- **Marketing Integrations**: Connect marketing platforms
- **Webhook Configuration**: Configure webhooks

##### First Campaign/Journey Creation

- **Campaign Wizard**: Create first campaign
- **Journey Builder**: Create first journey
- **Template Selection**: Use templates
- **Guided Tour**: Step-by-step guidance

##### Tutorial Completion

- **Feature Tours**: Tour key features
- **Best Practices**: Learn best practices
- **Tips & Tricks**: Platform tips
- **Completion**: Mark onboarding complete

#### Onboarding Progress

##### Progress Tracking

- **Step Completion**: Track completed steps
- **Progress Percentage**: Show completion percentage
- **Next Steps**: Show next steps
- **Progress Persistence**: Save progress

##### Step Completion Validation

- **Auto-Validation**: Validate steps automatically
- **Manual Validation**: Manual step completion
- **Validation Rules**: Rules for step completion
- **Completion Confirmation**: Confirm completion

##### Onboarding Skip

- **Skip Option**: Skip onboarding
- **Skip Confirmation**: Confirm skip
- **Skip Tracking**: Track skipped steps
- **Resume Later**: Resume onboarding later

#### API Endpoints

**Onboarding**:
- `GET /onboarding/progress` - Get onboarding progress
- `PUT /onboarding/progress` - Update progress
- `POST /onboarding/complete` - Mark onboarding complete
- `POST /onboarding/skip` - Skip onboarding

---

## Technical Architecture

### System Architecture

#### Backend Architecture

**NestJS Framework**: Modular, scalable backend
- **Modules**: Feature-based modules
- **Services**: Business logic services
- **Controllers**: HTTP request handlers
- **Entities**: Database entities
- **DTOs**: Data transfer objects

**Database Layer**:
- **TypeORM**: Object-relational mapping
- **PostgreSQL**: Primary database
- **Migrations**: Database migrations
- **Entity Relationships**: Complex relationships

**Caching Layer**:
- **Redis**: Caching and session storage
- **Cache Strategies**: Various caching strategies
- **Session Management**: User session management

**Message Queue**:
- **RabbitMQ**: Async job processing
- **Job Queues**: Background job queues
- **Message Routing**: Message routing
- **Job Scheduling**: Scheduled jobs

#### Frontend Architecture

**Next.js Framework**: React-based frontend
- **App Router**: Next.js App Router
- **Server Components**: Server-side rendering
- **Client Components**: Client-side interactivity
- **API Routes**: API route handlers

**State Management**:
- **React Query**: Server state management
- **Zustand**: Client state management
- **Context API**: Context providers

**UI Components**:
- **shadcn/ui**: Component library
- **Tailwind CSS**: Styling
- **Framer Motion**: Animations

#### Integration Architecture

**External APIs**:
- **Twilio API**: SMS and voice
- **Anthropic API**: Claude AI
- **Stripe API**: Billing
- **Kokoro TTS**: Text-to-speech

**WebSocket**:
- **Socket.io**: Real-time communication
- **Event Broadcasting**: Event broadcasting
- **Connection Management**: Connection management

### Data Flow

#### Journey Execution Flow

1. Journey launched → contacts enrolled
2. Entry node scheduled
3. Cron scheduler picks up pending executions
4. Execution rules checked
5. TCPA compliance checked
6. Node executed
7. Outcome determined
8. Next node scheduled
9. Process repeats

#### Message Sending Flow

1. Campaign/journey triggers message
2. Template processed with variables
3. TCPA compliance checked
4. Number pool selected (round-robin)
5. Message sent via Twilio
6. Delivery status tracked
7. Webhooks triggered
8. Notifications sent

#### Call Flow

1. Journey node triggers call
2. Voice template processed
3. TTS audio generated (if needed)
4. DID selected
5. Call originated via Asterisk
6. Call status tracked
7. Transfer handled (if press-1)
8. Call completion logged

### Security

#### Authentication

- **JWT Tokens**: Access and refresh tokens
- **Token Expiration**: Token expiration handling
- **Token Refresh**: Automatic token refresh
- **Multi-factor Authentication**: MFA support (future)

#### Authorization

- **Role-Based Access**: RBAC system
- **Tenant Isolation**: Tenant data isolation
- **Resource Permissions**: Resource-level permissions
- **API Security**: API endpoint security

#### Data Protection

- **Encryption**: Data encryption at rest and in transit
- **PII Protection**: Personal information protection
- **Compliance**: TCPA and GDPR compliance
- **Audit Logging**: Comprehensive audit logs

---

## API Reference

### Base URL

- **Production**: `https://api.nurtureengine.net/api`
- **Development**: `http://localhost:5002/api`

### Authentication

All API requests require authentication via JWT token:

```
Authorization: Bearer {access_token}
```

### Common Response Formats

**Success Response**:
```json
{
  "data": { ... }
}
```

**Error Response**:
```json
{
  "error": {
    "message": "Error message",
    "code": "ERROR_CODE"
  }
}
```

### Rate Limiting

API requests are rate-limited:
- **Default**: 100 requests per minute per tenant
- **Burst**: Up to 200 requests per minute
- **Headers**: Rate limit headers included in responses

### Pagination

List endpoints support pagination:
- **Query Parameters**: `page`, `limit`
- **Response**: Includes `total`, `page`, `limit`, `data`

### Filtering & Sorting

- **Filtering**: Query parameters for filtering
- **Sorting**: `sortBy`, `sortOrder` parameters
- **Search**: `search` parameter for text search

---

## Integration Points

### Twilio Integration

- **SMS Sending**: Send SMS via Twilio
- **MMS Support**: Multimedia messaging
- **Voice Calls**: Voice calling (via Asterisk/Twilio)
- **Webhooks**: Receive Twilio webhooks
- **Number Management**: Manage Twilio numbers

### Asterisk Integration

- **AMI**: Asterisk Manager Interface
- **Call Control**: Originate, bridge, transfer calls
- **WebRTC**: WebRTC bridge for agents
- **DID Management**: DID management
- **Call Recording**: Call recording

### Claude AI Integration

- **Chatbot**: Conversational AI
- **Content Generation**: Content generation
- **Template Generation**: Journey template generation
- **Lead Qualification**: Lead qualification

### Kokoro TTS Integration

- **Voice Generation**: Text-to-speech generation
- **Voice Selection**: Multiple voice options
- **Audio Processing**: Audio effects and processing
- **Voice Presets**: Pre-configured voice settings

### Stripe Integration

- **Subscriptions**: Subscription management
- **Payments**: Payment processing
- **Invoices**: Invoice generation
- **Webhooks**: Stripe webhook handling

### Marketing Platform Integrations

- **Facebook**: Facebook Lead Ads
- **TikTok**: TikTok Lead Gen
- **Google**: Google Lead Forms
- **Custom**: Custom integrations via webhooks

---

## Conclusion

This documentation provides a comprehensive overview of all features, services, and functions of the Nurture Engine application. Each feature is documented with bullet points for quick reference and detailed explanations for complete understanding.

For additional information or support, please refer to the API documentation or contact support.

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: Nurture Engine Development Team

