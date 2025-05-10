import { updateMessage as updateMessageService } from "../services/messageService.ts";
import logger from "../utils/logger.ts";

export const getStatusCallback = async (req, res) => {
  try {
    console.log("get status callback", req);
    // const message = await updateMessageService(req.body.MessageSid, req.body);
    res.json({ message: "Status callback received" });
  } catch (error) {
    logger.error(`Error in getStatusCallback: ${error.message}`);
    res
      .status(500)
      .json({ message: "Error in getStatusCallback", error: error.message });
  }
};
