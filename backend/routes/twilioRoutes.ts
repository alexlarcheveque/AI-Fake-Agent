import express from "express";
import asyncHandler from "express-async-handler";
import { getStatusCallback } from "../controllers/twilioController.ts";

const router = express.Router();

// Apply protect middleware to all message routes
// router.use(protect);

// Get message history for a lead
router.get(
  "/status-callback",
  asyncHandler((req, res) => getStatusCallback(req, res))
);

export default router;
