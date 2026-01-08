# Complete List of App Pages and Websites

## 🌐 Domains/Websites

### Production Domains
- **app.nurtureengine.net** - Main Nurture Engine application (frontend) - Includes marketplace routes
- **api.nurtureengine.net** - Backend API server

### Development URLs
- **http://localhost:5001** - Frontend development server
- **http://localhost:5000** - Backend API development server

---

## 📱 Frontend Pages

### Main Application Routes (app.nurtureengine.net)

#### Authentication Pages
- `/` - Landing page (redirects based on auth status)
- `/login` - Login page
- `/signup` - Signup/Registration page

#### Marketing Pages
- `/features` - Features page
- `/use-cases` - Use cases page
- `/pricing` - Pricing page
- `/how-it-works` - How it works page
- `/about` - About page
- `/contact` - Contact page
- `/book-a-call` - Book a call page
- `/docs` - Documentation page
- `/security` - Security page
- `/resources` - Resources page
- `/integrations` - Integrations page

#### Main Application Pages (Protected)
- `/dashboard` - Main dashboard
- `/campaigns` - Campaigns list
- `/campaigns/new` - Create new campaign
- `/campaigns/[id]` - Campaign details
- `/contacts` - Contacts list
- `/contacts/[id]` - Contact details
- `/contacts/import` - Import contacts
- `/conversations` - Conversations inbox
- `/conversations/[id]` - Conversation details
- `/journeys` - Journeys list
- `/journeys/new` - Create new journey
- `/journeys/[id]` - Journey details
- `/journeys/[id]/edit` - Edit journey
- `/journey-templates` - Journey templates
- `/templates` - Message templates
- `/templates/voice-studio` - Voice studio
- `/voice-templates` - Voice templates
- `/segments` - Contact segments
- `/scheduling` - Scheduling/Calendar
- `/settings` - Settings page
- `/super-admin` - Super admin dashboard
- `/super-admin/compliance` - Compliance management
- `/super-admin/limits` - Tenant limits management
- `/super-admin/marketplace` - Marketplace admin

#### Marketplace Pages (app.nurtureengine.net/marketplace)
**Note**: All marketplace routes are consolidated under `/marketplace` prefix. Marketplace has separate authentication and user storage, but can be linked to engine accounts for seamless access.

##### Marketplace Authentication
- `/marketplace/login` - Marketplace login (separate from engine login)
- `/marketplace/signup` - Marketplace signup (separate from engine signup)

##### Marketplace Main Pages
- `/marketplace` - Marketplace home
- `/marketplace/storefront` - Storefront management
- `/marketplace/onboarding` - Marketplace onboarding
- `/marketplace/listings` - Listings list
- `/marketplace/listings/new` - Create new listing
- `/marketplace/listings/[id]` - Listing details
- `/marketplace/listings/[id]/edit` - Edit listing
- `/marketplace/listings/[id]/analytics` - Listing analytics
- `/marketplace/seller` - Seller dashboard
- `/marketplace/buyer` - Buyer dashboard
- `/marketplace/purchases` - Purchases list
- `/marketplace/reservations` - Reservations list
- `/marketplace/reviews` - Reviews page
- `/marketplace/subscriptions` - Subscriptions
- `/marketplace/ingestion` - Lead ingestion
- `/marketplace/ingestion/new` - New ingestion
- `/marketplace/lead-sources` - Lead sources
- `/marketplace/integrations` - Integrations
- `/marketplace/settings` - Marketplace settings

##### Account Linking & Data Sharing
- `/marketplace/account-linking` - Link marketplace and engine accounts
- `/marketplace/data-sharing` - Configure data sharing permissions

### PBX Routes (/pbx)
- `/pbx/login` - PBX login page
- `/pbx/dashboard` - PBX dashboard
- `/pbx/agent` - Agent interface
- `/pbx/manager` - Manager interface

### Calendar Booking Routes
- `/book/[eventTypeId]` - Public calendar booking page

---

## 🔌 Backend API Endpoints

### Base URL
- Production: `https://api.nurtureengine.net/api`
- Development: `http://localhost:5000/api`

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

