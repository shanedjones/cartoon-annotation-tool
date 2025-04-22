import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VirtualList from '../VirtualList';

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

describe('VirtualList', () => {
  // Mock data for testing
  const mockItems = Array.from({ length: 100 }, (_, i) => ({
    id: `item-${i}`,
    value: `Item ${i}`
  }));

  // Helper to get element dimensions for mocking
  const mockElementDimensions = (width: number, height: number) => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: height
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: width
    });
  };

  // Mock scroll event
  const mockScroll = (element: HTMLElement, scrollTop: number) => {
    Object.defineProperty(element, 'scrollTop', {
      configurable: true,
      value: scrollTop
    });
    fireEvent.scroll(element);
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock element dimensions for testing
    mockElementDimensions(500, 400);
  });

  afterEach(() => {
    // Cleanup
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      value: 0
    });
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
      configurable: true,
      value: 0
    });
  });

  it('renders without crashing', () => {
    render(
      <VirtualList
        items={mockItems}
        renderItem={(item) => <div data-testid={`item-${item.id}`}>{item.value}</div>}
        itemHeight={50}
      />
    );
    
    // VirtualList should be rendered
    expect(document.querySelector('.virtual-list-container')).toBeInTheDocument();
  });

  it('renders empty state when no items are provided', () => {
    render(
      <VirtualList
        items={[]}
        renderItem={(item) => <div>{item.value}</div>}
        itemHeight={50}
        emptyComponent={<div data-testid="empty-state">No items available</div>}
      />
    );
    
    // Empty state should be rendered
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders loading indicator when isLoading is true', () => {
    render(
      <VirtualList
        items={mockItems}
        renderItem={(item) => <div>{item.value}</div>}
        itemHeight={50}
        isLoading={true}
        loadingIndicator={<div data-testid="loading-indicator">Loading...</div>}
      />
    );
    
    // Loading indicator should be rendered
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('renders visible items based on viewport', () => {
    const { container } = render(
      <VirtualList
        items={mockItems}
        renderItem={(item) => <div data-testid={item.id}>{item.value}</div>}
        itemHeight={50}
        height={200} // Only show 4 items (50px each)
      />
    );
    
    // Get the list container
    const listContainer = container.querySelector('.virtual-list-container');
    
    // Initially, should render first few items plus overscan
    expect(screen.getByTestId('item-0')).toBeInTheDocument();
    expect(screen.getByTestId('item-1')).toBeInTheDocument();
    expect(screen.getByTestId('item-2')).toBeInTheDocument();
    expect(screen.getByTestId('item-3')).toBeInTheDocument();
    
    // Simulate scrolling down
    if (listContainer) {
      mockScroll(listContainer, 250); // Scroll down 250px (5 items)
      
      // After scrolling, should render items starting around index 5
      expect(screen.getByTestId('item-5')).toBeInTheDocument();
      expect(screen.getByTestId('item-6')).toBeInTheDocument();
      expect(screen.getByTestId('item-7')).toBeInTheDocument();
      expect(screen.getByTestId('item-8')).toBeInTheDocument();
    }
  });

  it('calls onEndReached when scrolled to the bottom', () => {
    const onEndReached = jest.fn();
    const { container } = render(
      <VirtualList
        items={mockItems}
        renderItem={(item) => <div>{item.value}</div>}
        itemHeight={50}
        height={200}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.8}
      />
    );
    
    // Get the list container
    const listContainer = container.querySelector('.virtual-list-container');
    
    // Simulate scrolling to near the end
    if (listContainer) {
      // Calculate a position that's beyond the onEndReachedThreshold
      const totalHeight = mockItems.length * 50; // Each item is 50px
      const scrollPosition = totalHeight * 0.85; // Beyond the 0.8 threshold
      
      mockScroll(listContainer, scrollPosition);
      
      // onEndReached should be called
      expect(onEndReached).toHaveBeenCalled();
    }
  });

  it('uses keyExtractor function when provided', () => {
    const keyExtractor = jest.fn((item) => `custom-key-${item.id}`);
    
    render(
      <VirtualList
        items={mockItems.slice(0, 5)} // Use just a few items
        renderItem={(item) => <div>{item.value}</div>}
        itemHeight={50}
        keyExtractor={keyExtractor}
      />
    );
    
    // keyExtractor should be called for each rendered item
    expect(keyExtractor).toHaveBeenCalledTimes(5);
    expect(keyExtractor).toHaveBeenCalledWith(mockItems[0], 0);
    expect(keyExtractor).toHaveBeenCalledWith(mockItems[1], 1);
  });
});