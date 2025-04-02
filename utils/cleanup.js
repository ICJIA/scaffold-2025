const fs = require("fs");
const path = require("path");
const logger = require("./logger");

class CleanupManager {
  constructor() {
    this.operations = [];
    this.backupDir = path.join(
      process.env.HOME || process.env.USERPROFILE,
      ".scaffold-backups"
    );

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  // Register a file operation for potential rollback
  registerOperation(operation) {
    this.operations.push(operation);
    logger.debug("Registered operation", { operation });
  }

  // Create a backup of a file or directory
  async createBackup(source, type = "file") {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupName = `${path.basename(source)}-${timestamp}`;
    const backupPath = path.join(this.backupDir, backupName);

    try {
      if (type === "file") {
        fs.copyFileSync(source, backupPath);
      } else {
        fs.cpSync(source, backupPath, { recursive: true });
      }
      logger.info("Created backup", { source, backupPath });
      return backupPath;
    } catch (error) {
      logger.error("Failed to create backup", { source, error: error.message });
      throw error;
    }
  }

  // Rollback all operations in reverse order
  async rollback() {
    logger.info("Starting rollback");
    for (let i = this.operations.length - 1; i >= 0; i--) {
      const operation = this.operations[i];
      try {
        await this.rollbackOperation(operation);
        logger.info("Rolled back operation", { operation });
      } catch (error) {
        logger.error("Failed to rollback operation", {
          operation,
          error: error.message,
        });
        // Continue with other rollbacks even if one fails
      }
    }
    logger.info("Rollback completed");
  }

  // Rollback a single operation
  async rollbackOperation(operation) {
    switch (operation.type) {
      case "create":
        if (fs.existsSync(operation.path)) {
          fs.unlinkSync(operation.path);
        }
        break;
      case "createDir":
        if (fs.existsSync(operation.path)) {
          fs.rmSync(operation.path, { recursive: true, force: true });
        }
        break;
      case "overwrite":
        if (operation.backupPath && fs.existsSync(operation.backupPath)) {
          fs.copyFileSync(operation.backupPath, operation.path);
        }
        break;
      case "overwriteDir":
        if (operation.backupPath && fs.existsSync(operation.backupPath)) {
          fs.cpSync(operation.backupPath, operation.path, { recursive: true });
        }
        break;
    }
  }

  // Clean up old backups (older than 7 days)
  async cleanupOldBackups() {
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    const files = fs.readdirSync(this.backupDir);

    for (const file of files) {
      const filePath = path.join(this.backupDir, file);
      const stats = fs.statSync(filePath);
      const age = Date.now() - stats.mtimeMs;

      if (age > maxAge) {
        try {
          fs.unlinkSync(filePath);
          logger.info("Cleaned up old backup", { filePath });
        } catch (error) {
          logger.error("Failed to clean up old backup", {
            filePath,
            error: error.message,
          });
        }
      }
    }
  }
}

module.exports = new CleanupManager();
