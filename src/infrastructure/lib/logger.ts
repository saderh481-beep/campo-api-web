type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  data?: Record<string, unknown>;
  error?: string;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  const envLevel = (process.env.LOG_LEVEL || "info").toLowerCase() as LogLevel;
  return LOG_LEVELS[level] >= LOG_LEVELS[envLevel];
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

export function createLogger(context: string) {
  return {
    debug(message: string, data?: Record<string, unknown>) {
      if (shouldLog("debug")) {
        console.log(formatLog({ timestamp: new Date().toISOString(), level: "debug", message, context, data }));
      }
    },
    info(message: string, data?: Record<string, unknown>) {
      if (shouldLog("info")) {
        console.log(formatLog({ timestamp: new Date().toISOString(), level: "info", message, context, data }));
      }
    },
    warn(message: string, data?: Record<string, unknown>) {
      if (shouldLog("warn")) {
        console.warn(formatLog({ timestamp: new Date().toISOString(), level: "warn", message, context, data }));
      }
    },
    error(message: string, error?: Error, data?: Record<string, unknown>) {
      if (shouldLog("error")) {
        console.error(formatLog({
          timestamp: new Date().toISOString(),
          level: "error",
          message,
          context,
          data,
          error: error?.stack || error?.message,
        }));
      }
    },
  };
}

export const logger = createLogger("app");

export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context: string
): T {
  return (async (...args: Parameters<T>) => {
    try {
      return await fn(...args);
    } catch (error) {
      logger.error(`${context} failed`, error as Error);
      throw error;
    }
  }) as T;
}