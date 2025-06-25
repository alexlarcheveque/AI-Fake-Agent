# Backend - RealNurture API Server

The backend is a Node.js/Express API server that powers the RealNurture platform. It handles lead management, AI-powered messaging, appointment scheduling, and integrations with external services.

## 🏗️ Architecture

- **Framework**: Express.js with TypeScript
- **Database**: Supabase (PostgreSQL)
- **AI Service**: OpenAI GPT-4
- **SMS Provider**: Twilio
- **Authentication**: Supabase Auth with JWT
- **Real-time**: Socket.io for live updates

## 📁 Folder Structure

### `/config`

Configuration files for external services:

- `supabase.ts` - Supabase client initialization and database connection

### `/controllers`

Express route handlers that process HTTP requests:

- `leadController.ts` - Lead CRUD operations, CSV import, bulk operations
- `messageController.ts` - SMS messaging, conversation history, Twilio webhooks
- `appointmentController.ts` - Calendar management, appointment CRUD
- `notificationController.ts` - User notifications and alerts
- `searchCriteriaController.ts` - Client property preferences management
- `userSettingsController.ts` - Agent profile and settings management

### `/models`

TypeScript types and data models:

- `Lead.ts` - Lead entity types and helper functions
- `Message.ts` - SMS message and conversation types
- `Appointment.ts` - Calendar appointment types
- `Notification.ts` - Notification system types
- `SearchCriteria.ts` - Property search preference types
- `UserSettings.ts` - Agent profile and configuration types

### `/services`

Business logic and external service integrations:

- `leadService.ts` - Lead management business logic
- `messageService.ts` - Message processing and conversation management
- `openaiService.ts` - **CORE AI SERVICE** - GPT-4 response generation with context
- `twilioService.ts` - SMS sending and webhook processing
- `appointmentService.ts` - Calendar and scheduling logic
- `notificationService.ts` - Real-time notification system
- `cronService.ts` - Scheduled tasks and automated jobs
- `orchestrator/messagingOrchestrator.ts` - Coordinates AI responses and message flow

### `/services/prompts`

AI prompt engineering:

- `buyerPrompt.ts` - System prompts for buyer lead conversations
- `sellerPrompt.ts` - System prompts for seller lead conversations

### `/routes`

Express route definitions:

- `leadRoutes.ts` - `/api/leads/*` endpoints
- `messageRoutes.ts` - `/api/messages/*` endpoints
- `appointmentRoutes.ts` - `/api/appointments/*` endpoints
- `notificationRoutes.ts` - `/api/notifications/*` endpoints
- `searchCriteriaRoutes.ts` - `/api/search-criteria/*` endpoints
- `userSettingsRoutes.ts` - `/api/user-settings/*` endpoints

### `/middleware`

Express middleware:

- `authMiddleware.ts` - JWT authentication and user authorization

### `/utils`

Utility functions:

- `logger.ts` - Winston logging configuration
- `phoneUtils.ts` - Phone number formatting and validation
- `validation.ts` - Input validation schemas

### `/tests`

Unit and integration tests:

- `twilio.test.ts` - Twilio service testing
- `twilioStatusCallback.test.ts` - Webhook callback testing

### `/scripts`

Database and maintenance scripts:

- `migrateNotifications.js` - Database migration utilities
- `reset-db.sql` - Database reset commands

## 🔑 Key Services

### OpenAI Service (`/services/openaiService.ts`)

**Most Important File** - Handles AI response generation:

- Generates contextual responses using GPT-4
- Extracts appointment details from conversations
- Identifies and stores client search criteria
- Personalizes responses based on agent settings

### Messaging Orchestrator (`/services/orchestrator/messagingOrchestrator.ts`)

Coordinates the entire messaging workflow:

- Receives incoming SMS via Twilio webhooks
- Triggers AI response generation
- Manages conversation state and context

### Twilio Service (`/services/twilioService.ts`)

Handles SMS communication:

- Sends outbound messages to leads
- Processes delivery status updates
- Manages phone number validation

## 🚀 Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create `.env` with:

   ```
   OPENAI_API_KEY=your_openai_key
   TWILIO_ACCOUNT_SID=your_twilio_sid
   TWILIO_AUTH_TOKEN=your_twilio_token
   SUPABASE_URL=your_supabase_url
   SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database Setup:**

   ```bash
   npm run update-types  # Generate TypeScript types from Supabase
   ```

4. **Start Development:**
   ```bash
   npm run dev  # Runs on port 3000
   ```

## 📡 API Endpoints

### Leads

- `GET /api/leads` - List all leads
- `POST /api/leads` - Create new lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `POST /api/leads/bulk` - Bulk import leads

### Messages

- `GET /api/messages/lead/:leadId` - Get conversation history
- `POST /api/messages/send` - Send SMS to lead
- `POST /api/messages/twilio/webhook` - Twilio incoming SMS webhook
- `POST /api/messages/twilio/status` - Twilio delivery status webhook

#### Scheduled Message Workflow

Messages with `scheduled_at` timestamp use automated delivery:

1. **Scheduled**: Message created with future `scheduled_at` timestamp
2. **Polling**: Cron job checks for overdue messages (`scheduled_at` <= now)
3. **Sending**: Message sent via Twilio, status updated to "sent"
4. **Delivery**: Twilio webhook updates status to "delivered"

All updates are done **in-place** on the same message record, preserving audit trail.

### Appointments

- `GET /api/appointments` - List appointments
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

## 🔧 Development

### Testing

```bash
npm test                    # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Database Types

```bash
npm run update-types       # Regenerate TypeScript types from Supabase schema
```

### Deployment

The backend deploys to Fly.io with the included `Dockerfile` and `fly.toml` configuration.
