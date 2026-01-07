
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

  const formatLogArgument = (arg: any): string => {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (arg instanceof Error) return arg.stack || arg.message;
    if (typeof arg === 'object') {
      // Handle Supabase/API style error objects
      if (arg.message) return arg.message;
      try {
        return JSON.stringify(arg);
      } catch (e) {
        return '[Unserializable Object]';
      }
    }
    return String(arg);
  };

  const addLog = useCallback((level: LogLevel, message: string, data?: any) => {
    const newLog: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      data: (() => {
        if (!data) return undefined;
        if (data instanceof Error) {
          return { name: data.name, message: data.message, stack: data.stack };
        }
        try {
          return JSON.parse(JSON.stringify(data));
        } catch (e) {
          return "Unserializable data";
        }
      })()
    };
    setLogs(prevLogs => [newLog, ...prevLogs.slice(0, 99)]);
  }, []);

  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  useEffect(() => {
    const originalConsole = { ...console };
    
    console.log = (...args) => {
      addLog(LogLevel.INFO, args.map(arg => formatLogArgument(arg)).join(' '));
      originalConsole.log(...args);
    };
    console.warn = (...args) => {
      addLog(LogLevel.WARN, args.map(arg => formatLogArgument(arg)).join(' '));
      originalConsole.warn(...args);
    };
    console.error = (...args) => {
      const message = args.map(arg => formatLogArgument(arg)).join(' ');
      addLog(LogLevel.ERROR, message);
      originalConsole.error(...args);
    };

    return () => {
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
