const express = require("express");
const app = express();
const leadRoutes = require("../routes/leadroutes");

app.use(express.json());
app.use("/api", leadRoutes); // Mount routes under /api prefix

// ... rest of your app configuration
