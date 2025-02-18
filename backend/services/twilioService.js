const twilio = require("twilio");
const logger = require("../utils/logger");

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

const twilioService = {
  async sendMessage(phoneNumber, text) {
    console.log("trrying to send twilio message");
    try {
      const twilioMessage = await client.messages.create({
        body: text,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });
      console.log("twilio message sent");
      return twilioMessage;
    } catch (error) {
      logger.error("Error sending Twilio message:", error);
      throw error;
    }
  },
};

module.exports = twilioService;
