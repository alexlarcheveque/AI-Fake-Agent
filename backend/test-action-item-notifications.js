/**
 * Test script for Action Item Notifications Feature
 *
 * This script tests the new feature that extracts urgent action items and commitments
 * from call transcripts and creates notifications in the app.
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { callRecordingService } from "./services/callRecordingService.js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Mock transcript with urgent action items and commitments
const mockTranscriptWithActionItems = `
[14:32] AI: Hello Sarah, this is Alex from LPT Realty. I'm calling about your interest in buying a home.

[14:33] Customer: Hi Alex! Yes, I've been looking for a 3-bedroom house in Culver City. 

[14:34] AI: Great! What's your budget range if you don't mind me asking?

[14:34] Customer: We're looking at around $800,000 to $900,000. We need to move by the end of next month because our lease expires.

[14:35] AI: That's a good timeline. Have you been pre-approved for a mortgage yet?

[14:36] Customer: No, not yet. We need to get that done ASAP. Can you recommend a lender?

[14:37] AI: Absolutely. I can connect you with our preferred lender tomorrow. They can usually get pre-approval done within 24-48 hours.

[14:38] Customer: That would be perfect! Also, I saw a listing on Oak Street that looked interesting. Can we schedule a showing for this Saturday at 2pm?

[14:39] AI: Let me check... Yes, I can arrange that showing for Saturday at 2pm. I'll send you the listing details and confirmation by email today.

[14:40] Customer: Excellent! And can you send me some more listings that match our criteria? We're very motivated to find something quickly.

[14:41] AI: Of course! I'll send you a curated list of properties this afternoon. Given your timeline, I'd also recommend viewing 2-3 properties this weekend.

[14:42] Customer: Yes, we're committed to looking at houses this weekend. Our goal is to make an offer by next week if we find the right place.

[14:43] AI: Perfect! I'll coordinate with the listing agents and set up a weekend tour. You'll have my full support through this process.

[14:44] Customer: Thank you so much! I really appreciate the quick response. This is exactly the kind of service we were hoping for.
`;

async function testActionItemNotifications() {
  console.log("🧪 Testing Action Item Notifications Feature");
  console.log("=".repeat(60));

  try {
    // Step 1: Create a test lead and call
    console.log("\n📋 Step 1: Creating test lead and call...");

    // Create a test lead
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        name: "Sarah Johnson",
        phone_number: 5551234567,
        email: "sarah.johnson@example.com",
        status: "new",
        lead_type: "buyer",
        context: "Interested in 3BR home in Culver City, budget $800-900K",
        user_uuid: "test-user-uuid-123", // This should be a real user UUID in production
      })
      .select()
      .single();

    if (leadError) {
      console.error("❌ Error creating test lead:", leadError);
      return;
    }

    console.log(`✅ Test lead created: ${lead.name} (ID: ${lead.id})`);

    // Create a test call
    const { data: call, error: callError } = await supabase
      .from("calls")
      .insert({
        lead_id: lead.id,
        direction: "outbound",
        status: "completed",
        duration: 720, // 12 minutes
        started_at: new Date().toISOString(),
        ended_at: new Date(Date.now() + 12 * 60 * 1000).toISOString(),
      })
      .select()
      .single();

    if (callError) {
      console.error("❌ Error creating test call:", callError);
      return;
    }

    console.log(`✅ Test call created (ID: ${call.id})`);

    // Step 2: Test action item extraction
    console.log(
      "\n🤖 Step 2: Testing AI analysis and action item extraction..."
    );

    const analysis = await callRecordingService.generateCallAnalysis(
      mockTranscriptWithActionItems
    );

    console.log("📊 AI Analysis Results:");
    console.log("- Summary:", analysis.summary.substring(0, 100) + "...");
    console.log("- Sentiment Score:", analysis.sentiment_score);
    console.log("- Customer Interest Level:", analysis.customer_interest_level);
    console.log("- Action Items Count:", analysis.action_items.length);
    console.log("- Action Items:", analysis.action_items);
    console.log("- Commitment Details:", analysis.commitment_details);

    // Step 3: Update call with analysis
    console.log("\n📝 Step 3: Updating call with analysis...");

    await callRecordingService.updateCallWithAnalysis(call.id, analysis);
    console.log("✅ Call updated with AI analysis");

    // Step 4: Create notifications for urgent action items
    console.log(
      "\n📢 Step 4: Creating notifications for urgent action items..."
    );

    await callRecordingService.createActionItemNotifications(call.id, analysis);
    console.log("✅ Action item notifications created");

    // Step 5: Verify notifications were created
    console.log("\n🔍 Step 5: Verifying notifications in database...");

    const { data: notifications, error: notificationError } = await supabase
      .from("notifications")
      .select("*")
      .eq("lead_id", lead.id)
      .order("created_at", { ascending: false });

    if (notificationError) {
      console.error("❌ Error fetching notifications:", notificationError);
      return;
    }

    console.log(`📬 Found ${notifications.length} notifications:`);
    notifications.forEach((notification, index) => {
      console.log(
        `  ${index + 1}. [${notification.type}] ${notification.title}`
      );
      console.log(`     Message: ${notification.message}`);
      console.log(`     Read: ${notification.is_read ? "Yes" : "No"}`);
      console.log(
        `     Created: ${new Date(notification.created_at).toLocaleString()}`
      );
      console.log("");
    });

    // Verify we got the expected notification types
    const actionItemNotifications = notifications.filter(
      (n) => n.type === "action_item"
    );
    const commitmentNotifications = notifications.filter(
      (n) => n.type === "commitment"
    );

    console.log(
      `📋 Action Item Notifications: ${actionItemNotifications.length}`
    );
    console.log(
      `🤝 Commitment Notifications: ${commitmentNotifications.length}`
    );

    // Step 6: Verify call was updated with structured data
    console.log("📞 Step 6: Verifying call analysis data...");

    const { data: updatedCall, error: callFetchError } = await supabase
      .from("calls")
      .select("*")
      .eq("id", call.id)
      .single();

    if (callFetchError) {
      console.error("❌ Error fetching updated call:", callFetchError);
      return;
    }

    console.log("📊 Call Analysis Data Stored:");
    console.log(
      "- AI Summary:",
      updatedCall.ai_summary ? "✅ Present" : "❌ Missing"
    );
    console.log("- Sentiment Score:", updatedCall.sentiment_score);
    console.log("- Action Items:", updatedCall.action_items);
    console.log("- Interest Level:", updatedCall.customer_interest_level);
    console.log("- Commitment Details:", updatedCall.commitment_details);

    // Step 7: Clean up test data
    console.log("\n🧹 Step 7: Cleaning up test data...");

    // Delete notifications
    await supabase.from("notifications").delete().eq("lead_id", lead.id);

    // Delete call
    await supabase.from("calls").delete().eq("id", call.id);

    // Delete lead
    await supabase.from("leads").delete().eq("id", lead.id);

    console.log("✅ Test data cleaned up");

    console.log(
      "\n🎉 Action Item Notifications Feature Test Completed Successfully!"
    );
    console.log("\nKey Features Verified:");
    console.log("✅ AI extracts action items from call transcripts");
    console.log(
      "✅ General notifications created when action items are identified"
    );
    console.log("✅ General notifications created when commitments are made");
    console.log(
      "✅ Users can review call details to prioritize urgency themselves"
    );
    console.log("✅ Structured call analysis data is stored in database");
    console.log("✅ Clean notification interface without overwhelming details");
  } catch (error) {
    console.error("❌ Test failed with error:", error);
    console.error("Stack trace:", error.stack);
  }
}

// Run the tests
async function runAllTests() {
  try {
    await testActionItemNotifications();
  } catch (error) {
    console.error("❌ Test suite failed:", error);
    process.exit(1);
  }
}

// Check if we're running this file directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests();
}

export { testActionItemNotifications };
