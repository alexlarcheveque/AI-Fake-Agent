const express = require("express");
const app = express();
const leadRoutes = require("../routes/leadRoutes");
const messageRoutes = require("../routes/messageRoutes");
const settingsRoutes = require("../routes/settingsRoutes");
const notificationRoutes = require("../routes/notificationRoutes");

app.use(express.json());

app.use("/api/leads", leadRoutes); // Mount routes under /api prefix

app.use("/api/messages", messageRoutes); // Mount routes under /api prefix

app.use("/api/settings", settingsRoutes); // Mount routes under /api prefix

app.use("/api/notifications", notificationRoutes); // Mount notification routes under /api prefix

module.exports = app;
