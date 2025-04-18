import { Op } from 'sequelize';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';

const notificationService = {
  /**
   * Find all notifications with pagination and search
   */
  async findAll({
    page = 1,
    limit = 10,
    search = "",
    searchFields = [],
    where = {},
    order = [["createdAt", "DESC"]],
    include = [],
  } = {}) {
    try {
      const offset = (page - 1) * limit;

      // Add search conditions if provided
      if (search && searchFields.length > 0) {
        const searchConditions = searchFields.map((field) => ({
          [field]: { [Op.iLike]: `%${search}%` },
        }));

        where = {
          ...where,
          [Op.or]: searchConditions,
        };
      }

      // Execute query
      const { count, rows } = await Notification.findAndCountAll({
        where,
        limit,
        offset,
        order,
        include,
        distinct: true,
      });

      return {
        items: rows,
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalItems: count,
      };
    } catch (error) {
      logger.error('Error finding all notifications:', error);
      throw error;
    }
  },

  /**
   * Find notification by primary key
   */
  async findById(id, { include = [] } = {}) {
    try {
      const item = await Notification.findByPk(id, { include });

      if (!item) {
        throw new Error(`Notification not found with id ${id}`);
      }

      return item;
    } catch (error) {
      logger.error('Error finding notification by id:', error);
      throw error;
    }
  },

  /**
   * Find a single notification
   */
  async findOne({ where = {}, include = [] } = {}) {
    try {
      const item = await Notification.findOne({ where, include });
      return item;
    } catch (error) {
      logger.error('Error finding notification:', error);
      throw error;
    }
  },

  /**
   * Create a new notification
   */
  async create(data) {
    try {
      const item = await Notification.create(data);
      return item;
    } catch (error) {
      logger.error('Error creating notification:', error);
      throw error;
    }
  },

  /**
   * Update an existing notification
   */
  async update(id, data) {
    try {
      const item = await this.findById(id);
      await item.update(data);
      return item;
    } catch (error) {
      logger.error('Error updating notification:', error);
      throw error;
    }
  },

  /**
   * Delete a notification
   */
  async delete(id) {
    try {
      const item = await this.findById(id);
      await item.destroy();
      return true;
    } catch (error) {
      logger.error('Error deleting notification:', error);
      throw error;
    }
  },

  /**
   * Get unread notification count for a user
   */
  async getUnreadCount(userId) {
    try {
      const count = await Notification.count({
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
  },

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId) {
    try {
      await Notification.update(
        { isRead: true },
        { where: { userId, isRead: false } }
      );
      return true;
    } catch (error) {
      logger.error('Error marking all as read:', error);
      throw error;
    }
  },

  /**
   * Mark a notification as read
   */
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
  },

  /**
   * Mark a notification as unread
   */
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
};

export default notificationService; 