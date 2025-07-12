// Test script to debug checkout session creation
import "dotenv/config";
import stripeService from "./services/stripeService.ts";

async function testCheckout() {
  try {
    console.log("🧪 Testing checkout session creation...");

    // Test user ID (replace with a real one from your database)
    const testUserId = "5b61b5ca-1369-42bd-abcb-de7b10c9f670";
    const planType = "PRO";
    const successUrl = "https://your-app.com/settings?success=true&plan=PRO";
    const cancelUrl = "https://your-app.com/settings?canceled=true";

    console.log(`Creating checkout session for user: ${testUserId}`);
    console.log(`Plan: ${planType}`);

    const checkoutUrl = await stripeService.createCheckoutSession(
      testUserId,
      planType,
      successUrl,
      cancelUrl
    );

    console.log("✅ Success! Checkout URL:", checkoutUrl);
    console.log("URL type:", typeof checkoutUrl);
    console.log("URL length:", checkoutUrl.length);
  } catch (error) {
    console.error("❌ Error:", error.message);
    console.error("Full error:", error);
  }
}

testCheckout();
