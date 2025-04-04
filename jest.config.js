export default {
  // Common configuration for both frontend and backend
  projects: [
    // Backend configuration
    {
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/backend/__tests__/**/*.test.js'],
      moduleFileExtensions: ['js', 'json'],
      transform: {
        '^.+\\.js$': 'babel-jest'
      },
      globals: {
        'NODE_ENV': 'test'
      },
      setupFilesAfterEnv: [
        '<rootDir>/backend/__tests__/setupAfterEnv.js'
      ],
      moduleNameMapper: {
        '^openai$': '<rootDir>/backend/__mocks__/openai.js',
        '^twilio$': '<rootDir>/backend/__mocks__/twilio.js'
      },
      collectCoverageFrom: [
        'backend/controllers/**/*.js',
        'backend/services/**/*.js',
        'backend/utils/**/*.js',
        '!**/node_modules/**'
      ],
      coverageDirectory: 'coverage/backend',
      testPathIgnorePatterns: ['/node_modules/']
    },
    
    // Frontend configuration
    {
      displayName: 'frontend',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/frontend/src/__tests__/**/*.test.{js,jsx}'],
      moduleFileExtensions: ['js', 'jsx', 'json'],
      extensionsToTreatAsEsm: ['.jsx'],
      transform: {
        '^.+\\.(js|jsx)$': ['babel-jest', { rootMode: 'upward' }],
        '^.+\\.css$': '<rootDir>/frontend/config/cssTransform.js',
        '^(?!.*\\.(js|jsx|css|json)$)': '<rootDir>/frontend/config/fileTransform.js'
      },
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
        '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/frontend/__mocks__/fileMock.js'
      },
      setupFilesAfterEnv: [
        '<rootDir>/frontend/src/setupTests.js'
      ],
      collectCoverageFrom: [
        'frontend/src/**/*.{js,jsx}',
        '!frontend/src/index.js',
        '!frontend/src/serviceWorker.js',
        '!**/node_modules/**'
      ],
      coverageDirectory: 'coverage/frontend',
      testPathIgnorePatterns: ['/node_modules/']
    }
  ],
  // Global coverage configuration
  collectCoverage: false,
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
}; 