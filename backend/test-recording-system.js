import "dotenv/config";
import { callRecordingService } from "./services/callRecordingService.ts";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testRecordingSystem() {
  console.log("🧪 Testing Call Recording and Highlights System\n");

  // First, get an existing lead
  const { data: leads, error: leadError } = await supabase
    .from("leads")
    .select("id")
    .limit(1);

  if (leadError || !leads || leads.length === 0) {
    console.error("❌ No leads found to test with:", leadError);
    return;
  }

  const testLeadId = leads[0].id;
  console.log(`📞 Using lead ID ${testLeadId} for test`);

  // Test 1: Create a test call
  console.log("📞 Creating test call...");

  const { data: testCall, error: callError } = await supabase
    .from("calls")
    .insert({
      direction: "outbound",
      status: "completed",
      from_number: "+15551234567",
      to_number: "+15559876543",
      started_at: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      ended_at: new Date().toISOString(),
      duration: 180, // 3 minutes
      lead_id: testLeadId,
    })
    .select()
    .single();

  if (callError) {
    console.error("❌ Error creating test call:", callError);
    return;
  }

  console.log("✅ Test call created:", testCall.id);

  // Test 2: Simulate a transcript for analysis
  const mockTranscript = `[10:00:00] AI: Hi, this is Sarah from LPT Realty. I was calling to see if you were interested in selling your home.
[10:00:05] Customer: Oh, hi Sarah. Actually, I have been thinking about selling recently.
[10:00:15] AI: That's great to hear! What's got you thinking about potentially selling?
[10:00:20] Customer: Well, we're looking to downsize. The kids have moved out and this house is just too big now.
[10:00:30] AI: I totally understand that. How long have you been in your current home?
[10:00:35] Customer: About 15 years now. We love the neighborhood but it's time for a change.
[10:00:45] AI: That's wonderful that you've enjoyed the area. Have you had your home valued recently?
[10:00:50] Customer: No, I haven't. I'm a bit concerned about the current market though.
[10:01:00] AI: I completely get that concern. Actually, homes in your area have been moving really well lately. I'd love to get you a no-obligation market analysis.
[10:01:10] Customer: That sounds helpful. Yes, I'd be interested in that.
[10:01:15] AI: Perfect! I can schedule that for next week. What's your timeline looking like? No rush at all, just curious.
[10:01:25] Customer: We're thinking maybe in the next 3-6 months if the numbers work out.
[10:01:35] AI: That's a great timeline. I'll call you back in a couple days with that market analysis.
[10:01:40] Customer: Sounds good, thank you Sarah.`;

  console.log("\n🤖 Testing AI analysis generation...");

  try {
    // Test 3: Skip the audio transcription and directly test the analysis
    const analysis = await callRecordingService.generateCallAnalysis(
      mockTranscript
    );
    console.log("✅ AI Analysis generated:", {
      summary: analysis.summary,
      highlightsCount: analysis.highlights.length,
      sentimentScore: analysis.sentiment_score,
      topicsCount: analysis.key_topics.length,
      actionItemsCount: analysis.action_items.length,
    });

    // Test 4: Update the call with analysis
    await callRecordingService.updateCallWithAnalysis(testCall.id, analysis);

    // Test 5: Create recording record
    await callRecordingService.createRecordingRecord(
      testCall.id,
      "https://example.com/mock-recording.mp3",
      180,
      mockTranscript
    );

    // Test 6: Create message entry
    await callRecordingService.createCallMessageEntry(testCall.id, analysis);

    console.log("✅ Recording processing completed successfully");

    // Test 4: Verify the call was updated with analysis
    const { data: updatedCall, error: updateError } = await supabase
      .from("calls")
      .select("*")
      .eq("id", testCall.id)
      .single();

    if (updateError) {
      console.error("❌ Error fetching updated call:", updateError);
      return;
    }

    console.log("\n📊 Call Analysis Results:");
    console.log("Summary:", updatedCall.ai_summary);
    console.log("Sentiment Score:", updatedCall.sentiment_score);

    // Test 5: Check if recording record was created
    const { data: recordings, error: recordingError } = await supabase
      .from("call_recordings")
      .select("*")
      .eq("call_id", testCall.id);

    if (recordingError) {
      console.error("❌ Error fetching recordings:", recordingError);
      return;
    }

    if (recordings && recordings.length > 0) {
      console.log("\n🎙️ Recording Record Created:");
      console.log("Recording ID:", recordings[0].id);
      console.log("Has Transcription:", !!recordings[0].transcription);
      console.log("Duration:", recordings[0].duration);
    }

    // Test 6: Check if message was created in thread
    const { data: messages, error: messageError } = await supabase
      .from("messages")
      .select("*")
      .eq("lead_id", testCall.lead_id)
      .eq("sender", "system")
      .order("created_at", { ascending: false })
      .limit(1);

    if (messageError) {
      console.error("❌ Error fetching messages:", messageError);
      return;
    }

    if (messages && messages.length > 0) {
      console.log("\n💬 Call Summary Message Created:");
      console.log(
        "Message Preview:",
        messages[0].text.substring(0, 100) + "..."
      );
    }

    console.log("\n🎉 All tests completed successfully!");

    // Clean up test data
    console.log("\n🧹 Cleaning up test data...");

    await supabase.from("call_recordings").delete().eq("call_id", testCall.id);
    await supabase
      .from("messages")
      .delete()
      .eq("lead_id", testCall.lead_id)
      .eq("sender", "system");
    await supabase.from("calls").delete().eq("id", testCall.id);

    console.log("✅ Cleanup completed");
  } catch (error) {
    console.error("❌ Test failed:", error);

    // Cleanup on error
    await supabase.from("call_recordings").delete().eq("call_id", testCall.id);
    await supabase
      .from("messages")
      .delete()
      .eq("lead_id", testCall.lead_id)
      .eq("sender", "system");
    await supabase.from("calls").delete().eq("id", testCall.id);
  }
}

// Run the test
testRecordingSystem().catch(console.error);
