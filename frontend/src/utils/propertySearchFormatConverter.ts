import { PropertySearchCriteria } from "../api/propertySearchApi";

/**
 * Utility functions to help with property search criteria format conversion
 * This is helpful for transitioning between different formats
 */
export const propertySearchFormatConverter = {
  /**
   * Converts a PropertySearchCriteria object to the NEW CRITERIA SEARCH string format
   * @param criteria The property search criteria object
   * @returns A formatted string in the NEW CRITERIA SEARCH format
   */
  toNewCriteriaSearchFormat: (criteria: PropertySearchCriteria): string => {
    if (!criteria || Object.keys(criteria).length === 0) {
      return "";
    }
    
    const parts: string[] = [];
    
    // Handle bed count
    if (criteria.minBedrooms !== undefined || criteria.minBeds !== undefined) {
      const minBeds = criteria.minBedrooms !== undefined ? criteria.minBedrooms : criteria.minBeds;
      parts.push(`BED:${minBeds}+`);
    } else if (criteria.maxBedrooms !== undefined && criteria.minBedrooms !== undefined) {
      parts.push(`BED:${criteria.minBedrooms}-${criteria.maxBedrooms}`);
    } else if (criteria.bedrooms !== undefined || criteria.beds !== undefined) {
      const beds = criteria.bedrooms !== undefined ? criteria.bedrooms : criteria.beds;
      parts.push(`BED:${beds}`);
    }
    
    // Handle bath count
    if (criteria.minBathrooms !== undefined || criteria.minBaths !== undefined) {
      const minBaths = criteria.minBathrooms !== undefined ? criteria.minBathrooms : criteria.minBaths;
      parts.push(`BATH:${minBaths}+`);
    } else if (criteria.maxBathrooms !== undefined && criteria.minBathrooms !== undefined) {
      parts.push(`BATH:${criteria.minBathrooms}-${criteria.maxBathrooms}`);
    } else if (criteria.bathrooms !== undefined || criteria.baths !== undefined) {
      const baths = criteria.bathrooms !== undefined ? criteria.bathrooms : criteria.baths;
      parts.push(`BATH:${baths}`);
    }
    
    // Handle price range
    if (criteria.minPrice !== undefined && criteria.maxPrice !== undefined) {
      parts.push(`PRICE:$${criteria.minPrice.toLocaleString()}-$${criteria.maxPrice.toLocaleString()}`);
    } else if (criteria.minPrice !== undefined) {
      parts.push(`PRICE:$${criteria.minPrice.toLocaleString()}+`);
    } else if (criteria.maxPrice !== undefined) {
      parts.push(`PRICE:$${criteria.maxPrice.toLocaleString()}`);
    }
    
    // Handle square footage
    if (criteria.minSqft !== undefined || criteria.minSquareFeet !== undefined) {
      const minSqft = criteria.minSqft !== undefined ? criteria.minSqft : criteria.minSquareFeet;
      if (criteria.maxSqft !== undefined || criteria.maxSquareFeet !== undefined) {
        const maxSqft = criteria.maxSqft !== undefined ? criteria.maxSqft : criteria.maxSquareFeet;
        parts.push(`SQFT:${minSqft.toLocaleString()}-${maxSqft.toLocaleString()}`);
      } else {
        parts.push(`SQFT:${minSqft.toLocaleString()}+`);
      }
    } else if (criteria.maxSqft !== undefined || criteria.maxSquareFeet !== undefined) {
      const maxSqft = criteria.maxSqft !== undefined ? criteria.maxSqft : criteria.maxSquareFeet;
      parts.push(`SQFT:${maxSqft.toLocaleString()}`);
    }
    
    // Handle location
    if (criteria.location) {
      parts.push(`LOCATION:${criteria.location}`);
    } else if (criteria.locations && criteria.locations.length > 0) {
      parts.push(`LOCATION:${criteria.locations.join(', ')}`);
    }
    
    // Combine all parts with the NEW CRITERIA SEARCH prefix
    if (parts.length > 0) {
      return `NEW CRITERIA SEARCH: ${parts.join(', ')}`;
    }
    
    return "";
  },
  
  /**
   * Sample function to demonstrate usage in AI responses
   * @param aiResponse The original AI response text
   * @param criteria The property search criteria to append
   * @returns The AI response with appended NEW CRITERIA SEARCH format
   */
  formatAIResponse: (aiResponse: string, criteria: PropertySearchCriteria): string => {
    const formattedCriteria = propertySearchFormatConverter.toNewCriteriaSearchFormat(criteria);
    
    if (!formattedCriteria) {
      return aiResponse;
    }
    
    // Ensure there's a line break before appending the criteria
    const responseWithLineBreak = aiResponse.trim().endsWith('\n')
      ? aiResponse
      : `${aiResponse.trim()}\n\n`;
    
    return `${responseWithLineBreak}${formattedCriteria}`;
  }
};

export default propertySearchFormatConverter; 