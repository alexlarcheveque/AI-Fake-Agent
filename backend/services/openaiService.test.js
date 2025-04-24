import openaiService from './openaiService.js';

describe('openaiService', () => {
  describe('generateBuyerLeadPrompt', () => {
    const mockConfigSettings = {
      AGENT_NAME: 'Test Agent',
      COMPANY_NAME: 'Test Realty',
      AGENT_STATE: 'Test State',
      AGENT_CITY: 'Test City',
      // Add other settings if needed by the prompt structure
    };
    const mockContext = 'Looking for a 3 bed, 2 bath house.';
    const mockFormattedCurrentDate = 'July 26, 2024';
    const mockCurrentDayName = 'Friday';
    const mockTomorrowFormatted = '07/27/2024';

    it('should generate the correct prompt string with context', () => {
      const prompt = openaiService.generateBuyerLeadPrompt(
        mockConfigSettings,
        mockContext,
        mockFormattedCurrentDate,
        mockCurrentDayName,
        mockTomorrowFormatted
      );

      // Basic checks for interpolation
      expect(prompt).toContain(`agent assistant in the state of ${mockConfigSettings.AGENT_STATE}`);
      expect(prompt).toContain(`agent named "${mockConfigSettings.AGENT_NAME}"`);
      expect(prompt).toContain(`working for "${mockConfigSettings.COMPANY_NAME}"`);
      expect(prompt).toContain(mockContext);
      expect(prompt).toContain(`Today's date is ${mockFormattedCurrentDate} (${mockCurrentDayName})`);
      expect(prompt).toContain(`earliest appointment can be scheduled for tomorrow (${mockTomorrowFormatted})`);

      // Check for key structural elements
      expect(prompt).toContain('# Lead Context Information');
      expect(prompt).toContain('Objective:');
      expect(prompt).toContain('Instructions:');
      expect(prompt).toContain('NEW SEARCH CRITERIA:');
      expect(prompt).toContain('NEW APPOINTMENT SET:');
    });

    it('should generate the correct prompt string without context', () => {
      const prompt = openaiService.generateBuyerLeadPrompt(
        mockConfigSettings,
        null, // No context
        mockFormattedCurrentDate,
        mockCurrentDayName,
        mockTomorrowFormatted
      );

      // Check that context section is handled correctly
      expect(prompt).toContain('# Lead Context Information');
      expect(prompt).not.toContain(mockContext);
      expect(prompt).toContain(`${mockContext ? mockContext : ''}`); // Checks the template literal part specifically

      // Check other interpolations
      expect(prompt).toContain(`agent assistant in the state of ${mockConfigSettings.AGENT_STATE}`);
      expect(prompt).toContain(`agent named "${mockConfigSettings.AGENT_NAME}"`);
      expect(prompt).toContain(`working for "${mockConfigSettings.COMPANY_NAME}"`);
      expect(prompt).toContain(`Today's date is ${mockFormattedCurrentDate} (${mockCurrentDayName})`);
      expect(prompt).toContain(`earliest appointment can be scheduled for tomorrow (${mockTomorrowFormatted})`);
    });

    // Add more tests for edge cases if needed
  });

  // Add describe blocks for other methods in openaiService later
}); 