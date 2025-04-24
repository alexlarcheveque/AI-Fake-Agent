import Message from "../models/Message.js";

const messageService = {
  async createMessage(data) {
    // Ensure required fields have default values
    const messageData = {
      direction: data.sender === "agent" ? "outbound" : "inbound",
      status: data.status || "pending",
      ...data,
    };

    return await Message.create(messageData);
  },

  async getPreviousMessages(leadId) {
    const messages = await Message.findAll({
        where: { leadId },
        order: [['createdAt', 'DESC']]
    });
    return messages;
  },
};

export default messageService;