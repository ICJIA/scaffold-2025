# Web Project Scaffolder

A CLI tool for quickly scaffolding simple web projects. Built with Node.js and includes logging, backup, andenhanced security features.

## Features

- Interactive file selection
- Automatic backup creation
- Rollback capability for failed operations
- Comprehensive logging system
- Secure file operations
- Path traversal prevention
- File integrity verification
- Yarn as default package manager
- Cross-platform support (Linux, macOS)
  - Windows is unsupported.

## Default Files

The following files are available for scaffolding (all selected by default):

- `index.html`: Basic HTML template
- `style.css`: Empty CSS file
- `script.js`: Empty JavaScript file
- `.gitignore`: Git ignore file with common exclusions
- `.nvmrc`: Node.js version specification (v18)
- `package.json`: Basic Node.js project configuration
- `README.md`: Project documentation template
- `LICENSE.md`: MIT license file

## Error Handling

The tool includes error handling:

- Automatic rollback on failure
- Detailed error logging
- User-friendly error messages
- Backup restoration capability

## Installation

### Using Yarn (Recommended)

```bash
# Install globally
yarn global add web-project-scaffolder

# Or install locally in your project
yarn add web-project-scaffolder
```

### Using npm

```bash
# Install globally
npm install -g web-project-scaffolder

# Or install locally in your project
npm install web-project-scaffolder
```

## Quick Start

1. Run the scaffold tool:

   ```bash
   # If installed globally
   scaffold

   # If installed locally
   yarn scaffold
   # or
   npm run scaffold
   ```

2. Follow the interactive prompts:
   - Enter project name (default: project-YYYY-MM-DD)
   - Choose target directory
   - Select files to include
   - Confirm any overwrites

## Command Line Options

### Basic Usage

```bash
scaffold [options]
```

### Options

- `--help, -h`: Display help information
- `--version, -v`: Display version information
- `--debug`: Enable debug logging
- `--no-backup`: Disable automatic backup creation
- `--force`: Skip confirmation prompts (use with caution)

### Examples

```bash
# Create a project with default settings
scaffold

# Create a project with debug logging
scaffold --debug

# Create a project without backups
scaffold --no-backup

# Force create a project (skip confirmations)
scaffold --force
```

## Logging System

The scaffold tool maintains detailed logs of all operations. Logs are stored in `~/.scaffold-logs/` and are kept for 7 days.

### Viewing Logs

```bash
# View today's logs
cat ~/.scaffold-logs/scaffold-$(date +%Y-%m-%d).log

# View all log files
ls -l ~/.scaffold-logs/

# Search for errors
grep '"level":"ERROR"' ~/.scaffold-logs/scaffold-$(date +%Y-%m-%d).log

# Search for specific operations
grep '"operationId":"<operation-id>"' ~/.scaffold-logs/scaffold-$(date +%Y-%m-%d).log

# Pretty print logs (requires jq)
cat ~/.scaffold-logs/scaffold-$(date +%Y-%m-%d).log | jq '.'
```

### Log Levels

- `DEBUG`: Detailed debugging information
- `INFO`: General operational information
- `WARN`: Warning messages
- `ERROR`: Error messages

### Log Contents

Each log entry includes:

- Timestamp
- Log level
- Operation ID
- Process ID
- Memory usage
- Detailed message
- Additional context data

## Backup System

The tool automatically creates backups before any destructive operation:

- Backups are stored in `~/.scaffold-backups/`
- Backups are kept for 7 days
- Each backup includes timestamp and operation ID

### Managing Backups

```bash
# View backup directory
ls -l ~/.scaffold-backups/

# Clean up old backups manually
rm ~/.scaffold-backups/*.bak
```

## Security Features

- Path traversal prevention
- File integrity verification
- Secure file writing with temporary files
- File name sanitization
- Content validation
- Safe directory creation



## License

This project is licensed under the MIT License - see the LICENSE.md file for details.
