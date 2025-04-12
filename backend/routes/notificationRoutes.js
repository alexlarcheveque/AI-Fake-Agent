const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authMiddleware = require('../middleware/authMiddleware');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Test endpoint
router.get('/test', notificationController.testConnection);

// Get all notifications for current user
router.get('/', notificationController.getAll);

// Get unread count
router.get('/unread-count', notificationController.getUnreadCount);

// Create new notification
router.post('/', notificationController.create);

// Get single notification
router.get('/:id', notificationController.getOne);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark notification as unread
router.put('/:id/unread', notificationController.markAsUnread);

// Mark all notifications as read
router.put('/mark-all-read', notificationController.markAllAsRead);

// Delete notification
router.delete('/:id', notificationController.delete);

module.exports = router; 