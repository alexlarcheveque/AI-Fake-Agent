import messageController from '../../controllers/messageController';

describe('messageController', () => {
  test('should have expected methods', () => {
    expect(messageController).toBeDefined();
    expect(typeof messageController.sendMessage).toBe('function');
    expect(typeof messageController.receiveMessage).toBe('function');
    expect(typeof messageController.getMessages).toBe('function');
    expect(typeof messageController.statusCallback).toBe('function');
  });

  test('should include helper methods', () => {
    expect(typeof messageController.buildMessageMetadata).toBe('function');
  });
}); 