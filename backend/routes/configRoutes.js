const express = require("express");
const router = express.Router();
const appSettings = require("../config/appSettings");
const fs = require("fs");
const path = require("path");

// Get all settings
router.get("/", (req, res) => {
  res.json(appSettings.getAll());
});

// Update settings (this will update the .env file)
router.put("/", async (req, res) => {
  try {
    const newSettings = req.body;

    // Update environment variables
    Object.keys(newSettings).forEach((key) => {
      process.env[key] = newSettings[key];
      appSettings[key] = newSettings[key];
    });

    // Optionally persist to .env file (be careful with this)
    // This is a simple implementation - you might want a more robust solution
    const envPath = path.resolve(__dirname, "../.env");
    let envContent = fs.readFileSync(envPath, "utf8");

    Object.keys(newSettings).forEach((key) => {
      const regex = new RegExp(`^${key}=.*`, "m");
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${newSettings[key]}`);
      } else {
        envContent += `\n${key}=${newSettings[key]}`;
      }
    });

    fs.writeFileSync(envPath, envContent);

    res.json({ success: true, settings: appSettings.getAll() });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

module.exports = router;
