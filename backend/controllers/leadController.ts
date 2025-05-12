import { LeadRow } from "../models/Lead.ts";
import {
  createLead as createLeadService,
  getLeadById as getLeadByIdService,
  updateLead as updateLeadService,
  deleteLead as deleteLeadService,
  getLeadsByUserId as getLeadsByUserIdService,
  checkLeadLimit as checkLeadLimitService,
} from "../services/leadService.ts";
import { createMessage as createMessageService } from "../services/messageService.ts";
import logger from "../utils/logger.ts";

const getFirstMessageTiming = (firstMessageTiming: string) => {
  switch (firstMessageTiming) {
    case "immediate":
      return new Date(Date.now());
    case "next_day":
      return new Date(Date.now() + 1000 * 60 * 60 * 24);
    case "one_week":
      return new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
    case "two_weeks":
      return new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
    default:
      return new Date(Date.now() + 1000 * 60 * 60 * 24);
  }
};

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

export const getLeadLimitInfo = async (req, res) => {
  try {
    const userId = req.user.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in request" });
    }
    const limitInfo = await checkLeadLimitService(userId);
    res.json(limitInfo);
  } catch (error) {
    logger.error("Error fetching lead limit info:", error);
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

export const createLeadAndScheduleMessage = async (req, res) => {
  try {
    const lead: LeadRow = await createLeadService(req.user, req.body);

    console.log("req.body", req.body);

    await createMessageService({
      lead_id: lead.id,
      text: "", // hit openai api to get first message
      delivery_status: "scheduled",
      error_code: null,
      error_message: null,
      is_ai_generated: true,
      created_at: new Date(Date.now()).toISOString(),
      scheduled_at: getFirstMessageTiming(
        req.body.firstMessageTiming
      ).toISOString(),
      sender: "agent",
    });

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

    console.log("delete lead", lead);

    res.json(lead);
  } catch (error) {
    logger.error("Error deleting lead:", error);
    res.status(500).json({ error: error.message });
  }
};
