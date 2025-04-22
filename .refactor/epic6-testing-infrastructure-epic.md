# Epic 6: Testing Infrastructure

**Description:** Set up comprehensive testing infrastructure for the application.

## Stories

### Story 6.1: Set Up Unit Testing Framework

**Description:** Configure Jest and React Testing Library for unit testing.

**Tasks:**
- Install and configure Jest
- Set up React Testing Library
- Create test configuration files
- Add script commands for running tests

**Acceptance Criteria:**
- Jest and React Testing Library configured
- Test configuration files created
- Script commands for running tests
- Sample tests for utility functions

**Example Implementation:**
```typescript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/components/(.*)$': '<rootDir>/src/components/$1',
    '^@/contexts/(.*)$': '<rootDir>/src/contexts/$1',
    '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@/types/(.*)$': '<rootDir>/src/types/$1',
    '^@/lib/(.*)$': '<rootDir>/src/lib/$1',
  },
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/.next/'],
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/pages/_app.tsx',
    '!src/pages/_document.tsx',
  ],
};

// jest.setup.js
import '@testing-library/jest-dom';
```

### Story 6.2: Create Unit Tests for Utility Functions

**Description:** Develop unit tests for core utility functions.

**Tasks:**
- Identify critical utility functions
- Write unit tests for each function
- Add test coverage reporting
- Document testing patterns for the team

**Acceptance Criteria:**
- Unit tests for critical utility functions
- Test coverage reporting
- Documentation on testing patterns
- At least 80% test coverage for utilities

**Example Implementation:**
```typescript
// src/utils/formatUtils.test.ts
import { formatTime, formatFileSize, formatDuration } from './formatUtils';

describe('formatTime', () => {
  it('should format seconds to MM:SS', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(30)).toBe('0:30');
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(3661)).toBe('61:01');
  });

  it('should handle invalid inputs', () => {
    expect(formatTime(-1)).toBe('0:00');
    expect(formatTime(NaN)).toBe('0:00');
    expect(formatTime(null as any)).toBe('0:00');
  });
});

describe('formatFileSize', () => {
  it('should format bytes to human-readable size', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(1048576)).toBe('1 MB');
    expect(formatFileSize(1073741824)).toBe('1 GB');
  });
});

describe('formatDuration', () => {
  it('should format seconds to HH:MM:SS', () => {
    expect(formatDuration(0)).toBe('00:00:00');
    expect(formatDuration(30)).toBe('00:00:30');
    expect(formatDuration(60)).toBe('00:01:00');
    expect(formatDuration(3600)).toBe('01:00:00');
    expect(formatDuration(3661)).toBe('01:01:01');
  });
});
```

### Story 6.3: Implement Component Testing

**Description:** Add tests for React components to ensure correct rendering and behavior.

**Tasks:**
- Create tests for presentational components
- Add tests for container components
- Test context providers and consumers
- Create test utilities for common patterns

**Acceptance Criteria:**
- Tests for key presentational components
- Tests for container components
- Tests for context providers and consumers
- Reusable test utilities

**Example Implementation:**
```typescript
// src/components/VideoPlayer.test.tsx
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayer } from './VideoPlayer';

// Mock dependencies
jest.mock('../contexts/VideoContext', () => ({
  useVideo: () => ({
    state: {
      isPlaying: false,
      currentTime: 0,
      duration: 100,
      playbackRate: 1,
      volume: 1
    },
    play: jest.fn(),
    pause: jest.fn(),
    seek: jest.fn(),
    setPlaybackRate: jest.fn(),
    setVolume: jest.fn()
  })
}));

describe('VideoPlayer', () => {
  beforeEach(() => {
    // Mock HTMLMediaElement methods
    window.HTMLMediaElement.prototype.play = jest.fn();
    window.HTMLMediaElement.prototype.pause = jest.fn();
  });

  it('renders correctly with default props', () => {
    render(<VideoPlayer videoUrl="test-video.mp4" />);
    
    // Check if video element is rendered
    const videoElement = screen.getByTestId('video-player');
    expect(videoElement).toBeInTheDocument();
    
    // Check if control elements are rendered
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Volume')).toBeInTheDocument();
    expect(screen.getByLabelText('Progress')).toBeInTheDocument();
  });
  
  it('calls play function when play button is clicked', () => {
    const { useVideo } = require('../contexts/VideoContext');
    const mockPlay = useVideo().play;
    
    render(<VideoPlayer videoUrl="test-video.mp4" />);
    
    fireEvent.click(screen.getByLabelText('Play'));
    expect(mockPlay).toHaveBeenCalled();
  });
  
  it('seeks to correct time when progress bar is clicked', () => {
    const { useVideo } = require('../contexts/VideoContext');
    const mockSeek = useVideo().seek;
    
    render(<VideoPlayer videoUrl="test-video.mp4" />);
    
    // Mock getBoundingClientRect for the progress bar
    Element.prototype.getBoundingClientRect = jest.fn(() => ({
      width: 100,
      height: 10,
      top: 0,
      left: 0,
      bottom: 0,
      right: 0,
      x: 0,
      y: 0,
      toJSON: () => {}
    }));
    
    // Click at 50% position
    fireEvent.click(screen.getByLabelText('Progress'), { clientX: an = 50 });
    expect(mockSeek).toHaveBeenCalledWith(50);
  });
});
```

### Story 6.4: Create Integration Tests

**Description:** Develop integration tests for critical user flows.

