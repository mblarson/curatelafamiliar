
import React, { createContext, useState, useCallback, ReactNode, useEffect } from 'react';

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  data?: any;
}

interface LoggerContextType {
  logs: LogEntry[];
  addLog: (level: LogLevel, message: string, data?: any) => void;
  clearLogs: () => void;
}

export const LoggerContext = createContext<LoggerContextType | undefined>(undefined);

export const LoggerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const addLog = useCallback((level: LogLevel, message: string, data?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined // Deep copy to avoid mutation issues
    };
    setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 99)]); // Keep last 100 logs
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Intercept global console methods
  useEffect(() => {
    const originalConsole = { ...console };
    
    console.log = (...args) => {
      addLog(LogLevel.INFO, args.map(arg => String(arg)).join(' '));
      originalConsole.log(...args);
    };
    console.warn = (...args) => {
      addLog(LogLevel.WARN, args.map(arg => String(arg)).join(' '));
      originalConsole.warn(...args);
    };
    console.error = (...args) => {
      // Try to get more info from Error objects
      const message = args.map(arg => (arg instanceof Error ? arg.stack || arg.message : String(arg))).join(' ');
      addLog(LogLevel.ERROR, message);
      originalConsole.error(...args);
    };

    return () => {
      // Restore original console methods on cleanup
      console.log = originalConsole.log;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
    };
  }, [addLog]);


  const contextValue = { logs, addLog, clearLogs };

  return (
    <LoggerContext.Provider value={contextValue}>
      {children}
    </LoggerContext.Provider>
  );
};
