const twilio = require("twilio");
const client = twilio("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN");

// Send SMS to a phone number
const sendSMS = (to, body) => {
  return client.messages.create({
    body,
    from: "TWILIO_PHONE_NUMBER",
    to,
  });
};

module.exports = { sendSMS };
