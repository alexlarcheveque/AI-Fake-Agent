const Lead = require("../models/Lead");
const { Op } = require("sequelize");
const logger = require("../utils/logger");
const scheduledMessageService = require("../services/scheduledMessageService");

// Get all leads with pagination and search
const getAllLeads = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const searchFields = req.query.searchFields
      ? JSON.parse(req.query.searchFields)
      : ["name", "email", "phoneNumber", "status"];
    const offset = (page - 1) * limit;

    // Build search condition
    const searchCondition = search
      ? {
          [Op.or]: searchFields.map((field) => ({
            [field]: {
              [Op.iLike]: `%${search}%`,
            },
          })),
        }
      : {};

    const { count, rows } = await Lead.findAndCountAll({
      where: searchCondition,
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

    // Schedule the first message
    if (lead.enableFollowUps) {
      await scheduledMessageService.scheduleNextMessage(lead.id);
    }

    // Fetch the lead again to include the scheduled message
    const updatedLead = await Lead.findByPk(lead.id);
    res.status(201).json(updatedLead);
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
