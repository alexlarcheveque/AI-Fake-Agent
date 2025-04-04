import axios, { AxiosError } from 'axios';
import { parseNewPropertySearchFormat } from "./propertySearchParser";

// Use import.meta.env for Vite projects instead of process.env
const API_URL = (import.meta.env?.VITE_API_URL as string) || '';

export interface PropertySearchCriteria {
  // Keep only minBedrooms/maxBedrooms, removing beds/bedrooms/minBeds/maxBeds
  minBedrooms?: number;
  maxBedrooms?: number;
  
  // Keep only minBathrooms/maxBathrooms, removing baths/bathrooms/minBaths/maxBaths
  minBathrooms?: number;
  maxBathrooms?: number;
  
  // Price range remains the same
  minPrice?: number;
  maxPrice?: number;
  
  // Keep only minSquareFeet/maxSquareFeet, removing minSqft/maxSqft
  minSquareFeet?: number;
  maxSquareFeet?: number;
  
  // Locations array preferred over single location
  locations?: string[];
  location?: string; // Keep for backward compatibility
  
  propertyTypes?: string[];
  isActive?: boolean;
}

// Backend criteria interface that allows null values for numeric fields
interface BackendPropertySearchCriteria {
  minBedrooms?: number | null;
  maxBedrooms?: number | null;
  minBathrooms?: number | null;
  maxBathrooms?: number | null;
  minPrice?: number | null;
  maxPrice?: number | null;
  minSquareFeet?: number | null;
  maxSquareFeet?: number | null;
  locations?: string[];
  propertyTypes?: string[];
  isActive?: boolean;
  [key: string]: any;
}


// Local error handler
const handleApiError = (error: unknown): any => {
  console.error('API Error:', error);
  if (axios.isAxiosError(error)) {
    console.error('Error details:', (error as AxiosError).message);
  }
  return [];
};

