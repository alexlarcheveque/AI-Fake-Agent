# Frontend Components - UI Layer

The components folder contains all React components that make up the RealNurture user interface. Components are organized by feature area and follow a consistent architecture pattern.

## 🏗️ Component Architecture

### Design Patterns

- **Functional Components**: All components use React hooks
- **Composition**: Components compose smaller, reusable pieces
- **Props Interface**: TypeScript interfaces for all component props
- **State Management**: Local state with hooks, global state via Context

### File Organization

- **Feature-based**: Components grouped by business functionality
- **Shared Components**: Reusable UI elements in `/ui` folder
- **Co-location**: Related components near each other

## 📁 Core Application Components

### `App.tsx` ⭐ **MAIN ENTRY POINT**

**Purpose**: Application shell with routing and authentication

**Key Features:**

- Route protection with authentication checks
- Global provider setup (Auth, Notifications)
- Loading states during authentication
- Navigation structure definition

**Architecture:**

```typescript
AuthProvider → ProtectedRoute → AuthenticatedApp → Outlet
```

### `Navbar.tsx`

**Purpose**: Top navigation bar with user controls

**Features:**

- User profile dropdown
- Navigation links to main sections
- Notification indicators
- Logout functionality
- Responsive mobile menu

### `Dashboard.tsx`

**Purpose**: Main overview page with key metrics

**Features:**

- Lead summary statistics
- Recent message activity
- Upcoming appointments
- Quick action buttons
- Real-time data updates

## 📁 Lead Management Components

### `LeadManagement.tsx` ⭐ **CORE FEATURE**

**Purpose**: Main lead management interface

**Features:**

- Lead list with sorting and filtering
- Search functionality
- Bulk operations (import, export, delete)
- Lead status management
- Pagination for large datasets

**State Management:**

- Lead list data with caching
- Filter and search state
- Selection state for bulk operations

### `LeadList.tsx`

**Purpose**: Table/grid display of leads

**Features:**

- Sortable columns (name, status, last contact)
- Row selection for bulk actions
- Inline editing for quick updates
- Status indicators and badges
- Responsive table design

### `SingleLeadForm.tsx`

**Purpose**: Create/edit individual lead form

**Features:**

- Form validation with error handling
- Phone number formatting
- Lead status selection
- Save and cancel actions
- Auto-save drafts

### `BulkLeadForm.tsx`

**Purpose**: CSV import and bulk operations

**Features:**

- File upload with validation
- CSV preview and mapping
- Error handling and correction
- Progress tracking for large imports
- Import summary and results

## 📁 Messaging System Components

### `MessageCenter.tsx` ⭐ **CORE FEATURE**

**Purpose**: Main messaging interface hub

**Features:**

- Conversation list sidebar
- Active conversation display
- Message composition area
- Real-time message updates
- Conversation search and filtering

### `MessageThread.tsx` ⭐ **CRITICAL COMPONENT**

**Purpose**: Individual conversation view

**Features:**

- Chat history display
- Message bubbles (sent/received)
- Delivery status indicators
- AI response indicators
- Auto-scroll to latest messages
- Message timestamps

**State Management:**

- Message history with real-time updates
- Typing indicators
- Message sending states
- Error handling for failed messages

### `MessageInput.tsx`

**Purpose**: Text input for sending messages

**Features:**

- Text area with auto-resize
- Send button with loading states
- Character count display
- Enter key to send
- Draft message preservation

### `MessageList.tsx`

**Purpose**: Conversation list sidebar

**Features:**

- List of all conversations
- Unread message indicators
- Last message preview
- Contact name and avatar
- Search and filter conversations

### `MessageCalendar.tsx`

**Purpose**: Calendar view of message activity

**Features:**

- Monthly calendar display
- Message activity indicators
- Click to view day's messages
- Appointment overlays
- Activity heatmap

## 📁 Appointment Components

### `AppointmentsList.tsx`

**Purpose**: List view of all appointments

**Features:**

- Upcoming appointments display
- Past appointments history
- Appointment status indicators
- Quick reschedule actions
- Calendar integration links

### `AppointmentModal.tsx`

**Purpose**: Create/edit appointment dialog

**Features:**

- Date and time picker
- Appointment type selection
- Contact association
- Description and notes
- Conflict detection
- Save and cancel actions

## 📁 Settings & Configuration

### `Settings.tsx`

**Purpose**: User profile and system configuration

**Features:**

- Agent profile information
- AI assistant personality settings
- Business information
- Notification preferences
- Account management

**Sections:**

- Personal Information
- Business Details
- AI Configuration
- Notification Settings
- Account Security

### `SearchCriteriaModal.tsx`

**Purpose**: Client property preferences editor

**Features:**

- Price range sliders
- Bedroom/bathroom selectors
- Location preferences
- Property type checkboxes
- Save and apply criteria

## 📁 Authentication Components

### `Login.tsx`

**Purpose**: User authentication form

**Features:**

- Email/password input
- Form validation
- Error handling
- "Remember me" option
- Link to registration

### `Register.tsx`

**Purpose**: New user registration

**Features:**

- Account creation form
- Email verification
- Password strength validation
- Terms of service acceptance
- Success confirmation

### `ForgotPassword.tsx` & `ResetPassword.tsx`

**Purpose**: Password recovery flow

**Features:**

- Email input for reset request
- Token validation
- New password creation
- Success confirmation
- Return to login link

## 📁 Notification Components

### `NotificationsPage.tsx`

**Purpose**: Notification center and history

**Features:**

- Notification list display
- Mark as read/unread
- Notification filtering
- Bulk actions
- Auto-refresh for new notifications

## 📁 UI Components (`/ui`)

### `Button.tsx`

**Purpose**: Reusable button component

**Features:**

- Multiple variants (primary, secondary, danger)
- Size options (small, medium, large)
- Loading states with spinners
- Disabled states
- Icon support

**Usage:**

```typescript
<Button variant="primary" size="medium" loading={isSubmitting}>
  Save Changes
</Button>
```

## 🎨 Design System

### Styling Approach

- **TailwindCSS**: Utility-first styling
- **Component Classes**: Consistent design tokens
- **Responsive Design**: Mobile-first approach
- **Theme Colors**: Professional blue/gray palette

### Component Patterns

- **Loading States**: Consistent loading indicators
- **Error States**: User-friendly error messages
- **Empty States**: Helpful placeholder content
- **Form Validation**: Real-time validation feedback

## 🔧 Development Guidelines

### Component Structure

```typescript
interface ComponentProps {
  // Props interface
}

const Component: React.FC<ComponentProps> = ({ prop1, prop2 }) => {
  // Hooks and state
  // Event handlers
  // Render return
};

export default Component;
```

### State Management

- **Local State**: Use `useState` for component-specific data
- **Global State**: Use Context for shared data
- **API State**: Custom hooks for data fetching
- **Form State**: Controlled components with validation

### Performance

- **React.memo**: Memoize expensive components
- **useCallback**: Memoize event handlers
- **useMemo**: Memoize computed values
- **Lazy Loading**: Route-based code splitting
