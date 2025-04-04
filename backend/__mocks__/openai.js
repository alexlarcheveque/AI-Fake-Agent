// Mock for OpenAI module
class MockOpenAI {
  constructor() {
    this.chat = {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{
            message: {
              content: 'This is a mock response from OpenAI.'
            }
          }]
        })
      }
    };
  }
}

module.exports = {
  OpenAI: MockOpenAI
}; 