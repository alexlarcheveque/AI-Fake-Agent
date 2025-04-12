import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageThread from '../../components/MessageThread.jsx';
import { getMessages, sendMessage } from '../../api/messageApi.js';
import { useUserSettings } from '../../hooks/useUserSettings.js';
import { io } from 'socket.io-client';

// Mock dependencies
jest.mock('../../api/messageApi.js');
jest.mock('../../hooks/useUserSettings.js');
jest.mock('socket.io-client');

// Mock socket
const mockSocket = {
  on: jest.fn(),
  off: jest.fn()
};

describe('MessageThread Component', () => {
  // Common test data
  const testLead = {
    id: 123,
    name: 'Test User',
    phoneNumber: '+14155551234',
    aiAssistantEnabled: true
  };

  const testMessages = [
    {
      id: 1,
      leadId: 123,
      text: 'Hello there',
      sender: 'agent',
      direction: 'outbound',
      createdAt: '2023-06-20T10:00:00Z',
      deliveryStatus: 'delivered'
    },
    {
      id: 2,
      leadId: 123,
      text: 'Hi, how can I help you?',
      sender: 'lead',
      direction: 'inbound',
      createdAt: '2023-06-20T10:05:00Z',
      deliveryStatus: 'delivered'
    }
  ];

  const testUserSettings = {
    agentName: 'Test Agent',
    companyName: 'Test Realty',
    aiAssistantEnabled: true,
    companyPhoneNumber: '+15105551234'
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Setup default mock implementations
    getMessages.mockResolvedValue(testMessages);
    useUserSettings.mockReturnValue({ 
      userSettings: testUserSettings, 
      isLoading: false, 
      error: null 
    });
    io.mockReturnValue(mockSocket);
  });

  test('renders message thread with messages', async () => {
    // Render component
    render(<MessageThread lead={testLead} />);
    
    // Wait for messages to load
    await waitFor(() => {
      expect(getMessages).toHaveBeenCalledWith(testLead.id);
    });
    
    // Check if messages are displayed
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(screen.getByText('Hi, how can I help you?')).toBeInTheDocument();
  });

  test('sends a new message when submitting message form', async () => {
    // Mock successful message send
    sendMessage.mockResolvedValue({
      id: 3,
      leadId: 123,
      text: 'New test message',
      sender: 'agent',
      direction: 'outbound',
      deliveryStatus: 'queued',
      createdAt: new Date().toISOString()
    });
    
    // Render component
    render(<MessageThread lead={testLead} />);
    
    // Type a message in the input
    const messageInput = screen.getByPlaceholderText(/Type a message/i);
    fireEvent.change(messageInput, { target: { value: 'New test message' } });
    
    // Submit the message form
    const sendButton = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendButton);
    
    // Verify the message was sent with correct parameters
    await waitFor(() => {
      expect(sendMessage).toHaveBeenCalledWith({
        leadId: testLead.id,
        text: 'New test message',
        isAiGenerated: false,
        userSettings: testUserSettings
      });
    });
    
    // Check that the input was cleared
    expect(messageInput.value).toBe('');
  });

  test('connects to socket and listens for new messages', async () => {
    // Render component
    render(<MessageThread lead={testLead} />);
    
    // Check socket connection
    expect(io).toHaveBeenCalled();
    expect(mockSocket.on).toHaveBeenCalledWith('new-message', expect.any(Function));
    
    // Verify socket event handling by simulating a socket event
    const socketCallbacks = {};
    mockSocket.on.mockImplementation((event, callback) => {
      socketCallbacks[event] = callback;
    });
    
    // Simulate new message event
    const newMessage = {
      id: 4,
      leadId: 123,
      text: 'Socket message',
      sender: 'lead',
      direction: 'inbound',
      createdAt: new Date().toISOString()
    };
    
    // Wait for messages to load first
    await waitFor(() => {
      expect(getMessages).toHaveBeenCalledWith(testLead.id);
    });
    
    // Trigger the socket callback if it exists
    if (socketCallbacks['new-message']) {
      socketCallbacks['new-message'](newMessage);
    }
    
    // The new message should be displayed
    await waitFor(() => {
      expect(screen.getByText('Socket message')).toBeInTheDocument();
    });
  });

  test('disconnects from socket when component unmounts', async () => {
    // Render component
    const { unmount } = render(<MessageThread lead={testLead} />);
    
    // Unmount component
    unmount();
    
    // Verify socket disconnection
    expect(mockSocket.off).toHaveBeenCalledWith('new-message');
  });

  test('shows loading state while fetching messages', async () => {
    // Mock loading state
    getMessages.mockImplementation(() => new Promise(resolve => {
      // Delay resolving to simulate loading
      setTimeout(() => resolve(testMessages), 100);
    }));
    
    // Render component
    render(<MessageThread lead={testLead} />);
    
    // Check for loading indicator
    expect(screen.getByText(/loading messages/i)).toBeInTheDocument();
    
    // Wait for messages to load
    await waitFor(() => {
      expect(screen.getByText('Hello there')).toBeInTheDocument();
    });
    
    // Loading indicator should be gone
    expect(screen.queryByText(/loading messages/i)).not.toBeInTheDocument();
  });

  test('shows error state when message fetch fails', async () => {
    // Mock error state
    const errorMessage = 'Failed to fetch messages';
    getMessages.mockRejectedValue(new Error(errorMessage));
    
    // Render component
    render(<MessageThread lead={testLead} />);
    
    // Wait for error to be displayed
    await waitFor(() => {
      expect(screen.getByText(new RegExp(errorMessage, 'i'))).toBeInTheDocument();
    });
  });

  test('renders correctly for AI assistant disabled lead', async () => {
    // Lead with AI assistant disabled
    const aiDisabledLead = {
      ...testLead,
      aiAssistantEnabled: false
    };
    
    // Render component
    render(<MessageThread lead={aiDisabledLead} />);
    
    // Wait for messages to load
    await waitFor(() => {
      expect(getMessages).toHaveBeenCalledWith(aiDisabledLead.id);
    });
    
    // AI assistant toggle should be off
    const aiToggle = screen.getByRole('checkbox', { name: /ai assistant/i });
    expect(aiToggle).not.toBeChecked();
  });
}); 