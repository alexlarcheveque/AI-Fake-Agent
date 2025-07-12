require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function checkCalls() {
  console.log("🔍 Checking recent calls...");

  try {
    // Check recent calls
    const { data: calls, error } = await supabase
      .from("calls")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      console.error("❌ Error fetching calls:", error);
      return;
    }

    console.log(`📞 Found ${calls.length} recent calls:`);
    calls.forEach((call) => {
      console.log(
        `  Call ${call.id}: Lead ${call.lead_id}, Status: ${
          call.status
        }, Attempt: ${call.attempt_number}, Type: ${
          call.call_type
        }, Voicemail: ${call.is_voicemail}, Twilio SID: ${
          call.twilio_call_sid || "none"
        }, Created: ${call.created_at}`
      );
    });
  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }
}

checkCalls()
  .then(() => {
    console.log("\n✅ Debug check complete");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Script error:", err);
    process.exit(1);
  });
