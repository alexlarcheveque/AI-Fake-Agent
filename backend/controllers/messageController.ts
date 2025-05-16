import {
  updateMessage as updateMessageService,
  deleteMessage as deleteMessageService,
  getMessagesByLeadIdDescending as getMessagesByLeadIdDescendingService,
  getMessagesThatAreOverdue as getMessagesThatAreOverdueService,
  createMessage as createMessageService,
  receiveIncomingMessage as receiveIncomingMessageService,
  getNextScheduledMessageForLead as getNextScheduledMessageForLeadService,
} from "../services/messageService.ts";
import { sendTwilioMessage } from "../services/orchestrator/messagingOrchestrator.ts";
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
      delivery_status: "queued",
      error_code: null,
      error_message: null,
      is_ai_generated: false,
      created_at: new Date().toISOString(),
      scheduled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      sender: "agent",
    });

    console.log("message to send", message);

    // Immediately send the message instead of waiting for cron job
    // Check if message is an array (from createMessage service) and get the first item
    if (message && Array.isArray(message) && message.length > 0) {
      const messageId = message[0].id;
      const actualLeadId = message[0].lead_id;

      try {
        logger.info(
          `Immediately sending message ${messageId} for lead ${actualLeadId}`
        );
        await sendTwilioMessage(messageId, actualLeadId);
        logger.info(`Successfully sent message ${messageId}`);
      } catch (sendError) {
        logger.error(`Error sending message ${messageId}:`, sendError);
        // Still return success for the message creation
      }
    }

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

    logger.info(`Fetching messages for lead ${leadIdNum}`);

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
    await receiveIncomingMessageService(req.body);
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

    const { SmsSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

    if (!SmsSid) {
      logger.error("Received status callback without SmsSid");
      return res.status(400).json({ message: "Missing SmsSid parameter" });
    }

    logger.info(`Twilio message ${SmsSid} status updated to ${MessageStatus}`);

    // Find the message by twilioSid and then update it
    const { data: messages, error } = await supabase
      .from("messages")
      .select("id, twilio_sid")
      .eq("twilio_sid", SmsSid);

    if (error) {
      logger.error(
        `Error finding message with Twilio SID ${SmsSid}: ${error.message}`
      );
      return res.status(500).json({ message: "Database error" });
    }

    if (!messages || messages.length === 0) {
      logger.warn(`No messages found with Twilio SID ${SmsSid}`);
      return res.status(404).json({ message: "Message not found" });
    }

    if (messages.length > 1) {
      logger.warn(
        `Multiple messages found with Twilio SID ${SmsSid}, updating the first one`
      );
    }

    // Update the first message found (or the only one if there's just one)
    await updateMessageService(messages[0].id, {
      delivery_status: MessageStatus,
      error_code: ErrorCode || null,
      error_message: ErrorMessage || null,
    });

    res.status(200).send();
  } catch (error) {
    logger.error(`Error in statusCallback: ${error.message}`);
    res.status(500).json({
      message: "Error processing status callback",
      error: error.message,
    });
  }
};
