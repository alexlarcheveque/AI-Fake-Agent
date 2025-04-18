import notificationService from '../services/notificationService.js';

const notificationController = {
  // Get all notifications for the current user
  async getAll(req, res, next) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 10 } = req.query;

      const result = await notificationService.findAll({
        page: parseInt(page),
        limit: parseInt(limit),
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      // The service returns { items, currentPage, totalPages, totalItems }
      return res.json(result);
    } catch (error) {
      next(error);
    }
  },

  // Get a single notification
  async getOne(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const notification = await notificationService.findOne({
        where: { id, userId }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      return res.json(notification);
    } catch (error) {
      next(error);
    }
  },

  // Create a new notification
  async create(req, res, next) {
    try {
      const userId = req.user.id;
      const notificationData = { ...req.body, userId };
      const newItem = await notificationService.create(notificationData);
      return res.status(201).json(newItem);
    } catch (error) {
      next(error);
    }
  },

  // Delete a notification
  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const notification = await notificationService.findOne({
        where: { id, userId }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      await notificationService.delete(id);
      return res.json({ message: 'Notification deleted successfully' });
    } catch (error) {
      next(error);
    }
  },

  // Get unread count for current user
  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;
      const count = await notificationService.getUnreadCount(userId);
      return res.json({ count });
    } catch (error) {
      next(error);
    }
  },

  // Mark all notifications as read for current user
  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      await notificationService.markAllAsRead(userId);
      return res.json({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  },

  // Mark a notification as read
  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const notification = await notificationService.markAsRead(id, userId);
      return res.json(notification);
    } catch (error) {
      next(error);
    }
  },

  // Mark a notification as unread
  async markAsUnread(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const notification = await notificationService.markAsUnread(id, userId);
      return res.json(notification);
    } catch (error) {
      next(error);
    }
  },

  // Test endpoint for API connectivity
  async testConnection(req, res, next) {
    try {
      return res.json({ status: 'ok', message: 'Notification API is working' });
    } catch (error) {
      next(error);
    }
  }
};

export default notificationController; 