import express from "express";
import {
  getUserSettings,
  updateUserSettings,
  deleteUserSettings,
} from "../controllers/userSettingsController.ts";
import asyncHandler from "express-async-handler";
import protect from "../middleware/authMiddleware.ts";

const router = express.Router();

// Apply protect middleware to all routes
router.use(protect);

// Get current user settings
router.get(
  "/",
  asyncHandler((req, res) => getUserSettings(req, res))
);

// Update current user settings
router.put(
  "/",
  asyncHandler((req, res) => updateUserSettings(req, res))
);

router.delete(
  "/",
  asyncHandler((req, res) => deleteUserSettings(req, res))
);

export default router;
