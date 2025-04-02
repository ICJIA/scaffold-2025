const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger");

class SecurityManager {
  constructor() {
    this.checksums = new Map();
  }

  // Generate checksum for a file
  generateChecksum(filePath) {
    try {
      const fileBuffer = fs.readFileSync(filePath);
      const hashSum = crypto.createHash("sha256");
      hashSum.update(fileBuffer);
      return hashSum.digest("hex");
    } catch (error) {
      logger.error("Failed to generate checksum", {
        filePath,
        error: error.message,
      });
      throw error;
    }
  }

  // Verify file integrity using checksum
  verifyIntegrity(filePath, expectedChecksum) {
    try {
      const actualChecksum = this.generateChecksum(filePath);
      return actualChecksum === expectedChecksum;
    } catch (error) {
      logger.error("Failed to verify file integrity", {
        filePath,
        error: error.message,
      });
      return false;
    }
  }

  // Store checksum for a file
  storeChecksum(filePath) {
    try {
      const checksum = this.generateChecksum(filePath);
      this.checksums.set(filePath, checksum);
      logger.debug("Stored checksum", { filePath, checksum });
      return checksum;
    } catch (error) {
      logger.error("Failed to store checksum", {
        filePath,
        error: error.message,
      });
      throw error;
    }
  }

  // Secure file write with checksum verification
  async secureWrite(filePath, content, options = {}) {
    try {
      // Create temporary file
      const tempPath = `${filePath}.tmp`;
      fs.writeFileSync(tempPath, content, options);

      // Verify the temporary file
      const checksum = this.generateChecksum(tempPath);

      // If file exists, verify its integrity
      if (fs.existsSync(filePath)) {
        const existingChecksum = this.checksums.get(filePath);
        if (
          existingChecksum &&
          !this.verifyIntegrity(filePath, existingChecksum)
        ) {
          throw new Error("File integrity check failed");
        }
      }

      // Move temporary file to final location
      fs.renameSync(tempPath, filePath);

      // Store new checksum
      this.storeChecksum(filePath);

      logger.info("Secure file write completed", { filePath });
      return true;
    } catch (error) {
      // Clean up temporary file if it exists
      if (fs.existsSync(`${filePath}.tmp`)) {
        fs.unlinkSync(`${filePath}.tmp`);
      }
      logger.error("Secure file write failed", {
        filePath,
        error: error.message,
      });
      throw error;
    }
  }

  // Secure directory creation
  async secureMkdir(dirPath, options = { recursive: true }) {
    try {
      // Check for path traversal
      if (!this.isPathSafe(dirPath)) {
        throw new Error("Path traversal detected");
      }

      // Create directory
      fs.mkdirSync(dirPath, options);

      logger.info("Secure directory creation completed", { dirPath });
      return true;
    } catch (error) {
      logger.error("Secure directory creation failed", {
        dirPath,
        error: error.message,
      });
      throw error;
    }
  }

  // Check if path is safe (prevents path traversal)
  isPathSafe(targetPath) {
    const homeDir = process.env.HOME || process.env.USERPROFILE;
    const resolvedPath = path.resolve(targetPath);
    return resolvedPath.startsWith(homeDir);
  }

  // Sanitize file name
  sanitizeFileName(fileName) {
    // Remove any path traversal attempts
    const sanitized = fileName.replace(/[^a-zA-Z0-9-_.]/g, "_");
    return sanitized || "unnamed_file";
  }

  // Validate file content
  validateFileContent(content, fileType) {
    switch (fileType) {
      case "json":
        try {
          JSON.parse(content);
          return true;
        } catch {
          return false;
        }
      case "html":
        return /<html[^>]*>[\s\S]*<\/html>/i.test(content);
      case "javascript":
        // Basic JavaScript validation
        try {
          new Function(content);
          return true;
        } catch {
          return false;
        }
      default:
        return true;
    }
  }
}

module.exports = new SecurityManager();
