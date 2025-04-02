const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger");

/**
 * Maximum age of backup files in milliseconds (7 days)
 * @type {number}
 */
const maxBackupAge = 7 * 24 * 60 * 60 * 1000;

/**
 * Cleanup utility for managing backups and rollback operations
 * @class
 */
class Cleanup {
  /**
   * Creates a new Cleanup instance
   */
  constructor() {
    this.backupDir = path.join(
      process.env.HOME || process.env.USERPROFILE,
      ".scaffold-backups"
    );
    this.operations = [];
    this.operationId = crypto.randomBytes(8).toString("hex");

    // Create backup directory if it doesn't exist
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Clean up old backups on startup
    this.cleanupOldBackups();
  }

  /**
   * Cleans up backup files older than maxBackupAge
   * @private
   */
  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir);
      const now = Date.now();

      files.forEach((file) => {
        const filePath = path.join(this.backupDir, file);
        const stats = fs.statSync(filePath);
        const age = now - stats.mtimeMs;

        if (age > maxBackupAge) {
          fs.unlinkSync(filePath);
          logger.debug(`Cleaned up old backup file: ${file}`);
        }
      });
    } catch (error) {
      logger.error("Failed to clean up old backups", { error: error.message });
    }
  }

  /**
   * Creates a backup of a file or directory
   * @param {string} source - Path to the file or directory to backup
   * @param {string} [type='file'] - Type of backup ('file' or 'dir')
   * @returns {Promise<string>} Path to the backup file
   * @throws {Error} If backup creation fails
   */
  async createBackup(source, type = "file") {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const backupName = `${path.basename(source)}-${timestamp}.bak`;
      const backupPath = path.join(this.backupDir, backupName);

      if (type === "dir") {
        // For directories, create a zip archive
        const { execSync } = require("child_process");
        execSync(`zip -r "${backupPath}.zip" "${source}"`);
        logger.debug(`Created directory backup: ${backupPath}.zip`);
        return `${backupPath}.zip`;
      } else {
        // For files, create a direct copy
        fs.copyFileSync(source, backupPath);
        logger.debug(`Created file backup: ${backupPath}`);
        return backupPath;
      }
    } catch (error) {
      logger.error("Failed to create backup", {
        source,
        type,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Registers an operation for potential rollback
   * @param {Object} operation - Operation details
   * @param {string} operation.type - Type of operation ('create', 'overwrite', 'createDir', 'overwriteDir')
   * @param {string} operation.path - Path affected by the operation
   * @param {string} [operation.backupPath] - Path to backup file if applicable
   */
  registerOperation(operation) {
    this.operations.push({
      ...operation,
      operationId: this.operationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Rolls back all registered operations
   * @returns {Promise<void>}
   * @throws {Error} If rollback fails
   */
  async rollback() {
    try {
      logger.info("Starting rollback operation", {
        operationId: this.operationId,
        operations: this.operations.length,
      });

      // Reverse the operations array to rollback in reverse order
      for (const operation of this.operations.reverse()) {
        try {
          switch (operation.type) {
            case "create":
              if (fs.existsSync(operation.path)) {
                fs.unlinkSync(operation.path);
                logger.debug(`Rolled back file creation: ${operation.path}`);
              }
              break;

            case "overwrite":
              if (operation.backupPath && fs.existsSync(operation.backupPath)) {
                fs.copyFileSync(operation.backupPath, operation.path);
                logger.debug(`Restored file from backup: ${operation.path}`);
              }
              break;

            case "createDir":
              if (fs.existsSync(operation.path)) {
                fs.rmSync(operation.path, { recursive: true, force: true });
                logger.debug(
                  `Rolled back directory creation: ${operation.path}`
                );
              }
              break;

            case "overwriteDir":
              if (operation.backupPath && fs.existsSync(operation.backupPath)) {
                const { execSync } = require("child_process");
                execSync(
                  `unzip -o "${operation.backupPath}" -d "${path.dirname(
                    operation.path
                  )}"`
                );
                logger.debug(
                  `Restored directory from backup: ${operation.path}`
                );
              }
              break;
          }
        } catch (error) {
          logger.error(`Failed to rollback operation`, {
            operation,
            error: error.message,
          });
          // Continue with other operations even if one fails
        }
      }

      logger.info("Rollback completed successfully", {
        operationId: this.operationId,
      });
    } catch (error) {
      logger.error("Rollback failed", {
        operationId: this.operationId,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new Cleanup();
