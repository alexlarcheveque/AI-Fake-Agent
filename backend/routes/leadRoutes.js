const express = require("express");
const { getAllLeads, createLead } = require("../controllers/leadController");
const router = express.Router();

// GET /leads - Retrieve all leads
router.get("/leads", getAllLeads);

// POST /leads - Create a new lead
router.post("/leads", createLead);

module.exports = router;
