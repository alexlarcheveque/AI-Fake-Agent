const Property = require("../models/Property");
const LeadPropertySearch = require("../models/LeadPropertySearch");
const PropertyMatch = require("../models/PropertyMatch");
const { Op } = require("sequelize");
const logger = require("../utils/logger");

const propertyService = {
  // Add or update a property in the database
  async upsertProperty(propertyData) {
    try {
      const { externalId } = propertyData;
      
      if (externalId) {
        const existingProperty = await Property.findOne({ where: { externalId } });
        if (existingProperty) {
          logger.info(`Updating existing property with externalId: ${externalId}`);
          return await existingProperty.update(propertyData);
        }
      }
      
      logger.info(`Creating new property: ${propertyData.address}`);
      return await Property.create(propertyData);
    } catch (error) {
      logger.error("Error in upsertProperty:", error);
      throw error;
    }
  },
  
  // Create or update a lead's property search
  async saveLeadPropertySearch(leadId, searchCriteria) {
    try {
      // Find active search for this lead or create a new one
      const [search, created] = await LeadPropertySearch.findOrCreate({
        where: { leadId, isActive: true },
        defaults: {
          ...searchCriteria,
          isActive: true
        }
      });
      
      if (!created) {
        // Update existing search
        logger.info(`Updating existing property search for lead ${leadId}`);
        await search.update(searchCriteria);
      } else {
        logger.info(`Created new property search for lead ${leadId}`);
      }
      
      // Run matching algorithm if we have properties in the database
      const propertiesCount = await Property.count();
      if (propertiesCount > 0) {
        await this.findMatchesForSearch(search.id);
      } else {
        logger.info("No properties in database, skipping matching");
      }
      
      return search;
    } catch (error) {
      logger.error("Error in saveLeadPropertySearch:", error);
      throw error;
    }
  },
  
  // Find property matches for a search
  async findMatchesForSearch(searchId) {
    try {
      const search = await LeadPropertySearch.findByPk(searchId);
      if (!search) {
        throw new Error("Search not found");
      }
      
      logger.info(`Finding property matches for search ${searchId} (Lead ${search.leadId})`);
      
      // Build query based on search criteria
      const whereClause = { status: 'Active' };
      
      // Add bedroom criteria
      if (search.minBedrooms) {
        whereClause.bedrooms = { [Op.gte]: search.minBedrooms };
      }
      
      // Add bathroom criteria
      if (search.minBathrooms) {
        whereClause.bathrooms = { [Op.gte]: search.minBathrooms };
      }
      
      // Add price criteria
      if (search.minPrice || search.maxPrice) {
        whereClause.price = {};
        if (search.minPrice) whereClause.price[Op.gte] = search.minPrice;
        if (search.maxPrice) whereClause.price[Op.lte] = search.maxPrice;
      }
      
      // Add square footage criteria
      if (search.minSquareFeet) {
        whereClause.squareFeet = { [Op.gte]: search.minSquareFeet };
      }
      
      // Add property type criteria
      if (search.propertyTypes && search.propertyTypes.length > 0) {
        whereClause.propertyType = { [Op.in]: search.propertyTypes };
      }
      
      // For locations, we need a more complex query with OR conditions
      const locationConditions = [];
      if (search.locations && search.locations.length > 0) {
        search.locations.forEach(location => {
          if (location && location.trim()) {
            locationConditions.push(
              { city: { [Op.like]: `%${location.trim()}%` } },
              { zipCode: { [Op.like]: `%${location.trim()}%` } },
              { address: { [Op.like]: `%${location.trim()}%` } }
            );
          }
        });
      }
      
      // Find matching properties
      const properties = await Property.findAll({
        where: {
          ...whereClause,
          ...(locationConditions.length > 0 ? { [Op.or]: locationConditions } : {})
        },
        limit: 50 // Prevent excessive matches
      });
      
      logger.info(`Found ${properties.length} potential property matches`);
      
      // Calculate match scores and save
      let matchesCreated = 0;
      for (const property of properties) {
        const matchScore = this.calculateMatchScore(property, search);
        
        // Only save if match score is above threshold
        if (matchScore > 60) {
          const [match, created] = await PropertyMatch.findOrCreate({
            where: {
              leadId: search.leadId,
              propertyId: property.id,
              searchId: search.id
            },
            defaults: {
              matchScore,
              wasSent: false,
              wasViewed: false,
              leadInterest: "unknown"
            }
          });
          
          if (!created) {
            // Update match score if it changed
            if (match.matchScore !== matchScore) {
              await match.update({ matchScore });
            }
          } else {
            matchesCreated++;
          }
        }
      }
      
      logger.info(`Created ${matchesCreated} new property matches`);
      return matchesCreated;
    } catch (error) {
      logger.error("Error in findMatchesForSearch:", error);
      throw error;
    }
  },
  
  // Calculate how well a property matches search criteria (0-100%)
  calculateMatchScore(property, search) {
    let totalPoints = 0;
    let availablePoints = 0;
    
    // Bedrooms match
    if (search.minBedrooms) {
      availablePoints += 15;
      if (property.bedrooms >= search.minBedrooms) {
        totalPoints += 15;
      } else if (property.bedrooms >= search.minBedrooms - 1) {
        totalPoints += 5; // Close match
      }
    }
    
    // Bathrooms match
    if (search.minBathrooms) {
      availablePoints += 15;
      if (property.bathrooms >= search.minBathrooms) {
        totalPoints += 15;
      } else if (property.bathrooms >= search.minBathrooms - 0.5) {
        totalPoints += 5; // Close match
      }
    }
    
    // Price match
    if (search.minPrice || search.maxPrice) {
      availablePoints += 25;
      
      if (search.minPrice && search.maxPrice) {
        // Both min and max specified
        if (property.price >= search.minPrice && property.price <= search.maxPrice) {
          totalPoints += 25;
        } else if (
          (property.price >= search.minPrice * 0.9 && property.price < search.minPrice) ||
          (property.price > search.maxPrice && property.price <= search.maxPrice * 1.1)
        ) {
          totalPoints += 10; // Close match
        }
      } else if (search.maxPrice && property.price <= search.maxPrice) {
        totalPoints += 25;
      } else if (search.minPrice && property.price >= search.minPrice) {
        totalPoints += 25;
      }
    }
    
    // Square feet match
    if (search.minSquareFeet) {
      availablePoints += 15;
      if (property.squareFeet >= search.minSquareFeet) {
        totalPoints += 15;
      } else if (property.squareFeet >= search.minSquareFeet * 0.9) {
        totalPoints += 5; // Close match
      }
    }
    
    // Property type match
    if (search.propertyTypes && search.propertyTypes.length > 0) {
      availablePoints += 10;
      if (search.propertyTypes.includes(property.propertyType)) {
        totalPoints += 10;
      }
    }
    
    // Location match
    if (search.locations && search.locations.length > 0) {
      availablePoints += 30;
      
      const locationMatches = search.locations.some(location => {
        if (!location) return false;
        
        const locationLower = location.toLowerCase().trim();
        return (
          property.city.toLowerCase().includes(locationLower) ||
          property.zipCode.includes(locationLower) ||
          property.address.toLowerCase().includes(locationLower)
        );
      });
      
      if (locationMatches) {
        totalPoints += 30;
      }
    }
    
    // Calculate percentage
    return availablePoints > 0 ? (totalPoints / availablePoints) * 100 : 0;
  },
  
  // Get top property matches for a lead
  async getTopMatchesForLead(leadId, limit = 5) {
    try {
      const matches = await PropertyMatch.findAll({
        where: { leadId, wasSent: false },
        order: [['matchScore', 'DESC']],
        limit,
        include: [{ model: Property }]
      });
      
      logger.info(`Retrieved ${matches.length} top matches for lead ${leadId}`);
      return matches;
    } catch (error) {
      logger.error("Error in getTopMatchesForLead:", error);
      throw error;
    }
  },
  
  // Mark properties as sent to lead
  async markMatchesAsSent(matchIds) {
    try {
      if (!matchIds || matchIds.length === 0) return 0;
      
      const result = await PropertyMatch.update(
        { wasSent: true },
        { where: { id: { [Op.in]: matchIds } } }
      );
      
      logger.info(`Marked ${result[0]} property matches as sent`);
      return result[0];
    } catch (error) {
      logger.error("Error in markMatchesAsSent:", error);
      throw error;
    }
  },
  
  // Update lead interest in property
  async updateLeadInterest(matchId, interest) {
    try {
      if (!['unknown', 'interested', 'not_interested'].includes(interest)) {
        throw new Error("Invalid interest value");
      }
      
      const match = await PropertyMatch.findByPk(matchId);
      if (!match) {
        throw new Error("Property match not found");
      }
      
      await match.update({ leadInterest: interest });
      logger.info(`Updated lead interest to ${interest} for match ${matchId}`);
      
      return match;
    } catch (error) {
      logger.error("Error in updateLeadInterest:", error);
      throw error;
    }
  }
};

module.exports = propertyService; 