const twilio = require("twilio");

const validateTwilioRequest = (req, res, next) => {
  const twilioSignature = req.headers["x-twilio-signature"];
  const url = `${process.env.BASE_URL}/api/messages/receive`;

  const requestIsValid = twilio.validateRequest(
    process.env.TWILIO_AUTH_TOKEN,
    twilioSignature,
    url,
    req.body
  );

  if (requestIsValid) {
    next();
  } else {
    res.status(403).send("Forbidden");
  }
};

module.exports = validateTwilioRequest;
