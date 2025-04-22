import { createContext, useContext, useState } from 'react';

interface LastClearTimeContextValue {
  lastClearTime: number;
  updateClearTime: (time: number) => void;
  resetClearTime: () => void;
}

export const LastClearTimeContext = createContext<LastClearTimeContextValue>({
  lastClearTime: 0,
  updateClearTime: () => {},
  resetClearTime: () => {},
});

export const LastClearTimeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lastClearTime, setLastClearTime] = useState<number>(0);

  const updateClearTime = (time: number) => {
    setLastClearTime(time);
  };

  const resetClearTime = () => {
    setLastClearTime(0);
  };

  return (
    <LastClearTimeContext.Provider value={{ lastClearTime, updateClearTime, resetClearTime }}>
      {children}
    </LastClearTimeContext.Provider>
  );
};

export const useLastClearTime = () => useContext(LastClearTimeContext);

export default useLastClearTime;