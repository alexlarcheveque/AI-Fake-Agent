import Message from "../models/Message.js";
import Lead from "../models/Lead.js";
import Notification from "../models/Notification.js";
import twilioService from "../services/twilioService.js";
import openaiService from "../services/openaiService.js";
import logger from "../utils/logger.js";
import scheduledMessageService from "../services/scheduledMessageService.js";
import userSettingsService from "../services/userSettingsService.js";
import leadStatusService from "../services/leadStatusService.js";
import { Op } from "sequelize";
import sequelize from "sequelize";
import DEFAULT_SETTINGS from "../config/defaultSettings.js";
import User from "../models/User.js";

import pkg from 'twilio/lib/twiml/MessagingResponse.js';
const { MessagingResponse } = pkg;

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
      const { leadId, text, isAiGenerated, userSettings } = req.body;
      const userId = req.user?.id;
      
      // Log received user settings if available
      if (userSettings) {
        logger.info("Received user settings with message:", userSettings);
      }
      
      // Find the lead
      const lead = await Lead.findByPk(leadId);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Create a new outbound message
      const message = await Message.create({
        leadId,
        text,
        sender: "agent",
        direction: "outbound",
        isAiGenerated: Boolean(isAiGenerated),
        deliveryStatus: "queued",
      });
      
      // Get settings for AI response - prioritize user settings from request
      let settingsMap;
      if (userSettings) {
        // Use the settings directly as they are from frontend, without converting to uppercase
        settingsMap = {
          // Preserve original properties without conversion to uppercase
          agentName: userSettings.agentName || "Your Name",
          companyName: userSettings.companyName || "Your Company",
          agentState: userSettings.agentState || "Your State",
          agentCity: userSettings.agentCity || "Your City",
          aiAssistantEnabled: userSettings.aiAssistantEnabled !== undefined 
            ? userSettings.aiAssistantEnabled 
            : true,
          // Follow-up intervals
          followUpIntervalNew: userSettings.followUpIntervalNew || 2,
          followUpIntervalInConversation: userSettings.followUpIntervalInConversation || 3,
          followUpIntervalQualified: userSettings.followUpIntervalQualified || 5,
          followUpIntervalAppointmentSet: userSettings.followUpIntervalAppointmentSet || 1,
          followUpIntervalConverted: userSettings.followUpIntervalConverted || 14,
          followUpIntervalInactive: userSettings.followUpIntervalInactive || 30,
        };
        logger.info("Using user settings from frontend for AI response:", settingsMap);
      } else if (userId) {
        // Fall back to getting settings from database
        settingsMap = await userSettingsService.getAllSettings(userId);
        logger.info("Using user settings from database for AI response:", settingsMap);
      } else {
        // Use default settings if nothing else is available
        settingsMap = DEFAULT_SETTINGS;
        logger.info("Using default settings for AI response (no userId found)");
      }

      // Send the message via Twilio
      let twilioResponse;
      try {
        twilioResponse = await twilioService.sendMessage(lead.phoneNumber, text);
        
        // Update the message with Twilio data
        await message.update({
          twilioSid: twilioResponse.sid,
          deliveryStatus: "sent",
        });
      } catch (twilioError) {
        logger.error("Error sending message via Twilio:", twilioError);
        
        // Update message status to failed
        await message.update({
          deliveryStatus: "failed",
        });
      }
      
      // If AI assistant is not enabled for this lead, just return the user message
      if (!lead.aiAssistantEnabled) {
        return res.json({ message });
      }
      
      // Generate AI response using the settings from the user's Settings page
      let previousMessages = [];
      try {
        // Get previous messages for context
        previousMessages = await Message.findAll({
          where: { leadId },
          order: [["createdAt", "DESC"]],
          limit: 5,
        });
        
        // Reverse to get chronological order
        previousMessages = previousMessages.reverse();
      } catch (messageError) {
        logger.error("Error fetching previous messages:", messageError);
      }
      
      try {
        // Determine if this is a follow-up message based on message count
        const isFollowUp = lead.messageCount > 2; // Consider it a follow-up if there are more than 2 previous messages
        
        // Get lead details for context
        const leadDetails = {
          leadName: lead.name,
          leadStatus: lead.status,
          leadType: lead.leadType || 'buyer', // Default to buyer if not specified
          isFollowUp
        };
        
        // Generate AI response with user's settings and lead context
        const aiResponseData = await openaiService.generateResponse(
          text,
          settingsMap,
          previousMessages,
          leadDetails
        );
        
        // Process the AI response
        let aiResponseText;
        let appointmentDetails = null;
        let isPropertySearch = false;
        let propertySearchCriteria = null;
        let propertySearchMeta = null;
        
        if (typeof aiResponseData === 'object' && aiResponseData.text) {
          aiResponseText = aiResponseData.text;
          
          // Check for appointment details
          if (aiResponseData.appointmentDetails && 
              aiResponseData.appointmentDetails.date && 
              aiResponseData.appointmentDetails.time) {
            appointmentDetails = aiResponseData.appointmentDetails;
          }
          
          // Check for property search criteria
          if (aiResponseData.isPropertySearch && aiResponseData.searchCriteria) {
            isPropertySearch = true;
            propertySearchCriteria = aiResponseData.searchCriteria;
            propertySearchMeta = {
              format: aiResponseData.propertySearchFormat || 'legacy'
            };
          }
        } else {
          aiResponseText = aiResponseData || "I couldn't generate a response at this time.";
        }
        
        // Build metadata for the AI message
        let metadata = {};
        
        // Add property search metadata if it exists
        if (isPropertySearch && propertySearchMeta) {
          metadata.isPropertySearch = true;
          metadata.propertySearchCriteria = propertySearchCriteria;
          metadata.propertySearchFormat = propertySearchMeta.format || 'legacy';
        }
        
        // Add appointment details if they exist
        if (appointmentDetails) {
          metadata.hasAppointment = true;
          metadata.appointmentDate = appointmentDetails.date;
          metadata.appointmentTime = appointmentDetails.time;
        }
        
        // Create the AI response message
        const aiMessage = await Message.create({
          leadId,
          text: aiResponseText,
          sender: "agent",
          direction: "outbound", 
          isAiGenerated: true,
          deliveryStatus: "queued",
          metadata
        });
        
        // Try to send the AI message via Twilio
        try {
          const aiTwilioResponse = await twilioService.sendMessage(
            lead.phoneNumber, 
            aiResponseText
          );
          
          // Update with Twilio data
          await aiMessage.update({
            twilioSid: aiTwilioResponse.sid,
            deliveryStatus: "sent",
          });
        } catch (aiTwilioError) {
          logger.error("Error sending AI message via Twilio:", aiTwilioError);
          
          // Update status to failed
          await aiMessage.update({
            deliveryStatus: "failed",
          });
        }
        
        // Return both messages
        return res.json({
          message,
          aiMessage,
        });
      } catch (aiError) {
        logger.error("Error generating or sending AI response:", aiError);
        return res.json({ message });
      }
    } catch (error) {
      logger.error("Error in sendMessage:", error);
      return res.status(500).json({ error: "Failed to send message" });
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

        // Get the user ID - either from the authenticated user or find first user
        let userToAssign = null;
        
        // Try to get from request if available
        if (req.user && req.user.id) {
          userToAssign = req.user.id;
          logger.info(`Using authenticated user ID ${userToAssign} for new lead`);
        } else {
          // If not, try to get the first user from the database
          try {
            
            const firstUser = await User.findOne({
              order: [['createdAt', 'ASC']]
            });
            
            if (firstUser) {
              userToAssign = firstUser.id;
              logger.info(`Using first user ID ${userToAssign} for new lead`);
            } else {
              logger.warn('No users found in database, creating lead without userId');
            }
          } catch (userError) {
            logger.error('Error finding user for new lead:', userError);
          }
        }

        // Optionally create a new lead for unknown numbers
        lead = await Lead.create({
          name: `Unknown (${From})`,
          phoneNumber: From,
          email: "",
          source: "SMS",
          status: "New",
          userId: userToAssign, // Assign the found user ID or null if none
          notes: `Automatically created from incoming SMS on ${new Date().toISOString()}`,
        });

        logger.info(
          `Created new lead with ID ${lead.id} for unknown phone number ${From}, assigned to user ${userToAssign || 'none'}`
        );
      }

      // Update the lead status based on received message
      console.log(`[DEBUG MAJOR] About to call leadStatusService.updateStatusBasedOnMessage for lead ${lead.id}, sender=lead, message: ${Body}`);
      await leadStatusService.updateStatusBasedOnMessage(lead.id, Body, "lead");
      console.log(`[DEBUG MAJOR] Finished calling leadStatusService.updateStatusBasedOnMessage for lead ${lead.id}`);
      
      // Fetch the lead again to get the potentially updated status
      lead = await Lead.findByPk(lead.id);
      console.log(`[DEBUG MAJOR] After status update, lead status is now: ${lead.status}`);
      
      // Define qualifyingLeadDetected variable before using it
      let qualifyingLeadDetected = false;

      // Simple keyword detection for potential qualification
      // This is a very basic implementation that could be enhanced with NLP in the future
      const isInConversationStatus = lead.status === "In Conversation";
      if (isInConversationStatus) {
        // Check for budget keywords
        const hasBudgetKeywords = /\b(budget|afford|price|cost|spend|range|financing|mortgage|loan|pre.?approv|qualify|qualify for)\b/i.test(Body);
        
        // Check for timeline keywords
        const hasTimelineKeywords = /\b(timeline|when|soon|move|moving|relocate|timeframe|month|year|asap|urgently|quickly)\b/i.test(Body);
        
        // Check for area/location keywords
        const hasAreaKeywords = /\b(area|location|neighborhood|school|district|community|live|north|south|east|west|downtown|suburb)\b/i.test(Body);
        
        // If message contains at least two of the three qualification criteria, mark for agent review
        if ([hasBudgetKeywords, hasTimelineKeywords, hasAreaKeywords].filter(Boolean).length >= 2) {
          logger.info(`Potential qualification detected for lead ${lead.id} - contains 2+ qualification criteria`);
          // We don't automatically change status, but we add a flag for agent review
          // This could trigger an email/notification to the agent in a future enhancement
          
          // For now, let's add an AI question in the response to gather more qualifying info
          qualifyingLeadDetected = true;
        }
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

      // Create a notification for the new message if there's a user assigned to the lead
      if (lead.userId) {
        try {
          // Truncate the message if it's too long
          const truncatedMessage = Body.length > 50 ? Body.substring(0, 47) + '...' : Body;
          
          // Create notification
          await Notification.create({
            userId: lead.userId,
            type: 'message',
            title: `New message from ${lead.name}`,
            message: truncatedMessage,
            isRead: false,
            isNew: true,
            metadata: { 
              leadId: lead.id,
              messageId: message.id,
              phoneNumber: lead.phoneNumber
            }
          });
          
          logger.info(`Created notification for new message from lead ${lead.id}`);
        } catch (notificationError) {
          logger.error(`Error creating notification for message from lead ${lead.id}:`, notificationError);
        }
      }

      // Get user settings for follow-up intervals
      let settings = DEFAULT_SETTINGS;
      if (lead.userId) {
        settings = await userSettingsService.getAllSettings(lead.userId);
      }
      
      // Use the scheduledMessageService to get the appropriate follow-up interval
      const daysToAdd = scheduledMessageService.getFollowUpInterval(lead.status, settings);
      
      // Update the lead with the current messageCount + 1, but DON'T schedule an immediate follow-up
      await lead.update({
        lastMessageDate: new Date(), // Corrected field name from lastMessageAt to lastMessageDate
        messageCount: lead.messageCount + 1,
        // Set nextScheduledMessage based on status-specific interval
        nextScheduledMessage: new Date(Date.now() + daysToAdd * 24 * 60 * 60 * 1000),
      });

      console.log(
        `Updated lead ${lead.id} with new message count and future follow-up date using ${daysToAdd}-day interval based on status: ${lead.status}`
      );

      // Emit socket event with the new message
      const io = req.app.get("io");
      if (io) {
        console.log(`Emitting new-message event for lead ${lead.id}. Message ID: ${message.id}, Sender: ${message.sender}`);
        
        // Log the message object before emission for debugging
        console.log("Lead message object before emission:", {
          id: message.id,
          leadId: lead.id,
          text: message.text,
          sender: message.sender,
          direction: message.direction,
          isAiGenerated: false
        });
        
        // Add all required fields for proper display in UI
        io.emit("new-message", {
          leadId: parseInt(lead.id, 10), // Ensure leadId is a number
          message: {
            id: message.id,
            leadId: parseInt(lead.id, 10), // Explicitly include leadId as a number
            text: message.text,
            sender: message.sender,
            direction: message.direction || 'inbound',
            createdAt: message.createdAt,
            leadName: lead.name,
            phoneNumber: lead.phoneNumber,
            deliveryStatus: message.deliveryStatus || "delivered",
            isAiGenerated: false, // Explicitly specify false for lead messages
            twilioSid: message.twilioSid || null
          },
        });
        
        console.log("Socket event emitted successfully");
      } else {
        console.warn("Socket.io instance not available - unable to emit message event");
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

            // First, check if this lead has AI messages disabled
            if (!lead.aiAssistantEnabled) {
              console.log(`AI Messages disabled for lead ${lead.id}`);
              return res.send('<Response></Response>');
            } 

            // Generate AI response
            console.log(`Generating AI response for lead ${lead.id}`);
            const promptContext = {
              leadName: lead.name,
              leadStatus: lead.status,
              leadType: lead.leadType,
              context: lead.context, // Add lead context for personalized responses
              qualifyingLeadDetected: qualifyingLeadDetected
            };
            
            const aiResponseData = await openaiService.generateResponse(
              Body,
              settingsMap,
              messageHistory,
              promptContext // Pass the prompt context here
            );

            // Check if aiResponseData contains appointment details or property search
            let aiResponseText;
            let appointmentDetails = null;
            let isPropertySearch = false;
            let propertySearchCriteria = null;
            let propertySearchMeta = null;
            
            if (typeof aiResponseData === 'object' && aiResponseData.text) {
              // It's the new format with additional data
              aiResponseText = aiResponseData.text;
              
              // Check for appointment details (not exclusive)
              if (aiResponseData.appointmentDetails) {
                // It has appointment details
                appointmentDetails = aiResponseData.appointmentDetails;
                
                if (appointmentDetails) {
                  console.log('Appointment detected in playground:', appointmentDetails);
                  // For playground, we log the appointment details but don't add text to the message
                  console.log(`Playground would create appointment for ${appointmentDetails.date} at ${appointmentDetails.time}`);
                }
              }
              
              // Check for property search (can exist alongside appointment)
              if (aiResponseData.isPropertySearch || aiResponseData.hasPropertySearch) {
                // It has property search criteria
                isPropertySearch = true;
                propertySearchCriteria = aiResponseData.searchCriteria;
                console.log('Property search criteria detected in AI response');
                
                // Prepare property search metadata
                propertySearchMeta = {
                  isPropertySearch: true,
                  propertySearchCriteria: propertySearchCriteria,
                  propertySearchFormat: aiResponseData.propertySearchFormat || 'legacy'
                };
              }
            } else {
              // It's just a string (old format or no appointment/search detected)
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
              metadata: this.buildMessageMetadata(isPropertySearch, propertySearchMeta, appointmentDetails)
            });

            console.log(`AI response sent to lead ${lead.id}: ${aiResponseText}`);

            // Update lead's lastMessageDate to help with follow-up scheduling
            const now = new Date();
            await lead.update({ 
              lastMessageDate: now,
              messageCount: lead.messageCount + 1 
              // Don't set nextScheduledMessage directly - let scheduledMessageService handle it
            });
            console.log(`Updated lead ${lead.id} lastMessageDate to: ${now}`);
            
            // Schedule the next follow-up message based on lead status using the service
            await scheduledMessageService.scheduleFollowUp(lead.id, now);
            console.log(`Scheduled next follow-up for lead ${lead.id} based on status: ${lead.status}`);

            // Emit socket event for the AI response
            if (io) {
              console.log(`Emitting AI response via socket for lead ${lead.id}. Message ID: ${aiMessage.id}`);
              
              // Ensure we're using the correct format and all required fields are present
              console.log("AI Message object before emission:", {
                id: aiMessage.id,
                leadId: lead.id, // Explicitly include leadId
                text: aiMessage.text,
                sender: aiMessage.sender,
                direction: aiMessage.direction,
                isAiGenerated: true
              });
              
              // Add all required fields for proper display in UI
              io.emit("new-message", {
                leadId: parseInt(lead.id, 10), // Ensure leadId is a number
                message: {
                  id: aiMessage.id,
                  leadId: parseInt(lead.id, 10), // Explicitly include leadId as a number
                  text: aiMessage.text,
                  sender: aiMessage.sender,
                  direction: aiMessage.direction || 'outbound',
                  createdAt: aiMessage.createdAt,
                  leadName: lead.name,
                  phoneNumber: lead.phoneNumber,
                  deliveryStatus: aiMessage.deliveryStatus || "sent",
                  isAiGenerated: true,
                  twilioSid: aiMessage.twilioSid || null
                },
              });
              
              console.log("AI response socket event emitted successfully");
            } else {
              console.warn("Socket.io instance not available - unable to emit AI message event");
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
      const { text, previousMessages, userId, leadType = "buyer", context = "" } = req.body;

      // Check if userId is provided
      if (!userId) {
        console.log("No userId provided, using default settings");
        // Use default settings
        const promptContext = {
          leadName: "Test Lead", 
          leadStatus: "New",
          leadType,
          context,
          isFollowUp: false
        };
        
        const aiResponseData = await openaiService.generateResponse(
          text,
          DEFAULT_SETTINGS,
          previousMessages,
          promptContext
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

        // Create a message object that mimics what we'd store in the database
        const messageObj = {
          id: Date.now(), // using timestamp as a temporary ID
          text: aiResponseText,
          sender: "agent",
          direction: "outbound",
          createdAt: new Date(),
          metadata: this.buildMessageMetadata(false, null, appointmentDetails)
        };
        
        // Add the AI message to the history
        const allMessages = [messageObj];

        // Return the conversation history along with any appointment information
        return res.json({ 
          conversation: allMessages,
          success: true 
        });
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
      let isPropertySearch = false;
      let propertySearchCriteria = null;
      let propertySearchMeta = null;
      
      if (typeof aiResponseData === 'object' && aiResponseData.text) {
        // It's the new format with additional data
        aiResponseText = aiResponseData.text;
        
        // Check for appointment details (not exclusive)
        if (aiResponseData.appointmentDetails) {
          // It has appointment details
          appointmentDetails = aiResponseData.appointmentDetails;
          
          if (appointmentDetails) {
            console.log('Appointment detected in playground:', appointmentDetails);
            // For playground, we log the appointment details but don't add text to the message
            console.log(`Playground would create appointment for ${appointmentDetails.date} at ${appointmentDetails.time}`);
          }
        }
        
        // Check for property search (can exist alongside appointment)
        if (aiResponseData.isPropertySearch || aiResponseData.hasPropertySearch) {
          // It has property search criteria
          isPropertySearch = true;
          propertySearchCriteria = aiResponseData.searchCriteria;
          console.log('Property search criteria detected in AI response');
          
          // Prepare property search metadata
          propertySearchMeta = {
            isPropertySearch: true,
            propertySearchCriteria: propertySearchCriteria,
            propertySearchFormat: aiResponseData.propertySearchFormat || 'legacy'
          };
        }
      } else {
        // It's just a string (old format or no appointment/search detected)
        aiResponseText = aiResponseData;
      }

      // Create a message object that mimics what we'd store in the database
      const messageObj = {
        id: Date.now(), // using timestamp as a temporary ID
        text: aiResponseText,
        sender: "agent",
        direction: "outbound",
        createdAt: new Date(),
        metadata: this.buildMessageMetadata(isPropertySearch, propertySearchMeta, appointmentDetails)
      };
      
      // Add the AI message to the history
      const allMessages = [messageObj];

      // Return the conversation history along with any appointment information
      return res.json({ 
        conversation: allMessages,
        success: true 
      });
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

  // Debug endpoint to check for recent messages
  async getRecentMessages(req, res) {
    try {
      const { leadId } = req.params;
      
      // Get messages from the last hour
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const messages = await Message.findAll({
        where: { 
          leadId,
          createdAt: {
            [Op.gte]: oneHourAgo
          }
        },
        order: [["createdAt", "DESC"]],
        limit: 50
      });
      
      res.json({
        count: messages.length,
        messages: messages,
        timestamp: new Date().toISOString(),
        period: {
          from: oneHourAgo.toISOString(),
          to: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error("Error fetching recent messages:", error);
      res.status(500).json({ error: "Failed to fetch recent messages" });
    }
  },
  
  // Get all messages with optional status filter
  async getAllMessages(req, res) {
    try {
      const { status } = req.query;
      const whereClause = status && status !== "all" 
        ? { deliveryStatus: status } 
        : {};

      const messages = await Message.findAll({
        where: whereClause,
        order: [["createdAt", "DESC"]],
        limit: 100,
        include: [
          {
            model: Lead,
            attributes: ['id', 'name', 'phoneNumber'],
            required: false
          }
        ]
      });

      logger.info(`Retrieved ${messages.length} messages${status ? ` with status ${status}` : ''}`);
      res.json(messages);
    } catch (error) {
      logger.error("Error fetching all messages:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  },

  // Utility function to build message metadata
  buildMessageMetadata(isPropertySearch, propertySearchMeta, appointmentDetails) {
    let metadata = {};
    
    // Add property search metadata if it exists
    if (isPropertySearch && propertySearchMeta) {
      if (typeof propertySearchMeta === 'object') {
        // Copy propertySearchMeta properties to metadata
        Object.assign(metadata, propertySearchMeta);
      } else {
        // Basic property search metadata
        metadata.isPropertySearch = true;
        metadata.propertySearchCriteria = propertySearchMeta;
      }
    }
    
    // Add appointment details if they exist
    if (appointmentDetails) {
      metadata.hasAppointment = true;
      metadata.appointmentDate = appointmentDetails.date;
      metadata.appointmentTime = appointmentDetails.time;
    }
    
    // Return null if metadata is empty
    return Object.keys(metadata).length > 0 ? metadata : null;
  }
};

export default messageController;