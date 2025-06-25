# Frontend App - RealNurture Dashboard

The main React application that provides the user interface for real estate agents to manage leads, view conversations, schedule appointments, and configure their AI assistant.

## 🏗️ Architecture

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Routing**: React Router v7
- **State Management**: React Context + Hooks
- **Authentication**: Supabase Auth

## 📁 Folder Structure

### `/src/components`

React components organized by feature:

#### Core Components

- `App.tsx` - Main application component with routing and authentication
- `Navbar.tsx` - Top navigation bar with user menu
- `Dashboard.tsx` - Main dashboard with metrics and recent activity

#### Lead Management

- `LeadManagement.tsx` - Main leads page with list and filters
- `LeadList.tsx` - Table/grid view of all leads
- `SingleLeadForm.tsx` - Form for creating/editing individual leads
- `BulkLeadForm.tsx` - CSV import and bulk lead operations

#### Messaging System

- `MessageCenter.tsx` - Main messaging interface
- `MessageList.tsx` - List of all conversations
- `MessageThread.tsx` - Individual conversation view with chat history
- `MessageInput.tsx` - Text input for sending messages
- `MessageCalendar.tsx` - Calendar view of message activity

#### Appointments

- `AppointmentsList.tsx` - List view of all appointments
- `AppointmentModal.tsx` - Create/edit appointment modal dialog

#### Search & Preferences

- `SearchCriteriaModal.tsx` - Client property preferences editor

#### Settings & Auth

- `Settings.tsx` - User profile and AI assistant configuration
- `Login.tsx` - Authentication login form
- `Register.tsx` - User registration form
- `ForgotPassword.tsx` - Password reset request
- `ResetPassword.tsx` - Password reset confirmation

#### Notifications

- `NotificationsPage.tsx` - Notification center and history

#### UI Components

- `ui/Button.tsx` - Reusable button component with variants

### `/src/api`

API client modules for backend communication:

- `apiClient.ts` - Base HTTP client with authentication
- `leadApi.ts` - Lead CRUD operations
- `messageApi.ts` - Message and conversation endpoints
- `appointmentApi.ts` - Appointment management
- `notificationApi.ts` - Notification system
- `searchCriteriaApi.ts` - Search preferences
- `settingsApi.ts` - User settings management

### `/src/contexts`

React Context providers for global state:

- `AuthContext.tsx` - User authentication state and methods
- `NotificationContext.tsx` - Real-time notifications and alerts

### `/src/hooks`

Custom React hooks for reusable logic:

- `useAuth.ts` - Authentication utilities and state
- `useFetchLeads.ts` - Lead data fetching with caching
- `useForm.ts` - Form state management and validation
- `useUserSettings.ts` - User settings management
- `useApiError.ts` - Centralized API error handling

### `/src/utils`

Utility functions and helpers:

- `auth.ts` - Authentication utility functions
- `errorHandler.ts` - Error handling and user feedback
- `propertySearchFormatConverter.ts` - Search criteria data transformation

### `/src/styles`

CSS and styling files:

- `styles.css` - Global application styles
- `leads.css` - Lead management specific styles
- `MessageThread.css` - Conversation interface styles

### `/src/config`

Configuration files:

- `supabase.ts` - Supabase client initialization

### `/src/data`

Sample and mock data:

- `sampleLeadContext.ts` - Example lead data for development

### `/src/__tests__`

Test files organized by feature:

- `components/MessageThread.test.jsx` - Message interface tests
- `api/messageApi.test.js` - API client tests

## 🔑 Key Components

### App.tsx

- **Purpose**: Main application shell with routing and authentication
- **Features**: Protected routes, authentication checks, global providers
- **Key Flows**: Login → Dashboard → Feature pages

### MessageThread.tsx

- **Purpose**: Core messaging interface for lead conversations
- **Features**: Real-time chat, message history, AI response indicators
- **Integration**: Connects to backend messaging API and WebSocket updates

### LeadManagement.tsx

- **Purpose**: Central hub for managing all leads
- **Features**: Lead list, filtering, search, import, individual lead details
- **Workflows**: Import → View → Message → Convert

### Dashboard.tsx

- **Purpose**: Overview of key metrics and recent activity
- **Features**: Lead statistics, recent messages, upcoming appointments
- **Data**: Real-time updates from multiple API endpoints

## 🚀 Getting Started

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create `.env` with:

   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_API_BASE_URL=http://localhost:3000/api
   ```

3. **Start Development:**
   ```bash
   npm run dev  # Runs on port 5173
   ```

## 🎨 UI/UX Design

### Design System

- **Colors**: Professional blue/gray palette suitable for business use
- **Typography**: Clean, readable fonts optimized for data-heavy interfaces
- **Components**: Consistent button styles, form inputs, and modal dialogs
- **Layout**: Responsive design that works on desktop and tablet

### User Flows

1. **Lead Import**: CSV upload → Preview → Validation → Import confirmation
2. **Conversation**: Lead list → Select lead → View chat history → Send message
3. **Appointment**: Notification → Click → View details → Reschedule if needed
4. **Settings**: Profile → AI configuration → Save → Test with sample conversation

## 🧪 Testing

```bash
npm run test                # Run all tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

### Test Structure

- **Unit Tests**: Individual component testing
- **Integration Tests**: API client and user flow testing
- **Mocking**: API responses and external dependencies

## 📱 Key Features

### Real-time Updates

- **WebSocket**: Live message updates
- **Polling**: Notification and appointment updates
- **Optimistic UI**: Immediate feedback for user actions

### State Management

- **Authentication**: Global auth state via Context
- **API Data**: Component-level state with custom hooks
- **Form State**: Controlled inputs with validation

### Performance

- **Code Splitting**: Route-based lazy loading
- **API Optimization**: Request caching and debouncing
- **Bundle Size**: Tree shaking and dependency optimization

## 🚀 Deployment

Deploys to Vercel with the included `vercel.json` configuration. The build process:

1. `npm run build` - Creates production build
2. Static assets served via Vercel CDN
3. Environment variables configured in Vercel dashboard
