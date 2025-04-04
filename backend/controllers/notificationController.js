const Notification = require('../models/Notification');
const { Op } = require('sequelize');

const notificationController = {
  // Get all notifications for a user
  async getAllForUser(req, res) {
    try {
      const userId = req.user.id;
      
      const notifications = await Notification.findAll({
        where: { userId },
        order: [['createdAt', 'DESC']],
      });
      
      return res.json({ notifications });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Get a specific notification
  async getById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOne({
        where: { 
          id,
          userId 
        },
      });
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      return res.json({ notification });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Create a new notification
  async create(req, res) {
    try {
      const userId = req.user.id;
      const { type, title, message, metadata } = req.body;
      
      if (!type || !title || !message) {
        return res.status(400).json({ error: 'Type, title, and message are required' });
      }
      
      const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        metadata: metadata || null,
        isRead: false,
        isNew: true,
      });
      
      return res.status(201).json({ notification });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Mark a notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOne({
        where: { 
          id,
          userId 
        },
      });
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      notification.isRead = true;
      await notification.save();
      
      return res.json({ notification });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Mark a notification as unread
  async markAsUnread(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOne({
        where: { 
          id,
          userId 
        },
      });
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      notification.isRead = false;
      notification.isNew = true;
      await notification.save();
      
      return res.json({ notification });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Dismiss new status (remove red dot but keep read status unchanged)
  async dismissNewStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOne({
        where: { 
          id,
          userId 
        },
      });
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      notification.isNew = false;
      await notification.save();
      
      return res.json({ notification });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Mark all notifications as not new
  async markAllAsNotNew(req, res) {
    try {
      const userId = req.user.id;
      
      await Notification.update(
        { isNew: false },
        { where: { userId, isNew: true } }
      );
      
      return res.json({ message: 'All notifications marked as not new' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      
      await Notification.update(
        { isRead: true },
        { where: { userId, isRead: false } }
      );
      
      return res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Delete a notification
  async delete(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const notification = await Notification.findOne({
        where: { 
          id,
          userId 
        },
      });
      
      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }
      
      await notification.destroy();
      
      return res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      
      const count = await Notification.count({
        where: { 
          userId,
          isRead: false 
        },
      });
      
      return res.json({ count });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  },

  // Get new count
  async getNewCount(req, res) {
    try {
      const userId = req.user.id;
      
      const count = await Notification.count({
        where: { 
          userId,
          isNew: true 
        },
      });
      
      return res.json({ count });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }
};

// Helper methods for response handling
notificationController.sendSuccess = function(res, data, message = 'Success', status = 200) {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

notificationController.sendError = function(res, error, status = 500) {
  console.error('Error in notification controller:', error);
  return res.status(status).json({
    success: false,
    message: error.message || 'An unexpected error occurred',
    error: process.env.NODE_ENV === 'development' ? error : undefined
  });
};

module.exports = notificationController; 