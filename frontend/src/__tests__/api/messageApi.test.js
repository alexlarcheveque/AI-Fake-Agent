import { sendMessage, getMessages } from '../../api/messageApi.js';
import axios from 'axios';

// Mock axios
jest.mock('axios');

describe('messageApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    test('should send a message successfully', async () => {
      // Setup
      const messageData = {
        leadId: 123,
        text: 'Hello from the test',
        isAiGenerated: false,
        userSettings: {
          agentName: 'Test Agent',
          companyName: 'Test Company'
        }
      };

      const response = {
        data: {
          id: 456,
          leadId: 123,
          text: 'Hello from the test',
          sender: 'agent',
          direction: 'outbound',
          isAiGenerated: false,
          deliveryStatus: 'queued',
          createdAt: '2023-06-20T12:00:00Z'
        }
      };

      axios.post.mockResolvedValue(response);

      // Execute
      const result = await sendMessage(messageData);

      // Assert
      expect(axios.post).toHaveBeenCalledWith('/api/messages', messageData);
      expect(result).toEqual(response.data);
    });

    test('should handle errors when sending a message', async () => {
      // Setup
      const messageData = {
        leadId: 123,
        text: 'Hello from the test'
      };

      const errorResponse = {
        response: {
          status: 500,
          data: {
            error: 'Something went wrong'
          }
        }
      };

      axios.post.mockRejectedValue(errorResponse);

      // Execute and Assert
      await expect(sendMessage(messageData)).rejects.toEqual(errorResponse);
    });
  });

  describe('getMessages', () => {
    test('should get messages for a lead', async () => {
      // Setup
      const leadId = 123;
      const response = {
        data: [
          {
            id: 1,
            leadId: 123,
            text: 'Hello',
            sender: 'agent',
            direction: 'outbound',
            createdAt: '2023-06-20T11:00:00Z'
          },
          {
            id: 2,
            leadId: 123,
            text: 'Hi there',
            sender: 'lead',
            direction: 'inbound',
            createdAt: '2023-06-20T11:05:00Z'
          }
        ]
      };

      axios.get.mockResolvedValue(response);

      // Execute
      const result = await getMessages(leadId);

      // Assert
      expect(axios.get).toHaveBeenCalledWith(`/api/messages/${leadId}`);
      expect(result).toEqual(response.data);
    });

    test('should handle errors when getting messages', async () => {
      // Setup
      const leadId = 999; // Non-existent lead
      const errorResponse = {
        response: {
          status: 404,
          data: {
            error: 'Lead not found'
          }
        }
      };

      axios.get.mockRejectedValue(errorResponse);

      // Execute and Assert
      await expect(getMessages(leadId)).rejects.toEqual(errorResponse);
    });
  });
}); 