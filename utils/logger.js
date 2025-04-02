const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

/**
 * Maximum age of log files in milliseconds (7 days)
 * @type {number}
 */
const maxLogAge = 7 * 24 * 60 * 60 * 1000;

/**
 * Log levels available in the logger
 * @type {Object.<string, number>}
 */
const levels = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
};

/**
 * ANSI color codes for different log levels
 * @type {Object.<string, string>}
 */
const colors = {
  DEBUG: "\x1b[36m", // Cyan
  INFO: "\x1b[32m", // Green
  WARN: "\x1b[33m", // Yellow
  ERROR: "\x1b[31m", // Red
  RESET: "\x1b[0m",
};

/**
 * Logger class for handling application logging
 * @class
 */
class Logger {
  /**
   * Creates a new Logger instance
   * @param {Object} options - Logger configuration options
   * @param {string} options.logDir - Directory to store log files
   * @param {string} options.level - Minimum log level to output
   * @param {number} options.maxLogAge - Maximum age of log files in milliseconds
   */
  constructor(options = {}) {
    this.logDir =
      options.logDir ||
      path.join(process.env.HOME || process.env.USERPROFILE, ".scaffold-logs");
    this.level = options.level || "DEBUG";
    this.maxLogAge = options.maxLogAge || maxLogAge;
    this.currentLogFile = null;
    this.operationId = null;

    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Clean up old logs on startup
    this.cleanupOldLogs();

    // Set up process event handlers
    this.setupProcessHandlers();
  }

  /**
   * Cleans up log files older than maxLogAge
   * @private
   */
  cleanupOldLogs() {
    const files = fs.readdirSync(this.logDir);
    const now = Date.now();

    files.forEach((file) => {
      const filePath = path.join(this.logDir, file);
      const stats = fs.statSync(filePath);
      const age = now - stats.mtimeMs;

      if (age > this.maxLogAge) {
        fs.unlinkSync(filePath);
      }
    });
  }

  /**
   * Sets up process event handlers for graceful shutdown
   * @private
   */
  setupProcessHandlers() {
    process.on("SIGINT", () => this.handleShutdown("SIGINT"));
    process.on("SIGTERM", () => this.handleShutdown("SIGTERM"));
  }

  /**
   * Handles process shutdown events
   * @param {string} signal - The shutdown signal received
   * @private
   */
  async handleShutdown(signal) {
    this.info(`Received ${signal}, initiating graceful shutdown...`);
    await this.logShutdown(signal);
    process.exit(0);
  }

  /**
   * Logs startup information
   * @param {Object} info - Additional startup information
   */
  logStartup(info = {}) {
    const startupInfo = {
      timestamp: new Date().toISOString(),
      processId: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      ...info,
    };

    this.info("Application startup", startupInfo);
  }

  /**
   * Logs shutdown information
   * @param {string} signal - The shutdown signal
   * @private
   */
  async logShutdown(signal) {
    const shutdownInfo = {
      timestamp: new Date().toISOString(),
      processId: process.pid,
      signal,
      memoryUsage: process.memoryUsage(),
    };

    this.info("Application shutdown", shutdownInfo);
  }

  /**
   * Sets the current operation ID for log correlation
   * @param {string} operationId - Unique identifier for the current operation
   */
  setOperationId(operationId) {
    this.operationId = operationId;
  }

  /**
   * Gets the current log file path
   * @returns {string} Path to the current log file
   * @private
   */
  getCurrentLogFile() {
    const date = new Date().toISOString().split("T")[0];
    return path.join(this.logDir, `scaffold-${date}.log`);
  }

  /**
   * Writes a log entry to the log file
   * @param {Object} entry - The log entry to write
   * @private
   */
  writeToFile(entry) {
    const logFile = this.getCurrentLogFile();
    const logEntry = JSON.stringify(entry) + "\n";
    fs.appendFileSync(logFile, logEntry);
  }

  /**
   * Creates a log entry with common fields
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   * @returns {Object} Formatted log entry
   * @private
   */
  createLogEntry(level, message, data = {}) {
    return {
      timestamp: new Date().toISOString(),
      level,
      operationId: this.operationId,
      processId: process.pid,
      message,
      memoryUsage: process.memoryUsage(),
      ...data,
    };
  }

  /**
   * Logs a message at the specified level
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   * @private
   */
  log(level, message, data = {}) {
    if (levels[level] >= levels[this.level]) {
      const entry = this.createLogEntry(level, message, data);
      this.writeToFile(entry);

      // Console output with colors
      const color = colors[level] || colors.RESET;
      console.log(
        `${color}[${level}] ${message}${
          Object.keys(data).length ? ` ${JSON.stringify(data)}` : ""
        }${colors.RESET}`
      );
    }
  }

  /**
   * Logs a debug message
   * @param {string} message - Debug message
   * @param {Object} [data] - Additional data to log
   */
  debug(message, data = {}) {
    this.log("DEBUG", message, data);
  }

  /**
   * Logs an info message
   * @param {string} message - Info message
   * @param {Object} [data] - Additional data to log
   */
  info(message, data = {}) {
    this.log("INFO", message, data);
  }

  /**
   * Logs a warning message
   * @param {string} message - Warning message
   * @param {Object} [data] - Additional data to log
   */
  warn(message, data = {}) {
    this.log("WARN", message, data);
  }

  /**
   * Logs an error message
   * @param {string} message - Error message
   * @param {Object} [data] - Additional data to log
   */
  error(message, data = {}) {
    this.log("ERROR", message, data);
  }
}

const logger = new Logger();

// Log startup information
logger.logStartup();

// Handle process termination
process.on("SIGINT", () => {
  logger.logShutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  logger.logShutdown();
  process.exit(0);
});

module.exports = logger;
