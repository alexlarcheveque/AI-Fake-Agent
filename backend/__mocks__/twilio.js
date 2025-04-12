// Mock for Twilio module
const mockTwilio = jest.fn().mockImplementation(() => {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        sid: 'SM123456',
        status: 'queued',
        errorCode: null,
        errorMessage: null
      })
    }
  };
});

// Add the twiml property with MessagingResponse class
mockTwilio.twiml = {
  MessagingResponse: jest.fn().mockImplementation(() => ({
    message: jest.fn().mockReturnThis(),
    toString: jest.fn().mockReturnValue('<Response><Message></Message></Response>')
  }))
};

module.exports = mockTwilio; 