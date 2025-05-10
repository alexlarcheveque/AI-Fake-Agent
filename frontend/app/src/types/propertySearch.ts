/**
 * PropertySearchCriteria interface - defines the structure for property search criteria
 * Supports both min/max format and specific value formats
 */
export interface PropertySearchCriteria {
  // Bedrooms - support multiple naming conventions
  beds?: number;
  bedrooms?: number;
  minBeds?: number;
  maxBeds?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  
  // Bathrooms - support multiple naming conventions
  baths?: number;
  bathrooms?: number;
  minBaths?: number;
  maxBaths?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  
  // Price range
  minPrice?: number;
  maxPrice?: number;
  
  // Square footage - support multiple naming conventions
  minSqft?: number;
  maxSqft?: number;
  minSquareFeet?: number;
  maxSquareFeet?: number;
  
  // Locations
  location?: string;
  locations?: string[];
  
  // Any other properties can be added dynamically
  [key: string]: any;
} 