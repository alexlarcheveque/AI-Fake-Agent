// Quick script to check environment variables
import "dotenv/config";

console.log("🔍 Checking Twilio Environment Variables:");
console.log("=====================================");

const requiredVars = [
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
  "TWILIO_API_KEY",
  "TWILIO_API_SECRET",
  "TWILIO_APP_SID",
];

let allPresent = true;

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const status = value ? "✅" : "❌";
  const display = value ? `${value.substring(0, 8)}...` : "NOT SET";
  console.log(`${status} ${varName}: ${display}`);

  if (!value) allPresent = false;
});

console.log("=====================================");
if (allPresent) {
  console.log("✅ All required environment variables are set!");
} else {
  console.log("❌ Some environment variables are missing.");
  console.log("📖 See WEBRTC_SETUP.md for setup instructions.");
}
