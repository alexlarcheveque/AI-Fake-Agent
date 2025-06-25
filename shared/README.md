# Shared - Common Types and Utilities

The shared folder contains TypeScript types, interfaces, and utility functions that are used across both the backend and frontend applications. This ensures type safety and consistency across the entire RealNurture platform.

## 📁 Folder Structure

### `/types`

Shared TypeScript type definitions:

#### Domain Types

Types that represent core business entities:

- **Lead Types**: Lead entities, status enums, contact information interfaces
- **Message Types**: SMS message structure, conversation metadata, delivery status
- **Appointment Types**: Calendar event structure, scheduling preferences
- **User Types**: Agent profiles, authentication tokens, permission levels
- **Notification Types**: Alert structure, notification categories, read status

#### API Types

Request/response interfaces for API communication:

- **Request DTOs**: Data transfer objects for API requests
- **Response DTOs**: Standardized API response formats
- **Error Types**: Consistent error handling interfaces
- **Pagination Types**: List pagination and filtering interfaces

#### Integration Types

Types for external service integrations:

- **Twilio Types**: SMS webhook payloads, delivery status updates
- **OpenAI Types**: Chat completion interfaces, prompt structures
- **Supabase Types**: Database row types, authentication interfaces

## 🔧 Usage

### Backend Import

```typescript
import { LeadRow, MessageStatus, AppointmentType } from "../shared/types";
```

### Frontend Import

```typescript
import { LeadRow, MessageStatus, AppointmentType } from "../../shared/types";
```

## 📝 Type Conventions

### Naming Patterns

- **Entities**: Singular nouns (e.g., `Lead`, `Message`, `Appointment`)
- **Enums**: Descriptive names with context (e.g., `MessageStatus`, `LeadSource`)
- **Interfaces**: Descriptive names ending in interface type (e.g., `ApiResponse`, `CreateLeadRequest`)

### Database Types

- **Row Types**: Represent actual database table rows (e.g., `LeadRow`)
- **Insert Types**: For creating new records (e.g., `LeadInsert`)
- **Update Types**: For updating existing records (e.g., `LeadUpdate`)

### API Types

- **Request Types**: Incoming request payloads (e.g., `CreateLeadRequest`)
- **Response Types**: Outgoing response data (e.g., `LeadListResponse`)
- **DTO Types**: Data transfer objects for complex operations

## 🚀 Benefits

### Type Safety

- **Compile-time Checks**: Catch type mismatches before deployment
- **IntelliSense**: Better IDE autocompletion and error detection
- **Refactoring**: Safe renaming and restructuring across codebase

### Consistency

- **Shared Standards**: Same data structures across frontend and backend
- **Single Source of Truth**: One place to define business entities
- **API Contracts**: Clear interfaces between client and server

### Maintainability

- **Centralized Changes**: Update types in one place, reflect everywhere
- **Documentation**: Types serve as living documentation of data structures
- **Onboarding**: New developers can understand data flow quickly

## 🔄 Type Generation

### Database Types

Types are auto-generated from Supabase schema:

```bash
cd backend
npm run update-types  # Generates database.types.ts
```

### API Types

Manually maintained based on actual API endpoints and business requirements.

## 📚 Development Guidelines

### Adding New Types

1. **Location**: Add to appropriate subfolder in `/types`
2. **Naming**: Follow established naming conventions
3. **Documentation**: Include JSDoc comments for complex types
4. **Exports**: Update index files for easy importing

### Updating Existing Types

1. **Backward Compatibility**: Consider impact on existing code
2. **Migration**: Plan migration strategy for breaking changes
3. **Testing**: Update tests that rely on changed types
4. **Communication**: Document changes for team

### Best Practices

- **Optional Properties**: Use `?` for optional fields
- **Union Types**: Use unions for known sets of values
- **Generic Types**: Create reusable generic interfaces
- **Strict Types**: Avoid `any` type whenever possible
