import {
  createLead as createLeadService,
  getLeadById as getLeadByIdService,
  updateLead as updateLeadService,
  deleteLead as deleteLeadService,
  getLeadsByUserId as getLeadsByUserIdService,
} from "../services/leadService.ts";
import logger from "../utils/logger.ts";

export const getLeadsByUserId = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in request" });
    }
    const leads = await getLeadsByUserIdService(userId);
    res.json(leads);
  } catch (error) {
    logger.error("Error fetching leads:", error);
    res.status(500).json({ error: error.message });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const lead = await getLeadByIdService(req.params.id);
    res.json(lead);
  } catch (error) {
    logger.error("Error fetching lead:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createLead = async (req, res) => {
  try {
    const lead = await createLeadService(req.user, req.body);
    res.status(201).json(lead);
  } catch (error) {
    logger.error("Error creating lead:", error);
    res.status(500).json({ error: error.message });
  }
};

export const updateLead = async (req, res) => {
  try {
    const lead = await updateLeadService(req.params.id, req.body);
    res.json(lead);
  } catch (error) {
    logger.error("Error updating lead:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const lead = await deleteLeadService(req.params.id);
    res.json(lead);
  } catch (error) {
    logger.error("Error deleting lead:", error);
    res.status(500).json({ error: error.message });
  }
};
