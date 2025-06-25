import { sendMessage, updateMessageStatus } from "../services/twilioService.ts";
import supabase from "../config/supabase.ts";
import { describe, it, expect } from "@jest/globals";
import { createMessage } from "../services/messageService.ts";

describe("Twilio Status Callback", () => {
  it("should send a message and verify status callback updates", async () => {
    // 1. Create a test message in the database
    const testPhoneNumber = 9095697757; // Your test number
    const testMessage = "Test message for status callback verification";

    // Create a test lead if needed
    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id")
      .eq("phone_number", testPhoneNumber.toString())
      .single();

    if (leadError) {
      console.error("Error finding lead:", leadError);
      throw leadError;
    }

    // Create the message record
    const messageRecord = await createMessage({
      lead_id: lead.id,
      text: testMessage,
      sender: "agent",
      delivery_status: "sending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    console.log("Created message record:", messageRecord);

    // 2. Send the message through Twilio
    const twilioMessage = await sendMessage(testPhoneNumber, testMessage);
    expect(twilioMessage.sid).toBeDefined();
    console.log("Message sent with SID:", twilioMessage.sid);

    // 3. Update the message record with the Twilio SID
    await supabase
      .from("messages")
      .update({ twilio_sid: twilioMessage.sid })
      .eq("id", messageRecord[0]?.id);

    // 4. Wait for status updates (give it more time for delivery)
    console.log("Waiting for status updates...");
    await new Promise((resolve) => setTimeout(resolve, 30000)); // Wait 30 seconds

    // 5. Check the message status in the database
    const { data: dbMessage, error } = await supabase
      .from("messages")
      .select("*")
      .eq("twilio_sid", twilioMessage.sid)
      .single();

    if (error) {
      console.error("Error fetching message:", error);
      // Log all messages to help debug
      const { data: allMessages } = await supabase
        .from("messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);
      console.log("Recent messages:", allMessages);
      throw error;
    }

    console.log("Message status:", {
      sid: twilioMessage.sid,
      status: dbMessage.delivery_status,
      errorCode: dbMessage.error_code,
      errorMessage: dbMessage.error_message,
      updatedAt: dbMessage.updated_at,
    });

    // 6. Verify the status was updated
    expect(dbMessage).toBeDefined();
    expect(dbMessage.twilio_sid).toBe(twilioMessage.sid);
    expect(["sent", "delivered", "failed"]).toContain(
      dbMessage.delivery_status
    );

    // 7. If not delivered, wait a bit longer and check again
    if (dbMessage.delivery_status !== "delivered") {
      console.log("Message not yet delivered, waiting another 30 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 30000));

      const { data: finalMessage } = await supabase
        .from("messages")
        .select("*")
        .eq("twilio_sid", twilioMessage.sid)
        .single();

      console.log("Final message status:", {
        sid: twilioMessage.sid,
        status: finalMessage.delivery_status,
        errorCode: finalMessage.error_code,
        errorMessage: finalMessage.error_message,
        updatedAt: finalMessage.updated_at,
      });
    }
  }, 60000); // Set timeout to 60 seconds
});
