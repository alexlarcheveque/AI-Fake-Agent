import express from "express";
import {
  getUserSettings,
  updateUserSettings,
  getCurrentUserSettings,
  updateCurrentUserSettings,
} from "../controllers/userSettingsController.ts";
import asyncHandler from "express-async-handler";
import protect from "../middleware/authMiddleware.ts";

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// Get current user settings
router.get(
  "/current",
  asyncHandler((req, res) => getCurrentUserSettings(req, res))
);

// Update current user settings
router.put(
  "/current",
  asyncHandler((req, res) => updateCurrentUserSettings(req, res))
);

// Get user settings by ID
router.get(
  "/:userId",
  asyncHandler((req, res) => getUserSettings(req, res))
);

// Update user settings by ID
router.put(
  "/:userId",
  asyncHandler((req, res) => updateUserSettings(req, res))
);

export default router;
