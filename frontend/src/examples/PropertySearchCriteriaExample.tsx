import React, { useState } from 'react';
import PropertySearchCriteriaSummary from '../components/PropertySearchCriteriaSummary';
import { PropertySearchCriteria } from '../api/propertySearchApi';

const exampleCriteria: PropertySearchCriteria = {
  minBedrooms: 3,
  minBathrooms: 2.5,
  minPrice: 800000,
  maxPrice: 1000000,
  minSqft: 1200,
  maxSqft: 2500,
  location: 'Pasadena, CA'
};

const PropertySearchCriteriaExample: React.FC = () => {
  const [criteria, setCriteria] = useState<PropertySearchCriteria>(exampleCriteria);
  
  // Mock function for onEdit
  const handleEdit = (criteria: PropertySearchCriteria) => {
    alert('Edit button clicked - in a real app this would open the property search editor');
    console.log('Edit criteria:', criteria);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Property Search Criteria Component Examples</h1>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">Original Full View</h2>
        <div className="border border-gray-300 rounded-md p-4 bg-white">
          <PropertySearchCriteriaSummary 
            criteria={criteria}
            onEdit={handleEdit}
            leadId={123}
          />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-lg font-semibold mb-3">New Compact View</h2>
        <div className="border border-gray-300 rounded-md p-4 bg-white">
          <PropertySearchCriteriaSummary 
            criteria={criteria}
            onEdit={handleEdit}
            leadId={123}
            compact={true}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          <span className="font-medium">Note:</span> Click "Show more" to see the expanded view
        </p>
      </div>
      
      <div>
        <h2 className="text-lg font-semibold mb-3">Compact View With Minimal Data</h2>
        <div className="border border-gray-300 rounded-md p-4 bg-white">
          <PropertySearchCriteriaSummary 
            criteria={{ 
              minBedrooms: 2,
              maxPrice: 500000
            }}
            onEdit={handleEdit}
            leadId={123}
            compact={true}
          />
        </div>
      </div>
    </div>
  );
};

export default PropertySearchCriteriaExample; 