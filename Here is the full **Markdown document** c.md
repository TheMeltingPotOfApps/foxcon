Here is the full **Markdown document** containing **everything we covered**, fully structured, clean, and ready to use as a product/tech spec for your SaaS platform.

---

# **📘 Multi-Tenant SMS AI SaaS Platform – Technical & Product Specification**

*A complete system & architecture document*
*Stack: GCP · Node.js · Redis · RabbitMQ · PostgreSQL · Twilio · React/Next.js · Claude AI*

---

# **1. Product Overview**

## **1.1 Summary**

A premium, highly animated, multi-tenant SaaS platform for businesses to manage outbound and conversational SMS campaigns with:

* Twilio SMS/MMS messaging
* Campaign builder with CSV import and speed throttling
* Round-robin DID routing and number pool management
* AI-assisted replies (Claude)
* Lead qualification automation
* Inbox-style conversation management
* Robust template system for outreach, replies, and AI prompts
* Full SaaS features: billing, usage, roles, permissions, workspace management

Inspired visually by: **Attentive.com** (clean, modern, premium aesthetic).

---

# **2. High-Level Architecture**

## **2.1 Stack**

* **Cloud:** GCP
* **Backend:** Node.js (TypeScript), Express/NestJS
* **Async:** RabbitMQ
* **Caching & Rate-Limiting:** Redis
* **Database:** PostgreSQL (Cloud SQL)
* **Queues:** RabbitMQ
* **Messaging provider:** Twilio
* **Frontend:** Next.js + React + TypeScript

  * Tailwind CSS
  * shadcn/ui
  * Framer Motion for premium animations
* **AI:** Claude via Anthropic API
* **Storage:** Google Cloud Storage
* **Observability:** GCP Logging, Sentry, Prometheus/Grafana

---

# **3. Multi-Tenancy Model**

## **3.1 Structure**

* Logical multi-tenancy via `tenant_id` on all DB records
* Role-based access:

  * OWNER
  * ADMIN
  * MANAGER
  * AGENT
  * VIEWER

## **3.2 Auth**

* JWT-based auth
* Access token + refresh token
* Optional SSO in future
* Each token contains the active `tenant_id`

---

# **4. Core Domain Objects**

### **Tenant**

* Branding, Twilio config, billing info, AI defaults, number pools

### **Users & Roles**

* `User`, `UserTenant`, roles

### **Twilio Entities**

* `TwilioConfig`
* `TwilioNumber`
* Number Pools

### **Campaigns**

* Name, type, status, speed, AI enabled
* Audience, content, schedule

### **Contacts**

* Contact attributes, consent, tags, custom fields

### **Conversations & Messages**

* Threaded SMS inbox
* Sent/received messages with Twilio delivery statuses

### **AI Config**

* Tone, rules, persona, business info, qualification rules, auto-send settings

### **Billing**

* Plan, usage, invoices, overages

---

# **5. Twilio Integration**

## **5.1 Number Management**

* Import all numbers from Twilio
* Purchase DIDs
* Assign to pools or campaigns
* Check health/capabilities

## **5.2 Messaging**

* Outbound messages sent via Messaging Services
* Round-robin routing from number pools
* Rate-limiting per campaign using Redis

## **5.3 Webhooks**

* **Inbound messages:** `/webhooks/twilio/inbound`
* **Delivery status:** `/webhooks/twilio/status`
* Automatic:

  * Conversation creation
  * Opt-out handling
  * AI reply triggering

---

# **6. Campaign Flow**

## **6.1 CSV Upload**

* Large CSV import
* Background validation job
* Deduplication
* Phone normalization
* Consent verification

## **6.2 Campaign Wizard**

1. Details
2. Audience
3. Message content (templates supported)
4. Sending speed configuration
5. Number pool selection
6. AI behavior
7. Review & Launch

## **6.3 Round-Robin & Speed Throttling**

Via Redis:

* Circular list per campaign of available DIDs
* Token bucket rate limit logic

---

# **7. AI Reply Engine (Claude)**

## **7.1 Capabilities**

* Auto-replies
* Lead qualification
* Tone & persona control
* Structured extraction (JSON)
* Campaign-level and tenant-level configs

## **7.2 Pipeline**

1. Inbound message received
2. Find conversation & AI config
3. Build prompt using:

   * Template
   * Tone
   * Business info
   * Conversation history
4. Claude generates:

   * Draft or auto-send reply
   * Qualification data
5. Post-processing
6. Save AI log

---

# **8. Template System (Full)**

## **8.1 Template Types**

* Outreach templates
* Reply templates (macros)
* AI prompt templates
* System templates (opt-in, unsub)
* Snippets/partials
* Multi-step drips (future)

## **8.2 Features**

* Variables: `{{first_name}}`, `{{contact.city}}`, etc.
* Conditional logic (optional)
* Snippets: `{{> disclaimer}}`
* Versioning & approvals
* Search & categorization
* Tenant-level + global templates

