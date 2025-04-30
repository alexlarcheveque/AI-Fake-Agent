import {
  createNotification as createNotificationService,
  getNotificationsByUserId as getNotificationsByUserIdService,
  getNotificationsByLeadId as getNotificationsByLeadIdService,
  updateNotification as updateNotificationService,
  deleteNotification as deleteNotificationService,
  markAllAsRead as markAllAsReadService,
  markAsRead as markAsReadService,
  markAsUnread as markAsUnreadService,
} from "../services/notificationService.js";

export const createNotification = async (req, res) => {
  const notification = await createNotificationService(req.body);
  res.json(notification);
};

export const getNotificationsByUserId = async (req, res) => {
  const notifications = await getNotificationsByUserIdService(
    req.params.userId
  );
  res.json(notifications);
};

export const getNotificationsByLeadId = async (req, res) => {
  const notifications = await getNotificationsByLeadIdService(
    req.params.leadId
  );
  res.json(notifications);
};

export const updateNotification = async (req, res) => {
  const notification = await updateNotificationService(req.params.id, req.body);
  res.json(notification);
};

export const deleteNotification = async (req, res) => {
  const notification = await deleteNotificationService(req.params.id);
  res.json(notification);
};

export const markAllAsRead = async (req, res) => {
  const notification = await markAllAsReadService(req.params.userId);
  res.json(notification);
};

export const markAsRead = async (req, res) => {
  const notification = await markAsReadService(
    req.params.id,
    req.params.userId
  );
  res.json(notification);
};

export const markAsUnread = async (req, res) => {
  const notification = await markAsUnreadService(
    req.params.id,
    req.params.userId
  );
  res.json(notification);
};
