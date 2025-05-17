import {
  createNotification as createNotificationService,
  getNotificationsByUserId as getNotificationsByUserIdService,
  getNotificationsByLeadId as getNotificationsByLeadIdService,
  updateNotification as updateNotificationService,
  deleteNotification as deleteNotificationService,
  markAllAsRead as markAllAsReadService,
  markAsRead as markAsReadService,
  markAsUnread as markAsUnreadService,
} from "../services/notificationService.ts";

export const createNotification = async (req, res) => {
  const notification = await createNotificationService(req.body);
  res.json(notification);
};

export const getNotificationsByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in request" });
    }
    const notifications = await getNotificationsByUserIdService(userId);

    return res.json(notifications);
  } catch (error) {
    console.error("Error in getNotificationsByUserId:", error);
    return res.status(500).json({ error: error.message });
  }
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
  const notification = await markAllAsReadService(req.user.id);
  res.json(notification);
};

export const markAsRead = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const notification = await markAsReadService(id);
    res.json(notification);
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ error: error.message });
  }
};

export const markAsUnread = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid notification ID" });
    }

    const notification = await markAsUnreadService(id);
    res.json(notification);
  } catch (error) {
    console.error("Error marking notification as unread:", error);
    res.status(500).json({ error: error.message });
  }
};
