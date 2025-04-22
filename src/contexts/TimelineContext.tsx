'use client';

import React, { useState, useCallback } from 'react';
import { createTimelineContext } from './factory/timelineFactory';

// Create the context using the factory
const { 
  Provider: TimelineProvider, 
  useTimeline 
} = createTimelineContext();

// Create a LastClearTime context for managing when annotations were last cleared
const LastClearTimeContext = React.createContext<{
  lastClearTime: number;
  updateClearTime: (time: number) => void;
}>({
  lastClearTime: 0,
  updateClearTime: () => {},
});

// Provider wrapper that combines TimelineProvider with LastClearTimeContext
const CombinedTimelineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastClearTime, setLastClearTime] = useState(0);
  
  const updateClearTime = useCallback((time: number) => {
    setLastClearTime(time);
  }, []);

  return (
    <TimelineProvider>
      <LastClearTimeContext.Provider value={{ lastClearTime, updateClearTime }}>
        {children}
      </LastClearTimeContext.Provider>
    </TimelineProvider>
  );
};

// Custom hook for accessing the LastClearTime context
const useLastClearTime = () => {
  return React.useContext(LastClearTimeContext);
};

// Export the components and hooks
export { 
  CombinedTimelineProvider as TimelineProvider, 
  useTimeline,
  useLastClearTime
};