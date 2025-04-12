import propertySearchApi from '../api/propertySearchApi';

describe('Property Search Criteria Parsing', () => {
  describe('parseStructuredPropertySearch', () => {
    test('should correctly parse JSON from NEW PROPERTY SEARCH format', () => {
      const message = `Here are some properties that match your criteria:
      
NEW PROPERTY SEARCH: {"minBedrooms": 4, "minBathrooms": 2.5, "minPrice": 500000, "maxPrice": 800000, "location": "Austin, TX"}`;
      
      const result = propertySearchApi.parseStructuredPropertySearch(message);
      
      expect(result).toEqual({
        minBedrooms: 4,
        minBathrooms: 2.5,
        minPrice: 500000,
        maxPrice: 800000,
        location: "Austin, TX"
      });
    });
    
    test('should handle invalid JSON in NEW PROPERTY SEARCH format', () => {
      const message = `Here are some properties that match your criteria:
      
NEW PROPERTY SEARCH: {"minBedrooms": 4, "minBathrooms": 2.5, missing quotes and invalid JSON}`;
      
      // It should try the other parsers as fallback
      const spy = jest.spyOn(propertySearchApi, 'parseSearchCriteriaFromAIMessage');
      
      propertySearchApi.parseStructuredPropertySearch(message);
      
      expect(spy).toHaveBeenCalled();
      
      spy.mockRestore();
    });
    
    test('should fall back to parseSearchCriteriaFromAIMessage when no structured data is found', () => {
      const message = `Here are some properties with 3 bedrooms that match your criteria.`;
      
      const spy = jest.spyOn(propertySearchApi, 'parseSearchCriteriaFromAIMessage')
        .mockReturnValue({ bedrooms: 3 });
      
      const result = propertySearchApi.parseStructuredPropertySearch(message);
      
      expect(spy).toHaveBeenCalled();
      expect(result).toEqual({ bedrooms: 3 });
      
      spy.mockRestore();
    });
    
    test('should fall back to parseNaturalLanguageCriteria as last resort', () => {
      const message = `Here are some properties with 3 bedrooms that match your criteria.`;
      
      const spyExplicit = jest.spyOn(propertySearchApi, 'parseSearchCriteriaFromAIMessage')
        .mockReturnValue(null);
      
      const spyNatural = jest.spyOn(propertySearchApi, 'parseNaturalLanguageCriteria')
        .mockReturnValue({ bedrooms: 3 });
      
      const result = propertySearchApi.parseStructuredPropertySearch(message);
      
      expect(spyExplicit).toHaveBeenCalled();
      expect(spyNatural).toHaveBeenCalled();
      expect(result).toEqual({ bedrooms: 3 });
      
      spyExplicit.mockRestore();
      spyNatural.mockRestore();
    });
  });
}); 