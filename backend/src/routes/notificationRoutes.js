const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const auth = require('../middleware/auth');

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ status: 'success', data: { message: 'Notification API is working' } });
});

// Get all notifications
router.get('/', auth, notificationController.getNotifications);

// Get a single notification
router.get('/:id', auth, notificationController.getNotification);

// Create a notification
router.post('/', auth, notificationController.createNotification);

// Mark notification as read
router.put('/:id/read', auth, notificationController.markAsRead);

// Mark notification as unread
router.put('/:id/unread', auth, notificationController.markAsUnread);

// Mark all notifications as read
router.put('/mark-all-read', auth, notificationController.markAllAsRead);

// Delete a notification
router.delete('/:id', auth, notificationController.deleteNotification);

// Get unread count
router.get('/unread-count', auth, notificationController.getUnreadCount);

module.exports = router; 