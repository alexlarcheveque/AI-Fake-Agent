import Lead from "../models/Lead.js"; 
import { Op } from "sequelize";
import logger from "../utils/logger.js";
import scheduledMessageService from "../services/scheduledMessageService.js";
import leadStatusService from "../services/leadStatusService.js";
import csv from 'csv-parser';
import { Readable } from 'stream';

const leadController = {
  // Get all leads with pagination and search
  async getAllLeads(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const search = req.query.search || "";
      const searchFields = req.query.searchFields
        ? JSON.parse(req.query.searchFields)
        : ["name", "email", "phoneNumber", "status"];
      const offset = (page - 1) * limit;

      // Build search condition
      const searchCondition = search
        ? {
            [Op.or]: searchFields.map((field) => ({
              [field]: {
                [Op.iLike]: `%${search}%`,
              },
            })),
          }
        : {};

      const { count, rows } = await Lead.findAndCountAll({
        where: searchCondition,
        limit,
        offset,
        order: [["createdAt", "DESC"]],
      });

      const totalPages = Math.ceil(count / limit);

      res.json({
        leads: rows,
        currentPage: page,
        totalPages,
        totalLeads: count,
      });
    } catch (error) {
      logger.error("Error fetching leads:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Get a single lead
  async getLeadById(req, res) {
    try {
      const lead = await Lead.findByPk(req.params.id);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      res.json(lead);
    } catch (error) {
      logger.error("Error fetching lead:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Create a new lead
  async createLead(req, res) {
    try {
      // Get the user ID from the authenticated user
      const userId = req.user?.id;
      
      // If no user ID is available, return an error
      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
          details: [{ message: "You must be logged in to create a lead" }],
        });
      }
      
      // Add the userId to the lead data
      const leadData = {
        ...req.body,
        userId
      };
      
      const lead = await Lead.create(leadData);

      // Schedule the first message
      if (lead.enableFollowUps) {
        await scheduledMessageService.scheduleNextMessage(lead.id);
      }

      // Fetch the lead again to include the scheduled message
      const updatedLead = await Lead.findByPk(lead.id);
      res.status(201).json(updatedLead);
    } catch (error) {
      logger.error("Error creating lead:", error);

      // Handle Sequelize validation errors
      if (error.name === "SequelizeValidationError") {
        const validationErrors = error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: validationErrors,
        });
      }

      // Handle unique constraint errors
      if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(400).json({
          error: "Email already exists",
          details: [
            { field: "email", message: "This email is already registered" },
          ],
        });
      }

      res.status(500).json({ error: "Failed to create lead" });
    }
  },

  // Update a lead
  async updateLead(req, res) {
    try {
      const lead = await Lead.findByPk(req.params.id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Update lead properties
      await lead.update(req.body);

      res.json(lead);
    } catch (error) {
      logger.error("Error updating lead:", error);

      // Handle validation errors
      if (error.name === "SequelizeValidationError") {
        const validationErrors = error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        }));
        return res.status(400).json({
          error: "Validation failed",
          details: validationErrors,
        });
      }

      res.status(500).json({ error: "Failed to update lead" });
    }
  },

  // Delete a lead
  async deleteLead(req, res) {
    try {
      const { id } = req.params;

      // First, check if the lead exists
      const lead = await Lead.findByPk(id);
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Add detailed logging
      logger.info(`Attempting to delete lead ${id}`);

      // Delete the lead (CASCADE will handle related records)
      await lead.destroy();

      logger.info(`Successfully deleted lead ${id}`);
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      // Add detailed error logging
      logger.error("Error deleting lead:", {
        error: error.message,
        stack: error.stack,
        params: req.params.id,
      });

      res
        .status(500)
        .json({ error: "Failed to delete lead", details: error.message });
    }
  },

  // Bulk import leads from CSV
  async bulkImportLeads(req, res) {
    try {
      // Get the user ID from the authenticated user
      const userId = req.user?.id;
      
      // If no user ID is available, return an error
      if (!userId) {
        return res.status(401).json({
          error: "Authentication required",
          details: [{ message: "You must be logged in to import leads" }],
        });
      }
      
      if (!req.file && !req.files) {
        return res.status(400).json({ error: "No CSV file uploaded" });
      }

      // Access the uploaded file buffer
      const fileBuffer = req.file ? req.file.buffer : req.files.file.data;
      
      // Get AI feature settings from request body or use defaults
      const aiFeatureSettings = {
        aiAssistantEnabled: req.body.aiAssistantEnabled === 'true',
        enableFollowUps: req.body.enableFollowUps === 'true',
        firstMessageTiming: req.body.firstMessageTiming || 'immediate'
      };
      
      // Log the AI feature settings
      logger.info(`Bulk import with AI settings: ${JSON.stringify(aiFeatureSettings)}`);
      
      // Parse CSV data
      const results = [];
      const errors = [];
      let rowCount = 0;
      
      // Create a readable stream from the buffer
      const bufferStream = new Readable();
      bufferStream.push(fileBuffer);
      bufferStream.push(null);
      
      // Field mappings for flexibility - add variations of column names
      const fieldMappings = {
        name: ['name', 'fullname', 'full name', 'customer name', 'client name', 'contact name'],
        phoneNumber: ['phone number', 'phonenumber', 'phone', 'mobile', 'cell', 'telephone', 'contact number', 'cell number', 'mobile number'],
        email: ['email', 'email address', 'mail', 'e-mail'],
        status: ['status', 'lead status', 'customer status', 'client status'],
      };
      
      // Create a normalized field map based on actual headers
      let normalizedFieldMap = null;
      
      // Process the stream with csv-parser
      await new Promise((resolve, reject) => {
        bufferStream
          .pipe(csv())
          .on('data', (data) => {
            rowCount++;
            
            // On first row, create the normalized field map
            if (rowCount === 1 && !normalizedFieldMap) {
              normalizedFieldMap = {};
              
              // Get all headers and normalize them (lowercase, remove spaces)
              const actualHeaders = Object.keys(data).map(header => header.toLowerCase().trim());
              
              // For each field type (name, email, etc.), find its best match in the headers
              Object.entries(fieldMappings).forEach(([fieldName, possibleMatches]) => {
                // Find the first match in the header
                const matchedHeader = actualHeaders.find(header => 
                  possibleMatches.includes(header.toLowerCase())
                );
                
                // If found, create a mapping from the field name to the actual header
                if (matchedHeader) {
                  normalizedFieldMap[fieldName] = Object.keys(data).find(
                    h => h.toLowerCase().trim() === matchedHeader
                  );
                }
              });
              
              // Debug log the field mapping
              logger.info(`CSV import: created field mapping: ${JSON.stringify(normalizedFieldMap)}`);
            }
            
            // Validate required fields
            const rowErrors = [];
            
            // Check for required name field
            const nameValue = normalizedFieldMap.name ? data[normalizedFieldMap.name]?.trim() : '';
            if (!nameValue) {
              rowErrors.push(`Row ${rowCount}: Name is required`);
            }
            
            // Check for required phone field
            const phoneValue = normalizedFieldMap.phoneNumber ? 
              data[normalizedFieldMap.phoneNumber]?.trim() : '';
            if (!phoneValue) {
              rowErrors.push(`Row ${rowCount}: Phone number is required`);
            }
            
            // Extract email (optional)
            const emailValue = normalizedFieldMap.email ? 
              data[normalizedFieldMap.email]?.trim() : '';
            
            // Extract status (optional with default)
            let statusValue = normalizedFieldMap.status ? 
              data[normalizedFieldMap.status]?.trim().toLowerCase() : 'new';
            
            // Validate status if provided
            if (statusValue && !['new', 'contacted', 'qualified', 'lost'].includes(statusValue)) {
              statusValue = 'new'; // Default to 'new' if invalid
            }
            
            // Standardize the data structure - order matches our standard CSV format
            const lead = {
              name: nameValue,
              phoneNumber: phoneValue || '',
              email: emailValue || '',
              status: statusValue || 'new',
              aiAssistantEnabled: aiFeatureSettings.aiAssistantEnabled,
              enableFollowUps: aiFeatureSettings.enableFollowUps,
              firstMessageTiming: aiFeatureSettings.firstMessageTiming,
              userId
            };
            
            if (rowErrors.length > 0) {
              errors.push(...rowErrors);
            } else {
              results.push(lead);
            }
          })
          .on('end', resolve)
          .on('error', (error) => {
            logger.error('Error parsing CSV:', error);
            reject(error);
          });
      });
      
      // If there are validation errors, return them
      if (errors.length > 0) {
        return res.status(400).json({
          error: "Validation errors in CSV file",
          details: errors
        });
      }
      
      // If no valid leads were found
      if (results.length === 0) {
        return res.status(400).json({
          error: "No valid leads found in CSV file",
          details: ["The file appears to be empty or does not contain valid data"]
        });
      }
      
      // Process all leads and create them in the database
      const createdLeads = [];
      const failedLeads = [];
      
      // Use Promise.all for better performance with many leads
      const leadPromises = results.map(async (leadData) => {
        try {
          const lead = await Lead.create(leadData);
          
          // Schedule the first message if follow-ups are enabled
          if (lead.enableFollowUps) {
            await scheduledMessageService.scheduleNextMessage(lead.id);
          }
          
          // Fetch the lead again to include any associations
          const updatedLead = await Lead.findByPk(lead.id);
          createdLeads.push(updatedLead);
          return updatedLead;
        } catch (error) {
          // Handle duplicate emails or other errors
          const errorMessage = error.name === "SequelizeUniqueConstraintError" 
            ? `Lead with email ${leadData.email} already exists` 
            : error.message;
            
          failedLeads.push({
            data: leadData,
            error: errorMessage
          });
          
          // We don't want to throw, we want to process as many leads as possible
          return null;
        }
      });
      
      await Promise.all(leadPromises);
      
      res.status(201).json({
        success: true,
        message: `Processed ${results.length} leads, created ${createdLeads.length} leads`,
        created: createdLeads,
        failed: failedLeads
      });
    } catch (error) {
      logger.error("Error processing bulk lead upload:", error);
      res.status(500).json({ error: "Failed to process bulk lead upload", details: error.message });
    }
  },
  
  // Generate a CSV template for lead uploads
  async downloadLeadTemplate(req, res) {
    try {
      // Set the appropriate headers
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="lead-template.csv"');
      
      // Define the column headers we're using
      const headers = 'Name,Phone Number,Email,Status';
      
      // Create a simplified CSV template with standardized column headers
      const csvTemplate = [
        // Headers row
        headers,
        // Example row 1 - basic required fields
        'John Doe,+1234567890,john@example.com,new',
        // Example row 2 - different status value
        'Jane Smith,+1987654321,jane@example.com,contacted',
        // Example row 3 - minimal required fields (name and phone only)
        'Michael Johnson,+1654987320,,qualified',
        // Example row 4 - international number format example
        'Sara Wilson,+44 20 1234 5678,sara@example.com,lost'
      ].join('\n');
      
      // Log that template is being downloaded
      logger.info(`Lead CSV template downloaded with headers: ${headers}`);
      
      // Send the CSV template
      res.send(csvTemplate);
    } catch (error) {
      logger.error("Error generating lead template:", error);
      res.status(500).json({ error: "Failed to generate lead template" });
    }
  },

  // Fix lead scheduling
  async fixLeadScheduling(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`Fixing scheduling for lead ${id}`);
      
      // Use the utility function to reset the lead's next scheduled message
      const result = await scheduledMessageService.resetScheduledMessage(id);
      
      if (!result.success) {
        return res.status(404).json({ error: result.message });
      }
      
      // Return detailed information about the fix
      res.json({
        message: "Lead scheduling fixed successfully",
        details: result
      });
    } catch (error) {
      logger.error("Error fixing lead scheduling:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Schedule a new follow-up message
  async scheduleFollowUp(req, res) {
    try {
      const { id } = req.params;
      
      logger.info(`Scheduling new follow-up for lead ${id} after AI Assistant toggle`);
      
      // First, find the lead to verify it exists and get its current state
      const lead = await Lead.findByPk(id);
      
      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }
      
      // Verify AI Assistant is enabled
      if (!lead.aiAssistantEnabled) {
        return res.status(400).json({ 
          error: "Cannot schedule follow-up when AI Assistant is disabled"
        });
      }
      
      // Schedule the next message based on lead status
      await scheduledMessageService.scheduleNextMessage(id);
      
      // Fetch the updated lead to get the new scheduled message date
      const updatedLead = await Lead.findByPk(id);
      
      res.json({
        message: "Follow-up scheduled successfully",
        nextScheduledMessage: updatedLead.nextScheduledMessage,
        status: updatedLead.status
      });
    } catch (error) {
      logger.error("Error scheduling follow-up:", error);
      res.status(500).json({ error: error.message });
    }
  },
  
  // Fix all lead schedule intervals to be 7 days
  async fixAllScheduleIntervals(req, res) {
    try {
      logger.info('Starting fix for all lead schedule intervals...');
      
      // Find all leads with scheduled messages
      const leads = await Lead.findAll({
        where: {
          nextScheduledMessage: {
            [Op.not]: null
          },
          aiAssistantEnabled: true
        }
      });
      
      logger.info(`Found ${leads.length} leads with scheduled messages to check`);
      
      let fixedCount = 0;
      const results = [];
      
      for (const lead of leads) {
        try {
          // Skip leads without a lastMessageDate
          if (!lead.lastMessageDate) {
            results.push({
              leadId: lead.id,
              status: 'skipped',
              reason: 'No last message date'
            });
            continue;
          }
          
          const lastMessageDate = new Date(lead.lastMessageDate);
          const currentScheduledDate = new Date(lead.nextScheduledMessage);
          
          // Calculate the current interval in milliseconds and convert to days
          const currentIntervalMs = currentScheduledDate.getTime() - lastMessageDate.getTime();
          const currentIntervalDays = Math.round(currentIntervalMs / (1000 * 60 * 60 * 24));
          
          // If the interval is not 7 days, fix it
          if (currentIntervalDays !== 7) {
            // Calculate the correct date (7 days from last message)
            const correctedDate = new Date(lastMessageDate);
            correctedDate.setDate(correctedDate.getDate() + 7);
            
            // Update the lead
            await lead.update({ 
              nextScheduledMessage: correctedDate 
            });
            
            results.push({
              leadId: lead.id,
              status: 'fixed',
              oldInterval: currentIntervalDays,
              oldDate: currentScheduledDate.toISOString(),
              newDate: correctedDate.toISOString()
            });
            
            fixedCount++;
          } else {
            results.push({
              leadId: lead.id,
              status: 'ok',
              interval: currentIntervalDays
            });
          }
        } catch (error) {
          logger.error(`Error processing lead ${lead.id}:`, error);
          results.push({
            leadId: lead.id,
            status: 'error',
            error: error.message
          });
        }
      }
      
      logger.info(`Fixed ${fixedCount} leads with incorrect intervals`);
      
      res.json({
        message: `Fixed ${fixedCount} out of ${leads.length} leads with incorrect follow-up intervals`,
        fixedCount,
        totalCount: leads.length,
        results
      });
    } catch (error) {
      logger.error("Error fixing all lead schedule intervals:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Update lead status
  async updateLeadStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }

      const lead = await Lead.findByPk(id);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      // Update lead status
      await lead.update({ status });

      // Schedule next follow-up based on new status
      await scheduledMessageService.scheduleFollowUp(id, new Date());

      res.json(lead);
    } catch (error) {
      logger.error("Error updating lead status:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Mark lead as qualified
  async markLeadAsQualified(req, res) {
    try {
      const { id } = req.params;

      const lead = await leadStatusService.markAsQualified(id);

      if (!lead) {
        return res.status(404).json({ error: "Lead not found" });
      }

      res.json(lead);
    } catch (error) {
      logger.error("Error marking lead as qualified:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Process inactive leads
  async processInactiveLeads(req, res) {
    try {
      const count = await leadStatusService.markInactiveLeads();
      res.json({ 
        success: true, 
        message: `${count} leads marked as inactive` 
      });
    } catch (error) {
      logger.error("Error processing inactive leads:", error);
      res.status(500).json({ error: error.message });
    }
  },

  // Add this new endpoint to fix leads with null userId
  async fixLeadsWithoutUser(req, res) {
    try {
      // Find leads with null userId
      const leads = await Lead.findAll({
        where: { userId: null }
      });
      
      if (leads.length === 0) {
        return res.json({ message: "No leads without userId found" });
      }
      
      // Find the first user to assign these leads to
      const User = require("../models/User");
      const firstUser = await User.findOne({
        order: [['createdAt', 'ASC']]
      });
      
      if (!firstUser) {
        return res.status(404).json({ error: "No users found in system" });
      }
      
      // Update all leads to assign them to this user
      const userIdToAssign = firstUser.id;
      
      const updatedCount = await Lead.update(
        { userId: userIdToAssign },
        { where: { userId: null } }
      );
      
      logger.info(`Fixed ${updatedCount[0]} leads by assigning them to user ${userIdToAssign}`);
      
      return res.json({ 
        message: `Fixed ${updatedCount[0]} leads by assigning them to user ${userIdToAssign}`,
        updatedCount: updatedCount[0]
      });
    } catch (error) {
      logger.error("Error fixing leads without userId:", error);
      res.status(500).json({ error: "Failed to fix leads" });
    }
  }
};

export default leadController;
