const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const auth = require("../middleware/auth");

// Protect all settings routes with auth middleware
router.use(auth);

// Get all settings for current user
router.get("/", settingsController.getSettings);

// Update settings for current user
router.put("/", settingsController.updateSettings);

module.exports = router;