const propertySearchApi = {
  parseSearchCriteriaFromAIMessage: (message: string): PropertySearchCriteria | null => {
    // The detection pattern for "NEW SEARCH CRITERIA:"
    const searchPattern = /NEW SEARCH CRITERIA:\s*(.*?)(?:$|\n)/i;
    // Also check for the format the user requested
    const newCriteriaPattern = /NEW CRITERIA SEARCH:\s*(.*?)(?:$|\n)/i;
    const searchMatch = message.match(searchPattern) || message.match(newCriteriaPattern);
    
    if (!searchMatch) {
      // Try to detect criteria in natural language if no explicit NEW SEARCH CRITERIA section
      return propertySearchApi.parseNaturalLanguageCriteria(message);
    }
    
    // Extract the criteria text
    const criteriaText = searchMatch[1];
    
    // Parse the criteria 
    const criteria: PropertySearchCriteria = {};
    
    // Match beds, including X+ format (e.g., "BED:3+" or "BEDS:3-5")
    const bedsRangeMatch = criteriaText.match(/BED(?:S|ROOM(?:S)?)?:?\s*(\d+)\s*-\s*(\d+)/i);
    const bedsPlusMatch = criteriaText.match(/BED(?:S|ROOM(?:S)?)?:?\s*(\d+)\s*\+/i);
    const bedsMatch = criteriaText.match(/BED(?:S|ROOM(?:S)?)?:?\s*(\d+)/i);
    
    if (bedsPlusMatch) {
      criteria.minBedrooms = parseInt(bedsPlusMatch[1]);
    } else if (bedsRangeMatch) {
      criteria.minBedrooms = parseInt(bedsRangeMatch[1]);
      criteria.maxBedrooms = parseInt(bedsRangeMatch[2]);
    } else if (bedsMatch) {
      criteria.minBedrooms = parseInt(bedsMatch[1]);
    }
    
    // Match baths, including X+ format (e.g., "BATH:2.5+" or "BATHS:2-3")
    const bathsRangeMatch = criteriaText.match(/BATH(?:S|ROOM(?:S)?)?:?\s*(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/i);
    const bathsPlusMatch = criteriaText.match(/BATH(?:S|ROOM(?:S)?)?:?\s*(\d+(?:\.\d+)?)\s*\+/i);
    const bathsMatch = criteriaText.match(/BATH(?:S|ROOM(?:S)?)?:?\s*(\d+(?:\.\d+)?)/i);
    
    if (bathsPlusMatch) {
      criteria.minBathrooms = parseFloat(bathsPlusMatch[1]);
    } else if (bathsRangeMatch) {
      criteria.minBathrooms = parseFloat(bathsRangeMatch[1]);
      criteria.maxBathrooms = parseFloat(bathsRangeMatch[2]);
    } else if (bathsMatch) {
      criteria.minBathrooms = parseFloat(bathsMatch[1]);
    }
    
    // Match price range, e.g., "PRICE:$800,000" or "PRICE:$500,000-$800,000"
    const priceRangeMatch = criteriaText.match(/PRICE:?\s*\$?([\d,]+)(?:\s*-\s*\$?([\d,]+))?/i);
    if (priceRangeMatch) {
      const minPrice = priceRangeMatch[1].replace(/,/g, '');
      
      if (priceRangeMatch[2]) {
        criteria.minPrice = parseInt(minPrice);
        const maxPrice = priceRangeMatch[2].replace(/,/g, '');
        criteria.maxPrice = parseInt(maxPrice);
      } else {
        // If only one price is specified, treat it as the maximum price
        criteria.maxPrice = parseInt(minPrice);
      }
    }
    
    // Match square footage, e.g., "SQFT:1500-2500" or "SQFT:2000+"
    const sqftRangeMatch = criteriaText.match(/SQFT:?\s*([\d,]+)\s*-\s*([\d,]+)/i);
    const sqftPlusMatch = criteriaText.match(/SQFT:?\s*([\d,]+)\s*\+/i);
    const sqftMatch = criteriaText.match(/SQFT:?\s*([\d,]+)/i);
    
    if (sqftRangeMatch) {
      const minSqft = sqftRangeMatch[1].replace(/,/g, '');
      const maxSqft = sqftRangeMatch[2].replace(/,/g, '');
      criteria.minSquareFeet = parseInt(minSqft);
      criteria.maxSquareFeet = parseInt(maxSqft);
    } else if (sqftPlusMatch) {
      const minSqft = sqftPlusMatch[1].replace(/,/g, '');
      criteria.minSquareFeet = parseInt(minSqft);
    } else if (sqftMatch) {
      const sqft = sqftMatch[1].replace(/,/g, '');
      criteria.minSquareFeet = parseInt(sqft);
    }
    
    // Match locations (look for any text not part of the other criteria)
    const locationMatches = criteriaText.match(/(?:IN|LOCATION|AREA):\s*([^,]+(?:,\s*[^,]+)*)/i);
    if (locationMatches) {
      const locationString = locationMatches[1].trim();
      if (locationString.includes(',')) {
        criteria.locations = locationString.split(',').map(loc => loc.trim());
      } else {
        criteria.location = locationString;
      }
    } else {
      // Try to find standalone location mentions (not tagged with LOCATION:)
      const words = criteriaText.split(/\s+/);
      const potentialLocations = words.filter(word => 
        !word.match(/BED|BATH|PRICE|SQFT|:|\d+/i) && 
        word.length > 3
      );
      
      if (potentialLocations.length > 0) {
        const locationString = potentialLocations.join(' ').trim();
        if (locationString.includes(',')) {
          criteria.locations = locationString.split(',').map(loc => loc.trim());
        } else {
          criteria.location = locationString;
        }
      }
    }
    
    // If we have any criteria found, log them
    if (Object.keys(criteria).length > 0) {
      console.log("Successfully parsed search criteria:", criteria);
    }
    
    return Object.keys(criteria).length > 0 ? criteria : null;
  },
  
  // Parse natural language references to property criteria
  parseNaturalLanguageCriteria: (message: string): PropertySearchCriteria | null => {
    const criteria: PropertySearchCriteria = {};
    let hasMatch = false;
    
    // Look for bedrooms in natural language
    const minBedroomsMatch = message.match(/(\d+)\s*\+\s*(?:bedroom|bed|br)/i); // "4+ bedrooms"
    const bedroomsRangeMatch = message.match(/(\d+)\s*-\s*(\d+)\s*(?:bedroom|bed|br)/i); // "3-5 bedrooms"
    const bedroomsMatch = message.match(/(\d+)\s*(?:bedroom|bed|br)/i); // "3 bedrooms"
    
    if (minBedroomsMatch) {
      criteria.minBedrooms = parseInt(minBedroomsMatch[1]);
      hasMatch = true;
    } else if (bedroomsRangeMatch) {
      criteria.minBedrooms = parseInt(bedroomsRangeMatch[1]);
      criteria.maxBedrooms = parseInt(bedroomsRangeMatch[2]);
      hasMatch = true;
    } else if (bedroomsMatch) {
      criteria.minBedrooms = parseInt(bedroomsMatch[1]);
      hasMatch = true;
    }
    
    // Look for bathrooms in natural language
    const minBathroomsMatch = message.match(/(\d+(?:\.\d+)?)\s*\+\s*(?:bathroom|bath|ba)/i); // "2.5+ bathrooms"
    const bathroomsRangeMatch = message.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*(?:bathroom|bath|ba)/i); // "2-3 bathrooms"
    const bathroomsMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:bathroom|bath|ba)/i); // "2 bathrooms"
    
    if (minBathroomsMatch) {
      criteria.minBathrooms = parseFloat(minBathroomsMatch[1]);
      hasMatch = true;
    } else if (bathroomsRangeMatch) {
      criteria.minBathrooms = parseFloat(bathroomsRangeMatch[1]);
      criteria.maxBathrooms = parseFloat(bathroomsRangeMatch[2]);
      hasMatch = true;
    } else if (bathroomsMatch) {
      criteria.minBathrooms = parseFloat(bathroomsMatch[1]);
      hasMatch = true;
    }
    
    // Look for price ranges
    const priceRangeMatch = message.match(/(?:price range|budget|price)[^\$]*\$?(\d+(?:[,\.]\d+)?)\s*(?:k|thousand|m|million)?(?:\s*-\s*|\s*to\s*)\$?(\d+(?:[,\.]\d+)?)\s*(?:k|thousand|m|million)?/i);
    if (priceRangeMatch) {
      let minPrice = priceRangeMatch[1].replace(/[,\s]/g, '');
      let maxPrice = priceRangeMatch[2].replace(/[,\s]/g, '');
      
      // Convert shorthand to full numbers
      if (priceRangeMatch[1].toLowerCase().includes('k') || priceRangeMatch[1].toLowerCase().includes('thousand')) {
        minPrice = (parseFloat(minPrice) * 1000).toString();
      } else if (priceRangeMatch[1].toLowerCase().includes('m') || priceRangeMatch[1].toLowerCase().includes('million')) {
        minPrice = (parseFloat(minPrice) * 1000000).toString();
      }
      
      if (priceRangeMatch[2].toLowerCase().includes('k') || priceRangeMatch[2].toLowerCase().includes('thousand')) {
        maxPrice = (parseFloat(maxPrice) * 1000).toString();
      } else if (priceRangeMatch[2].toLowerCase().includes('m') || priceRangeMatch[2].toLowerCase().includes('million')) {
        maxPrice = (parseFloat(maxPrice) * 1000000).toString();
      }
      
      criteria.minPrice = parseFloat(minPrice);
      criteria.maxPrice = parseFloat(maxPrice);
      hasMatch = true;
    }
    
    // Look for square footage
    const sqftMatch = message.match(/(\d+(?:[,\.]\d+)?)\s*(?:sq\.?\s*ft\.?|square\s*feet|sqft)/i);
    if (sqftMatch) {
      criteria.minSquareFeet = parseInt(sqftMatch[1].replace(/[,\s]/g, ''));
      hasMatch = true;
    }
    
    // Look for location
    const locationMatch = message.match(/(?:in|near|around|location|area)\s+([^,.]+(?:,[^,.]+)?)/i);
    if (locationMatch) {
      const locationText = locationMatch[1].trim();
      if (locationText.includes(',')) {
        criteria.locations = locationText.split(',').map(loc => loc.trim());
      } else {
        criteria.location = locationText;
      }
      hasMatch = true;
    }
    
    return hasMatch ? criteria : null;
  },
  
  // This function creates a clean, readable version of the search criteria for display
  formatSearchCriteria: (criteria: PropertySearchCriteria): string => {
    if (!criteria) {
      return "No search criteria";
    }
    
    const parts = [];
    
    // Use minBedrooms instead of beds/bedrooms
    if (criteria.minBedrooms !== undefined) {
      parts.push(`${criteria.minBedrooms}+ bed${criteria.minBedrooms !== 1 ? 's' : ''}`);
    }
    
    // Use minBathrooms instead of baths/bathrooms
    if (criteria.minBathrooms !== undefined) {
      parts.push(`${criteria.minBathrooms}+ bath${criteria.minBathrooms !== 1 ? 's' : ''}`);
    }
    
    if (criteria.minPrice !== undefined || criteria.maxPrice !== undefined) {
      if (criteria.minPrice !== undefined && criteria.maxPrice !== undefined) {
        parts.push(`$${criteria.minPrice?.toLocaleString()}-$${criteria.maxPrice?.toLocaleString()}`);
      } else if (criteria.maxPrice !== undefined) {
        parts.push(`Up to $${criteria.maxPrice?.toLocaleString()}`);
      } else if (criteria.minPrice !== undefined) {
        parts.push(`From $${criteria.minPrice?.toLocaleString()}`);
      }
    }
    
    // Use minSquareFeet instead of minSqft
    if (criteria.minSquareFeet !== undefined || criteria.maxSquareFeet !== undefined) {
      if (criteria.minSquareFeet !== undefined && criteria.maxSquareFeet !== undefined) {
        parts.push(`${criteria.minSquareFeet?.toLocaleString()}-${criteria.maxSquareFeet?.toLocaleString()} sq ft`);
      } else if (criteria.maxSquareFeet !== undefined) {
        parts.push(`Up to ${criteria.maxSquareFeet?.toLocaleString()} sq ft`);
      } else if (criteria.minSquareFeet !== undefined) {
        parts.push(`Min ${criteria.minSquareFeet?.toLocaleString()} sq ft`);
      }
    }
    
    if (criteria.locations && criteria.locations.length > 0) {
      parts.push(`in ${criteria.locations.join(', ')}`);
    }
    
    return parts.length > 0 ? parts.join(', ') : "No specific criteria";
  },
  
  // Update this to call the real API endpoint
  searchProperties: async (criteria: PropertySearchCriteria): Promise<any[]> => {
    try {
      // First, convert our frontend criteria format to the backend format
      const backendCriteria = {
        minBedrooms: criteria.minBedrooms,
        maxBedrooms: criteria.maxBedrooms,
        minBathrooms: criteria.minBathrooms,
        maxBathrooms: criteria.maxBathrooms,
        minPrice: criteria.minPrice,
        maxPrice: criteria.maxPrice,
        minSquareFeet: criteria.minSquareFeet,
        maxSquareFeet: criteria.maxSquareFeet,
        locations: criteria.locations || [],
        propertyTypes: criteria.propertyTypes || ['Single Family Home'], // Default type
        isActive: true
      };

      // Debug auth token
      const token = localStorage.getItem('token');
      console.log("🔐 Using auth token:", token ? `${token.substring(0, 10)}...` : 'No token found');
      console.log("🔍 Searching with criteria:", backendCriteria);

      // Make an actual API call to your backend
      const response = await axios.get(`${API_URL}/api/properties/search`, {
        params: backendCriteria,
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      console.log("🏡 API Response status:", response.status);
      console.log("🏡 API Response data length:", response.data ? response.data.length : 0);
      
      // If the backend call fails, fall back to mock data
      if (!response.data || response.data.length === 0) {
        console.log("No properties found from backend, using mock data");
        // Return mock data as fallback
        return [
          {
            id: 'property-1',
            address: '123 Main St',
            price: 800000,
            beds: 3,
            baths: 2,
            sqft: 1800,
            imageUrl: 'https://placehold.co/600x400?text=Property+Image'
          },
          {
            id: 'property-2',
            address: '456 Oak Ave',
            price: 750000,
            beds: 3,
            baths: 2.5,
            sqft: 2100,
            imageUrl: 'https://placehold.co/600x400?text=Property+Image'
          }
        ];
      }
      
      // Map the backend response to the format expected by the UI
      return response.data.map((property: any) => ({
        id: property.id,
        address: `${property.address}, ${property.city}`,
        price: property.price,
        beds: property.bedrooms,
        baths: property.bathrooms,
        sqft: property.squareFeet,
        imageUrl: property.images?.[0] || 'https://placehold.co/600x400?text=Property+Image',
        description: property.description,
        features: property.features
      }));
    } catch (error) {
      console.error("Error searching for properties:", error);
      
      // Check for specific error types
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        if (status === 401) {
          console.error("Authentication failed. Please log in again.");
        } else if (status === 404) {
          console.error("Property search endpoint not found. API might be misconfigured.");
        } else if (status && status >= 500) {
          console.error("Server error when searching for properties.");
        }
      }
      
      // Return mock data on error as fallback
      return [
        {
          id: 'property-1',
          address: '123 Main St',
          price: 800000,
          beds: 3,
          baths: 2,
          sqft: 1800,
          imageUrl: 'https://placehold.co/600x400?text=Property+Image'
        },
        {
          id: 'property-2',
          address: '456 Oak Ave',
          price: 750000,
          beds: 3,
          baths: 2.5,
          sqft: 2100,
          imageUrl: 'https://placehold.co/600x400?text=Property+Image'
        }
      ];
    }
  },

  // Function to get property search criteria for a lead from the database
  getPropertySearchesForLead: async (leadId: number): Promise<PropertySearchCriteria | null> => {
    try {
      // Ensure we have a valid leadId
      if (!leadId) {
        console.error("Invalid leadId for getPropertySearchesForLead:", leadId);
        return null;
      }
      
      // Get the auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No authentication token available");
        return null;
      }
      
      // Make the API request
      const response = await axios.get(`${API_URL}/api/properties/searches/lead/${leadId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Check if we have data
      if (!response.data || response.data.length === 0) {
        console.log("No property searches found for lead:", leadId);
        return null;
      }
      
      // Use the most recent search (should be sorted by the backend)
      const activeSearch = response.data[0];
      console.log("Found property search for lead:", activeSearch);
      
      // Convert backend format back to our internal format
      const clientCriteria: PropertySearchCriteria = {
        // Standardized field names for bedrooms
        minBedrooms: activeSearch.minBedrooms,
        maxBedrooms: activeSearch.maxBedrooms,
        
        // Standardized field names for bathrooms 
        minBathrooms: activeSearch.minBathrooms,
        maxBathrooms: activeSearch.maxBathrooms,
        
        // Price range
        minPrice: activeSearch.minPrice,
        maxPrice: activeSearch.maxPrice,
        
        // Square footage using standardized names
        minSquareFeet: activeSearch.minSquareFeet, 
        maxSquareFeet: activeSearch.maxSquareFeet,
        
        // Handle locations
        locations: activeSearch.locations || [],
        location: activeSearch.locations && activeSearch.locations.length === 1 ? activeSearch.locations[0] : undefined,
        
        // Property types
        propertyTypes: activeSearch.propertyTypes || [],
        isActive: activeSearch.isActive
      };
      
      // Remove any undefined fields to keep the object clean
      Object.keys(clientCriteria).forEach(key => {
        if (clientCriteria[key as keyof PropertySearchCriteria] === undefined) {
          delete clientCriteria[key as keyof PropertySearchCriteria];
        }
      });
      
      console.log("Converted property search criteria:", clientCriteria);
      return clientCriteria;
    } catch (error) {
      console.error("Error getting property searches for lead:", error);
      return null;
    }
  },

  // Save property search criteria to the database
  savePropertySearchCriteria: async (leadId: number, criteria: PropertySearchCriteria): Promise<boolean> => {
    try {
      // Ensure we have a valid leadId
      if (!leadId) {
        console.error("Invalid leadId for savePropertySearchCriteria:", leadId);
        return false;
      }
      
      // Validate the search criteria
      if (!criteria || Object.keys(criteria).length === 0) {
        console.error("No property search criteria provided to save");
        return false;
      }
      
      // Get the auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No authentication token available");
        return false;
      }
      
      console.log("Saving property search criteria:", criteria);
      
      // Convert our internal format to the backend expected format
      const backendCriteria = {
        // Standardized field names for bedrooms
        minBedrooms: criteria.minBedrooms,
        maxBedrooms: criteria.maxBedrooms,
        
        // Standardized field names for bathrooms
        minBathrooms: criteria.minBathrooms,
        maxBathrooms: criteria.maxBathrooms,
        
        // Price range
        minPrice: criteria.minPrice,
        maxPrice: criteria.maxPrice,
        
        // Square footage using standardized names
        minSquareFeet: criteria.minSquareFeet,
        maxSquareFeet: criteria.maxSquareFeet,
        
        // Locations - combine both location fields if needed
        locations: criteria.locations || 
                  (criteria.location ? [criteria.location] : []),
        
        // Property types
        propertyTypes: criteria.propertyTypes || [],
        
        // Include isActive status
        isActive: criteria.isActive
      };
      
      // Remove any undefined fields to keep the object clean
      Object.keys(backendCriteria).forEach(key => {
        if (backendCriteria[key as keyof typeof backendCriteria] === undefined) {
          delete backendCriteria[key as keyof typeof backendCriteria];
        }
      });
      
      console.log("Converted backend criteria for saving:", backendCriteria);
      
      // Make the API request
      const response = await axios.post(
        `${API_URL}/api/properties/searches/lead/${leadId}`, 
        backendCriteria, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log("Property search criteria saved successfully:", response.data);
      return true;
    } catch (error) {
      console.error("Error saving property search criteria:", error);
      return false;
    }
  },

  parseStructuredPropertySearch: (message: string): PropertySearchCriteria | null => {
    // First try the NEW PROPERTY SEARCH format with MIN BEDROOMS, MAX BEDROOMS, etc.
    const newFormatCriteria = parseNewPropertySearchFormat(message);
    if (newFormatCriteria && Object.keys(newFormatCriteria).length > 0) {
      console.log("Found NEW PROPERTY SEARCH format criteria:", newFormatCriteria);
      return newFormatCriteria;
    }
    
    // Look for structured property search data in different formats
    // The regex here is updated to match any of the formats and be more flexible with whitespace
    const searchMatch = message.match(/NEW (?:PROPERTY|CRITERIA) SEARCH:\s*({.*})/i) || 
                       message.match(/NEW SEARCH CRITERIA:\s*({.*})/i);
    
    // Try to parse structured JSON format first
    if (searchMatch && searchMatch[1]) {
      try {
        // Parse the JSON
        const parsedData = JSON.parse(searchMatch[1]);
        
        // Filter out any null/undefined values
        const filteredData: Record<string, any> = {};
        for (const [key, value] of Object.entries(parsedData)) {
          if (value !== null && value !== undefined) {
            filteredData[key] = value;
          }
        }
        
        // Log and return if we have data
        if (Object.keys(filteredData).length > 0) {
          console.log("Successfully parsed structured property search criteria:", filteredData);
          return filteredData as PropertySearchCriteria;
        }
      } catch (error) {
        console.error("Error parsing structured property search data:", error);
        console.error("Raw JSON string was:", searchMatch[1]);
      }
    }
    
    // Try explicit format second
    const explicitCriteria = propertySearchApi.parseSearchCriteriaFromAIMessage(message);
    if (explicitCriteria && Object.keys(explicitCriteria).length > 0) {
      console.log("Found explicit property search criteria:", explicitCriteria);
      return explicitCriteria;
    }
    
    // Try natural language parsing last
    const naturalCriteria = propertySearchApi.parseNaturalLanguageCriteria(message);
    if (naturalCriteria && Object.keys(naturalCriteria).length > 0) {
      console.log("Found natural language property search criteria:", naturalCriteria);
      return naturalCriteria;
    }
    
    // Nothing found
    return null;
  },

  // Update property search criteria silently (without triggering notifications)
  updatePropertySearchCriteria: async (leadId: number, criteria: PropertySearchCriteria): Promise<boolean> => {
    try {
      // Ensure we have a valid leadId
      if (!leadId) {
        console.error("Invalid leadId for updatePropertySearchCriteria:", leadId);
        return false;
      }
      
      // Validate the search criteria
      if (!criteria || Object.keys(criteria).length === 0) {
        console.error("No property search criteria provided to update");
        return false;
      }
      
      // Get the auth token
      const token = localStorage.getItem('token');
      if (!token) {
        console.error("No authentication token available");
        return false;
      }
      
      console.log("Updating property search criteria silently:", criteria);
      
      // Create a deep copy to avoid modifying the original object
      const backendCriteria: BackendPropertySearchCriteria = {
        // Standardized field names for bedrooms
        minBedrooms: criteria.minBedrooms,
        maxBedrooms: criteria.maxBedrooms,
        
        // Standardized field names for bathrooms
        minBathrooms: criteria.minBathrooms,
        maxBathrooms: criteria.maxBathrooms,
        
        // Price range
        minPrice: criteria.minPrice,
        maxPrice: criteria.maxPrice,
        
        // Square footage using standardized names
        minSquareFeet: criteria.minSquareFeet,
        maxSquareFeet: criteria.maxSquareFeet,
        
        // Locations - combine both location fields if needed
        locations: criteria.locations || 
                  (criteria.location ? [criteria.location] : []),
        
        // Property types
        propertyTypes: criteria.propertyTypes || [],
        
        // Include isActive status
        isActive: criteria.isActive
      };
      
      // For PATCH requests, we want to explicitly pass null for fields that should be cleared
      // This ensures empty fields are actually cleared in the database
      const numericFields = [
        'minBedrooms', 'maxBedrooms', 
        'minBathrooms', 'maxBathrooms', 
        'minPrice', 'maxPrice', 
        'minSquareFeet', 'maxSquareFeet'
      ];
      
      // Explicitly set undefined numeric fields to null
      numericFields.forEach(field => {
        if (backendCriteria[field as keyof typeof backendCriteria] === undefined) {
          backendCriteria[field as keyof typeof backendCriteria] = null;
        }
      });
      
      console.log("Converted backend criteria for silent update:", backendCriteria);
      
      // Make the API request using PATCH method
      const response = await axios.patch(
        `${API_URL}/api/properties/searches/lead/${leadId}`, 
        backendCriteria, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log("Property search criteria updated silently:", response.data);
      return true;
    } catch (error) {
      console.error("Error updating property search criteria:", error);
      return false;
    }
  },
};

export default propertySearchApi; 