// jest.setup.js
import '@testing-library/jest-dom';
import 'whatwg-fetch';
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder/TextDecoder to global scope for Node.js environment
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock IntersectionObserver which isn't available in test environment
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  disconnect() {
    return null;
  }
  observe() {
    return null;
  }
  takeRecords() {
    return [];
  }
  unobserve() {
    return null;
  }
};

// Mock window.matchMedia
window.matchMedia = (query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

// Mock crypto.getRandomValues
crypto.getRandomValues = (arr) => {
  for (let i = 0; i < arr.length; i++) {
    arr[i] = Math.floor(Math.random() * 256);
  }
  return arr;
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  disconnect() {
    return null;
  }
  observe() {
    return null;
  }
  unobserve() {
    return null;
  }
};

// Mock canvas methods
HTMLCanvasElement.prototype.getContext = () => {
  return {
    fillRect: jest.fn(),
    clearRect: jest.fn(),
    getImageData: jest.fn(() => ({
      data: new Array(4),
    })),
    putImageData: jest.fn(),
    createImageData: jest.fn(() => []),
    setTransform: jest.fn(),
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    closePath: jest.fn(),
    stroke: jest.fn(),
    translate: jest.fn(),
    scale: jest.fn(),
    rotate: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    measureText: jest.fn(() => ({ width: 0 })),
    transform: jest.fn(),
    rect: jest.fn(),
    clip: jest.fn(),
  };
};

// Mock window.URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Suppresses console errors/warnings in test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
console.error = (...args) => {
  if (
    /Warning: ReactDOM.render is no longer supported in React 18./.test(args[0]) ||
    /Warning: The current testing environment is not configured to support act/.test(args[0]) ||
    /Warning: You seem to have overlapping act/.test(args[0])
  ) {
    return;
  }
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (/Warning: React does not recognize the.*prop on a DOM element/.test(args[0])) {
    return;
  }
  originalConsoleWarn(...args);
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});