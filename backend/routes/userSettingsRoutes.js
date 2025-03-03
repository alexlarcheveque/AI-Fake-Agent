const express = require("express");
const router = express.Router();
const userSettingsController = require("../controllers/userSettingsController");
const auth = require("../middleware/auth");

// Apply auth middleware to all routes
router.use(auth);

// GET /api/user-settings
router.get("/", userSettingsController.getSettings);

// PUT /api/user-settings
router.put("/", userSettingsController.updateSettings);

module.exports = router;
