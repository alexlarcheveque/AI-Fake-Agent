import React, { useState } from 'react';
import propertySearchApi, { PropertySearchCriteria } from '../api/propertySearchApi';

interface PropertySearchCriteriaSummaryProps {
  criteria: PropertySearchCriteria;
  onEdit?: (criteria: PropertySearchCriteria) => void;
  leadId?: number;
  compact?: boolean;
}

const PropertySearchCriteriaSummary: React.FC<PropertySearchCriteriaSummaryProps> = ({ 
  criteria, 
  onEdit,
  leadId,
  compact = false
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!criteria) return null;

  // Format price range for display
  const formatPrice = () => {
    if (criteria.minPrice !== undefined && criteria.maxPrice !== undefined) {
      return `$${criteria.minPrice.toLocaleString()} - $${criteria.maxPrice.toLocaleString()}`;
    } else if (criteria.maxPrice !== undefined) {
      return `Up to $${criteria.maxPrice.toLocaleString()}`;
    } else if (criteria.minPrice !== undefined) {
      return `From $${criteria.minPrice.toLocaleString()}`;
    }
    return '';
  };

  // Format square footage for display
  const formatSqFt = () => {
    if (criteria.minSqft !== undefined && criteria.maxSqft !== undefined) {
      return `${criteria.minSqft.toLocaleString()} - ${criteria.maxSqft.toLocaleString()} sq ft`;
    } else if (criteria.maxSqft !== undefined) {
      return `Up to ${criteria.maxSqft.toLocaleString()} sq ft`;
    } else if (criteria.minSqft !== undefined) {
      return `${criteria.minSqft.toLocaleString()}+ sq ft`;
    } else if (criteria.minSquareFeet !== undefined) {
      return `${criteria.minSquareFeet.toLocaleString()}+ sq ft`;
    }
    return '';
  };

  // Format locations for display
  const formatLocations = () => {
    if (criteria.locations && criteria.locations.length > 0) {
      return criteria.locations.join(', ');
    } else if (criteria.location) {
      return criteria.location;
    }
    return '';
  };

  // Get bed count from either beds or bedrooms field, handle min/max ranges
  const getBedCount = () => {
    // Handle minBedrooms for 3+ or 4+ format
    if (criteria.minBedrooms !== undefined && (!criteria.maxBedrooms || criteria.maxBedrooms > criteria.minBedrooms)) {
      return `${criteria.minBedrooms}+`;
    } 
    // Handle bedrooms range
    else if (criteria.minBedrooms !== undefined && criteria.maxBedrooms !== undefined) {
      return `${criteria.minBedrooms}-${criteria.maxBedrooms}`;
    }
    // Handle single beds/bedrooms value
    else if (criteria.beds !== undefined) {
      return `${criteria.beds}`;
    } else if (criteria.bedrooms !== undefined) {
      return `${criteria.bedrooms}`;
    } else if (criteria.minBeds !== undefined) {
      return `${criteria.minBeds}+`;
    }
    return '';
  };

  // Get bath count from either baths or bathrooms field
  const getBathCount = () => {
    // Handle minBathrooms for 2+ or 2.5+ format
    if (criteria.minBathrooms !== undefined && (!criteria.maxBathrooms || criteria.maxBathrooms > criteria.minBathrooms)) {
      return `${criteria.minBathrooms}+`;
    }
    // Handle bathrooms range
    else if (criteria.minBathrooms !== undefined && criteria.maxBathrooms !== undefined) {
      return `${criteria.minBathrooms}-${criteria.maxBathrooms}`;
    }
    // Handle single baths/bathrooms value
    else if (criteria.baths !== undefined) {
      return `${criteria.baths}`;
    } else if (criteria.bathrooms !== undefined) {
      return `${criteria.bathrooms}`;
    } else if (criteria.minBaths !== undefined) {
      return `${criteria.minBaths}+`;
    }
    return '';
  };

  // Create a compact summary of the most important criteria
  const getCompactSummary = () => {
    const parts = [];
    
    const beds = getBedCount();
    if (beds) parts.push(`${beds} bed${beds === '1' ? '' : 's'}`);
    
    const baths = getBathCount();
    if (baths) parts.push(`${baths} bath${baths === '1' ? '' : 's'}`);
    
    const price = formatPrice();
    if (price) parts.push(price);
    
    // Only include square footage and location if there's space
    if (parts.length < 2) {
      const sqft = formatSqFt();
      if (sqft) parts.push(sqft);
    }
    
    if (parts.length < 2) {
      const location = formatLocations();
      if (location) parts.push(location);
    }
    
    return parts.join(' • ');
  };

  // Map for the property keys and their display labels with icons
  const criteriaItems = [
    { 
      key: 'beds', 
      label: 'Bed Count', 
      value: getBedCount(),
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      )
    },
    { 
      key: 'baths', 
      label: 'Bath Count', 
      value: getBathCount(),
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      )
    },
    { 
      key: 'price', 
      label: 'Price', 
      value: formatPrice(),
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    { 
      key: 'sqft', 
      label: 'Sq. Ft.', 
      value: formatSqFt(),
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      )
    },
    { 
      key: 'locations', 
      label: 'Location', 
      value: formatLocations(),
      icon: (
        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    }
  ];

  const handleManualSync = async () => {
    if (leadId) {
      try {
        // Update the search criteria in the database
        console.log("Manually syncing property search criteria:", criteria);
        const success = await propertySearchApi.savePropertySearchCriteria(leadId, criteria);
        if (success) {
          console.log("Successfully synchronized property search criteria with database");
          // Could show a success message here
        } else {
          console.error("Failed to synchronize property search criteria with database");
        }
      } catch (error) {
        console.error("Error synchronizing property search criteria:", error);
      }
    }
  };

  // For compact mode, show a simplified view
  if (compact && !isExpanded) {
    return (
      <div className="bg-white border-l-4 border-blue-500 py-2 px-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center flex-grow">
            <div className="bg-blue-500 p-1 rounded-full mr-2 flex-shrink-0">
              <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-xs font-semibold text-gray-800 mb-0.5">Property Criteria</h3>
              <p className="text-xs text-gray-600 truncate">{getCompactSummary() || '—'}</p>
            </div>
            <button 
              onClick={() => setIsExpanded(true)}
              className="ml-2 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Details
            </button>
          </div>
          <div className="flex items-center ml-2 space-x-1">
            {leadId && (
              <button 
                onClick={handleManualSync}
                className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 flex items-center border border-gray-200"
                title="Manually sync criteria with database"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync
              </button>
            )}
            {onEdit && (
              <button 
                onClick={() => onEdit(criteria)}
                className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center"
              >
                <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Edit
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Full view (default or expanded from compact)
  return (
    <div className="bg-white border-l-4 border-blue-500 pl-3 py-3 mb-3 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-blue-500 p-1 rounded-full mr-2">
            <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-800">Property Search Criteria</h3>
        </div>
        
        <div className="flex items-center space-x-2">
          {compact && (
            <button 
              onClick={() => setIsExpanded(false)}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              Collapse
            </button>
          )}
          {leadId && (
            <button 
              onClick={handleManualSync}
              className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200 flex items-center border border-gray-200"
              title="Manually sync criteria with database"
            >
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync
            </button>
          )}
          {onEdit && (
            <button 
              onClick={() => onEdit(criteria)}
              className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 flex items-center"
            >
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Edit
            </button>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700 mt-3 pl-6">
        {criteriaItems.map((item, index) => (
          <div key={index} className={item.value ? 'flex items-center' : 'flex items-center opacity-50'}>
            <div className="mr-2 flex-shrink-0">
              {item.icon}
            </div>
            <div>
              <span className="font-medium text-gray-900">{item.label}:</span>{' '}
              <span className="font-normal">{item.value || '—'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PropertySearchCriteriaSummary; 