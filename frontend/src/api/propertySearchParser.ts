import { PropertySearchCriteria } from './propertySearchApi';

/**
 * Parse property search criteria from messages following the specific format:
 * NEW PROPERTY SEARCH: MIN BEDROOMS: 3, MAX BEDROOMS: 5, MIN BATHROOMS: 2, MAX BATHROOMS: 3, ...
 * This parser handles the FULL format where ALL fields are always included, even if empty.
 */
export const parseNewPropertySearchFormat = (message: string): PropertySearchCriteria | null => {
  // Check for the specific property search format
  const searchMatch = message.match(/NEW PROPERTY SEARCH:(.*?)(\n|$)/i);
  
  if (!searchMatch) {
    return null;
  }
  
  try {
    // Extract the criteria text
    const criteriaText = searchMatch[1].trim();
    
    // Initialize the criteria object
    const criteria: PropertySearchCriteria = {};
    
    // Define all the expected fields with their regex patterns
    const fieldPatterns: Record<string, { pattern: RegExp, type: string }> = {
      minBedrooms: { pattern: /MIN BEDROOMS:\s*(\d+)?/i, type: 'int' },
      maxBedrooms: { pattern: /MAX BEDROOMS:\s*(\d+)?/i, type: 'int' },
      minBathrooms: { pattern: /MIN BATHROOMS:\s*(\d+(?:\.\d+)?)?/i, type: 'float' },
      maxBathrooms: { pattern: /MAX BATHROOMS:\s*(\d+(?:\.\d+)?)?/i, type: 'float' },
      minPrice: { pattern: /MIN PRICE:\s*\$?(\d+(?:,\d+)*)?/i, type: 'currency' },
      maxPrice: { pattern: /MAX PRICE:\s*\$?(\d+(?:,\d+)*)?/i, type: 'currency' },
      minSquareFeet: { pattern: /MIN SQUARE FEET:\s*(\d+(?:,\d+)*)?/i, type: 'int' },
      maxSquareFeet: { pattern: /MAX SQUARE FEET:\s*(\d+(?:,\d+)*)?/i, type: 'int' },
      locations: { pattern: /LOCATIONS:\s*([^,]+(?:,\s*[^,]+)*)?/i, type: 'list' },
      propertyTypes: { pattern: /PROPERTY TYPES:\s*([^,]+(?:,\s*[^,]+)*)?/i, type: 'list' },
      notes: { pattern: /NOTE(?:S)?:\s*(.*?)(?:,|$)/i, type: 'string' }
    };
    
    // Process each field according to its pattern and type
    Object.entries(fieldPatterns).forEach(([field, config]) => {
      const fieldMatch = criteriaText.match(config.pattern);
      
      if (fieldMatch && fieldMatch[1] && fieldMatch[1].trim()) {
        const value = fieldMatch[1].trim();
        
        // Convert the value based on its type
        switch (config.type) {
          case 'int':
            criteria[field as keyof PropertySearchCriteria] = parseInt(value.replace(/,/g, ''), 10);
            break;
          case 'float':
            criteria[field as keyof PropertySearchCriteria] = parseFloat(value);
            break;
          case 'currency':
            criteria[field as keyof PropertySearchCriteria] = parseInt(value.replace(/,/g, ''), 10);
            break;
          case 'list':
            criteria[field as keyof PropertySearchCriteria] = value
              .split(',')
              .map(item => item.trim())
              .filter(item => item.length > 0);
            break;
          case 'string':
          default:
            criteria[field as keyof PropertySearchCriteria] = value;
        }
      } else {
        // Set null for missing or empty values to ensure all fields are present
        // If it's a list type, use an empty array instead of null
        criteria[field as keyof PropertySearchCriteria] = config.type === 'list' ? [] : null;
      }
    });
    
    console.log('Parsed property search criteria:', criteria);
    
    // Always return the criteria object, even if all fields are null/empty,
    // as we're expecting a complete set of fields
    return criteria;
    
  } catch (error) {
    console.error('Error parsing NEW PROPERTY SEARCH format:', error);
    return null;
  }
};

export default {
  parseNewPropertySearchFormat
}; 