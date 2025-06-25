# Backend Services - Business Logic Layer

The services folder contains the core business logic for RealNurture. These modules handle complex operations, external integrations, and orchestrate the main platform features.

## 🏗️ Architecture

Services follow a layered architecture pattern:

- **Controllers** call services for business logic
- **Services** handle complex operations and external APIs
- **Models** provide data structures and simple utilities

## 📁 Core Services

### `openaiService.ts` ⭐ **MOST CRITICAL**

**Purpose**: AI response generation and conversation intelligence

**Key Functions:**

- `generateResponse(leadId)` - Main AI response generation
- `checkForNewSearchCriteria()` - Extracts property preferences from conversations
- `checkForAppointmentDetails()` - Detects and creates appointments from messages
- `sanitizeResponse()` - Removes metadata before sending to client

**AI Workflow:**

1. Fetches lead context and message history
2. Gets agent settings for personalization
3. Builds conversation context for GPT-4
4. Generates response with structured metadata
5. Extracts appointments/search criteria
6. Returns sanitized response for SMS

**Integration Points:**

- OpenAI GPT-4 API for response generation
- Appointment service for auto-scheduling
- Search criteria service for preference tracking
- Notification service for alerting agents

### `messageService.ts`

**Purpose**: Message processing and conversation management

**Key Functions:**

- `createMessage()` - Store incoming/outgoing messages
- `getMessagesByLeadIdDescending()` - Retrieve conversation history
- `updateMessageStatus()` - Track delivery and read status
- `getUnreadMessageCount()` - Notification counters
- `getScheduledMessages()` - Retrieve messages scheduled for future delivery
- `updateDeliveryStatus()` - In-place updates for message delivery tracking

**Message Flow:**

1. Receive message from Twilio webhook
2. Store in database with metadata
3. Trigger AI response generation
4. Send response via Twilio service
5. Update delivery status

**Scheduled Message Flow:**

1. Message created with `scheduled_at` timestamp > current time
2. Cron job polls for overdue scheduled messages (`scheduled_at` <= now)
3. Send message to client via Twilio
4. Update message **in-place** with delivery status "sent"
5. Twilio webhook updates message **in-place** with delivery status "delivered"

**In-Place Updates:**

- Messages are **never deleted**, only status updated
- `delivery_status` field tracks: "scheduled" → "sent" → "delivered"
- Preserves complete message history and audit trail
- Allows retry logic for failed deliveries

### `twilioService.ts`

**Purpose**: SMS communication via Twilio

**Key Functions:**

- `sendSMS()` - Send outbound messages
- `handleIncomingMessage()` - Process webhook data
- `updateDeliveryStatus()` - Track message delivery
- `validatePhoneNumber()` - Phone number formatting

**Twilio Integration:**

- Webhook endpoints for incoming messages
- Status callbacks for delivery tracking
- Phone number validation and formatting
- Error handling for failed messages

### `leadService.ts`

**Purpose**: Lead data management and operations

**Key Functions:**

- `createLead()` - Add new leads with validation
- `getLeadsByUserId()` - Retrieve agent's lead list
- `updateLeadStatus()` - Track lead progression
- `bulkImportLeads()` - CSV import processing

**Lead Management:**

- CRUD operations with data validation
- Status tracking (new, contacted, qualified, etc.)
- Bulk import with error handling
- Lead scoring and prioritization

### `appointmentService.ts`

**Purpose**: Calendar and appointment management

**Key Functions:**

- `createAppointment()` - Schedule new appointments
- `getAppointmentsByUser()` - Retrieve agent's calendar
- `updateAppointment()` - Modify existing appointments
- `getUpcomingAppointments()` - Dashboard summaries

**Appointment Features:**

- Auto-scheduling from AI conversations
- Calendar integration capabilities
- Reminder and notification system
- Conflict detection and resolution

## 📁 Supporting Services

### `notificationService.ts`

**Purpose**: Real-time notification system

**Features:**

- Push notifications for important events
- In-app notification management
- Email notification integration
- Notification preferences and settings

### `userSettingsService.ts`

**Purpose**: Agent profile and configuration

**Features:**

- Agent profile management
- AI personality configuration
- Business information settings
- Notification preferences

### `searchCriteriaService.ts`

**Purpose**: Client property preference tracking

**Features:**

- Extract preferences from conversations
- Store and update search criteria
- Property matching algorithms
- Preference change notifications

### `cronService.ts`

**Purpose**: Scheduled tasks and automation

**Features:**

- **Scheduled Message Polling**: Monitors `messages` table for overdue scheduled messages
- Automated follow-up scheduling
- Lead scoring updates
- Database maintenance tasks
- Report generation

**Scheduled Message Processing:**

- Polls database every minute for messages where `scheduled_at` <= now
- Triggers message sending via Twilio service
- Updates message status in-place from "scheduled" to "sent"
- Handles retry logic for failed message deliveries

## 📁 Specialized Folders

### `/orchestrator`

**Contains**: `messagingOrchestrator.ts`

**Purpose**: Coordinates complex messaging workflows

- Manages the entire message lifecycle
- Handles error states and retries
- Coordinates between services
- Ensures message delivery reliability

### `/prompts`

**Contains**: AI prompt engineering files

- `buyerPrompt.ts` - Buyer lead conversation prompts
- `sellerPrompt.ts` - Seller lead conversation prompts

**Features:**

- Dynamic prompt generation based on context
- Agent personality injection
- Market-specific information
- Conversation state awareness

## 🔄 Service Interactions

### Message Processing Flow

```
Twilio Webhook → messagingOrchestrator → messageService → openaiService → twilioService
```

### Scheduled Message Flow

```
cronService → messageService.getScheduledMessages() → twilioService → messageService.updateDeliveryStatus()
```

### Lead Import Flow

```
CSV Upload → leadController → leadService → Validation → Database Storage
```

### AI Response Flow

```
Incoming Message → openaiService → Generate Response → Extract Metadata → Send Response
```

## 🛠️ Development Guidelines

### Error Handling

- All services use try/catch with proper logging
- External API failures are gracefully handled
- User-friendly error messages returned to frontend

### Testing

- Unit tests for individual service functions
- Integration tests for service interactions
- Mock external APIs for reliable testing

### Performance

- Database queries optimized with proper indexing
- External API calls cached when appropriate
- Async/await used for non-blocking operations

### Security

- Input validation on all service inputs
- API keys secured in environment variables
- User authorization checked at service level
