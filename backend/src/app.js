const express = require("express");
const app = express();
const leadRoutes = require("../routes/leadroutes");
const messageRoutes = require("../routes/messageRoutes");

app.use(express.json());

app.use("/api/leads", leadRoutes); // Mount routes under /api prefix

app.use("/api/messages", messageRoutes); // Mount routes under /api prefix