### Core Features
- `GET /api/dashboard/*` - Dashboard endpoints
- `GET|POST|PUT|DELETE /api/campaigns/*` - Campaign management
- `GET|POST|PUT|DELETE /api/contacts/*` - Contact management
- `GET|POST|PUT|DELETE /api/conversations/*` - Conversation management
- `GET|POST|PUT|DELETE /api/journeys/*` - Journey management
- `GET|POST|PUT|DELETE /api/journey-templates/*` - Journey templates
- `GET|POST|PUT|DELETE /api/templates/*` - Message templates
- `GET|POST|PUT|DELETE /api/segments/*` - Contact segments
- `GET|POST|PUT|DELETE /api/voice-templates/*` - Voice templates
- `GET|POST|PUT|DELETE /api/voice-presets/*` - Voice presets

### Marketplace API (Nurture Leads)
- `GET|POST|PUT|DELETE /api/nurture-leads/listings/*` - Listing management
- `GET|POST|PUT|DELETE /api/nurture-leads/reservations/*` - Lead reservations
- `GET|POST|PUT|DELETE /api/nurture-leads/subscriptions/*` - Subscriptions
- `GET|POST|PUT|DELETE /api/nurture-leads/reviews/*` - Reviews
- `GET|POST|PUT|DELETE /api/nurture-leads/storefront/*` - Storefront
- `GET|POST|PUT|DELETE /api/nurture-leads/onboarding/*` - Onboarding
- `GET|POST|PUT|DELETE /api/nurture-leads/register/*` - Registration
- `GET|POST|PUT|DELETE /api/nurture-leads/analytics/*` - Analytics
- `GET|POST|PUT|DELETE /api/nurture-leads/integrations/*` - Integrations
- `GET|POST|PUT|DELETE /api/nurture-leads/endpoints/*` - Custom endpoints
- `GET|POST|PUT|DELETE /api/nurture-leads/admin/*` - Admin endpoints
- `GET|POST|PUT|DELETE /api/nurture-leads/listings/:listingId/campaigns/*` - Campaign linking

### Lead Ingestion
- `POST /api/ingest/*` - Public lead ingestion endpoints
- `GET|POST|PUT|DELETE /api/lead-ingestion/*` - Lead ingestion management
- `POST /api/ingest/nurture-leads/*` - Marketplace lead ingestion

### Calendar & Scheduling
- `GET|POST|PUT|DELETE /api/calendar/*` - Calendar management
- `GET|POST|PUT|DELETE /api/event-types/*` - Event types
- `GET|POST|PUT|DELETE /api/availability/*` - Availability management
- `GET|POST /api/calendar/booking/*` - Calendar booking endpoints

### PBX (Phone System)
- `POST /api/pbx/auth/login` - PBX authentication
- `GET|POST|PUT|DELETE /api/pbx/*` - PBX management
- `GET|POST|PUT|DELETE /api/pbx/reporting/*` - PBX reporting
- `GET|POST|PUT|DELETE /api/pbx/agent-extensions/*` - Agent extensions
- `POST /api/pbx/calls/dial` - Dial outbound call
- `POST /api/pbx/calls/:callId/answer` - Answer call
- `POST /api/pbx/calls/:callId/hangup` - Hangup call
- `POST /api/pbx/calls/:callId/hold` - Hold call
- `POST /api/pbx/calls/:callId/unhold` - Unhold call
- `POST /api/pbx/calls/:callId/mute` - Mute call
- `POST /api/pbx/calls/:callId/unmute` - Unmute call

### Asterisk Integration
- `GET|POST|PUT|DELETE /api/asterisk-dids/*` - DID management
- `GET|POST|PUT|DELETE /api/asterisk-sounds/*` - Sound management
- `GET|POST|PUT|DELETE /api/calls/*` - Call management

### Voice & AI
- `GET|POST|PUT|DELETE /api/voice-messages/*` - Voice messages
- `GET|POST|PUT|DELETE /api/elevenlabs/*` - ElevenLabs integration
- `GET|POST|PUT|DELETE /api/kokoro/*` - Kokoro TTS integration
- `GET|POST|PUT|DELETE /api/content-ai-templates/*` - Content AI templates
- `GET|POST|PUT|DELETE /api/ai-templates/*` - AI templates
- `GET|POST /api/ai-generation/*` - AI content generation

