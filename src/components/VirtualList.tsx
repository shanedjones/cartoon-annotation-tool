/**
 * Virtual list component for efficient rendering of large lists
 * Only renders the items that are visible in the viewport plus a buffer
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VirtualListProps<T> {
  // The data items to render
  items: T[];
  
  // Function to render an item
  renderItem: (item: T, index: number) => React.ReactNode;
  
  // Estimated height of each item (can be a function or constant)
  itemHeight: number | ((item: T, index: number) => number);
  
  // Number of items to render as buffer before and after visible items
  overscan?: number;
  
  // Optional height for the container (defaults to 100%)
  height?: number | string;
  
  // Optional width for the container (defaults to 100%)
  width?: number | string;
  
  // Optional class name for the container
  className?: string;
  
  // Optional key extractor function
  keyExtractor?: (item: T, index: number) => string;
  
  // Optional loading state
  isLoading?: boolean;
  
  // Optional loading indicator component
  loadingIndicator?: React.ReactNode;
  
  // Optional empty state component
  emptyComponent?: React.ReactNode;
  
  // Optional callback when list is scrolled to the bottom
  onEndReached?: () => void;
  
  // Threshold for triggering onEndReached (0 to 1, percentage of list height)
  onEndReachedThreshold?: number;
}

function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  overscan = 5,
  height = '100%',
  width = '100%',
  className = '',
  keyExtractor,
  isLoading = false,
  loadingIndicator = <div>Loading...</div>,
  emptyComponent = <div>No items</div>,
  onEndReached,
  onEndReachedThreshold = 0.8,
}: VirtualListProps<T>): React.ReactElement {
  // Reference to the scroll container
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State to track scroll position
  const [scrollTop, setScrollTop] = useState<number>(0);
  
  // Track if onEndReached has been called to prevent multiple calls
  const hasCalledOnEndReached = useRef<boolean>(false);
  
  // Calculate visible range
  const getVisibleRange = useCallback(() => {
    if (!containerRef.current) {
      return { startIndex: 0, endIndex: overscan * 2 };
    }
    
    const containerHeight = containerRef.current.clientHeight;
    
    // Get item height function
    const getHeight = (index: number) => 
      typeof itemHeight === 'function' 
        ? itemHeight(items[index], index) 
        : itemHeight;
    
    // Calculate the total height of all items
    const totalHeight = items.reduce(
      (sum, item, index) => sum + getHeight(index),
      0
    );
    
    // Find the start index
    let startIndex = 0;
    let accumulatedHeight = 0;
    
    while (startIndex < items.length && accumulatedHeight < scrollTop - (overscan * getHeight(startIndex))) {
      accumulatedHeight += getHeight(startIndex);
      startIndex++;
    }
    
    // Find the end index
    let endIndex = startIndex;
    while (
      endIndex < items.length && 
      accumulatedHeight < scrollTop + containerHeight + (overscan * getHeight(Math.min(endIndex, items.length - 1)))
    ) {
      accumulatedHeight += endIndex < items.length ? getHeight(endIndex) : 0;
      endIndex++;
    }
    
    // Check if we should call onEndReached
    if (
      onEndReached &&
      !hasCalledOnEndReached.current &&
      accumulatedHeight <= totalHeight &&
      endIndex >= items.length * onEndReachedThreshold
    ) {
      hasCalledOnEndReached.current = true;
      onEndReached();
    }
    
    return {
      startIndex: Math.max(0, startIndex),
      endIndex: Math.min(items.length, endIndex)
    };
  }, [items, itemHeight, overscan, scrollTop, onEndReached, onEndReachedThreshold]);
  
  // Calculate the visible items
  const { startIndex, endIndex } = getVisibleRange();
  
  // Reset onEndReached flag when items change
  useEffect(() => {
    hasCalledOnEndReached.current = false;
  }, [items]);
  
  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);
  
  // Calculate spacer heights and visible items
  const calcSpacerHeight = useCallback(
    (start: number, end: number) => {
      let height = 0;
      for (let i = start; i < end; i++) {
        height += typeof itemHeight === 'function'
          ? itemHeight(items[i], i)
          : itemHeight;
      }
      return height;
    },
    [items, itemHeight]
  );
  
  const topSpacerHeight = calcSpacerHeight(0, startIndex);
  const bottomSpacerHeight = calcSpacerHeight(endIndex, items.length);
  
  // Render only the visible items
  const visibleItems = items.slice(startIndex, endIndex).map((item, relativeIndex) => {
    const actualIndex = startIndex + relativeIndex;
    const key = keyExtractor ? keyExtractor(item, actualIndex) : actualIndex;
    
    return (
      <div key={key} data-index={actualIndex}>
        {renderItem(item, actualIndex)}
      </div>
    );
  });
  
  // Calculate total list height
  const totalHeight = items.reduce(
    (sum, item, index) => 
      sum + (typeof itemHeight === 'function' ? itemHeight(item, index) : itemHeight),
    0
  );
  
  // If no items and not loading, show empty component
  if (items.length === 0 && !isLoading) {
    return <div className={`virtual-list-empty ${className}`}>{emptyComponent}</div>;
  }
  
  return (
    <div
      ref={containerRef}
      className={`virtual-list-container ${className}`}
      style={{
        height,
        width,
        overflow: 'auto',
        position: 'relative',
      }}
      onScroll={handleScroll}
    >
      <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
        {/* Top spacer */}
        <div style={{ height: `${topSpacerHeight}px` }} />
        
        {/* Visible items */}
        {visibleItems}
        
        {/* Bottom spacer */}
        <div style={{ height: `${bottomSpacerHeight}px` }} />
      </div>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="virtual-list-loading">
          {loadingIndicator}
        </div>
      )}
    </div>
  );
}

export default React.memo(VirtualList) as typeof VirtualList;