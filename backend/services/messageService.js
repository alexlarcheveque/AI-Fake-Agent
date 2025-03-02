const Message = require("../models/Message");

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
};

module.exports = messageService;
