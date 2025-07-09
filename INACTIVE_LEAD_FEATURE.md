# Enhanced Lead Inactivity Logic

## Overview

This feature automatically marks leads as "inactive" when they don't respond to communication attempts or when communication attempts fail repeatedly. The system now tracks both **messages AND calls** and considers both **no response** and **failure** scenarios.

## When Leads Are Marked as Inactive

A lead will be automatically marked as "inactive" when **either** of these conditions is met:

### 1. No Response (10 consecutive attempts)

- The lead hasn't responded to 10 consecutive messages/calls from the agent
- Counts both text messages and phone calls as communication attempts
- Counter resets when the lead responds to any communication

### 2. Communication Failures (10 consecutive failures)

- 10 consecutive messages/calls fail to be delivered/completed
- **Message failures**: Messages with `delivery_status = "failed"`
- **Call failures**: Calls with status `"failed"`, `"busy"`, `"no-answer"`, or `"canceled"`
- Counter resets when any successful communication is sent

## How It Works

### Communication Timeline

The system creates a chronological timeline of all communications (messages + calls) and analyzes:

1. **Consecutive No-Response Count**: How many agent communications since the last lead response
2. **Consecutive Failure Count**: How many consecutive communications failed from the most recent backwards

### Examples

#### Scenario 1: No Response ✅ → Inactive

```
Agent: Message 1 (delivered)
Agent: Message 2 (delivered)
Agent: Call 1 (completed - no human answer)
Agent: Message 3 (delivered)
... (6 more successful attempts with no lead response)
Agent: Message 10 (delivered) ← 10th consecutive attempt without response
→ Lead marked as INACTIVE
```

#### Scenario 2: Consecutive Failures ✅ → Inactive

```
Agent: Message 1 (failed)
Agent: Call 1 (failed)
Agent: Message 2 (failed)
Agent: Call 2 (no-answer)
Agent: Message 3 (failed)
... (5 more failed attempts)
Agent: Call 5 (busy) ← 10th consecutive failure
→ Lead marked as INACTIVE
```

#### Scenario 3: Mixed Success/Failure ❌ → Stays Active

```
Agent: Message 1 (delivered)
Agent: Call 1 (failed)
Agent: Message 2 (delivered)
Agent: Call 2 (completed)
Agent: Message 3 (failed)
→ Lead stays ACTIVE (not 10 consecutive failures)
```

#### Scenario 4: Lead Responds ❌ → Stays Active

```
Agent: Message 1 (delivered)
Agent: Message 2 (delivered)
Agent: Call 1 (no-answer)
Lead: "Thanks for reaching out!" ← Response resets counter
Agent: Message 3 (delivered)
... (would need 10 more attempts after this response)
→ Lead stays ACTIVE
```

## Implementation Details

### Key Function

- **`updateLeadStatusBasedOnCommunications(leadId)`**: Main function that analyzes all communications and updates lead status

### Automatic Triggers

The lead status is automatically checked and updated when:

- A message is delivered/failed (via Twilio webhook)
- A call completes/fails (via call completion handlers)
- Any scheduled communication is processed

### Backwards Compatibility

- Old function `updateLeadStatusBasedOnMessages()` still exists but delegates to the new comprehensive function
- Existing code continues to work without changes

## Files Modified

### Backend Services

- `backend/services/leadService.ts` - Core logic for lead status tracking
- `backend/services/callService.ts` - Added lead status updates after call completion
- `backend/services/realtimeVoiceService.ts` - Added lead status updates for real-time calls
- `backend/services/orchestrator/messagingOrchestrator.ts` - Updated to use new function
- `backend/controllers/messageController.ts` - Updated to use new function
- `backend/services/messageService.ts` - Updated to use new function

### Test File

- `backend/test-inactive-lead-logic.js` - Comprehensive test suite for the new logic

## Testing

Run the test script to validate the functionality:

```bash
cd backend
node test-inactive-lead-logic.js
```

The test covers:

1. ✅ 10 consecutive failed messages → Inactive
2. ✅ 10 consecutive no-answer calls → Inactive
3. ✅ Mixed success/failure → Stays Active

## Configuration

The threshold is currently hardcoded to **10 consecutive attempts**. To modify:

1. Find this line in `backend/services/leadService.ts`:

   ```typescript
   if (consecutiveNoResponse >= 10 || consecutiveFailures >= 10) {
   ```

2. Change `10` to your desired threshold

## Status Transitions

```
NEW → IN_CONVERSATION → INACTIVE
 ↓           ↓             ↓
[First response] [10 failures/no-response] [Manual override]
```

- **NEW**: Lead has never responded
- **IN_CONVERSATION**: Lead has responded at least once
- **INACTIVE**: 10+ consecutive failures OR 10+ consecutive non-responses
- **CONVERTED**: Terminal status (not auto-updated)

## Logging

The system provides detailed logging for debugging:

```
INFO: Marking lead 123 as inactive due to: 10 consecutive communication failures
INFO: Marking lead 456 as inactive due to: 12 consecutive attempts without response
INFO: Updated lead status for lead 789 after call completion
```

## Future Enhancements

Potential improvements:

- Configurable thresholds per user/plan
- Different thresholds for messages vs calls
- Time-based decay (e.g., reset counters after X days)
- Lead reactivation logic
- Dashboard analytics for inactive leads
