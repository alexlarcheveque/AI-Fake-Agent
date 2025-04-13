import BaseController from './BaseController.js';
import notificationService from '../services/notificationService.js';
import { AppError } from '../middleware/errorHandler.js';

class NotificationController extends BaseController {
  constructor() {
    super(notificationService);
  }

  // Override getAll to only get notifications for the current user
  async getAll(req, res, next) {
    try {
      const userId = req.user.id;
      const { page, limit } = req.query;

      const result = await this.service.findAll({
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
        where: { userId },
        order: [['createdAt', 'DESC']]
      });

      return res.success(result);
    } catch (error) {
      next(error);
    }
  }

  // Override create to add userId
  async create(req, res, next) {
    try {
      const userId = req.user.id;
      const notificationData = { ...req.body, userId };
      const newItem = await this.service.create(notificationData);
      return res.created(newItem);
    } catch (error) {
      next(error);
    }
  }

  // Get unread count for current user
  async getUnreadCount(req, res, next) {
    try {
      const userId = req.user.id;
      const count = await notificationService.getUnreadCount(userId);
      return res.success({ count });
    } catch (error) {
      next(error);
    }
  }

  // Mark all notifications as read for current user
  async markAllAsRead(req, res, next) {
    try {
      const userId = req.user.id;
      await notificationService.markAllAsRead(userId);
      return res.success({ message: 'All notifications marked as read' });
    } catch (error) {
      next(error);
    }
  }

  // Mark a notification as read
  async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const notification = await notificationService.markAsRead(id, userId);
      return res.success(notification);
    } catch (error) {
      next(error);
    }
  }

  // Mark a notification as unread
  async markAsUnread(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const notification = await notificationService.markAsUnread(id, userId);
      return res.success(notification);
    } catch (error) {
      next(error);
    }
  }

  // Test endpoint for API connectivity
  async testConnection(req, res, next) {
    try {
      return res.success({ status: 'ok' }, 'Notification API is working');
    } catch (error) {
      next(error);
    }
  }
}

export default new NotificationController(); 