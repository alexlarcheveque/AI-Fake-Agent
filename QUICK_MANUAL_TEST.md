# 📞 Quick Manual Voice Call Test

## 🎯 **Goal**: Make your first AI voice call in 10 minutes

### **Prerequisites** ✅

- [ ] Backend running (`npm run dev`)
- [ ] Frontend running
- [ ] Database migration completed
- [ ] ElevenLabs API key set

### **Step 1: Setup Test Lead** (2 minutes)

1. **Create a test lead** with **YOUR OWN phone number**
2. **Set lead type** to "buyer" or "seller"
3. **Enable AI Assistant** for this lead
4. **Note the Lead ID** (you'll need it)

### **Step 2: Configure Voice Settings** (3 minutes)

1. **Go to Settings page**
2. **Toggle "Enable Voice Calling" ON**
3. **Set calling hours** to include current time:
   - Start: 1 hour before current time
   - End: 1 hour after current time
4. **Select all days** of the week
5. **Choose any voice** from dropdown
6. **Save settings**

### **Step 3: Test Manual Call** (2 minutes)

1. **Open the test lead's MessageThread**
2. **Look for green "Call Lead" button**
3. **Click "Call Lead"**
4. **Verify button shows "Calling..."**
5. **Answer your phone when it rings**

### **Step 4: Verify Call Experience** (3 minutes)

1. **Listen to AI voice** speaking
2. **Verify script** mentions your name and lead type
3. **Let call complete** (or hang up after hearing voice)
4. **Check MessageThread** for new call entry
5. **Verify call shows** in timeline with status

---

## 🔧 **Quick Troubleshooting**

### **If Call Button Doesn't Work:**

```javascript
// Check browser console for errors
// Common fixes:
1. Refresh page and try again
2. Check if you're logged in
3. Verify Settings were saved
4. Check calling hours include current time
```

### **If No Call Received:**

```bash
# Check backend logs for errors
# Common issues:
1. Wrong phone number format
2. Twilio credentials incorrect
3. ElevenLabs API key missing
4. Outside calling hours
```

### **If Voice Doesn't Work:**

```bash
# Verify environment variables
echo $ELEVENLABS_API_KEY
echo $TWILIO_ACCOUNT_SID

# Check backend logs for API errors
```

---

## ✅ **Success Indicators**

### **You Know It's Working When:**

- [ ] ✅ No console errors in browser
- [ ] ✅ "Call Lead" button changes to "Calling..."
- [ ] ✅ Your phone rings within 10 seconds
- [ ] ✅ AI voice speaks your script
- [ ] ✅ Call appears in MessageThread timeline
- [ ] ✅ Call status shows in database

### **Expected Call Script:**

For a **buyer** lead named "John":

> "Hi John, this is [Agent Name] from [Company]. I hope you're having a great day. I'm calling because I see you're interested in buying a home in the area. I'd love to help you find the perfect property..."

For a **seller** lead named "Jane":

> "Hi Jane, this is [Agent Name] from [Company]. I hope you're doing well. I'm calling because I understand you're considering selling your home..."

---

## 🚨 **If Something Goes Wrong**

### **Check These In Order:**

1. **Backend console** - Any error messages?
2. **Browser console** - Any JavaScript errors?
3. **Database** - Did migration run successfully?
4. **Environment** - Are API keys set correctly?
5. **Twilio Console** - Any call logs or errors?
6. **Supabase Logs** - Any database errors?

### **Get Help:**

- Check the full `VOICE_CALLING_TEST_PLAN.md` for detailed troubleshooting
- Look at backend console logs for specific error messages
- Verify webhook URLs if using ngrok for local development

---

**🎉 Once this manual test works, your voice calling MVP is functional!**

Next steps:

- Test automated calling for new leads
- Configure advanced settings
- Set up production webhooks
