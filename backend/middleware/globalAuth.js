import { auth } from './auth.js';

// List of paths that should not require authentication
const publicPaths = [
  // Auth routes
  '/api/auth/register',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  // Webhook routes
  '/api/messages/receive',
  '/messages/receive',
  '/sms',
  '/api/mesages/receive', // Include the misspelled route
  // Test routes
  '/test',
  '/api/test-form'
];

/**
 * Global authentication middleware
 * Applies auth middleware to all routes except those in the publicPaths list
 */
const globalAuth = (req, res, next) => {
  // Check if the current path is in the public paths list
  const isPublicPath = publicPaths.some(path => {
    // Use exact match or check if the path starts with the publicPath
    // (important for paths with parameters)
    return req.path === path || 
           (path.endsWith('*') && req.path.startsWith(path.slice(0, -1)));
  });

  if (isPublicPath) {
    // Skip authentication for public paths
    return next();
  }

  // Apply authentication for protected paths
  return auth(req, res, next);
};

export { globalAuth }; 