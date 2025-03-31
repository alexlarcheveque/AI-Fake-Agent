const express = require("express");
const router = express.Router();
const propertyService = require("../services/propertyService");
const auth = require("../middleware/auth");
const PropertyMatch = require("../models/PropertyMatch");
const Property = require("../models/Property");
const LeadPropertySearch = require("../models/LeadPropertySearch");
const logger = require("../utils/logger");
const { Op } = require("sequelize");

// Get property searches for a lead
router.get("/searches/lead/:leadId", auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    
    const searches = await LeadPropertySearch.findAll({
      where: { leadId },
      order: [["createdAt", "DESC"]]
    });
    
    res.json(searches);
  } catch (error) {
    logger.error("Error fetching property searches:", error);
    res.status(500).json({ error: "Failed to fetch property searches" });
  }
});

// Get property matches for a lead
router.get("/matches/lead/:leadId", auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const { limit = 10, offset = 0 } = req.query;
    
    const matches = await PropertyMatch.findAll({
      where: { leadId },
      order: [["matchScore", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{ model: Property }]
    });
    
    res.json(matches);
  } catch (error) {
    logger.error("Error fetching property matches:", error);
    res.status(500).json({ error: "Failed to fetch property matches" });
  }
});

// Get a specific property
router.get("/properties/:propertyId", auth, async (req, res) => {
  try {
    const { propertyId } = req.params;
    
    const property = await Property.findByPk(propertyId);
    if (!property) {
      return res.status(404).json({ error: "Property not found" });
    }
    
    res.json(property);
  } catch (error) {
    logger.error("Error fetching property:", error);
    res.status(500).json({ error: "Failed to fetch property" });
  }
});

// Add a new property
router.post("/properties", auth, async (req, res) => {
  try {
    const propertyData = req.body;
    
    // Basic validation
    if (!propertyData.address || !propertyData.city || !propertyData.price) {
      return res.status(400).json({ 
        error: "Required fields missing",
        requiredFields: ["address", "city", "price", "bedrooms", "bathrooms", "squareFeet", "propertyType"] 
      });
    }
    
    const property = await propertyService.upsertProperty(propertyData);
    res.status(201).json(property);
  } catch (error) {
    logger.error("Error creating property:", error);
    res.status(500).json({ error: "Failed to create property" });
  }
});

// Update lead interest in a property
router.put("/matches/:matchId/interest", auth, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { interest } = req.body;
    
    if (!["unknown", "interested", "not_interested"].includes(interest)) {
      return res.status(400).json({ error: "Invalid interest value" });
    }
    
    const match = await propertyService.updateLeadInterest(matchId, interest);
    res.json(match);
  } catch (error) {
    logger.error("Error updating lead interest:", error);
    res.status(500).json({ error: "Failed to update lead interest" });
  }
});

// Create a new property search for a lead
router.post("/searches/lead/:leadId", auth, async (req, res) => {
  try {
    const { leadId } = req.params;
    const searchCriteria = req.body;
    
    const search = await propertyService.saveLeadPropertySearch(leadId, searchCriteria);
    res.status(201).json(search);
  } catch (error) {
    logger.error("Error creating property search:", error);
    res.status(500).json({ error: "Failed to create property search" });
  }
});

// Add a search endpoint
router.get("/search", auth, async (req, res) => {
  try {
    const searchCriteria = req.query;
    console.log("Received property search criteria:", searchCriteria);
    
    // Convert string values to appropriate types
    const criteria = {
      minBedrooms: searchCriteria.minBedrooms ? parseInt(searchCriteria.minBedrooms) : null,
      maxBedrooms: searchCriteria.maxBedrooms ? parseInt(searchCriteria.maxBedrooms) : null,
      minBathrooms: searchCriteria.minBathrooms ? parseFloat(searchCriteria.minBathrooms) : null,
      maxBathrooms: searchCriteria.maxBathrooms ? parseFloat(searchCriteria.maxBathrooms) : null,
      minPrice: searchCriteria.minPrice ? parseInt(searchCriteria.minPrice) : null,
      maxPrice: searchCriteria.maxPrice ? parseInt(searchCriteria.maxPrice) : null,
      minSquareFeet: searchCriteria.minSquareFeet ? parseInt(searchCriteria.minSquareFeet) : null,
      maxSquareFeet: searchCriteria.maxSquareFeet ? parseInt(searchCriteria.maxSquareFeet) : null,
      locations: searchCriteria.locations ? 
        (typeof searchCriteria.locations === 'string' ? 
          [searchCriteria.locations] : searchCriteria.locations) : 
        [],
      propertyTypes: searchCriteria.propertyTypes ?
        (typeof searchCriteria.propertyTypes === 'string' ? 
          [searchCriteria.propertyTypes] : searchCriteria.propertyTypes) :
        []
    };
    
    // Build the where clause for the query
    const where = { status: 'Active' };
    
    // Add bedroom criteria
    if (criteria.minBedrooms) {
      where.bedrooms = { [Op.gte]: criteria.minBedrooms };
    }
    if (criteria.maxBedrooms) {
      where.bedrooms = where.bedrooms || {};
      where.bedrooms[Op.lte] = criteria.maxBedrooms;
    }
    
    // Add bathroom criteria
    if (criteria.minBathrooms) {
      where.bathrooms = { [Op.gte]: criteria.minBathrooms };
    }
    if (criteria.maxBathrooms) {
      where.bathrooms = where.bathrooms || {};
      where.bathrooms[Op.lte] = criteria.maxBathrooms;
    }
    
    // Add price criteria
    if (criteria.minPrice || criteria.maxPrice) {
      where.price = {};
      if (criteria.minPrice) where.price[Op.gte] = criteria.minPrice;
      if (criteria.maxPrice) where.price[Op.lte] = criteria.maxPrice;
    }
    
    // Add square footage criteria
    if (criteria.minSquareFeet) {
      where.squareFeet = { [Op.gte]: criteria.minSquareFeet };
    }
    if (criteria.maxSquareFeet) {
      where.squareFeet = where.squareFeet || {};
      where.squareFeet[Op.lte] = criteria.maxSquareFeet;
    }
    
    // Add property type criteria
    if (criteria.propertyTypes && criteria.propertyTypes.length > 0) {
      where.propertyType = { [Op.in]: criteria.propertyTypes };
    }
    
    // For locations, we need a more complex query with OR conditions for city, zipCode, or address
    const locationConditions = [];
    if (criteria.locations && criteria.locations.length > 0) {
      criteria.locations.forEach(location => {
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
        ...where,
        ...(locationConditions.length > 0 ? { [Op.or]: locationConditions } : {})
      },
      limit: 10, // Limit to 10 results for the API endpoint
      order: [['createdAt', 'DESC']]
    });
    
    res.json(properties);
  } catch (error) {
    logger.error("Error searching properties:", error);
    res.status(500).json({ error: "Failed to search properties" });
  }
});

module.exports = router; 