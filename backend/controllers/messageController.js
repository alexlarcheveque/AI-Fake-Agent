const Message = require("../models/Message");
const Lead = require("../models/Lead");
const UserSettings = require("../models/UserSettings");
const twilioService = require("../services/twilioService");
const openaiService = require("../services/openaiService");
const logger = require("../utils/logger");
const followUpService = require("../services/followUpService");
const FollowUp = require("../models/FollowUp");
const userSettingsService = require("../services/userSettingsService");
const { Op } = require("sequelize");
const sequelize = require("sequelize");
const { MessagingResponse } = require("twilio").twiml;
const DEFAULT_SETTINGS = require("../config/defaultSettings");
const appointmentService = require("../services/appointmentService");

const messageController = {
  // send test twilio message
  async testTwilio(req, res) {
    const twilioMessage = await twilioService.sendMessage(
      "+5571981265131",
      "test"
    );
    res.json({ message: twilioMessage });
  },

  // Send a message to a lead via Twilio
  async sendMessage(req, res) {
    try {
      // Log the entire request body for debugging
      console.log("Received message request:", req.body);

      const { leadId, text, isAiGenerated = false } = req.body;

      // Validate inputs with detailed error messages
      if (!leadId) {
        return res.status(400).json({ error: "leadId is required" });
      }

      if (!text || typeof text !== "string") {
        return res.status(400).json({
          error: "text must be a non-empty string",
          received: {
            type: typeof text,
            value: text,
          },
        });
      }

      // Find the lead with error handling
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        return res.status(404).json({
          error: "Lead not found",
          leadId: leadId,
        });
      }

      // Get the lead owner
      const userId = lead.userId;

      // Add a check for missing userId
      if (!userId) {
        logger.warn(
          `Lead ${leadId} has no associated user, using default settings`
        );
        // Use default settings if no user is associated
        const settingsMap = DEFAULT_SETTINGS;
      } else {
        const settingsMap = await userSettingsService.getAllSettings(userId);
      }

      // Send message via Twilio
      const twilioMessage = await twilioService.sendMessage(
        lead.phoneNumber,
        text
      );

      // Save message to database
      const message = await Message.create({
        leadId,
        text,
        sender: "agent",
        direction: "outbound",
        twilioSid: twilioMessage.sid,
        isAiGenerated,
      });

      // Emit socket event for sent message
      const io = req.app.get("io");
      if (io) {
        io.emit("new-message", {
          leadId: lead.id,
          message: {
            id: message.id,
            text: message.text,
            sender: message.sender,
            createdAt: message.createdAt,
            leadName: lead.name,
            phoneNumber: lead.phoneNumber,
            deliveryStatus: message.deliveryStatus,
          },
        });
      }

      // If AI Assistant is enabled for this lead, generate and send AI response
      if (lead.aiAssistantEnabled) {
        // Generate AI response
        const aiResponseData = await openaiService.generateResponse(
          text,
          settingsMap
        );

        // Check if aiResponseData contains appointment details
        let aiResponseText;
        let appointmentDetails = null;
        
        if (typeof aiResponseData === 'object' && aiResponseData.text) {
          // It's the new format with appointment details
          aiResponseText = aiResponseData.text;
          appointmentDetails = aiResponseData.appointmentDetails;
          
          if (appointmentDetails) {
            console.log('Appointment detected:', appointmentDetails);
            
            // Create appointment in database
            try {
              console.log('Creating appointment from AI detected details', {
                leadId: lead.id, 
                userId: lead.userId,
                appointmentDetails
              });

              const appointment = await appointmentService.createAppointmentFromAI(
                lead.id, 
                lead.userId, // This could be null, but our updated appointmentService will handle that
                appointmentDetails
              );
              
              console.log('Appointment created successfully:', appointment.id);
              
              // Add a Google Calendar confirmation if a calendar link was created
              if (appointment.googleCalendarEventLink) {
                // Check if the lead has an email
                const leadWithEmail = await Lead.findByPk(lead.id);
                if (leadWithEmail && leadWithEmail.email) {
                  // If lead has an email, they'll receive a calendar invitation
                  aiResponseText += `\n\nI've sent a calendar invitation to your email (${leadWithEmail.email}). You can accept it to add this appointment to your calendar.`;
                }
              }
            } catch (appointmentError) {
              console.error('Error creating appointment:', appointmentError);
              // Continue with the message even if appointment creation fails
              // Don't add any calendar confirmation text since the appointment creation failed
            }
          }
        } else {
          // It's just a string (old format or no appointment detected)
          aiResponseText = aiResponseData;
        }

        // Send AI response via Twilio
        const aiTwilioMessage = await twilioService.sendMessage(
          lead.phoneNumber,
          aiResponseText
        );

        // Save AI response to database
        const aiMessage = await Message.create({
          leadId,
          text: aiResponseText,
          sender: "agent",
          direction: "outbound",
          twilioSid: aiTwilioMessage.sid,
          isAiGenerated: true,
        });

        // Schedule follow-up after sending message
        await followUpService.scheduleFollowUp(leadId, new Date());

        res.json({ message, aiMessage });
      } else {
        res.json({ message });
      }
    } catch (error) {
      console.error("Error in sendMessage:", error);
      res.status(500).json({
        error: "Failed to send message",
        details: error.message,
      });
    }
  },

  // Receive and process incoming messages
  async receiveMessage(req, res) {
    try {
      logger.info("Received incoming message from Twilio:", {
        body: req.body,
        rawBody: req.rawBody ? req.rawBody.toString() : "No raw body",
        headers: req.headers,
        url: req.originalUrl,
        method: req.method,
        contentType: req.headers["content-type"],
      });

      // Extract the message details from Twilio's request
      const { From, Body, To, MessageSid } = req.body;

      // Log the extracted fields specifically
      logger.info("Extracted message fields:", { From, Body, To, MessageSid });

      // Validate required fields
      if (!From || !Body) {
        logger.error("Missing required fields in Twilio webhook", {
          From,
          Body,
          To,
          MessageSid,
        });
        return res.status(400).send("Missing required fields");
      }

      // Extract just the last 10 digits (US numbers)
      const getLastTenDigits = (phoneNumber) => {
        const digitsOnly = phoneNumber.replace(/\D/g, "");
        return digitsOnly.slice(-10);
      };

      // Get the last 10 digits of the incoming number
      const last10Digits = getLastTenDigits(From);

      // First try to find by exact match
      let lead = await Lead.findOne({
        where: { phoneNumber: From },
      });

      // If not found, try without the country code (just the last 10 digits)
      if (!lead) {
        lead = await Lead.findOne({
          where: { phoneNumber: last10Digits },
        });
      }

      // If still not found, try with a more flexible approach
      if (!lead) {
        // Get all leads
        const allLeads = await Lead.findAll();

        // Find a lead where the last 10 digits match
        lead = allLeads.find((l) => {
          const leadLast10 = getLastTenDigits(l.phoneNumber);
          return leadLast10 === last10Digits;
        });
      }

      // Log what we tried
      logger.info("Phone number matching:", {
        incoming: From,
        last10Digits,
        foundLead: lead ? lead.id : "none",
      });

      if (!lead) {
        logger.warn(
          `No lead found with phone number ${From} (normalized: ${From})`
        );

        // Optionally create a new lead for unknown numbers
        lead = await Lead.create({
          name: `Unknown (${From})`,
          phoneNumber: From,
          email: "",
          source: "SMS",
          status: "New",
          notes: `Automatically created from incoming SMS on ${new Date().toISOString()}`,
        });

        logger.info(
          `Created new lead with ID ${lead.id} for unknown phone number ${From}`
        );
      }

      // Create the message record
      const message = await Message.create({
        leadId: lead.id,
        text: Body,
        sender: "lead",
        direction: "inbound",
        twilioSid: MessageSid || null,
        deliveryStatus: "delivered",
      });

      // Update the lead with the current messageCount + 1, but DON'T schedule an immediate follow-up
      await lead.update({
        lastMessageAt: new Date(),
        messageCount: lead.messageCount + 1,
        // Set nextScheduledMessage to a future date (e.g., 3 days from now)
        // This ensures we don't send another follow-up too soon after the AI response
        nextScheduledMessage: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days later
      });

      console.log(
        `Updated lead ${lead.id} with new message count and future follow-up date`
      );

      // Emit socket event with the new message
      const io = req.app.get("io");
      if (io) {
        io.emit("new-message", {
          leadId: lead.id,
          message: {
            id: message.id,
            text: message.text,
            sender: message.sender,
            createdAt: message.createdAt,
            leadName: lead.name,
            phoneNumber: lead.phoneNumber,
          },
        });
      }

      // After creating the message, log it
      logger.info("Successfully created inbound message:", {
        messageId: message.id,
        leadId: lead.id,
        text: Body,
      });

      // Check if AI Assistant is enabled for this lead
      if (lead.aiAssistantEnabled) {
        // Schedule AI response with a random delay between 10 seconds to 15 seconds
        const delayMs = Math.floor(Math.random() * (15000 - 10000 + 1) + 10000);

        console.log(
          `Scheduling AI response for lead ${lead.id} with ${
            delayMs / 1000
          } seconds delay`
        );

        setTimeout(async () => {
          try {
            // Get user settings
            const userId = lead.userId;
            let settingsMap;

            if (userId) {
              // Get user-specific settings
              settingsMap = await userSettingsService.getAllSettings(userId);
              console.log("Using user settings for AI response:", settingsMap);
            } else {
              // Use default settings if no user is associated
              settingsMap = DEFAULT_SETTINGS;
              console.log(
                "Using default settings for AI response (no userId found)"
              );
            }

            // Get previous messages for context (last 5 messages)
            const previousMessages = await Message.findAll({
              where: { leadId: lead.id },
              order: [["createdAt", "DESC"]],
              limit: 5,
            });

            // Reverse to get chronological order
            const messageHistory = previousMessages.reverse();

            // Generate AI response with proper settings and context
            const aiResponseData = await openaiService.generateResponse(
              Body, // The incoming message text
              settingsMap,
              messageHistory // Include previous messages for context
            );

            // Check if aiResponseData contains appointment details
            let aiResponseText;
            let appointmentDetails = null;
            
            if (typeof aiResponseData === 'object' && aiResponseData.text) {
              // It's the new format with appointment details
              aiResponseText = aiResponseData.text;
              appointmentDetails = aiResponseData.appointmentDetails;
              
              if (appointmentDetails) {
                console.log('Appointment detected:', appointmentDetails);
                
                // Create appointment in database
                try {
                  console.log('Creating appointment from AI detected details', {
                    leadId: lead.id, 
                    userId: lead.userId,
                    appointmentDetails
                  });

                  const appointment = await appointmentService.createAppointmentFromAI(
                    lead.id, 
                    lead.userId, // This could be null, but our updated appointmentService will handle that
                    appointmentDetails
                  );
                  
                  console.log('Appointment created successfully:', appointment.id);
                  
                  // Add a Google Calendar confirmation if a calendar link was created
                  if (appointment.googleCalendarEventLink) {
                    // Check if the lead has an email
                    const leadWithEmail = await Lead.findByPk(lead.id);
                    if (leadWithEmail && leadWithEmail.email) {
                      // If lead has an email, they'll receive a calendar invitation
                      aiResponseText += `\n\nI've sent a calendar invitation to your email (${leadWithEmail.email}). You can accept it to add this appointment to your calendar.`;
                    }
                  }
                } catch (appointmentError) {
                  console.error('Error creating appointment:', appointmentError);
                  // Continue with the message even if appointment creation fails
                  // Don't add any calendar confirmation text since the appointment creation failed
                }
              }
            } else {
              // It's just a string (old format or no appointment detected)
              aiResponseText = aiResponseData;
            }

            // Send AI response via Twilio
            const aiTwilioMessage = await twilioService.sendMessage(
              lead.phoneNumber,
              aiResponseText
            );

            // Save AI response to database
            const aiMessage = await Message.create({
              leadId: lead.id,
              text: aiResponseText,
              sender: "agent",
              direction: "outbound",
              twilioSid: aiTwilioMessage.sid,
              isAiGenerated: true,
            });

            console.log(`AI response sent to lead ${lead.id}: ${aiResponseText}`);

            // Emit socket event for the AI response
            if (io) {
              io.emit("new-message", {
                leadId: lead.id,
                message: {
                  id: aiMessage.id,
                  text: aiMessage.text,
                  sender: aiMessage.sender,
                  createdAt: aiMessage.createdAt,
                  leadName: lead.name,
                  phoneNumber: lead.phoneNumber,
                  deliveryStatus: aiMessage.deliveryStatus,
                },
              });
            }

            console.log("Lead info:", {
              id: lead.id,
              userId: lead.userId,
              aiAssistantEnabled: lead.aiAssistantEnabled,
            });

            console.log("Settings being used for AI:", settingsMap);
          } catch (error) {
            console.error(
              `Error sending AI response to lead ${lead.id}:`,
              error
            );
          }
        }, delayMs);
      }

      // Send a response to Twilio
      const twiml = new MessagingResponse();
      res.type("text/xml").send(twiml.toString());

      // Add more detailed logging for phone number details
      logger.info("Phone number details:", {
        original: From,
        last10Digits: From.replace(/\D/g, "").slice(-10),
      });
    } catch (error) {
      logger.error("Error processing incoming message:", error);
      res.status(500).send("Error processing message");
    }
  },

  // Get message history for a lead
  async getMessages(req, res) {
    try {
      const { leadId } = req.params;
      logger.info(`Fetching messages for lead ${leadId}`);

      const messages = await Message.findAll({
        where: { leadId },
        order: [["createdAt", "ASC"]],
      });

      console.log("messages", messages);

      logger.info(`Found ${messages.length} messages for lead ${leadId}`);
      res.json(messages);
    } catch (error) {
      logger.error("Error fetching messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  },

  // Send a local message (for playground testing)
  async sendLocalMessage(req, res) {
    console.log("sendLocalMessage", req.body);
    try {
      const { text, previousMessages, userId } = req.body;

      // Check if userId is provided
      if (!userId) {
        console.log("No userId provided, using default settings");
        // Use default settings
        const aiResponseData = await openaiService.generateResponse(
          text,
          DEFAULT_SETTINGS,
          previousMessages
        );

        // Check if aiResponseData contains appointment details
        let aiResponseText;
        let appointmentDetails = null;
        
        if (typeof aiResponseData === 'object' && aiResponseData.text) {
          // It's the new format with appointment details
          aiResponseText = aiResponseData.text;
          appointmentDetails = aiResponseData.appointmentDetails;
          
          if (appointmentDetails) {
            console.log('Appointment detected:', appointmentDetails);
            // For playground, we log the appointment details but don't add text to the message
            console.log(`Playground would create appointment for ${appointmentDetails.date} at ${appointmentDetails.time}`);
          }
        } else {
          // It's just a string (old format or no appointment detected)
          aiResponseText = aiResponseData;
        }

        // Create response message
        const aiMessage = {
          id: `local-playground-${Date.now()}`,
          text: aiResponseText,
          sender: "agent",
          twilioSid: `local-response-${Date.now()}`,
          timestamp: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          useAiResponse: true,
          isAiGenerated: true,
          appointmentDetails: appointmentDetails
        };

        return res.json({ message: aiMessage });
      }

      // Get user settings
      let settingsMap;
      try {
        settingsMap = await userSettingsService.getAllSettings(userId);
        console.log("Using user settings for playground:", settingsMap);
      } catch (error) {
        console.error("Error getting user settings:", error);
        settingsMap = DEFAULT_SETTINGS;
      }

      // Generate AI response
      const aiResponseData = await openaiService.generateResponse(
        text,
        settingsMap,
        previousMessages
      );

      // Check if aiResponseData contains appointment details
      let aiResponseText;
      let appointmentDetails = null;
      
      if (typeof aiResponseData === 'object' && aiResponseData.text) {
        // It's the new format with appointment details
        aiResponseText = aiResponseData.text;
        appointmentDetails = aiResponseData.appointmentDetails;
        
        if (appointmentDetails) {
          console.log('Appointment detected in playground:', appointmentDetails);
          // For playground, we log the appointment details but don't add text to the message
          console.log(`Playground would create appointment for ${appointmentDetails.date} at ${appointmentDetails.time}`);
        }
      } else {
        // It's just a string (old format or no appointment detected)
        aiResponseText = aiResponseData;
      }

      // Create response message
      const aiMessage = {
        id: Date.now(),
        text: aiResponseText,
        sender: "agent",
        twilioSid: `local-response-${Date.now()}`,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        useAiResponse: true,
        isAiGenerated: true,
        appointmentDetails: appointmentDetails
      };

      res.json({ message: aiMessage });
    } catch (error) {
      logger.error("Error processing local message:", error);
      res.status(500).json({ error: "Failed to process message" });
    }
  },

  // Status callback handler for Twilio
  async statusCallback(req, res) {
    try {
      const { MessageSid, MessageStatus, ErrorCode, ErrorMessage } = req.body;

      console.log(`Status update for message ${MessageSid}: ${MessageStatus}`);

      if (!MessageSid) {
        return res.status(400).json({ error: "MessageSid is required" });
      }

      // Find the message by Twilio SID
      const message = await Message.findOne({
        where: { twilioSid: MessageSid },
      });

      if (!message) {
        console.error(`No message found with Twilio SID: ${MessageSid}`);
        return res.status(404).json({ error: "Message not found" });
      }

      // Update the message status
      await message.update({
        deliveryStatus: MessageStatus,
        errorCode: ErrorCode || null,
        errorMessage: ErrorMessage || null,
        statusUpdatedAt: new Date(),
      });

      // Emit socket event for status update
      const io = req.app.get("io");
      if (io) {
        io.emit("message-status-update", {
          messageId: message.id,
          leadId: message.leadId,
          twilioSid: MessageSid,
          status: MessageStatus,
        });
      }

      console.log(
        `Updated status for message ${message.id} to ${MessageStatus}`
      );
      res.status(200).send("Status updated");
    } catch (error) {
      console.error("Error updating message status:", error);
      res.status(500).json({ error: "Failed to update message status" });
    }
  },

  // Get message statistics
  async getMessageStats(req, res) {
    try {
      // Count total messages
      const totalMessages = await Message.count();

      // Count delivered messages
      const deliveredMessages = await Message.count({
        where: { deliveryStatus: "delivered" },
      });

      // Count failed messages
      const failedMessages = await Message.count({
        where: {
          deliveryStatus: {
            [Op.in]: ["failed", "undelivered"],
          },
        },
      });

      // Count active conversations (leads with at least one message in the last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Use Sequelize's built-in methods instead of raw queries
      const activeConversations = await Message.findAll({
        attributes: [
          [
            sequelize.fn(
              "COUNT",
              sequelize.fn("DISTINCT", sequelize.col("leadId"))
            ),
            "count",
          ],
        ],
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo,
          },
        },
        raw: true,
      });

      res.json({
        totalMessages,
        deliveredMessages,
        failedMessages,
        activeConversations: activeConversations[0]?.count || 0,
      });
    } catch (error) {
      logger.error("Error getting message stats:", error);
      res.status(500).json({ error: "Failed to get message statistics" });
    }
  },

  // Get scheduled messages for calendar
  async getScheduledMessages(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res
          .status(400)
          .json({ error: "Start date and end date are required" });
      }

      // Parse dates
      const start = new Date(startDate);
      const end = new Date(endDate);

      logger.info(`Fetching scheduled messages from ${start} to ${end}`);

      // Get messages sent in the date range using proper Sequelize methods
      const messages = await Message.findAll({
        where: {
          createdAt: {
            [Op.between]: [start, end],
          },
          sender: "agent", // Only outbound messages
        },
        include: [
          {
            model: Lead,
            attributes: ["id", "name"],
            required: false, // Make this a LEFT JOIN instead of INNER JOIN
          },
        ],
        order: [["createdAt", "ASC"]],
        limit: 100, // Limit to prevent performance issues
      });

      // Format the response
      const formattedMessages = messages.map((message) => ({
        id: message.id,
        leadId: message.leadId,
        scheduledFor: message.createdAt,
        status: message.deliveryStatus || "unknown",
        leadName: message.Lead?.name || "Unknown Lead",
        messageType: message.isFirstMessage ? "first" : "followup",
        messageCount: message.messageCount || 1,
      }));

      res.json(formattedMessages);
    } catch (error) {
      logger.error("Error getting scheduled messages:", error);
      res.status(500).json({ error: "Failed to get scheduled messages" });
    }
  },

  // Add this function to compare phone numbers regardless of formatting
  phoneNumbersMatch(phone1, phone2) {
    const normalize = (phone) => {
      if (!phone) return "";
      return phone.replace(/\D/g, "").replace(/^1/, ""); // Remove country code and non-digits
    };

    return normalize(phone1) === normalize(phone2);
  },
};

module.exports = messageController;
