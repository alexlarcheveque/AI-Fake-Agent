import { sendMessage } from "../services/twilioService";

describe("Twilio Service", () => {
  it("should send a message successfully", async () => {
    const testPhoneNumber = "+1234567890"; // Replace with a test phone number
    const testMessage = "Test message from automated test";

    try {
      const result = await sendMessage(testPhoneNumber, testMessage);
      expect(result).toBeDefined();
      expect(result.sid).toBeDefined();
    } catch (error) {
      console.error("Test failed:", error);
      throw error;
    }
  });
});
