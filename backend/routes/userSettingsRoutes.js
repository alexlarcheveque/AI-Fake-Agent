import express from "express";
import userSettingsController from "../controllers/userSettingsController.js";

const router = express.Router();

// GET /api/user-settings
router.get("/", userSettingsController.getSettings);

// PUT /api/user-settings
router.put("/", userSettingsController.updateSettings);

export default router;
