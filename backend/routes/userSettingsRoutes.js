import express from "express";
import {
  getUserSettings,
  updateUserSettings,
} from "../controllers/userSettingsController.js";
import asyncHandler from "express-async-handler";

const router = express.Router();

// Get user settings
router.get(
  "/:userId",
  asyncHandler((req, res) => getUserSettings(req, res))
);

// Update user settings
router.put(
  "/:userId",
  asyncHandler((req, res) => updateUserSettings(req, res))
);

export default router;
