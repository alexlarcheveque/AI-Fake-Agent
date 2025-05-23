import express from "express";
import {
  getLeadById,
  createLeadAndScheduleMessage,
  updateLead,
  deleteLead,
  getLeadsByUserId,
  getLeadLimitInfo,
} from "../controllers/leadController.ts";
import asyncHandler from "express-async-handler";
import protect from "../middleware/authMiddleware.ts";

const router = express.Router();

// Apply protect middleware to all lead routes
router.use(protect);

// Get all leads by user id
router.get(
  "/user",
  asyncHandler((req, res) => getLeadsByUserId(req, res))
);

// Get lead limit info for the current user
router.get(
  "/limit",
  asyncHandler((req, res) => getLeadLimitInfo(req, res))
);

// Get a single lead by id - Place parametrized routes AFTER specific routes
router.get(
  "/:id",
  asyncHandler((req, res) => getLeadById(req, res))
);

// Create a new lead
router.post(
  "/",
  asyncHandler((req, res) => createLeadAndScheduleMessage(req, res))
);

// Update a lead
router.put(
  "/:id",
  asyncHandler((req, res) => updateLead(req, res))
);

// Delete a lead
router.delete(
  "/:id",
  asyncHandler((req, res) => deleteLead(req, res))
);

export default router;
