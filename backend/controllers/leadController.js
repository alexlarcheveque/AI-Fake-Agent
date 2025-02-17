const Lead = require("../models/Lead");
const logger = require("../utils/logger");

// Get all leads with pagination
const getAllLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { count, rows } = await Lead.findAndCountAll({
      limit,
      offset,
      order: [["createdAt", "DESC"]],
    });

    const totalPages = Math.ceil(count / limit);

    res.json({
      leads: rows,
      currentPage: page,
      totalPages,
      totalLeads: count,
    });
  } catch (error) {
    logger.error("Error fetching leads:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get a single lead
const getLead = async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }
    res.json(lead);
  } catch (error) {
    logger.error("Error fetching lead:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create a new lead
const createLead = async (req, res) => {
  try {
    const lead = await Lead.create(req.body);
    res.status(201).json(lead);
  } catch (error) {
    logger.error("Error creating lead:", error);

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

// Update a lead
const updateLead = async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Update lead properties
    await lead.update(req.body);

    res.json(lead);
  } catch (error) {
    logger.error("Error updating lead:", error);

    // Handle validation errors
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

    res.status(500).json({ error: "Failed to update lead" });
  }
};

// Delete a lead
const deleteLead = async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    await lead.destroy();
    res.json({ message: "Lead deleted successfully" });
  } catch (error) {
    logger.error("Error deleting lead:", error);
    res.status(500).json({ error: "Failed to delete lead" });
  }
};

module.exports = {
  getAllLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
};
