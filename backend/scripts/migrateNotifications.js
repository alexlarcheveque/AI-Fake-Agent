/**
 * Migration script for notifications
 * 
 * This script can be run to migrate existing notifications from localStorage to the database.
 * Place this script in your frontend to run it when a user logs in, or run it on the server side
 * if you have access to users' localStorage data.
 */

// Import dependencies - fix the import paths
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * Migrates notifications from localStorage to the database for a specific user
 * @param {string} userId - The user ID to migrate notifications for
 * @param {Array} localNotifications - Notifications from localStorage
 * @returns {Promise<Array>} - Array of created notification records
 */
async function migrateNotificationsForUser(userId, localNotifications) {
  try {
    console.log(`Migrating ${localNotifications.length} notifications for user ${userId}`);
    
    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    
    // Map localStorage notifications to database schema
    const notificationsToCreate = localNotifications.map(notification => ({
      userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.read, // Map the old 'read' property to 'isRead'
      isNew: notification.isNew,
      metadata: notification.data || {}, // Map the old 'data' property to 'metadata'
      createdAt: notification.timestamp || new Date(),
      updatedAt: new Date()
    }));
    
    // Create notifications in bulk
    const createdNotifications = await Notification.bulkCreate(notificationsToCreate);
    console.log(`Successfully migrated ${createdNotifications.length} notifications for user ${userId}`);
    
    return createdNotifications;
  } catch (error) {
    console.error(`Error migrating notifications for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Example usage in a controller or route handler:
 * 
 * // Call this when a user logs in
 * router.post('/migrate-notifications', authenticateToken, async (req, res) => {
 *   try {
 *     const { userId } = req.user;
 *     const { localNotifications } = req.body;
 *     
 *     if (!localNotifications || !Array.isArray(localNotifications)) {
 *       return res.status(400).json({ error: 'Invalid notifications data' });
 *     }
 *     
 *     const migratedNotifications = await migrateNotificationsForUser(userId, localNotifications);
 *     
 *     return res.status(200).json({ 
 *       message: 'Notifications migrated successfully',
 *       count: migratedNotifications.length
 *     });
 *   } catch (error) {
 *     console.error('Error in notification migration route:', error);
 *     return res.status(500).json({ error: error.message });
 *   }
 * });
 */

module.exports = {
  migrateNotificationsForUser
}; 