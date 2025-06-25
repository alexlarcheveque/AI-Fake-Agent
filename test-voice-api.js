// Quick Voice Calling API Test Script
// Run with: node test-voice-api.js

const BASE_URL = "http://localhost:3000";
const AUTH_TOKEN = "YOUR_JWT_TOKEN_HERE"; // Replace with actual token

async function testVoiceAPI() {
  console.log("🧪 Testing Voice Calling API...\n");

  try {
    // Test 1: Health Check
    console.log("1️⃣ Testing health endpoint...");
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthData = await healthResponse.json();
    console.log("✅ Health:", healthData);

    // Test 2: Available Voices
    console.log("\n2️⃣ Testing available voices...");
    const voicesResponse = await fetch(`${BASE_URL}/api/calls/voices`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    if (voicesResponse.ok) {
      const voices = await voicesResponse.json();
      console.log(`✅ Found ${voices.length} available voices`);
      console.log("First voice:", voices[0]?.name || "None");
    } else {
      console.log("❌ Voices failed:", voicesResponse.status);
    }

    // Test 3: Calling Stats
    console.log("\n3️⃣ Testing calling statistics...");
    const statsResponse = await fetch(`${BASE_URL}/api/calls/stats`, {
      headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    });

    if (statsResponse.ok) {
      const stats = await statsResponse.json();
      console.log("✅ Stats:", stats);
    } else {
      console.log("❌ Stats failed:", statsResponse.status);
    }

    // Test 4: Voice Test (if you have a voice ID)
    console.log("\n4️⃣ Testing voice generation...");
    const testVoiceResponse = await fetch(`${BASE_URL}/api/calls/voices/test`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        voiceId: "21m00Tcm4TlvDq8ikWAM",
        sampleText: "Hello, this is a test of the voice calling system.",
      }),
    });

    if (testVoiceResponse.ok) {
      const testResult = await testVoiceResponse.json();
      console.log("✅ Voice test:", testResult);
    } else {
      console.log("❌ Voice test failed:", testVoiceResponse.status);
    }
  } catch (error) {
    console.error("❌ Test failed:", error.message);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  console.log(
    "📝 Update AUTH_TOKEN variable with your JWT token from browser dev tools"
  );
  console.log(
    "🚀 Make sure your backend is running on http://localhost:3000\n"
  );
  testVoiceAPI();
}

module.exports = { testVoiceAPI };
