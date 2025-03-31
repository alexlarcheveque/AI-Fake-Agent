import React, { useState, useEffect } from 'react';
import propertySearchApi, { PropertySearchCriteria } from '../api/propertySearchApi';
import { useNotifications } from '../contexts/NotificationContext';

interface PropertySearchInfoProps {
  criteria: PropertySearchCriteria;
  leadId: number;
  leadName: string;
}

const PropertySearchInfo: React.FC<PropertySearchInfoProps> = ({ criteria, leadId, leadName }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<any[]>([]);
  const [showProperties, setShowProperties] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotifications();
  
  // Log when component mounts
  useEffect(() => {
    console.log("🏠 PropertySearchInfo component mounted with:", {
      criteria,
      leadId,
      leadName
    });
  }, []);
  
  // Auto-fetch properties on component load
  useEffect(() => {
    console.log("PropertySearchInfo loaded with criteria:", criteria);
    handleViewProperties();
  }, [criteria]);
  
  const handleViewProperties = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("🔍 Searching for properties with criteria:", criteria);
      console.log("🔑 Auth check - Token exists:", !!localStorage.getItem('token'));
      
      const results = await propertySearchApi.searchProperties(criteria);
      console.log("🏠 Search results:", results);
      
      // Check if these are mock results
      const isMockData = results.length > 0 && results[0].id.toString().includes('property-');
      if (isMockData) {
        console.log("⚠️ Using mock data - API call might have failed or found no matching properties");
      }
      
      setProperties(results);
      setShowProperties(true);
      
      // Add a notification about the search
      addNotification({
        type: 'property_search',
        title: 'New Property Search',
        message: `${leadName} is looking for ${propertySearchApi.formatSearchCriteria(criteria)}`,
        data: { leadId, criteria }
      });
    } catch (error) {
      console.error('Error searching properties:', error);
      setError('Failed to load properties. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
      <div className="flex items-center mb-2">
        <svg className="h-5 w-5 text-orange-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <h3 className="text-sm font-semibold text-orange-800">Property Search Criteria</h3>
      </div>
      
      <div className="text-sm text-gray-700 mb-3">
        {propertySearchApi.formatSearchCriteria(criteria)}
      </div>
      
      {/* Debug info */}
      <div className="text-xs text-gray-500 mb-2">
        <details>
          <summary className="cursor-pointer">Debug Info</summary>
          <div className="mt-1 p-2 bg-gray-100 rounded">
            <div>Search Criteria: {JSON.stringify(criteria)}</div>
            <div className="mt-1">Auth: {localStorage.getItem('token') ? 'Token Present' : 'No Auth Token'}</div>
            <div className="mt-1">API URL: {import.meta.env?.VITE_API_URL || 'Not configured'}</div>
            <div className="mt-1">Properties: {properties.length}</div>
            <div className="mt-1">Is Mock Data: {properties.length > 0 && properties[0].id.toString().includes('property-') ? 'Yes (Mock)' : 'No (API)'}</div>
          </div>
        </details>
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleViewProperties}
          disabled={isLoading}
          className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 flex items-center disabled:bg-orange-300"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </>
          ) : (
            <>
              <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Refresh Properties
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {isLoading && (
        <div className="mt-4 flex justify-center">
          <svg className="animate-spin h-8 w-8 text-orange-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
      
      {showProperties && properties.length > 0 && !isLoading && (
        <div className="mt-4 border-t border-orange-200 pt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Property Matches ({properties.length})</h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {properties.map(property => (
              <div key={property.id} className="border border-gray-200 rounded-md overflow-hidden">
                <div className="h-32 bg-gray-200 overflow-hidden">
                  <img src={property.imageUrl} alt={property.address} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className="font-medium text-sm">{property.address}</div>
                  <div className="text-sm text-gray-600">${property.price.toLocaleString()}</div>
                  <div className="text-xs text-gray-500">
                    {property.beds} bd • {property.baths} ba • {property.sqft.toLocaleString()} sqft
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {showProperties && properties.length === 0 && !isLoading && (
        <div className="mt-4 p-4 border border-gray-200 rounded-md bg-gray-50 text-center text-gray-500">
          No properties found matching your search criteria.
        </div>
      )}
    </div>
  );
};

export default PropertySearchInfo; 