#!/usr/bin/env node

const inquirer = require("inquirer");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const logger = require("./utils/logger");
const cleanup = require("./utils/cleanup");
const security = require("./utils/security");

// Colors for output
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
};

// Default project name with date
const defaultName = `project-${new Date().toISOString().split("T")[0]}`;

// File options with their default states
const defaultFiles = {
  "index.html": true,
  "style.css": true,
  "script.js": true,
  ".gitignore": true,
  ".nvmrc": true,
  "package.json": true,
  "README.md": true,
  "LICENSE.md": true,
};

// Function to check if directory exists and is not empty
function isDirectoryNotEmpty(dir) {
  try {
    const files = fs.readdirSync(dir);
    return files.length > 0;
  } catch (error) {
    return false;
  }
}

// Function to create the project directory and files
async function createProject(dir, files) {
  try {
    logger.info("Starting project creation", { dir, files });

    // Check if directory exists
    if (fs.existsSync(dir)) {
      if (isDirectoryNotEmpty(dir)) {
        const { overwrite } = await inquirer.prompt([
          {
            type: "confirm",
            name: "overwrite",
            message: `Directory ${dir} already exists and is not empty. Do you want to overwrite it?`,
            default: false,
          },
        ]);

        if (!overwrite) {
          logger.warn("Operation cancelled by user", { dir });
          console.log(`${colors.yellow}Operation cancelled.${colors.reset}`);
          return false;
        }

        // Additional safety check for non-empty directories
        const { confirm } = await inquirer.prompt([
          {
            type: "confirm",
            name: "confirm",
            message:
              "Are you absolutely sure? This will delete all existing files in the directory.",
            default: false,
          },
        ]);

        if (!confirm) {
          logger.warn("Operation cancelled by user after confirmation", {
            dir,
          });
          console.log(`${colors.yellow}Operation cancelled.${colors.reset}`);
          return false;
        }

        // Create backup before overwriting
        const backupPath = await cleanup.createBackup(dir, "dir");
        cleanup.registerOperation({
          type: "overwriteDir",
          path: dir,
          backupPath,
        });
      }

      // Remove existing directory
      fs.rmSync(dir, { recursive: true, force: true });
    }

    // Create directory securely
    await security.secureMkdir(dir);
    cleanup.registerOperation({
      type: "createDir",
      path: dir,
    });
    console.log(`${colors.green}✓ Created directory: ${dir}${colors.reset}`);

    // Create files
    for (const [file, selected] of Object.entries(files)) {
      if (selected) {
        const filePath = path.join(dir, file);
        const sanitizedPath = path.join(dir, security.sanitizeFileName(file));

        // Check if file already exists
        if (fs.existsSync(sanitizedPath)) {
          const { overwrite } = await inquirer.prompt([
            {
              type: "confirm",
              name: "overwrite",
              message: `File ${file} already exists. Do you want to overwrite it?`,
              default: false,
            },
          ]);

          if (!overwrite) {
            logger.warn("Skipping file", { file });
            console.log(`${colors.yellow}Skipping: ${file}${colors.reset}`);
            continue;
          }

          // Create backup before overwriting
          const backupPath = await cleanup.createBackup(sanitizedPath);
          cleanup.registerOperation({
            type: "overwrite",
            path: sanitizedPath,
            backupPath,
          });
        }

        let content = "";
        switch (file) {
          case ".gitignore":
            content = `node_modules/
.DS_Store
.env
*.log
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions`;
            break;
          case ".nvmrc":
            content = "18";
            break;
          case "package.json":
            content = JSON.stringify(
              {
                name: path.basename(dir),
                version: "1.0.0",
                description: "",
                main: "script.js",
                scripts: {
                  test: 'echo "Error: no test specified" && exit 1',
                },
                keywords: [],
                author: "",
                license: "MIT",
                packageManager: "yarn@4.1.1",
              },
              null,
              2
            );
            break;
          case "LICENSE.md":
            content = `MIT License

Copyright (c) ${new Date().getFullYear()}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
            break;
          case "README.md":
            content = `# ${path.basename(dir)}

A web project created on ${new Date().toISOString().split("T")[0]}.

## Getting Started

1. Install dependencies:
   \`\`\`bash
   yarn install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   yarn start
   \`\`\``;
            break;
        }

        // Validate content before writing
        if (
          content &&
          !security.validateFileContent(content, file.split(".").pop())
        ) {
          logger.error("Invalid file content", { file });
          throw new Error(`Invalid content for file: ${file}`);
        }

        // Write file securely
        await security.secureWrite(sanitizedPath, content);
        cleanup.registerOperation({
          type: "create",
          path: sanitizedPath,
        });
        console.log(`${colors.green}✓ Created: ${file}${colors.reset}`);
      }
    }

    logger.info("Project creation completed successfully", { dir });
    return true;
  } catch (error) {
    logger.error("Project creation failed", { dir, error: error.message });
    console.error(`${colors.red}✗ Error: ${error.message}${colors.reset}`);

    // Attempt rollback
    try {
      await cleanup.rollback();
      logger.info("Rollback completed successfully");
    } catch (rollbackError) {
      logger.error("Rollback failed", { error: rollbackError.message });
    }

    return false;
  }
}

// Main function
async function main() {
  try {
    // Welcome message
    console.log(`${colors.yellow}Web Project Scaffolder${colors.reset}`);
    console.log("----------------------------------------");

    // Get project name
    const { projectName } = await inquirer.prompt([
      {
        type: "input",
        name: "projectName",
        message: "Enter project name:",
        default: defaultName,
        validate: (input) => {
          if (!input) return "Project name cannot be empty";
          if (input.includes("/") || input.includes("\\"))
            return "Project name cannot contain slashes";
          return true;
        },
      },
    ]);

    // Get target directory
    const { targetDir } = await inquirer.prompt([
      {
        type: "input",
        name: "targetDir",
        message: "Enter target directory (press Enter for current directory):",
        default: ".",
        validate: (input) => {
          const fullPath = path.resolve(input);
          if (!security.isPathSafe(fullPath)) {
            return "Cannot create project outside of your home directory";
          }
          return true;
        },
      },
    ]);

    // File selection
    const { selectedFiles } = await inquirer.prompt([
      {
        type: "checkbox",
        name: "selectedFiles",
        message: "Select files to include in your project:",
        choices: Object.keys(defaultFiles).map((file) => ({
          name: file,
          value: file,
          checked: defaultFiles[file],
        })),
      },
    ]);

    // Update file selections
    const files = {};
    for (const file of Object.keys(defaultFiles)) {
      files[file] = selectedFiles.includes(file);
    }

    // Create the project
    const projectPath = path.join(targetDir, projectName);
    if (await createProject(projectPath, files)) {
      console.log(
        `\n${colors.green}Project scaffolded successfully!${colors.reset}`
      );
      console.log(`Location: ${projectPath}`);
    } else {
      console.log(`\n${colors.red}Failed to scaffold project.${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    logger.error("Main process failed", { error: error.message });
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the script
main();