### Twilio Integration
- `GET|POST|PUT|DELETE /api/twilio/*` - Twilio management
- `POST /api/webhooks/twilio/*` - Twilio webhooks

### Webhooks
- `GET|POST|PUT|DELETE /api/webhooks/*` - Webhook management
- `POST /api/webhooks/imessage/*` - iMessage webhooks
- `GET|POST|PUT|DELETE /api/journeys/:id/webhooks/*` - Journey webhooks

### Analytics
- `GET /api/analytics/*` - Analytics endpoints

### Billing
- `GET|POST|PUT|DELETE /api/billing/*` - Billing management
- `POST /api/billing/webhook/*` - Billing webhooks

### Compliance & Admin
- `GET|POST|PUT|DELETE /api/compliance/*` - Compliance management
- `GET|POST|PUT|DELETE /api/super-admin/*` - Super admin endpoints
- `GET|POST|PUT|DELETE /api/tenant-limits/*` - Tenant limits
- `GET|POST|PUT|DELETE /api/pricing-plans/*` - Pricing plans

### Configuration
- `GET|POST|PUT|DELETE /api/config/*` - Configuration management
- `GET|POST|PUT|DELETE /api/execution-rules/*` - Execution rules
- `GET|POST|PUT|DELETE /api/onboarding/*` - Onboarding flow
- `GET|POST|PUT|DELETE /api/setup/*` - Setup endpoints

### Other Services
- `GET|POST|PUT|DELETE /api/tenants/*` - Tenant management
- `GET|POST|PUT|DELETE /api/notifications/*` - Notifications
- `GET|POST|PUT|DELETE /api/uploads/*` - File uploads
- `GET|POST|PUT|DELETE /api/tcpa/*` - TCPA compliance
- `GET /api` - API information endpoint

---

## 📊 Summary Statistics

### Frontend Pages
- **Total Marketing Pages**: 11 pages
- **Total App Pages**: 30+ pages
- **Total Marketplace Pages**: 22 pages (all consolidated under `/marketplace` prefix on app.nurtureengine.net)
  - Includes: authentication, listings, seller/buyer dashboards, account linking, data sharing
- **Total PBX Pages**: 4 pages
- **Total Calendar Pages**: 1 page

### Backend API Controllers
- **Total Controllers**: 60+ controllers
- **Total API Endpoints**: 200+ endpoints

### Domains
- **Production Domains**: 2 domains (app.nurtureengine.net, api.nurtureengine.net)
- **Development URLs**: 2 URLs

---

## 🔗 Route Groups

### Frontend Route Groups
- `(app)` - Main application routes (protected) - Includes marketplace routes
- `(auth)` - Authentication routes
- `(marketing)` - Marketing/public routes
- `pbx` - PBX system routes

### Backend Route Prefixes
- `/api` - Base API prefix
- `/api/marketplace/auth/*` - Marketplace authentication API
- `/api/marketplace/account-linking/*` - Account linking API
- `/api/nurture-leads/*` - Marketplace API (legacy, still supported)
- `/api/pbx/*` - PBX API
- `/api/ingest/*` - Public ingestion endpoints
- `/api/webhooks/*` - Webhook endpoints

---

## 📝 Notes    

1. **Marketplace Consolidation**: All marketplace routes are now consolidated under `/marketplace` prefix on `app.nurtureengine.net`. The separate `leads.nurtureengine.net` subdomain is no longer used.

2. **Separate Authentication**: Marketplace has its own authentication system (`/marketplace/login`, `/marketplace/signup`) with separate user storage. Users can link marketplace and engine accounts for seamless access.

3. **Account Linking**: Users can link their marketplace account to their engine account, enabling:
   - Seamless switching between marketplace and engine
   - Data sharing between platforms (contacts, campaigns, etc.)
   - Single sign-on capabilities

4. **Authentication**: 
   - Engine routes use engine authentication
   - Marketplace routes use marketplace authentication
   - Linked accounts can access both platforms

5. **Dynamic Routes**: Routes with `[id]` or `[eventTypeId]` are dynamic and accept parameters.

6. **API Versioning**: All API endpoints are prefixed with `/api`.

7. **Webhooks**: Public webhook endpoints don't require authentication but may use signature verification.

