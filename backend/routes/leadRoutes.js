const express = require("express");
const router = express.Router();
const {
  getAllLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
} = require("../controllers/leadController");

// Get all leads
router.get("/", getAllLeads);

// Get a single lead
router.get("/:id", getLead);

// Create a new lead
router.post("/", createLead);

// Update a lead
router.put("/:id", updateLead);

// Delete a lead
router.delete("/:id", deleteLead);

module.exports = router;