## **8.3 Data Model**

* `Template`
* `TemplateVersion`
* `Snippet`
* Folders (optional)

## **8.4 Template Usage**

* Campaign content builder
* Inbox quick replies
* AI prompt scaffolding

---

# **9. Frontend – Complete SaaS Page Map**

Built with **Next.js + React + Tailwind + shadcn/ui + Framer Motion** for fluid, premium UI.

---

# **9.1 Public Site (Marketing)**

* Home / Landing
* Features
* Solutions (industry pages)
* Pricing
* Resources / Blog
* Docs / API Docs
* Legal pages
* Contact / Demo
* Status page
* Login / Signup

---

# **9.2 Auth & Onboarding**

* Login
* Signup
* Email verification
* Forgot password
* Reset password
* Accept workspace invite
* Workspace switcher
* First-time onboarding wizard:

  1. Company details
  2. Twilio connection
  3. Number purchase
  4. Import contacts
  5. Create first campaign

---

# **9.3 Application Shell**

* Global navigation
* Tenant switcher
* Notifications
* Search

---

# **9.4 App Pages**

## **Dashboard**

* Messages sent
* Delivery rate
* Replies
* AI usage
* Lead qualification metrics
* Animated charts

---

## **Campaigns**

* **List:** `/app/campaigns`
* **Create Wizard:** `/app/campaigns/new`
* **Detail:** `/app/campaigns/[id]`

Features:

* Real-time stats
* Review messages
* Errors
* Linked conversations

---

## **Conversations Inbox**

* **List:** filtered by open/closed/assigned/AI
* **Detail:** full SMS thread
* Contact right panel
* AI suggestion ghost messages
* Templates drawer
* Qualification fields

---

## **Contacts & Segments**

* Contacts list
* Contact profile page
* Segments builder
* Imports list & error logs

---

## **Templates System**

* Template library
* Template editor (with versioning)
* Snippet manager
* AI prompt template editor
* Preview panel with variable injection

---

## **AI Configuration**

* Global AI settings
* Campaign-linked AI configs
* AI logs (input/output/decision)

---

## **Settings**

### **Workspace**

* Branding
* Timezone
* Default numbers
* Legal footer templates

### **Twilio**

* Connect account
* Messaging service
* Number pools
* Purchase numbers
* Assign numbers

### **Team**

* Users & roles
* Invites

### **Billing**

* Plan
* Usage
* Invoice history
* Payment method

### **Webhooks**

* Tenant webhooks
* Logs
* Replay events

### **API Keys**

* Generate & revoke keys

### **Notifications**

* Email/SMS/Slack alerts

---

## **User Profile**

* Personal info
* Password change
* Notifications

## **Help Center**

* Docs
* Tutorials
* Support ticket form

## **Changelog**

* What’s new / release notes

---

## **System Pages**

* 404
* 500
* Maintenance
* Access denied

---

# **10. SaaS Requirements**

## **10.1 Billing**

* Stripe Billing
* Plans with included SMS/AI volumes
* Overages
* Usage metering
* Customer billing portal

## **10.2 Webhooks**

* Tenant webhooks
* Selectable events
* HMAC signatures
* Retry + DLQ

---

# **11. Non-Functional Requirements**

## **Security**

* Encryption for Twilio secrets
* Secret Manager for API keys
* Tenant isolation enforced
* Audit trail

## **Compliance**

* Opt-in and opt-out enforcement
* Automatic STOP/UNSUBSCRIBE handling

## **Scalability**

* Horizontal autoscaling
* Queue-based delivery
* Retry/backoff on Twilio errors

## **Reliability**

* DLQs for job failures
* Regular DB backups
* Monitoring & alerts

---

# **12. Example API Surface**

* **Auth:** login/refresh
* **Tenants:** create/switch/invite
* **Twilio:** numbers, buy, pools
* **Campaigns:** CRUD + launch/pause
* **Contacts:** import + CRUD
* **Conversations:** send messages, close
* **AI:** configs, logs
* **Templates:** CRUD + versions
* **Billing:** usage + plans
* **Webhooks:** inbound & outbound

---

# **13. MVP vs Future**

## **MVP**

* Campaign sending
* Inbox
* Twilio integration
* AI replies (manual approve or auto-send)
* Template system basic
* Billing
* Settings

## **Future**

* Drip journeys
* Multi-channel (WhatsApp/RCS/email)
* Advanced segmentation
* A/B testing
* Compliance automations
* More AI tooling (summaries, insights)

---

# **Done.**

If you want, I can now generate:
📌 **A printable PDF version**
📌 **A Google-Docs-style version**
📌 **A Notion-ready version**
📌 **A folder structure + file scaffolding for the actual codebase**

Just tell me which format you want.
