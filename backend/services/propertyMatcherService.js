const propertyService = require('./propertyService');
const twilioService = require('./twilioService');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const LeadPropertySearch = require('../models/LeadPropertySearch');
const PropertyMatch = require('../models/PropertyMatch');
const Property = require('../models/Property');
const cron = require('node-cron');
const logger = require('../utils/logger');

const propertyMatcherService = {
  // Initialize the service and set up scheduled jobs
  init() {
    // Run property matching daily at 1:00 AM
    cron.schedule('0 1 * * *', async () => {
      logger.info('Running scheduled property matching job');
      await this.runPropertyMatching();
    });
    
    // Send property recommendations at 10:00 AM
    cron.schedule('0 10 * * *', async () => {
      logger.info('Running scheduled property recommendations job');
      await this.sendPropertyRecommendations();
    });
    
    logger.info('Property matcher service initialized');
  },
  
  // Run matching for all active property searches
  async runPropertyMatching() {
    try {
      // Get all active searches
      const activeSearches = await LeadPropertySearch.findAll({
        where: { isActive: true }
      });
      
      logger.info(`Running property matching for ${activeSearches.length} active searches`);
      
      // Find matches for each search
      let totalMatches = 0;
      for (const search of activeSearches) {
        const newMatches = await propertyService.findMatchesForSearch(search.id);
        totalMatches += newMatches;
      }
      
      logger.info(`Property matching completed, created ${totalMatches} new matches`);
    } catch (error) {
      logger.error('Error in property matching job:', error);
    }
  },
  
  // Send property recommendations to leads
  async sendPropertyRecommendations() {
    try {
      // Get leads with active property searches
      const leadsWithSearches = await Lead.findAll({
        include: [{
          model: LeadPropertySearch,
          where: { isActive: true },
          required: true
        }]
      });
      
      logger.info(`Sending property recommendations to ${leadsWithSearches.length} leads`);
      
      let totalRecommendationsSent = 0;
      for (const lead of leadsWithSearches) {
        const sent = await this.sendRecommendationsToLead(lead.id);
        if (sent) totalRecommendationsSent++;
      }
      
      logger.info(`Property recommendations sent to ${totalRecommendationsSent} leads`);
    } catch (error) {
      logger.error('Error in property recommendations job:', error);
    }
  },
  
  // Send recommendations to a specific lead
  async sendRecommendationsToLead(leadId) {
    try {
      const lead = await Lead.findByPk(leadId);
      if (!lead) {
        logger.warn(`Lead ${leadId} not found`);
        return false;
      }
      
      // Check if AI assistant is enabled for this lead
      if (!lead.aiAssistantEnabled) {
        logger.info(`AI assistant disabled for lead ${leadId}, skipping property recommendations`);
        return false;
      }
      
      // Get top matches for this lead
      const matches = await propertyService.getTopMatchesForLead(leadId, 3);
      if (matches.length === 0) {
        logger.info(`No new property matches for lead ${leadId}`);
        return false;
      }
      
      // Format message with property recommendations
      let message = `Hi ${lead.name}, I found ${matches.length} properties that match what you're looking for:\n\n`;
      
      matches.forEach((match, index) => {
        const property = match.Property;
        message += `${index + 1}. ${property.address}, ${property.city}: ${property.bedrooms} bed, ${property.bathrooms} bath, $${property.price.toLocaleString()}\n`;
      });
      
      message += `\nReply with the number of any property you'd like to learn more about, or "show more" to see additional options.`;
      
      // Send message via Twilio
      const twilioMessage = await twilioService.sendMessage(
        lead.phoneNumber,
        message
      );
      
      // Create message record
      await Message.create({
        leadId: lead.id,
        text: message,
        sender: "agent",
        direction: "outbound",
        twilioSid: twilioMessage.sid,
        isAiGenerated: true,
        metadata: {
          isPropertyRecommendation: true,
          matchIds: matches.map(m => m.id)
        }
      });
      
      // Mark matches as sent
      await propertyService.markMatchesAsSent(matches.map(m => m.id));
      
      logger.info(`Sent ${matches.length} property recommendations to lead ${leadId}`);
      return true;
    } catch (error) {
      logger.error(`Error sending recommendations to lead ${leadId}:`, error);
      return false;
    }
  },
  
  // Handle a lead's response to property recommendations
  async handlePropertyResponse(leadId, messageText) {
    try {
      // Check if the message is a number or "show more"
      const showMoreMatch = /show\s+more/i.test(messageText);
      const numberMatch = messageText.match(/^[1-9]\d*$/);
      
      if (!showMoreMatch && !numberMatch) {
        logger.info(`Lead ${leadId} message "${messageText}" does not appear to be a property response`);
        return null;
      }
      
      if (showMoreMatch) {
        // Get additional properties
        const matches = await propertyService.getTopMatchesForLead(leadId, 5);
        if (matches.length === 0) {
          return "I don't have any more properties that match your criteria at the moment. I'll let you know when new listings become available.";
        }
        
        // Format message with property recommendations
        let response = `Here are ${matches.length} more properties that match what you're looking for:\n\n`;
        
        matches.forEach((match, index) => {
          const property = match.Property;
          response += `${index + 1}. ${property.address}, ${property.city}: ${property.bedrooms} bed, ${property.bathrooms} bath, $${property.price.toLocaleString()}\n`;
        });
        
        response += `\nReply with the number of any property you'd like to learn more about.`;
        
        // Mark matches as sent
        await propertyService.markMatchesAsSent(matches.map(m => m.id));
        
        return response;
      } else if (numberMatch) {
        // Get the property number
        const propertyNum = parseInt(numberMatch[0], 10);
        
        // Get recent messages with property recommendations
        const recentMessages = await Message.findAll({
          where: { 
            leadId,
            sender: "agent",
            metadata: {
              isPropertyRecommendation: true
            }
          },
          order: [["createdAt", "DESC"]],
          limit: 2
        });
        
        if (recentMessages.length === 0) {
          return "I'm not sure which property you're referring to. Would you like me to send you some property recommendations?";
        }
        
        // Get property matches from the recent messages
        const matchIds = [];
        recentMessages.forEach(msg => {
          if (msg.metadata && msg.metadata.matchIds) {
            matchIds.push(...msg.metadata.matchIds);
          }
        });
        
        if (matchIds.length === 0 || propertyNum > matchIds.length) {
          return "I'm sorry, but I couldn't find the property you're referring to. Would you like me to send you some new property recommendations?";
        }
        
        // Get the selected property match
        const matchId = matchIds[propertyNum - 1];
        const match = await PropertyMatch.findOne({
          where: { id: matchId },
          include: [{ model: Property }]
        });
        
        if (!match) {
          return "I'm sorry, but I couldn't find details for that property. Would you like me to send you some new property recommendations?";
        }
        
        // Update lead interest
        await propertyService.updateLeadInterest(matchId, "interested");
        
        // Get the property details
        const property = match.Property;
        
        // Format detailed response
        let response = `Here are the details for ${property.address}, ${property.city}:\n\n`;
        response += `• $${property.price.toLocaleString()}\n`;
        response += `• ${property.bedrooms} bed, ${property.bathrooms} bath\n`;
        response += `• ${property.squareFeet.toLocaleString()} square feet\n`;
        response += `• ${property.propertyType}\n`;
        
        if (property.features && property.features.length > 0) {
          response += `• Features: ${property.features.join(", ")}\n`;
        }
        
        if (property.description) {
          response += `\n${property.description}\n\n`;
        }
        
        response += `Would you like to schedule a viewing for this property?`;
        
        return response;
      }
      
      return null;
    } catch (error) {
      logger.error(`Error handling property response for lead ${leadId}:`, error);
      return null;
    }
  }
};

module.exports = propertyMatcherService; 