const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

class Logger {
  constructor() {
    this.logDir = path.join(
      process.env.HOME || process.env.USERPROFILE,
      ".scaffold-logs"
    );
    this.logFile = path.join(
      this.logDir,
      `scaffold-${new Date().toISOString().split("T")[0]}.log`
    );
    this.operationId = crypto.randomBytes(8).toString("hex");
    this.maxLogAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Clean up old logs on startup
    this.cleanupOldLogs();
  }

  cleanupOldLogs() {
    try {
      const files = fs.readdirSync(this.logDir);
      const now = Date.now();

      for (const file of files) {
        const filePath = path.join(this.logDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > this.maxLogAge) {
          fs.unlinkSync(filePath);
          console.log(`Cleaned up old log file: ${file}`);
        }
      }
    } catch (error) {
      console.error("Failed to clean up old logs:", error.message);
    }
  }

  log(level, message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      operationId: this.operationId,
      message,
      data,
      processId: process.pid,
      memoryUsage: process.memoryUsage(),
    };

    const logLine = JSON.stringify(logEntry) + "\n";
    fs.appendFileSync(this.logFile, logLine);
  }

  info(message, data = {}) {
    this.log("INFO", message, data);
  }

  error(message, data = {}) {
    this.log("ERROR", message, data);
  }

  warn(message, data = {}) {
    this.log("WARN", message, data);
  }

  debug(message, data = {}) {
    this.log("DEBUG", message, data);
  }

  // Log startup information
  logStartup() {
    this.debug("Scaffold tool started", {
      version: process.env.npm_package_version,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cwd: process.cwd(),
      argv: process.argv,
    });
  }

  // Log shutdown information
  logShutdown() {
    this.debug("Scaffold tool shutting down", {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
    });
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
