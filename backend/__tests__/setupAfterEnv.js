// Mock Sequelize
jest.mock('sequelize', () => {
  const SequelizeMock = jest.fn(() => ({
    define: jest.fn().mockReturnValue({
      findOne: jest.fn(),
      findAll: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: jest.fn(),
      hasMany: jest.fn(),
      belongsTo: jest.fn()
    }),
    authenticate: jest.fn(),
    sync: jest.fn().mockResolvedValue()
  }));
  
  SequelizeMock.DataTypes = {
    STRING: 'STRING',
    TEXT: 'TEXT',
    INTEGER: 'INTEGER',
    BOOLEAN: 'BOOLEAN',
    DATE: 'DATE',
    UUID: 'UUID',
    ENUM: jest.fn().mockImplementation((...args) => 'ENUM'),
    JSON: 'JSON'
  };
  
  return SequelizeMock;
});

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockImplementation((password, saltRounds) => 
    Promise.resolve(`hashed_${password}`)),
  compare: jest.fn().mockImplementation((password, hashedPassword) => 
    Promise.resolve(hashedPassword === `hashed_${password}`)),
  genSalt: jest.fn().mockResolvedValue('salt')
}));

// Prevent the model circular dependencies by directly mocking the models
jest.mock('../models/Lead', () => {
  return {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    hasMany: jest.fn()
  };
}, { virtual: true });

jest.mock('../models/Message', () => {
  return {
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    belongsTo: jest.fn()
  };
}, { virtual: true });

jest.mock('../models/User', () => {
  const mockUser = {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    findByCredentials: jest.fn()
  };
  
  // Add prototype methods
  mockUser.prototype = {
    checkPassword: jest.fn().mockResolvedValue(true)
  };
  
  return mockUser;
}, { virtual: true });

jest.mock('../models/Appointment', () => {
  return {
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    belongsTo: jest.fn()
  };
}, { virtual: true });

// Mock database connection
jest.mock('../config/database', () => ({
  sync: jest.fn().mockResolvedValue(),
  define: jest.fn().mockReturnValue({
    findOne: jest.fn(),
    findAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn()
  }),
  authenticate: jest.fn(),
}));

// Mock appointment service
jest.mock('../services/appointmentService', () => ({
  createAppointment: jest.fn().mockResolvedValue({
    id: 123,
    date: '2023-06-15',
    time: '14:00',
    leadId: 1
  }),
  getAppointmentsForLead: jest.fn().mockResolvedValue([])
}));

// Mock other services
jest.mock('../services/twilioService', () => ({
  sendMessage: jest.fn().mockResolvedValue({
    sid: 'SM123456',
    status: 'queued'
  })
}));

jest.mock('../services/openaiService', () => ({
  generateResponse: jest.fn().mockResolvedValue({
    text: 'This is a mock response from OpenAI.',
    isPropertySearch: false
  }),
  parseNewPropertySearchFormat: jest.fn().mockReturnValue({
    minBedrooms: 3,
    maxBedrooms: 4,
    locations: ['Austin']
  }),
  handleResponse: jest.fn().mockImplementation((text) => {
    if (text.includes('NEW APPOINTMENT SET:')) {
      return {
        hasAppointment: true,
        text: text.split('NEW APPOINTMENT SET:')[0].trim(),
        appointmentDetails: {
          date: '06/15/2023',
          time: '2:00 PM'
        }
      };
    } else if (text.includes('NEW SEARCH CRITERIA:')) {
      return {
        hasPropertySearch: true,
        text: text.split('NEW SEARCH CRITERIA:')[0].trim(),
        searchCriteria: 'NEW SEARCH CRITERIA: MIN BEDROOMS: 3, MAX BEDROOMS: 4'
      };
    } else {
      return text;
    }
  })
}));

jest.mock('../services/userSettingsService', () => ({
  getSettings: jest.fn().mockResolvedValue({
    agentName: 'Test Agent',
    companyName: 'Test Company'
  }),
  getAllSettings: jest.fn().mockResolvedValue({
    agentName: 'Test Agent',
    companyName: 'Test Company'
  }),
  updateSettings: jest.fn().mockResolvedValue(true)
}));

jest.mock('../services/leadStatusService', () => ({
  updateStatusBasedOnMessage: jest.fn().mockResolvedValue(true)
}));

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Reset the mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
}); 