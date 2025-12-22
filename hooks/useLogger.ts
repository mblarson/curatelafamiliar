import { useContext } from 'react';
import { LoggerContext, LogLevel } from '../context/LoggerContext';

export const useLogger = () => {
  const context = useContext(LoggerContext);
  if (context === undefined) {
    throw new Error('useLogger must be used within a LoggerProvider');
  }

  const { addLog, clearLogs, logs } = context;

  return {
    logs,
    info: (message: string, data?: any) => addLog(LogLevel.INFO, message, data),
    warn: (message: string, data?: any) => addLog(LogLevel.WARN, message, data),
    error: (message: string, data?: any) => addLog(LogLevel.ERROR, message, data),
    clear: clearLogs,
  };
};