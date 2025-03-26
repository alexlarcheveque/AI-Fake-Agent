import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const GoogleCalendarConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await axios.get(`${API_URL}/api/oauth/google/status`, {
        withCredentials: true
      });
      
      setIsConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking Google Calendar connection status:', error);
      setError('Failed to check connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setError('');
      
      // Get the authorization URL
      const response = await axios.get(`${API_URL}/api/oauth/google/auth`, {
        withCredentials: true
      });
      
      if (!response.data.authUrl) {
        setError('Failed to get authorization URL');
        return;
      }
      
      // Open the auth URL in a popup
      const authWindow = window.open(
        response.data.authUrl,
        'Google Calendar Authorization',
        'width=600,height=700'
      );
      
      if (!authWindow) {
        setError('Pop-up blocked. Please allow pop-ups for this site.');
        return;
      }
      
      // Set up message event listener to know when authentication is complete
      const handleMessage = (event) => {
        // Check that the message is from our popup
        if (event.data && event.data.type) {
          if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
            console.log('Google Calendar connected successfully');
            authWindow.close();
            checkConnectionStatus(); // Refresh the status
          } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
            console.error('Google Calendar connection error:', event.data.error);
            setError(`Connection failed: ${event.data.error}`);
            authWindow.close();
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Clean up the event listener when auth is complete or component unmounts
      return () => {
        window.removeEventListener('message', handleMessage);
      };
      
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      setError(error.response?.data?.message || 'Failed to connect to Google Calendar');
    }
  };

  const handleDisconnect = async () => {
    try {
      setError('');
      
      await axios.delete(`${API_URL}/api/oauth/google/disconnect`, {
        withCredentials: true
      });
      
      setIsConnected(false);
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      setError(error.response?.data?.message || 'Failed to disconnect Google Calendar');
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 bg-white rounded shadow-md">
        <p className="text-center text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Google Calendar Integration</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          <p>{error}</p>
        </div>
      )}
      
      <div className="mb-4">
        <p className="mb-2">Status: {isConnected ? (
          <span className="text-green-600 font-medium">
            Connected
          </span>
        ) : (
          <span className="text-gray-600">
            Not Connected
          </span>
        )}</p>
        
        {isConnected ? (
          <p className="text-sm text-gray-600 mb-4">
            Your Google Calendar is connected. All appointments will automatically appear in your calendar.
          </p>
        ) : (
          <p className="text-sm text-gray-600 mb-4">
            Connect your Google Calendar to automatically add appointments to your calendar.
          </p>
        )}
      </div>
      
      <div>
        {isConnected ? (
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Disconnect Google Calendar
          </button>
        ) : (
          <button
            onClick={handleConnect}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Connect Google Calendar
          </button>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendarConnect; 