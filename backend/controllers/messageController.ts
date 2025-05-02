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

class MessageController {
  async createOutgoingMessage(req, res) {
    const { lead_id, text, is_ai_generated, user_settings } = req.body;
    const user_id = req.user?.id;

    const message = await createMessageService(
      lead_id,
      text,
      is_ai_generated,
      user_settings
    );
    res.status(201).json(message);
  }

  async updateMessage(req, res) {
    const { message_id, data } = req.body;
    const message = await updateMessageService(message_id, data);
    res.json(message);
  }

  async deleteMessage(req, res) {
    const { message_id } = req.body;
    const message = await deleteMessageService(message_id);
    res.json(message);
  }

  async getMessagesByLeadIdDescending(req, res) {
    const { lead_id } = req.params;
    const messages = await getMessagesByLeadIdDescendingService(lead_id);
    res.json(messages);
  }

  async getMessagesThatAreOverdue(req, res) {
    const messages = await getMessagesThatAreOverdueService();
    res.json(messages);
  }

  async receiveIncomingMessage(req, res) {
    // Process the incoming webhook data
    const message = await receiveIncomingMessageService(req.body);
    res.status(200).send();
  }

  async markAsRead(req, res) {
    const { messageId } = req.params;
    await updateMessageService(messageId, { is_read: true });
    res.status(204).send();
  }

  async statusCallback(req, res) {
    const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;
    logger.info(
      `Twilio message ${MessageSid} status updated to ${MessageStatus}`
    );

    // Update message status in database if needed
    if (MessageSid) {
      await updateMessageService(
        { twilioSid: MessageSid },
        {
          delivery_status: MessageStatus,
          error_code: ErrorCode || null,
          error_message: ErrorMessage || null,
        }
      );
    }

    res.status(200).send();
  }
}

export default new MessageController();
