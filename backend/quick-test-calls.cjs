require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function quickTestCalls() {
  console.log("🔍 Checking recent calls...");

  try {
    // Get the most recent calls
    const { data: calls, error } = await supabase
      .from("calls")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error) {
      console.error("❌ Error fetching calls:", error);
      return;
    }

    console.log(`📞 Found ${calls.length} recent calls:`);
    calls.forEach((call) => {
      console.log(`  Call ${call.id}:`);
      console.log(`    Lead: ${call.lead_id}`);
      console.log(`    Status: ${call.status}`);
      console.log(`    Attempt: ${call.attempt_number}`);
      console.log(`    Type: ${call.call_type}`);
      console.log(`    Twilio SID: ${call.twilio_call_sid || "none"}`);
      console.log(`    Created: ${call.created_at}`);
      console.log("");
    });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

quickTestCalls()
  .then(() => {
    console.log("✅ Quick test complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Script error:", err);
    process.exit(1);
  });
