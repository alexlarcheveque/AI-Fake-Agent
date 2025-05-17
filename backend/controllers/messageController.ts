import {
  updateMessage as updateMessageService,
  deleteMessage as deleteMessageService,
  getMessagesByLeadIdDescending as getMessagesByLeadIdDescendingService,
  getMessagesThatAreOverdue as getMessagesThatAreOverdueService,
  createMessage as createMessageService,
  receiveIncomingMessage as receiveIncomingMessageService,
  getNextScheduledMessageForLead as getNextScheduledMessageForLeadService,
} from "../services/messageService.ts";
import { updateLeadStatusBasedOnMessages } from "../services/leadService.ts";
import logger from "../utils/logger.ts";
import supabase from "../config/supabase.ts";

export const createOutgoingMessage = async (req, res) => {
  try {
    const { lead_id, text, is_ai_generated } = req.body;

    const messageData = {
      lead_id,
      text,
      is_ai_generated,
    };

    console.log("messageData", messageData);

    const message = await createMessageService({
      lead_id,
      text,
      delivery_status: "scheduled",
      error_code: null,
      error_message: null,
      is_ai_generated: false,
      created_at: new Date().toISOString(),
      scheduled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: "agent",
    });

    console.log("message to send", message);

    res.status(201).json(message);
  } catch (error) {
    logger.error(`Error in createOutgoingMessage: ${error.message}`);
    res
      .status(500)
      .json({ message: "Error creating message", error: error.message });
  }
};

export const updateMessage = async (req, res) => {
  try {
    const { message_id, data } = req.body;
    const message = await updateMessageService(message_id, data);
    res.json(message);
  } catch (error) {
    logger.error(`Error in updateMessage: ${error.message}`);
    res
      .status(500)
      .json({ message: "Error updating message", error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { message_id } = req.body;
    await deleteMessageService(message_id);
    res.json({ success: true });
  } catch (error) {
    logger.error(`Error in deleteMessage: ${error.message}`);
    res
      .status(500)
      .json({ message: "Error deleting message", error: error.message });
  }
};

export const getNextScheduledMessageForLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    const nextScheduledMessage = await getNextScheduledMessageForLeadService(
      leadId
    );

    res.json(nextScheduledMessage);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching next scheduled message",
      error: error.message,
    });
  }
};

export const getMessagesByLeadIdDescending = async (req, res) => {
  try {
    const { leadId } = req.params;

    // Ensure leadId is a number
    const leadIdNum = parseInt(leadId, 10);

    if (isNaN(leadIdNum)) {
      return res.status(400).json({ message: "Invalid lead ID format" });
    }

    // Get userId from the authenticated user
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User ID not found in request" });
    }

    logger.info(`Fetching messages for lead ${leadIdNum} and user ${userId}`);

    const messages = await getMessagesByLeadIdDescendingService(leadIdNum);

    logger.info(`Returning ${messages.length} messages for lead ${leadIdNum}`);

    return res.json(messages);
  } catch (error) {
    logger.error(`Error in getMessagesByLeadIdDescending: ${error.message}`);
    return res.status(500).json({
      message: "Error fetching messages",
      error: error.message,
    });
  }
};

export const getMessagesThatAreOverdue = async (req, res) => {
  try {
    const messages = await getMessagesThatAreOverdueService();
    res.json(messages);
  } catch (error) {
    logger.error(`Error in getMessagesThatAreOverdue: ${error.message}`);
    res.status(500).json({
      message: "Error fetching overdue messages",
      error: error.message,
    });
  }
};

export const receiveIncomingMessage = async (req, res) => {
  try {
    console.log("receiveIncomingMessage", req.body);

    // Process the incoming webhook data
    const message = await receiveIncomingMessageService(req.body);
    res.status(200).send();
  } catch (error) {
    logger.error(`Error in receiveIncomingMessage: ${error.message}`);
    res.status(500).json({
      message: "Error processing incoming message",
      error: error.message,
    });
  }
};

export const markAsRead = async (req, res) => {
  logger.warn(
    "markAsRead called but messages table does not have a read status field"
  );
  res
    .status(200)
    .json({ message: "Operation completed but no field to update" });
};

export const statusCallback = async (req, res) => {
  try {
    console.log("statusCallback", req.body);

    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
    logger.info(
      `Twilio message ${MessageSid} status updated to ${MessageStatus}`
    );

    console.log("statusCallback", req.body);

    // Find the message by twilioSid and then update it
    const { data: messageToUpdate, error } = await supabase
      .from("messages")
      .select("id, lead_id")
      .eq("twilio_sid", MessageSid)
      .single();

    if (error) {
      logger.error(
        `Error finding message with Twilio SID ${MessageSid}: ${error.message}`
      );
      return res.status(404).json({ message: "Message not found" });
    }

    if (messageToUpdate) {
      await updateMessageService(messageToUpdate.id, {
        delivery_status: MessageStatus,
        error_code: ErrorCode || null,
        error_message: ErrorMessage || null,
      });
      
      // If the message status changes to "delivered", update the lead status and schedule next follow-up
      if (MessageStatus === "delivered" && messageToUpdate.lead_id) {
        try {
          // Update lead status based on message history
          await updateLeadStatusBasedOnMessages(messageToUpdate.lead_id);
          logger.info(`Updated lead status for lead ${messageToUpdate.lead_id} after message delivery status update`);
          
          // Schedule the next follow-up message
          const { scheduleNextFollowUp } = await import("../services/leadService.ts");
          await scheduleNextFollowUp(messageToUpdate.lead_id);
          logger.info(`Scheduled next follow-up for lead ${messageToUpdate.lead_id}`);
        } catch (statusError) {
          logger.error(`Error updating lead status: ${statusError.message}`);
          // Don't throw to continue response
        }
      }
    }

    res.status(200).send();
  } catch (error) {
    logger.error(`Error in statusCallback: ${error.message}`);
    res.status(500).json({
      message: "Error processing status callback",
      error: error.message,
    });
  }
};
