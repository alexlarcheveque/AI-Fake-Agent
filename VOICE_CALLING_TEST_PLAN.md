# Voice Calling Feature - Testing Plan

## 🎯 **Testing Overview**

This guide covers testing the complete voice calling feature from basic setup to end-to-end functionality.

## ✅ **Phase 1: Database & Environment Setup**

### **1.1 Verify Database Migration**

```sql
-- Run in Supabase SQL Editor to verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('calls', 'call_recordings');

-- Verify new columns in existing tables
SELECT column_name FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('last_call_attempt', 'voice_calling_enabled');

SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_settings'
AND column_name IN ('voice_calling_enabled', 'elevenlabs_voice_id');
```

### **1.2 Environment Variables Check**

```bash
# Verify these are set in your .env file
echo $ELEVENLABS_API_KEY
echo $ELEVENLABS_DEFAULT_VOICE_ID
echo $TWILIO_ACCOUNT_SID
echo $TWILIO_AUTH_TOKEN
echo $TWILIO_PHONE_NUMBER
```

### **1.3 Supabase Storage Setup**

- [ ] Create `call-recordings` bucket in Supabase Storage
- [ ] Set bucket permissions for authenticated users
- [ ] Test file upload permissions

---

## ✅ **Phase 2: Backend API Testing**

### **2.1 Test Available Voices Endpoint**

```bash
# Test voice fetching (replace with your backend URL)
curl -X GET "http://localhost:3000/api/calls/voices" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: Array of ElevenLabs voices
```

### **2.2 Test Voice Testing Endpoint**

```bash
# Test voice generation
curl -X POST "http://localhost:3000/api/calls/voices/test" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "sampleText": "Hello, this is a test call"
  }'

# Expected: {"success": true, "audioSize": XXXX}
```

### **2.3 Test Manual Call Initiation**

```bash
# Test call initiation (replace LEAD_ID)
curl -X POST "http://localhost:3000/api/calls/leads/LEAD_ID/call" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: {"message": "Call initiated successfully", "callId": XXX}
```

### **2.4 Test Call History**

```bash
# Test call retrieval
curl -X GET "http://localhost:3000/api/calls/leads/LEAD_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: Array of call records
```

### **2.5 Test Calling Statistics**

```bash
# Test stats endpoint
curl -X GET "http://localhost:3000/api/calls/stats" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Expected: Stats object with today/quarter data
```

---

## ✅ **Phase 3: Frontend Integration Testing**

### **3.1 Settings Page Testing**

- [ ] **Navigate to Settings page**
- [ ] **Voice Calling section appears**
- [ ] **Toggle voice calling ON**
- [ ] **Verify calling hours dropdowns work**
- [ ] **Verify day selection checkboxes work**
- [ ] **Verify voice dropdown populates**
- [ ] **Test voice testing button**
- [ ] **Save settings successfully**
- [ ] **Verify statistics section appears**

### **3.2 MessageThread Testing**

- [ ] **Open a lead's MessageThread**
- [ ] **Verify "Call Lead" button appears**
- [ ] **Click "Call Lead" button**
- [ ] **Verify loading state ("Calling...")**
- [ ] **Verify success/error messages appear**
- [ ] **Verify call appears in timeline**

### **3.3 Call Display Testing**

- [ ] **Calls show with correct icons**
- [ ] **Call status badges display properly**
- [ ] **Call duration formatting works**
- [ ] **Call types show correctly**
- [ ] **Playback controls work (if recordings exist)**

---

## ✅ **Phase 4: End-to-End Voice Calling Flow**

### **4.1 Manual Call Testing**

1. **Setup**: Create a test lead with your own phone number
2. **Configure Settings**:
   - Enable voice calling
   - Set calling hours to current time
   - Select a voice
   - Set retry attempts to 1
3. **Initiate Call**:
   - Go to MessageThread
   - Click "Call Lead"
   - Answer your phone
4. **Verify Call Experience**:
   - AI voice speaks
   - Script is appropriate for lead type
   - Call is recorded
5. **Check Results**:
   - Call appears in timeline
   - Call status updates correctly
   - Recording is available (if supported)

