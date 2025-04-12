import React, { useState, useEffect } from 'react';
import propertySearchApi, { PropertySearchCriteria } from '../api/propertySearchApi';

interface PropertySearchCriteriaFormProps {
  initialCriteria: PropertySearchCriteria;
  leadId: number;
  onSave: (criteria: PropertySearchCriteria) => void;
  onCancel: () => void;
}

const PropertySearchCriteriaForm: React.FC<PropertySearchCriteriaFormProps> = ({
  initialCriteria,
  leadId,
  onSave,
  onCancel
}) => {
  const [formData, setFormData] = useState<PropertySearchCriteria>({
    minBedrooms: initialCriteria.minBedrooms || undefined,
    maxBedrooms: initialCriteria.maxBedrooms || undefined,
    minBathrooms: initialCriteria.minBathrooms || undefined,
    maxBathrooms: initialCriteria.maxBathrooms || undefined,
    minPrice: initialCriteria.minPrice || undefined,
    maxPrice: initialCriteria.maxPrice || undefined,
    minSquareFeet: initialCriteria.minSquareFeet || undefined,
    maxSquareFeet: initialCriteria.maxSquareFeet || undefined,
    locations: initialCriteria.locations || undefined,
    propertyTypes: initialCriteria.propertyTypes || undefined,
    isActive: initialCriteria.isActive !== false // Default to true if not specified
  });

  const [locationsText, setLocationsText] = useState('');
  const [propertyTypesText, setPropertyTypesText] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the text fields from arrays
  useEffect(() => {
    // Initialize locations text
    if (initialCriteria.locations && Array.isArray(initialCriteria.locations)) {
      setLocationsText(initialCriteria.locations.length > 0 ? initialCriteria.locations.join(', ') : '');
    } else if (initialCriteria.location) {
      setLocationsText(initialCriteria.location);
    } else {
      setLocationsText('');
    }

    // Initialize property types text
    if (initialCriteria.propertyTypes && Array.isArray(initialCriteria.propertyTypes)) {
      setPropertyTypesText(initialCriteria.propertyTypes.length > 0 ? initialCriteria.propertyTypes.join(', ') : '');
    } else {
      setPropertyTypesText('');
    }
  }, [initialCriteria]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      // Handle number fields (price, bedrooms, etc.)
      // Set to undefined when empty to match the PropertySearchCriteria interface
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? undefined : Number(value)
      }));
    } else if (type === 'checkbox') {
      // Handle checkbox for isActive
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      // Handle text fields
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleLocationsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocationsText(e.target.value);
    
    // Convert comma-separated text to array for the form data
    const locationArray = e.target.value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (locationArray.length > 0) {
      setFormData(prev => ({
        ...prev,
        locations: locationArray,
        location: undefined // Clear single location if using array
      }));
    } else {
      // If empty, explicitly set locations to empty array (consistent with propertyTypes)
      setFormData(prev => ({
        ...prev,
        locations: [],
        location: undefined
      }));
    }
  };

  const handlePropertyTypesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPropertyTypesText(e.target.value);
    
    // Convert comma-separated text to array
    const typesArray = e.target.value
      .split(',')
      .map(item => item.trim())
      .filter(item => item.length > 0);

    if (typesArray.length > 0) {
      setFormData(prev => ({
        ...prev,
        propertyTypes: typesArray
      }));
    } else {
      // If empty, set to empty array
      setFormData(prev => ({
        ...prev,
        propertyTypes: []
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    
    try {
      // Create a deep copy of the form data to avoid reference issues
      const criteriaToSave: PropertySearchCriteria = JSON.parse(JSON.stringify(formData));
      
      // Explicitly handle empty text fields
      if (locationsText.trim() === '') {
        criteriaToSave.locations = [];
        criteriaToSave.location = undefined;
      }
      
      if (propertyTypesText.trim() === '') {
        criteriaToSave.propertyTypes = [];
      }
      
      // Ensure numeric fields are consistently handled when empty
      const numericFields = [
        'minBedrooms', 'maxBedrooms', 
        'minBathrooms', 'maxBathrooms', 
        'minPrice', 'maxPrice', 
        'minSquareFeet', 'maxSquareFeet'
      ];
      
      // Preserve undefined/empty numeric fields rather than removing them
      // This ensures they get explicitly set to null when sent to the API
      numericFields.forEach(field => {
        const key = field as keyof PropertySearchCriteria;
        // If it's an empty string or undefined, ensure it's undefined in the criteria
        // (which will be converted to null in the API layer)
        if (criteriaToSave[key] === '' || criteriaToSave[key] === null) {
          criteriaToSave[key] = undefined;
        }
      });
      
      // Clean up any other empty string fields (non-numeric ones)
      Object.keys(criteriaToSave).forEach(key => {
        const typedKey = key as keyof PropertySearchCriteria;
        if (!numericFields.includes(key) && criteriaToSave[typedKey] === '') {
          delete criteriaToSave[typedKey];
        }
      });
      
      // Log what we're saving for debugging
      console.log('Saving criteria:', criteriaToSave);
      
      // Call the onSave callback with the updated criteria
      onSave(criteriaToSave);
    } catch (err) {
      console.error('Error saving property search criteria:', err);
      setError('Failed to save search criteria. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bedrooms */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Bedrooms</label>
          <div className="flex space-x-2">
            <div className="w-1/2">
              <label className="block text-xs text-gray-500">Minimum</label>
              <input
                type="number"
                name="minBedrooms"
                value={formData.minBedrooms === undefined ? '' : formData.minBedrooms}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="1"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-xs text-gray-500">Maximum</label>
              <input
                type="number"
                name="maxBedrooms"
                value={formData.maxBedrooms === undefined ? '' : formData.maxBedrooms}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="1"
              />
            </div>
          </div>
        </div>

        {/* Bathrooms */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Bathrooms</label>
          <div className="flex space-x-2">
            <div className="w-1/2">
              <label className="block text-xs text-gray-500">Minimum</label>
              <input
                type="number"
                name="minBathrooms"
                value={formData.minBathrooms === undefined ? '' : formData.minBathrooms}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="0.5"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-xs text-gray-500">Maximum</label>
              <input
                type="number"
                name="maxBathrooms"
                value={formData.maxBathrooms === undefined ? '' : formData.maxBathrooms}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="0.5"
              />
            </div>
          </div>
        </div>

        {/* Price Range */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Price Range</label>
          <div className="flex space-x-2">
            <div className="w-1/2">
              <label className="block text-xs text-gray-500">Minimum ($)</label>
              <input
                type="number"
                name="minPrice"
                value={formData.minPrice === undefined ? '' : formData.minPrice}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="5000"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-xs text-gray-500">Maximum ($)</label>
              <input
                type="number"
                name="maxPrice"
                value={formData.maxPrice === undefined ? '' : formData.maxPrice}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="5000"
              />
            </div>
          </div>
        </div>

        {/* Square Feet */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Square Feet</label>
          <div className="flex space-x-2">
            <div className="w-1/2">
              <label className="block text-xs text-gray-500">Minimum</label>
              <input
                type="number"
                name="minSquareFeet"
                value={formData.minSquareFeet === undefined ? '' : formData.minSquareFeet}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="100"
              />
            </div>
            <div className="w-1/2">
              <label className="block text-xs text-gray-500">Maximum</label>
              <input
                type="number"
                name="maxSquareFeet"
                value={formData.maxSquareFeet === undefined ? '' : formData.maxSquareFeet}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                min="0"
                step="100"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Locations */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Locations</label>
        <p className="text-xs text-gray-500">Separate multiple locations with commas</p>
        <input
          type="text"
          value={locationsText}
          onChange={handleLocationsChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="e.g. San Francisco, Berkeley, Oakland"
        />
      </div>

      {/* Property Types */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">Property Types</label>
        <p className="text-xs text-gray-500">Separate multiple types with commas</p>
        <input
          type="text"
          value={propertyTypesText}
          onChange={handlePropertyTypesChange}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="e.g. Single Family Home, Condo, Townhouse"
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center">
        <input
          type="checkbox"
          name="isActive"
          checked={formData.isActive === true}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
          Active Search
        </label>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default PropertySearchCriteriaForm; 