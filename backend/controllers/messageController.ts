import {
  updateMessage as updateMessageService,
  deleteMessage as deleteMessageService,
  getMessagesByLeadIdDescending as getMessagesByLeadIdDescendingService,
  getMessagesThatAreOverdue as getMessagesThatAreOverdueService,
  getMessagesByLeadId as getMessageByLeadIdService,
  createMessage as createMessageService,
  receiveIncomingMessage as receiveIncomingMessageService,
} from "../services/messageService.ts";
import logger from "../utils/logger.ts";
import supabase from "../config/supabase.ts";

export const createOutgoingMessage = async (req, res) => {
  try {
    const { lead_id, text, is_ai_generated, user_settings } = req.body;
    const user_id = req.user?.id;

    // Create a message with proper parameters
    const messageData = {
      lead_id,
      text,
      is_ai_generated,
      user_id,
    };

    const message = await createMessageService(messageData);
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

    const messages = await getMessagesByLeadIdDescendingService(
      leadIdNum,
      userId
    );

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
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
    logger.info(
      `Twilio message ${MessageSid} status updated to ${MessageStatus}`
    );

    // Find the message by twilioSid and then update it
    const { data: messageToUpdate, error } = await supabase
      .from("messages")
      .select("id")
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
