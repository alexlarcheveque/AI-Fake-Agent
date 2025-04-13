import express from 'express';
import googleOAuthService from '../services/googleOAuthService.js';

const router = express.Router();

/**
 * @route   GET /api/oauth/google/auth
 * @desc    Get Google OAuth URL for authorization
 * @access  Private
 */
router.get('/google/auth', (req, res) => {
  try {
    const userId = req.user.id;
    const authUrl = googleOAuthService.generateAuthUrl(userId);
    
    res.json({ 
      success: true,
      authUrl
    });
  } catch (error) {
    console.error('Error generating Google OAuth URL:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to generate authorization URL',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/oauth/google/callback
 * @desc    Handle Google OAuth callback
 * @access  Public (but verifies state parameter)
 */
router.get('/google/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;
    
    console.log('Google OAuth callback received:');
    console.log('- Code present:', !!code);
    console.log('- State:', state);
    console.log('- Error:', error || 'none');
    console.log('- Error description:', error_description || 'none');
    
    // Check if there was an error in the OAuth flow
    if (error) {
      console.error('Google OAuth error:', error);
      console.error('Error description:', error_description || 'No description provided');
      return res.status(400).send(`
        <html>
          <head><title>Authentication Error</title></head>
          <body>
            <h1>Authentication Error</h1>
            <p>There was an error during authentication: ${error}</p>
            <p>Details: ${error_description || 'No details provided'}</p>
            <p>You can close this window now.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          </body>
        </html>
      `);
    }
    
    // Ensure code and state are provided
    if (!code || !state) {
      return res.status(400).send(`
        <html>
          <head><title>Missing Parameters</title></head>
          <body>
            <h1>Missing Parameters</h1>
            <p>Required parameters are missing from the callback.</p>
            <p>You can close this window now.</p>
            <script>
              setTimeout(() => {
                window.close();
              }, 5000);
            </script>
          </body>
        </html>
      `);
    }
    
    // Decode the state parameter to get the userId
    let decodedState;
    try {
      decodedState = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (error) {
      console.error('Error decoding state parameter:', error);
      return res.status(400).send('Invalid state parameter');
    }
    
    const { userId } = decodedState;
    
    if (!userId) {
      return res.status(400).send('Missing user ID in state parameter');
    }
    
    // Exchange the authorization code for tokens
    const tokens = await googleOAuthService.getTokensFromCode(code);
    
    // Save the tokens to the user's record
    await googleOAuthService.saveUserTokens(userId, tokens);
    
    // Return a success page that will close itself
    res.send(`
      <html>
        <head><title>Authentication Successful</title></head>
        <body>
          <h1>Authentication Successful</h1>
          <p>Your Google Calendar has been successfully connected.</p>
          <p>You can close this window now.</p>
          <script>
            // Notify the opener that authentication was successful
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
            }
            
            // Close this window after a short delay
            setTimeout(() => {
              window.close();
            }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.status(500).send(`
      <html>
        <head><title>Authentication Error</title></head>
        <body>
          <h1>Authentication Error</h1>
          <p>There was an error processing your authentication: ${error.message}</p>
          <p>You can close this window now.</p>
          <script>
            // Notify the opener that authentication failed
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_AUTH_ERROR', error: '${error.message}' }, '*');
            }
            
            setTimeout(() => {
              window.close();
            }, 5000);
          </script>
        </body>
      </html>
    `);
  }
});

/**
 * @route   DELETE /api/oauth/google/disconnect
 * @desc    Disconnect Google Calendar integration
 * @access  Private
 */
router.delete('/google/disconnect', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Disconnect the user from Google Calendar
    await googleOAuthService.disconnectUser(userId);
    
    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Calendar',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/oauth/google/status
 * @desc    Get connection status for Google Calendar
 * @access  Private
 */
router.get('/google/status', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if user has Google Calendar connected
    const user = await require('../models/User').findByPk(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.json({
      success: true,
      connected: !!user.googleCalendarConnected,
      // Don't include the actual tokens in the response for security
    });
  } catch (error) {
    console.error('Error checking Google Calendar status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check Google Calendar connection status',
      error: error.message
    });
  }
});

export default router; 