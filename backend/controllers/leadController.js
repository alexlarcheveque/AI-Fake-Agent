const Lead = require("../models/Lead");

// Get all leads
const getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.findAll();
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Create a new lead
const createLead = async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    res.status(201).json(lead);
  } catch (error) {
    console.error("Error creating lead:", error);

    // Handle Sequelize validation errors
    if (error.name === "SequelizeValidationError") {
      const validationErrors = error.errors.map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return res.status(400).json({
        error: "Validation failed",
        details: validationErrors,
      });
    }

    // Handle unique constraint errors
    if (error.name === "SequelizeUniqueConstraintError") {
      return res.status(400).json({
        error: "Email already exists",
        details: [
          { field: "email", message: "This email is already registered" },
        ],
      });
    }

    res.status(500).json({ error: "Failed to create lead" });
  }
};

module.exports = {
  getAllLeads,
  createLead,
};
