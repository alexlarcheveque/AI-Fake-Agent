import BaseService from './BaseService.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';

class NotificationService extends BaseService {
  constructor() {
    super(Notification, 'Notification');
  }

  async getUnreadCount(userId) {
    try {
      const count = await this.model.count({
        where: { 
          userId,
          isRead: false
        }
      });
      return count;
    } catch (error) {
      logger.error('Error getting unread count:', error);
      throw error;
    }
  }

  async markAllAsRead(userId) {
    try {
      await this.model.update(
        { isRead: true },
        { where: { userId, isRead: false } }
      );
      return true;
    } catch (error) {
      logger.error('Error marking all as read:', error);
      throw error;
    }
  }

  async markAsRead(id, userId) {
    try {
      const notification = await this.findById(id);
      if (notification.userId !== userId) {
        throw new Error('Unauthorized');
      }
      notification.isRead = true;
      await notification.save();
      return notification;
    } catch (error) {
      logger.error('Error marking as read:', error);
      throw error;
    }
  }

  async markAsUnread(id, userId) {
    try {
      const notification = await this.findById(id);
      if (notification.userId !== userId) {
        throw new Error('Unauthorized');
      }
      notification.isRead = false;
      await notification.save();
      return notification;
    } catch (error) {
      logger.error('Error marking as unread:', error);
      throw error;
    }
  }
}

export default new NotificationService(); 