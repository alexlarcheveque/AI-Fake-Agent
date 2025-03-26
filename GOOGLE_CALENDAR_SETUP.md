# Google Calendar Integration Setup Guide

This guide will help you set up Google Calendar integration for your AI Fake Agent application. The integration uses OAuth 2.0 to securely access users' calendars, allowing your application to create, update, and delete events.

## 1. Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a new project or select an existing one.
3. Note your project ID as you'll need it for configuration.

## 2. Enable the Google Calendar API

1. From your project dashboard, go to **APIs & Services** > **Library**.
2. Search for "Google Calendar API" and click on it.
3. Click the **Enable** button.

## 3. Configure the OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**.
2. Select **External** user type (or **Internal** if this is just for your organization).
3. Fill in the required information:
   - App name: "AI Fake Agent"
   - User support email: Your email address
   - Developer contact information: Your email address
4. Click **Save and Continue**.
5. For scopes, add the following:
   - `https://www.googleapis.com/auth/calendar.events`
6. Click **Save and Continue**.
7. Add any test users (including your own email).
8. Click **Save and Continue** to complete the setup.

## 4. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**.
2. Click **Create Credentials** > **OAuth client ID**.
3. Select **Web application** for the application type.
4. Enter a name for your credentials (e.g., "AI Fake Agent Web Client").
5. Add the following authorized redirect URIs:
   - For development: `http://localhost:3000/api/oauth/google/callback`
   - For production: `https://your-domain.com/api/oauth/google/callback`
6. Click **Create**.
7. Note the **Client ID** and **Client Secret** that are shown. You'll need these for your application.

## 5. Configure Your Application

1. Add the following variables to your `.env` file:

```
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/google/callback
```

2. Update the redirect URI for production when you deploy.

## 6. Implementing in Your Frontend

Here's a sample React component for your frontend to handle Google Calendar authentication:

```jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const GoogleCalendarConnect = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user has already connected Google Calendar
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/oauth/google/status');
      setIsConnected(response.data.connected);
    } catch (error) {
      console.error('Error checking connection status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      // Get the authorization URL
      const response = await axios.get('/api/oauth/google/auth');
      
      // Open the auth URL in a popup
      const authWindow = window.open(
        response.data.authUrl,
        'Google Calendar Authorization',
        'width=600,height=700'
      );
      
      // Set up message event listener to know when authentication is complete
      window.addEventListener('message', (event) => {
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          authWindow.close();
          setIsConnected(true);
          alert('Google Calendar connected successfully!');
        } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
          authWindow.close();
          alert(`Failed to connect: ${event.data.error}`);
        }
      }, { once: true });
      
    } catch (error) {
      console.error('Error connecting to Google Calendar:', error);
      alert('Failed to connect to Google Calendar');
    }
  };

  const handleDisconnect = async () => {
    try {
      await axios.delete('/api/oauth/google/disconnect');
      setIsConnected(false);
      alert('Google Calendar disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error);
      alert('Failed to disconnect Google Calendar');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="card">
      <h2>Google Calendar Integration</h2>
      
      {isConnected ? (
        <div>
          <p className="text-success">
            <i className="fas fa-check-circle"></i> Google Calendar is connected
          </p>
          <button className="btn btn-danger" onClick={handleDisconnect}>
            Disconnect Google Calendar
          </button>
        </div>
      ) : (
        <div>
          <p>Connect your Google Calendar to automatically create events for appointments.</p>
          <button className="btn btn-primary" onClick={handleConnect}>
            Connect Google Calendar
          </button>
        </div>
      )}
    </div>
  );
};

export default GoogleCalendarConnect;
```

## 7. Testing the Integration

1. Start your application.
2. Navigate to the settings page or wherever you've implemented the Google Calendar connection UI.
3. Click "Connect Google Calendar".
4. Log in with your Google account and authorize the app.
5. Create a new appointment and verify that it appears in your Google Calendar.

## 8. Troubleshooting

If you encounter issues with the integration:

1. Check that your OAuth credentials are correct.
2. Verify that the redirect URI exactly matches what you've configured in Google Cloud Console.
3. Ensure your application is properly handling the OAuth flow.
4. Check server logs for detailed error messages.
5. For development, you may need to add your email as a test user in the OAuth consent screen.

## 9. Security Considerations

- Always store OAuth tokens securely in your database.
- Never expose the client secret in frontend code.
- Use HTTPS for all API endpoints in production.
- Implement proper token refresh mechanisms to handle expired tokens.
- Ensure that appointments are only created in the calendar of the user who owns them.

## 10. Production Deployment

1. Update the `GOOGLE_REDIRECT_URI` to your production URL.
2. Add your production domain to the authorized redirect URIs in Google Cloud Console.
3. If your app is still in the "Testing" status in Google OAuth, only authorized test users can use it. To make it available to all users, publish your app through the verification process.

For any additional assistance, refer to the [Google Calendar API documentation](https://developers.google.com/calendar/api/guides/overview). 