const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const notificationController = require('../controllers/notificationController');

// Get all notifications for the authenticated user
router.get('/', auth, notificationController.getAllForUser);

// Get count of unread notifications
router.get('/counts/unread', auth, notificationController.getUnreadCount);

// Get a specific notification
router.get('/:id', auth, notificationController.getById);

// Create a new notification
router.post('/', auth, notificationController.create);

// Mark all notifications as read
router.patch('/mark-all-read', auth, notificationController.markAllAsRead);

// Mark a notification as read
router.patch('/:id/read', auth, notificationController.markAsRead);

// Mark a notification as unread
router.patch('/:id/unread', auth, notificationController.markAsUnread);

// Delete a notification
router.delete('/:id', auth, notificationController.delete);

module.exports = router; 