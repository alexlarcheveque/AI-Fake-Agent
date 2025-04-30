import express from "express";
import {
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  getLeadsByUserId,
} from "../controllers/leadController.js";
import asyncHandler from "express-async-handler";

const router = express.Router();

// Get all leads
router.get(
  "/",
  asyncHandler((req, res) => getLeadsByUserId(req, res))
);

// Get a single lead by id - Place parametrized routes AFTER specific routes
router.get(
  "/:id",
  asyncHandler((req, res) => getLeadById(req, res))
);

// Create a new lead
router.post(
  "/",
  asyncHandler((req, res) => createLead(req, res))
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
