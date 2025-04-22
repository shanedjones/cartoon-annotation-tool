// jest.config.js
const nextJest = require('next/jest');

// Providing the path to your Next.js app to load next.config.js and .env files
const createJestConfig = nextJest({
  dir: './',
});

// Custom Jest configuration
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Directory where Jest should store its cached dependency information
  cacheDirectory: '<rootDir>/.jest-cache',
  
  // Test environment for React components
  testEnvironment: 'jest-environment-jsdom',
  
  // Test paths to run
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/?(*.)+(spec|test).[jt]s?(x)',
  ],
  
  // Ignore these directories
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/', 
    '<rootDir>/.next/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
  ],
  
  // Module name transformations
  moduleNameMapper: {
    // Handle module aliases (adjust based on tsconfig paths)
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
    '^@/state/(.*)$': '<rootDir>/src/state/$1',
    
    // Handle CSS/SCSS/SASS imports
    '\\.(css|scss|sass)$': 'identity-obj-proxy',
    
    // Handle image imports
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  
  // Transform files with ts-jest
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Coverage settings
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
    '!**/*.stories.{js,jsx,ts,tsx}',
    '!**/__tests__/**/*',
    '!**/__mocks__/**/*',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  
  // Watch settings
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Test timeout
  testTimeout: 10000,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config
module.exports = createJestConfig(customJestConfig);