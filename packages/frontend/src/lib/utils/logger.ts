/**
 * Centralized logging utility for PrismVid Frontend
 * Provides structured logging with different levels
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  data?: Record<string, any>;
  timestamp: string;
}

class Logger {
  private isDevelopment = import.meta.env.DEV;
  private logLevel: LogLevel = (import.meta.env.VITE_LOG_LEVEL as LogLevel) || 'info';

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    return levels[level] >= levels[this.logLevel];
  }

  private formatMessage(level: LogLevel, message: string, data?: Record<string, any>): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data && Object.keys(data).length > 0) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    return `${prefix} ${message}`;
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>): void {
    if (!this.shouldLog(level)) return;

    const formattedMessage = this.formatMessage(level, message, data);
    
    if (this.isDevelopment) {
      // In development, use console with colors
      const colors = {
        debug: 'color: #888',
        info: 'color: #2196F3',
        warn: 'color: #FF9800',
        error: 'color: #F44336'
      };
      
      console.log(`%c${formattedMessage}`, colors[level]);
    } else {
      // In production, use appropriate console method
      switch (level) {
        case 'debug':
        case 'info':
          console.log(formattedMessage);
          break;
        case 'warn':
          console.warn(formattedMessage);
          break;
        case 'error':
          console.error(formattedMessage);
          break;
      }
    }
  }

  debug(message: string, data?: Record<string, any>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, any>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, any>): void {
    this.log('error', message, data);
  }
}

export const logger = new Logger();
export default logger;