**Tasks:**
- Identify critical user flows
- Create end-to-end tests for each flow
- Set up test environment for integration tests
- Add CI integration for automated testing

**Acceptance Criteria:**
- Integration tests for critical user flows
- Test environment for integration tests
- CI integration for automated testing
- Documentation on integration testing

**Example Implementation:**
```typescript
// cypress/integration/login_spec.js
describe('Login Flow', () => {
  beforeEach(() => {
    // Reset database state or use test database
    cy.exec('npm run db:reset');
    
    // Visit the login page
    cy.visit('/auth/signin');
  });
  
  it('should login with valid credentials', () => {
    // Enter valid credentials
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify redirection to dashboard
    cy.url().should('include', '/inbox');
    
    // Verify user is logged in
    cy.get('[data-testid="user-menu"]').should('contain', 'Test User');
  });
  
  it('should show error with invalid credentials', () => {
    // Enter invalid credentials
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('wrongpassword');
    
    // Submit the form
    cy.get('button[type="submit"]').click();
    
    // Verify error message
    cy.get('[data-testid="error-message"]').should('be.visible');
    cy.get('[data-testid="error-message"]').should('contain', 'Invalid email or password');
    
    // Verify URL has not changed
    cy.url().should('include', '/auth/signin');
  });
  
  it('should navigate to registration page', () => {
    // Click on register link
    cy.get('a[href="/auth/register"]').click();
    
    // Verify redirection to registration page
    cy.url().should('include', '/auth/register');
  });
});
```

### Story 6.5: Implement API Testing

**Description:** Create tests for API endpoints to ensure correct behavior.

**Tasks:**
- Set up API testing framework
- Create tests for each API endpoint
- Test error handling and edge cases
- Add test data generation

**Acceptance Criteria:**
- API testing framework set up
- Tests for all API endpoints
- Tests for error handling and edge cases
- Test data generation utilities

**Example Implementation:**
```typescript
// src/pages/api/videos.test.ts
import { createMocks } from 'node-mocks-http';
import { NextApiRequest, NextApiResponse } from 'next';
import videosHandler from './videos';
import { mockCosmosClient } from '../../__mocks__/@azure/cosmos';

// Mock Cosmos DB
jest.mock('@/utils/cosmosDb', () => ({
  initCosmosConnection: () => mockCosmosClient
}));

describe('Videos API', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock Cosmos DB responses
    mockCosmosClient.items.query.mockImplementation(() => ({
      fetchAll: async () => ({
        resources: [
          { id: 'video-1', title: 'Test Video 1' },
          { id: 'video-2', title: 'Test Video 2' }
        ]
      })
    }));
  });
  
  it('should return all videos for GET request without id', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET'
    });
    
    await videosHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveLength(2);
    expect(JSON.parse(res._getData())[0].title).toBe('Test Video 1');
  });
  
  it('should return a single video for GET request with id', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
      query: { id: 'video-1' }
    });
    
    // Mock specific video query
    mockCosmosClient.items.query.mockImplementation(() => ({
      fetchAll: async () => ({
        resources: [{ id: 'video-1', title: 'Test Video 1' }]
      })
    }));
    
    await videosHandler(req, res);
    
    expect(res._getStatusCode()).toBe(200);
    expect(JSON.parse(res._getData())).toHaveLength(1);
    expect(JSON.parse(res._getData())[0].id).toBe('video-1');
  });
  
  it('should create a new video for POST request', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        title: 'New Video',
        videoUrl: 'https://example.com/video.mp4'
      }
    });
    
    // Mock create operation
    mockCosmosClient.items.create.mockResolvedValue({
      resource: {
        id: 'new-video-id',
        title: 'New Video',
        videoUrl: 'https://example.com/video.mp4'
      }
    });
    
    await videosHandler(req, res);
    
    expect(res._getStatusCode()).toBe(201);
    expect(JSON.parse(res._getData()).title).toBe('New Video');
  });
  
  it('should return 400 for POST request with missing required fields', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'POST',
      body: {
        title: 'New Video'
        // Missing videoUrl
      }
    });
    
    await videosHandler(req, res);
    
    expect(res._getStatusCode()).toBe(400);
    expect(JSON.parse(res._getData()).error).toBeDefined();
  });
  
  it('should handle database errors', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET'
    });
    
    // Mock database error
    mockCosmosClient.items.query.mockImplementation(() => {
      throw new Error('Database connection failed');
    });
    
    await videosHandler(req, res);
    
    expect(res._getStatusCode()).toBe(500);
    expect(JSON.parse(res._getData()).error).toBeDefined();
  });
});
```

### Story 6.6: Set Up Test Automation with CI/CD

**Description:** Configure automated testing in the CI/CD pipeline.

**Tasks:**
- Set up GitHub Actions for test automation
- Configure test coverage reporting
- Add test runs to CI/CD pipeline
- Create test badges for repository

**Acceptance Criteria:**
- GitHub Actions configured for test automation
- Test coverage reporting in CI/CD
- Tests run automatically on pull requests
- Test badges in repository README

**Example Implementation:**
```yaml
# .github/workflows/test.yml
name: Run Tests

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Lint
      run: npm run lint
    
    - name: Type check
      run: npm run type-check
    
    - name: Run unit tests
      run: npm run test:ci
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v2
      with:
        token: ${{ secrets.CODECOV_TOKEN }}
        directory: ./coverage/
        fail_ci_if_error: true
    
    - name: Build
      run: npm run build
    
    # Optional: Run integration tests
    - name: Run integration tests
      run: npm run test:integration
```
