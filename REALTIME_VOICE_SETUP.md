# WebRTC + OpenAI Realtime Voice Calling

This application now uses a **simplified, single approach** for all voice calling:

- **WebRTC calling** via Twilio
- **OpenAI Realtime AI** using the official `@openai/agents/realtime` library
- **No traditional phone calls** - everything is WebRTC

## Architecture

```
User (Browser) → Twilio WebRTC → Twilio Media Streams → Our Backend → OpenAI Realtime API
```

## Key Components

### Backend

1. **`/backend/services/realtimeVoiceService.ts`**

   - Uses official `@openai/agents/realtime` library
   - Creates `RealtimeAgent` with real estate agent instructions
   - Handles Twilio WebSocket connections via `TwilioRealtimeTransportLayer`

2. **`/backend/controllers/callController.ts`**

   - `handleIncomingCall()` - Processes Twilio webhooks
   - `handleRealtimeWebSocket()` - Manages WebSocket connections
   - `generateRealtimeTwiML()` - Creates TwiML for WebRTC calls

3. **`/backend/routes/callRoutes.ts`**
   - `POST /api/voice/incoming` - Twilio webhook endpoint
   - `WS /api/voice/realtime` - WebSocket for media streams

### Frontend

- All voice calling UI has been simplified
- Calls are initiated through Twilio's WebRTC client
- No manual call initiation needed - handled via webhooks

## Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1...

# Ngrok (for development)
NGROK_URL=wss://your-ngrok-url.ngrok-free.app
```

## How It Works

1. **Call Initiation**: User makes WebRTC call via Twilio
2. **Webhook**: Twilio sends webhook to `/api/voice/incoming`
3. **TwiML Response**: Backend returns TwiML with WebSocket URL
4. **Media Stream**: Twilio connects to WebSocket at `/api/voice/realtime`
5. **AI Agent**: OpenAI Realtime Agent handles the conversation
6. **Real-time Audio**: Bidirectional audio streaming via WebRTC

## Benefits of This Approach

- ✅ **Simplified**: One voice calling method instead of multiple
- ✅ **Official Library**: Uses OpenAI's official agents library
- ✅ **Real-time**: Low latency voice conversations
- ✅ **WebRTC**: Better audio quality than traditional calls
- ✅ **Scalable**: No phone number limitations

## Removed Components

All old voice calling approaches have been removed:

- ElevenLabs integration
- Traditional Twilio voice calls
- Voice calling orchestrator
- Cron job scheduling for calls
- Call analytics and recordings
- Multiple voice calling options

## Testing

The system automatically handles incoming calls. To test:

1. Start the development server: `npm start`
2. Ensure ngrok is running and webhook is configured in Twilio
3. Make a WebRTC call via the frontend
4. The AI agent will automatically respond

## Configuration

The AI agent is configured in `realtimeVoiceService.ts` with:

- Real estate agent personality
- Conversation guidelines
- Voice settings (using 'alloy' voice)
- Optional tools for appointment scheduling
