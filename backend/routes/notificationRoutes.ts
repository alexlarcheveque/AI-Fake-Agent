import express from "express";
import {
  createNotification,
  getNotificationsByUserId,
  getNotificationsByLeadId,
  deleteNotification,
  markAllAsRead,
  markAsRead,
  markAsUnread,
} from "../controllers/notificationController.ts";
import asyncHandler from "express-async-handler";

const router = express.Router();

// Get all notifications for current user
router.get(
  "/",
  asyncHandler((req, res) => getNotificationsByUserId(req, res))
);

// Create new notification
router.post(
  "/",
  asyncHandler((req, res) => createNotification(req, res))
);

// Get single notification
router.get(
  "/:id",
  asyncHandler((req, res) => getNotificationsByLeadId(req, res))
);

// Mark notification as read
router.put(
  "/:id/read",
  asyncHandler((req, res) => markAsRead(req, res))
);

// Mark notification as unread
router.put(
  "/:id/unread",
  asyncHandler((req, res) => markAsUnread(req, res))
);

// Mark all notifications as read
router.put(
  "/mark-all-read",
  asyncHandler((req, res) => markAllAsRead(req, res))
);

// Delete notification
router.delete(
  "/:id",
  asyncHandler((req, res) => deleteNotification(req, res))
);

export default router;
