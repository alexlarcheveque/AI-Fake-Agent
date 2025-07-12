import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { updateLeadStatusBasedOnCommunications } from "./services/leadService.ts";

// Test script to validate the new lead inactivity logic
// This tests the enhanced lead status tracking that considers both messages and calls

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testInactiveLeadLogic() {
  console.log("🧪 Testing Enhanced Lead Inactivity Logic");
  console.log("=" * 50);

  try {
    // Find a test lead or create one
    const { data: leads, error: leadsError } = await supabase
      .from("leads")
      .select("*")
      .limit(1);

    if (leadsError || !leads || leads.length === 0) {
      console.log("❌ No leads found for testing");
      return;
    }

    const testLead = leads[0];
    console.log(`📋 Testing with lead: ${testLead.id} (${testLead.name})`);
    console.log(`📊 Current status: ${testLead.status}`);

    // Test Scenario 1: Create 10 consecutive failed messages
    console.log("\n🔬 Test Scenario 1: 10 consecutive failed messages");
    console.log("-".repeat(40));

    const failedMessages = [];
    for (let i = 1; i <= 10; i++) {
      const { data: message } = await supabase
        .from("messages")
        .insert({
          lead_id: testLead.id,
          sender: "agent",
          text: `Test failed message ${i}`,
          delivery_status: "failed",
          error_code: "TEST_FAILURE",
          error_message: "Test failure for inactivity logic",
          is_ai_generated: true,
          created_at: new Date(Date.now() + i * 1000).toISOString(), // Stagger timestamps
        })
        .select()
        .single();

      failedMessages.push(message);
      console.log(`📧 Created failed message ${i}/10`);
    }

    // Update lead status and check result
    console.log("\n🔄 Updating lead status...");
    const updatedLead1 = await updateLeadStatusBasedOnCommunications(
      testLead.id
    );
    console.log(
      `📈 Lead status after 10 failed messages: ${updatedLead1.status}`
    );

    if (updatedLead1.status === "inactive") {
      console.log(
        "✅ SUCCESS: Lead correctly marked as inactive due to 10 consecutive failures"
      );
    } else {
      console.log(
        "❌ FAILURE: Lead should be inactive but is: " + updatedLead1.status
      );
    }

    // Clean up test messages
    for (const msg of failedMessages) {
      await supabase.from("messages").delete().eq("id", msg.id);
    }

    // Reset lead status
    await supabase
      .from("leads")
      .update({ status: "new" })
      .eq("id", testLead.id);

    // Test Scenario 2: Create 10 consecutive calls with no response
    console.log("\n🔬 Test Scenario 2: 10 consecutive calls with no response");
    console.log("-".repeat(40));

    const noResponseCalls = [];
    for (let i = 1; i <= 10; i++) {
      const { data: call } = await supabase
        .from("calls")
        .insert({
          lead_id: testLead.id,
          direction: "outbound",
          status: "no-answer",
          to_number: testLead.phone_number.toString(),
          from_number: process.env.TWILIO_PHONE_NUMBER,
          call_type: "follow_up",
          call_mode: "ai",
          attempt_number: i,
          created_at: new Date(Date.now() + (i + 20) * 1000).toISOString(), // After messages
        })
        .select()
        .single();

      noResponseCalls.push(call);
      console.log(`📞 Created no-answer call ${i}/10`);
    }

    // Update lead status and check result
    console.log("\n🔄 Updating lead status...");
    const updatedLead2 = await updateLeadStatusBasedOnCommunications(
      testLead.id
    );
    console.log(
      `📈 Lead status after 10 no-answer calls: ${updatedLead2.status}`
    );

    if (updatedLead2.status === "inactive") {
      console.log(
        "✅ SUCCESS: Lead correctly marked as inactive due to 10 consecutive no-response attempts"
      );
    } else {
      console.log(
        "❌ FAILURE: Lead should be inactive but is: " + updatedLead2.status
      );
    }

    // Clean up test calls
    for (const call of noResponseCalls) {
      await supabase.from("calls").delete().eq("id", call.id);
    }

    // Reset lead status
    await supabase
      .from("leads")
      .update({ status: "new" })
      .eq("id", testLead.id);

    // Test Scenario 3: Mix of successful and failed attempts (should NOT be inactive)
    console.log(
      "\n🔬 Test Scenario 3: Mixed success/failure (should remain active)"
    );
    console.log("-".repeat(40));

    const mixedCommunications = [];

    // Create 5 successful messages
    for (let i = 1; i <= 5; i++) {
      const { data: message } = await supabase
        .from("messages")
        .insert({
          lead_id: testLead.id,
          sender: "agent",
          text: `Test successful message ${i}`,
          delivery_status: "delivered",
          is_ai_generated: true,
          created_at: new Date(Date.now() + (i + 40) * 1000).toISOString(),
        })
        .select()
        .single();

      mixedCommunications.push(message);
    }

    // Create 5 failed calls
    for (let i = 1; i <= 5; i++) {
      const { data: call } = await supabase
        .from("calls")
        .insert({
          lead_id: testLead.id,
          direction: "outbound",
          status: "failed",
          to_number: testLead.phone_number.toString(),
          from_number: process.env.TWILIO_PHONE_NUMBER,
          call_type: "follow_up",
          call_mode: "ai",
          attempt_number: i,
          created_at: new Date(Date.now() + (i + 45) * 1000).toISOString(),
        })
        .select()
        .single();

      mixedCommunications.push(call);
    }

    console.log("📧📞 Created 5 successful messages + 5 failed calls");

    // Update lead status and check result
    console.log("\n🔄 Updating lead status...");
    const updatedLead3 = await updateLeadStatusBasedOnCommunications(
      testLead.id
    );
    console.log(`📈 Lead status after mixed attempts: ${updatedLead3.status}`);

    if (updatedLead3.status !== "inactive") {
      console.log(
        "✅ SUCCESS: Lead correctly remains active with mixed success/failure"
      );
    } else {
      console.log(
        "❌ FAILURE: Lead should NOT be inactive with mixed results but is: " +
          updatedLead3.status
      );
    }

    // Clean up test data
    console.log("\n🧹 Cleaning up test data...");
    for (const comm of mixedCommunications) {
      if (comm.sender) {
        // It's a message
        await supabase.from("messages").delete().eq("id", comm.id);
      } else {
        // It's a call
        await supabase.from("calls").delete().eq("id", comm.id);
      }
    }

    // Reset lead to original status
    await supabase
      .from("leads")
      .update({ status: testLead.status })
      .eq("id", testLead.id);

    console.log("✅ Test completed and cleaned up");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testInactiveLeadLogic()
  .then(() => {
    console.log("\n🏁 Test execution completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Test execution failed:", error);
    process.exit(1);
  });
