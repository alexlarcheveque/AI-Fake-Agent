import express from "express";
import userSettingsController from "../controllers/userSettingsController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Apply auth middleware to all routes
router.use(auth);

// GET /api/user-settings
router.get("/", userSettingsController.getSettings);

// PUT /api/user-settings
router.put("/", userSettingsController.updateSettings);

export default router;
