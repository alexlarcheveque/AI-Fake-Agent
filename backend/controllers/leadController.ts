import { LeadRow } from "../models/Lead.ts";
import {
  createLead as createLeadService,
  getLeadById as getLeadByIdService,
  updateLead as updateLeadService,
  deleteLead as deleteLeadService,
  getLeadsByUserId as getLeadsByUserIdService,
  checkLeadLimit as checkLeadLimitService,
  scheduleNextFollowUp as scheduleNextFollowUpService,
} from "../services/leadService.ts";
import { createMessage as createMessageService } from "../services/messageService.ts";
import { makeImmediateCall } from "../services/callService.ts";
import logger from "../utils/logger.ts";

type FirstMessageTiming = "immediate" | "next_day" | "one_week" | "two_weeks";

const getFirstMessageTiming = (firstMessageTiming: FirstMessageTiming) => {
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

export const scheduleNextFollowUp = async (req, res) => {
  try {
    console.log("scheduleNextFollowUp", req.params.id);

    const leadId = req.params.id;
    const lead = await scheduleNextFollowUpService(leadId);
    res.json(lead);
  } catch (error) {
    logger.error("Error scheduling next follow-up:", error);
    res.status(500).json({ error: error.message });
  }
};

export const createLeadAndScheduleMessage = async (req, res) => {
  try {
    const lead: LeadRow = await createLeadService(req.user, req.body);

    // NEW: Make Call #1 immediately for new leads (non-blocking)
    // Call #2 will be triggered by webhook when Call #1 completes unsuccessfully
    if (lead.is_ai_enabled && lead.phone_number) {
      makeImmediateCall(lead.id, 1).catch((error) => {
        logger.error(
          `Failed to initiate immediate call for lead ${lead.id}:`,
          error
        );
      });
      logger.info(`Initiated immediate call for new lead ${lead.id}`);
    }

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
