import { google } from 'googleapis';
import { Op } from 'sequelize';
import User from '../models/User.js';

// Create an OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const googleOAuthService = {
  /**
   * Generate an authentication URL for Google OAuth
   * @param {string} userId - The user ID to associate with this OAuth session
   * @returns {string} The authorization URL
   */
  generateAuthUrl(userId) {
    // Generate a state parameter to include the userId
    // This helps us identify the user when Google redirects back
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');
    
    console.log('Generating Google OAuth URL with the following parameters:');
    console.log('- Client ID:', process.env.GOOGLE_CLIENT_ID);
    console.log('- Redirect URI:', process.env.GOOGLE_REDIRECT_URI);
    console.log('- State:', state);
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',  // Gets a refresh token
      prompt: 'consent',       // Forces consent screen to always appear
      scope: ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar'],
      state: state             // Pass state to identify the user
    });
    
    console.log(`Generated Google OAuth URL for user ${userId}`);
    console.log(`Using redirect URI: ${process.env.GOOGLE_REDIRECT_URI}`);
    console.log(`Full auth URL: ${authUrl}`);
    return authUrl;
  },
  
  /**
   * Exchange an authorization code for tokens
   * @param {string} code - The authorization code from Google
   * @returns {Promise<Object>} The tokens
   */
  async getTokensFromCode(code) {
    try {
      const { tokens } = await oauth2Client.getToken(code);
      console.log('Successfully obtained tokens from Google');
      return tokens;
    } catch (error) {
      console.error('Error getting tokens from code:', error);
      throw error;
    }
  },
  
  /**
   * Save Google OAuth tokens for a user
   * @param {string} userId - The user ID
   * @param {Object} tokens - The tokens from Google OAuth
   * @returns {Promise<User>} The updated user
   */
  async saveUserTokens(userId, tokens) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      // Update the user with Google OAuth tokens
      // We store the entire token object as a JSON string including
      // access_token, refresh_token, scope, token_type, id_token, expiry_date
      user.googleTokens = JSON.stringify(tokens);
      user.googleCalendarConnected = true;
      
      await user.save();
      console.log(`Saved Google tokens for user ${userId}`);
      
      return user;
    } catch (error) {
      console.error('Error saving user tokens:', error);
      throw error;
    }
  },
  
  /**
   * Get a configured OAuth2 client for a user
   * @param {string} userId - The user ID
   * @returns {Promise<OAuth2Client>} Configured OAuth2 client
   */
  async getAuthClientForUser(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      if (!user.googleTokens) {
        throw new Error(`User ${userId} has not connected their Google Calendar`);
      }
      
      // Parse the stored tokens
      const tokens = JSON.parse(user.googleTokens);
      
      // Create a new OAuth client instance
      const userClient = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
      );
      
      // Set the credentials
      userClient.setCredentials(tokens);
      
      // Set up a token refresh handler if token is expired or about to expire
      if (tokens.expiry_date && Date.now() >= tokens.expiry_date - 60000) {
        console.log(`Refreshing expired token for user ${userId}`);
        
        try {
          const { credentials } = await userClient.refreshAccessToken();
          await this.saveUserTokens(userId, credentials);
          userClient.setCredentials(credentials);
        } catch (refreshError) {
          console.error(`Error refreshing token for user ${userId}:`, refreshError);
          throw new Error('Could not refresh Google token - user needs to reconnect');
        }
      }
      
      return userClient;
    } catch (error) {
      console.error(`Error getting auth client for user ${userId}:`, error);
      throw error;
    }
  },
  
  /**
   * Disconnect a user from Google Calendar
   * @param {string} userId - The user ID to disconnect
   * @returns {Promise<boolean>} True if successfully disconnected
   */
  async disconnectUser(userId) {
    try {
      const user = await User.findByPk(userId);
      
      if (!user) {
        throw new Error(`User not found with ID: ${userId}`);
      }
      
      // Clear Google tokens
      user.googleTokens = null;
      user.googleCalendarConnected = false;
      
      await user.save();
      console.log(`Disconnected Google Calendar for user ${userId}`);
      
      return true;
    } catch (error) {
      console.error(`Error disconnecting user ${userId}:`, error);
      throw error;
    }
  },
};

export default googleOAuthService;