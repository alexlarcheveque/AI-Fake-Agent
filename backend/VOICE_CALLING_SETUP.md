# Voice Calling Feature Setup Guide

## 🎯 Overview

This document outlines the complete setup for the AI voice calling feature that integrates with your existing CRM system.

## ✅ Completed Backend Infrastructure

### 1. Database Schema

- ✅ **New Tables Created:**
  - `calls` - Stores call records with status, duration, AI summary, etc.
  - `call_recordings` - Stores recording metadata and Supabase storage paths
- ✅ **Enhanced Existing Tables:**
  - `leads` - Added `voice_calling_enabled`, `last_call_attempt`
  - `user_settings` - Added voice calling configuration fields

### 2. Backend Services

- ✅ **ElevenLabs Service** (`elevenlabsService.ts`) - AI voice generation
- ✅ **Twilio Voice Service** (`twilioVoiceService.ts`) - Call management and webhooks
- ✅ **Voice Calling Orchestrator** (`voiceCallingOrchestrator.ts`) - Business logic and scheduling
- ✅ **Cron Jobs** - Automated calling for new and inactive leads

### 3. API Endpoints

- ✅ **Call Management:** `/api/calls/leads/:leadId/call` (POST) - Manual call initiation
- ✅ **Call History:** `/api/calls/leads/:leadId` (GET) - Get calls for a lead
- ✅ **Webhooks:** Twilio voice, status, and recording callbacks
- ✅ **Voice Settings:** Get available voices, test voices
- ✅ **Statistics:** Calling stats and analytics

### 4. Models & Types

- ✅ **Call Model** (`Call.ts`) - Type definitions and helper functions
- ✅ **Call Recording Model** (`CallRecording.ts`) - Recording management

## 🚀 Quick Setup Instructions

### 1. Run Database Migration

Execute this SQL in your Supabase SQL editor:

```bash
# Run the migration script
psql -f backend/scripts/voice_calling_migration.sql
```

### 2. Install Dependencies

```bash
cd backend
npm install elevenlabs
```

### 3. Environment Variables

Add these to your `.env` file:

```env
# ElevenLabs Configuration
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Twilio Voice (you likely already have these)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Backend URL for webhooks
BACKEND_URL=https://your-backend-domain.com
```

### 4. Supabase Storage Setup

Create a storage bucket for call recordings:

1. Go to Supabase Storage
2. Create bucket named `call-recordings`
3. Set appropriate permissions for authenticated users

## 🎯 How It Works

### Call Flow

1. **Trigger:** New lead created OR inactive lead identified OR manual call button
2. **Validation:** Check calling hours, quarterly limits, lead preferences
3. **Script Generation:** Dynamic script based on lead type and call purpose
4. **Twilio Call:** Initiate call with AI-generated script
5. **Recording:** Automatic recording with Supabase storage
6. **Fallback:** SMS sent if call fails or reaches voicemail
7. **Analytics:** Call summary with sentiment analysis

### Call Types

- **New Lead:** Qualification and rapport building
- **Follow Up:** Continue previous conversations
- **Reactivation:** Re-engage inactive leads (quarterly limit applies)

### Business Rules

- **Calling Hours:** 11 AM - 7 PM (configurable per user)
- **Retry Logic:** 2 attempts with 5-minute intervals
- **Quarterly Limits:** 1 call per inactive lead per quarter
- **Fallback SMS:** Sent after failed calls

## 🎨 Frontend Integration Needed

### 1. Update MessageThread Component

- [ ] Rename `MessageThread.tsx` to `CommunicationThread.tsx`
- [ ] Add call history alongside messages in chronological order
- [ ] Add call playback controls inline with messages
- [ ] Add manual call initiation button
- [ ] Display call status, duration, and AI summaries

### 2. Enhanced Settings Page

- [ ] Add Voice Calling section with:
  - Global voice calling enable/disable
  - Calling hours configuration
  - Voice selection from ElevenLabs
  - Quarterly call limits
  - Retry attempt settings
  - Voice testing functionality

### 3. Lead Management

- [ ] Add voice calling toggle per lead
- [ ] Show call history in lead details
- [ ] Manual call button with status feedback

### 4. Dashboard Analytics

- [ ] Call statistics widgets
- [ ] Success rate metrics
- [ ] Voice calling performance charts

## 📋 Next Steps

### Immediate (Required for MVP)

1. **Run Database Migration** - Execute `voice_calling_migration.sql`
2. **Set Environment Variables** - ElevenLabs and Twilio configuration
3. **Frontend Integration** - Update MessageThread and Settings components
4. **Testing** - Manual call initiation and webhook handling

### Phase 2 (Enhancements)

1. **AI Summaries** - OpenAI integration for call transcription analysis
2. **Sentiment Analysis** - Enhance lead scoring based on call sentiment
3. **Advanced Analytics** - Conversion tracking and ROI metrics
4. **Custom Voice Training** - User-specific voice cloning with ElevenLabs

## 🔧 API Usage Examples

### Manual Call Initiation

```javascript
// Frontend call to initiate a voice call
const response = await fetch("/api/calls/leads/123/call", {
  method: "POST",
  headers: { Authorization: `Bearer ${token}` },
});
```

### Get Call History

```javascript
// Get all calls for a lead
const calls = await fetch("/api/calls/leads/123", {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Voice Testing

```javascript
// Test an ElevenLabs voice
const response = await fetch("/api/calls/voices/test", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    voiceId: "voice_id_here",
    sampleText: "Hello, this is a test call.",
  }),
});
```

## ⚠️ Important Notes

1. **Webhook URLs:** Ensure your backend is accessible by Twilio for webhooks
2. **ngrok for Development:** Use ngrok for local development webhook testing
3. **Rate Limits:** ElevenLabs has API rate limits - monitor usage
4. **Call Costs:** Twilio voice calls cost more than SMS - implement safeguards
5. **Compliance:** Ensure compliance with calling regulations in your regions

## 🐛 Troubleshooting

### Common Issues

1. **Webhook Not Receiving:** Check ngrok/public URL accessibility
2. **Voice Generation Fails:** Verify ElevenLabs API key and quota
3. **Calls Not Initiating:** Check Twilio credentials and phone number verification
4. **Database Errors:** Ensure migration ran successfully

### Debug Endpoints

- `GET /api/calls/stats` - View calling statistics
- `GET /api/calls/voices` - List available voices
- Check server logs for detailed error information

---

**🎉 Status:** Backend infrastructure complete! Ready for frontend integration and testing.
