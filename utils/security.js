const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const logger = require("./logger");

/**
 * Security utility for handling file operations and path validation
 * @class
 */
class Security {
  /**
   * Creates a new Security instance
   */
  constructor() {
    this.checksums = new Map();
    this.homeDir = process.env.HOME || process.env.USERPROFILE;
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

  /**
   * Checks if a path is safe to operate on (within home directory)
   * @param {string} targetPath - The path to check
   * @returns {boolean} True if the path is safe, false otherwise
   */
  isPathSafe(targetPath) {
    const resolvedPath = path.resolve(targetPath);
    return resolvedPath.startsWith(this.homeDir);
  }

  /**
   * Sanitizes a file name to prevent path traversal and invalid characters
   * @param {string} fileName - The file name to sanitize
   * @returns {string} The sanitized file name
   */
  sanitizeFileName(fileName) {
    // Remove any path traversal attempts
    const sanitized = fileName.replace(/[\\/]/g, "");
    // Remove any null bytes
    return sanitized.replace(/\0/g, "");
  }

  /**
   * Validates file content based on file type
   * @param {string} content - The content to validate
   * @param {string} fileType - The type of file (extension)
   * @returns {boolean} True if the content is valid, false otherwise
   */
  validateFileContent(content, fileType) {
    try {
      switch (fileType.toLowerCase()) {
        case "json":
          JSON.parse(content);
          return true;
        case "js":
          // Basic JavaScript validation
          return !content.includes("require('") && !content.includes("eval(");
        case "html":
          // Basic HTML validation
          return content.includes("<html") && content.includes("</html>");
        case "css":
          // Basic CSS validation
          return content.includes("{") && content.includes("}");
        default:
          return true;
      }
    } catch (error) {
      logger.error("Content validation failed", {
        fileType,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Creates a directory securely with proper permissions
   * @param {string} dirPath - The path to create
   * @returns {Promise<void>}
   * @throws {Error} If directory creation fails
   */
  async secureMkdir(dirPath) {
    try {
      if (!this.isPathSafe(dirPath)) {
        throw new Error("Cannot create directory outside of home directory");
      }

      // Create directory with restricted permissions
      fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
      logger.debug(`Created directory securely: ${dirPath}`);
    } catch (error) {
      logger.error("Failed to create directory securely", {
        dirPath,
        error: error.message,
      });
      throw error;
    }
  }

  // Secure file write with checksum verification
  async secureWrite(filePath, content, options = {}) {
    try {
      if (!this.isPathSafe(filePath)) {
        throw new Error("Cannot write file outside of home directory");
      }

      // Create temporary file
      const tempPath = `${filePath}.${crypto
        .randomBytes(8)
        .toString("hex")}.tmp`;
      const sanitizedPath = path.join(
        path.dirname(filePath),
        this.sanitizeFileName(path.basename(filePath))
      );

      // Write to temporary file first
      fs.writeFileSync(tempPath, content, { mode: 0o644 });
      logger.debug(`Wrote content to temporary file: ${tempPath}`);

      // Validate the written content
      const writtenContent = fs.readFileSync(tempPath, "utf8");
      if (writtenContent !== content) {
        throw new Error("Content validation failed after writing");
      }

      // Move temporary file to target location
      fs.renameSync(tempPath, sanitizedPath);
      logger.debug(`Moved temporary file to target location: ${sanitizedPath}`);

      // Store new checksum
      this.storeChecksum(sanitizedPath);

      logger.info("Secure file write completed", { filePath });
      return true;
    } catch (error) {
      // Clean up temporary file if it exists
      if (fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }
      logger.error("Secure file write failed", {
        filePath,
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new Security();
