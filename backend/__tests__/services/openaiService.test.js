import { describe, it, expect } from '@jest/globals';
import openaiService from '../../services/openaiService.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get the path to the openaiService.js file
const servicePath = path.resolve(__dirname, '../../services/openaiService.js');

// Read the file content
const serviceCode = fs.readFileSync(servicePath, 'utf8');

// Simple test cases for now to ensure the service methods exist
describe('openaiService', () => {
  it('should have a generateResponse method', () => {
    expect(typeof openaiService.generateResponse).toBe('function');
  });

  it('should have a parseNewPropertySearchFormat method', () => {
    expect(typeof openaiService.parseNewPropertySearchFormat).toBe('function');
  });

  it('should have a handleResponse method', () => {
    expect(typeof openaiService.handleResponse).toBe('function');
  });

  it('should have a generateFollowUpMessage method', () => {
    expect(typeof openaiService.generateFollowUpMessage).toBe('function');
  });
  
  // Test the prompt selection logic based on implementation details we know
  describe('prompt selection', () => {
    it('should contain proper buyer, seller, and follow-up prompt templates', () => {
      // Check for the presence of key phrases in each prompt type
      // This is a simple way to validate the prompts exist without mocking OpenAI
      
      // BUYER_LEAD_PROMPT should contain buyer-specific content
      expect(serviceCode).toContain('BUYER_LEAD_PROMPT');
      expect(serviceCode).toContain('You are interacting with potential home buyers');
      expect(serviceCode).toContain('Build rapport with the buyer');
      
      // SELLER_LEAD_PROMPT should contain seller-specific content
      expect(serviceCode).toContain('SELLER_LEAD_PROMPT');
      expect(serviceCode).toContain('You are interacting with potential home sellers');
      expect(serviceCode).toContain('Assist potential home sellers');
      
      // FOLLOW_UP_PROMPT should contain follow-up specific content
      expect(serviceCode).toContain('FOLLOW_UP_PROMPT');
      expect(serviceCode).toContain('You are following up with leads');
      expect(serviceCode).toContain('Re-engage the lead');
    });
    
    it('should select the appropriate prompt based on lead type and follow-up status', () => {
      // Verify the selection logic exists
      expect(serviceCode).toContain('if (isFollowUp)');
      expect(serviceCode).toContain('systemPrompt = FOLLOW_UP_PROMPT');
      expect(serviceCode).toContain('else if (leadType === "seller")');
      expect(serviceCode).toContain('systemPrompt = SELLER_LEAD_PROMPT');
      expect(serviceCode).toContain('else if (leadType === "buyer")');
      expect(serviceCode).toContain('systemPrompt = BUYER_LEAD_PROMPT');
      expect(serviceCode).toContain('else');
      expect(serviceCode).toContain('systemPrompt = BUYER_LEAD_PROMPT'); // Default fallback
    });
  });
  
  // Test the appointment and search criteria detection logic
  describe('appointment and search criteria detection', () => {
    it('should have regex patterns to detect appointments', () => {
      // Check for appointment regex pattern
      expect(serviceCode).toContain('NEW APPOINTMENT SET:');
      expect(serviceCode).toContain('appointmentRegex');
    });
    
    it('should have regex patterns to detect search criteria', () => {
      // Check for search criteria regex pattern
      expect(serviceCode).toContain('NEW SEARCH CRITERIA:');
      expect(serviceCode).toContain('searchCriteriaRegex');
    });
  });
}); 