### **4.2 Automated Call Testing**

1. **Create New Lead**:
   - Add lead with voice calling enabled
   - Verify cron job processes it (within 30 minutes)
2. **Check Inactive Lead Process**:
   - Mark a lead as "inactive"
   - Wait for daily cron job (or trigger manually)

### **4.3 Webhook Testing**

1. **Setup ngrok** (for local development):
   ```bash
   ngrok http 3000
   ```
2. **Update webhook URLs** in your code to ngrok URL
3. **Verify webhooks receive**:
   - Call status updates
   - Recording callbacks
   - Proper database updates

---

## ✅ **Phase 5: Error Handling & Edge Cases**

### **5.1 Test Calling Restrictions**

- [ ] **Outside calling hours**: Should prevent calls
- [ ] **Disabled days**: Should prevent calls
- [ ] **Quarterly limits**: Should prevent excess calls
- [ ] **Voice calling disabled**: Should prevent calls

### **5.2 Test Error Scenarios**

- [ ] **Invalid lead ID**: Should return proper error
- [ ] **ElevenLabs API down**: Should handle gracefully
- [ ] **Twilio API down**: Should handle gracefully
- [ ] **No voice selected**: Should use default or error

### **5.3 Test Retry Logic**

- [ ] **Failed call triggers retry**: After 5 minutes
- [ ] **Max retries reached**: Should send SMS fallback
- [ ] **Voicemail detection**: Should handle appropriately

---

## 🚀 **Quick Start Testing (Recommended)**

### **Step 1: Basic Setup Test**

```bash
# 1. Check if backend starts without errors
npm run dev

# 2. Check if new API endpoints respond
curl http://localhost:3000/api/calls/voices

# 3. Verify Settings page loads without errors
```

### **Step 2: Settings Page Test**

1. Open Settings page
2. Enable voice calling
3. Configure basic settings
4. Test voice selection
5. Save settings

### **Step 3: Simple Manual Call Test**

1. Use your own phone number as test lead
2. Enable voice calling for that lead
3. Click "Call Lead" button
4. Answer your phone
5. Verify call experience

### **Step 4: Verify Data Flow**

1. Check call appears in database
2. Check call shows in MessageThread
3. Check statistics update
4. Check webhook logs

---

## 🐛 **Common Issues & Solutions**

### **Backend Issues**

- **"elevenlabs not found"**: Run `npm install elevenlabs`
- **Voice API fails**: Check ELEVENLABS_API_KEY is valid
- **Twilio errors**: Verify Twilio credentials and phone number

### **Frontend Issues**

- **Settings don't save**: Check API endpoint connectivity
- **Call button doesn't work**: Check authentication token
- **Voice dropdown empty**: Check ElevenLabs API connectivity

### **Call Issues**

- **Calls don't initiate**: Check calling hours and restrictions
- **No webhooks received**: Check ngrok URL and Twilio config
- **Recordings missing**: Check Supabase storage setup

---

## 📊 **Success Criteria**

### **MVP Complete When:**

- [ ] Settings page allows full voice configuration
- [ ] Manual calls can be initiated from MessageThread
- [ ] Calls appear in unified communication timeline
- [ ] Call recordings play back correctly
- [ ] Automated calling processes new leads
- [ ] Error handling works gracefully
- [ ] Statistics display correctly

---

## 🎯 **Testing Checklist**

### **Critical Path (Must Work)**

- [ ] Database migration successful
- [ ] Settings page configuration works
- [ ] Manual call initiation works
- [ ] Calls display in MessageThread
- [ ] Basic error handling works

### **Advanced Features (Should Work)**

- [ ] Automated new lead calling
- [ ] Quarterly inactive lead limits
- [ ] Call recording playback
- [ ] Webhook processing
- [ ] Retry logic and SMS fallback

### **Polish Features (Nice to Have)**

- [ ] Real-time call status updates
- [ ] Advanced statistics
- [ ] Sentiment analysis display
- [ ] Voice testing functionality

---

**🎉 Ready to start testing! Begin with Phase 1 and work your way through each phase systematically.**
