const express = require("express");
const router = express.Router();
const leadController = require("../controllers/leadController");

// Get all leads
router.get("/", leadController.getAllLeads);

// Get a single lead
router.get("/:id", leadController.getLead);

// Create a new lead
router.post("/", leadController.createLead);

// Update a lead
router.put("/:id", leadController.updateLead);

// Delete a lead
router.delete("/:id", leadController.deleteLead);

module.exports = router;
