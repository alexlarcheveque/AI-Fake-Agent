// Quick script to check Stripe environment variables
import "dotenv/config";

console.log("🔍 Checking Stripe Environment Variables:");

const requiredVars = [
  "STRIPE_SECRET_KEY",
  "STRIPE_PRO_PRICE_ID",
  "STRIPE_UNLIMITED_PRICE_ID",
  "STRIPE_WEBHOOK_SECRET_LOCAL",
  "FRONTEND_URL",
];

let allPresent = true;

requiredVars.forEach((varName) => {
  const value = process.env[varName];
  const status = value ? "✅" : "❌";
  const display = value ? `${value.substring(0, 8)}...` : "NOT SET";
  console.log(`${status} ${varName}: ${display}`);

  if (!value) allPresent = false;
});

console.log(
  "\n" +
    (allPresent
      ? "✅ All Stripe variables are set!"
      : "❌ Some Stripe variables are missing!")
);

if (!allPresent) {
  console.log(
    "\n💡 Make sure to set all required Stripe environment variables:"
  );
  console.log("- STRIPE_SECRET_KEY: Your Stripe secret key");
  console.log("- STRIPE_PRO_PRICE_ID: Price ID for Pro plan");
  console.log("- STRIPE_UNLIMITED_PRICE_ID: Price ID for Unlimited plan");
  console.log(
    "- STRIPE_WEBHOOK_SECRET_LOCAL: Webhook secret for local development"
  );
  console.log("- FRONTEND_URL: Your frontend URL for redirects");
}
