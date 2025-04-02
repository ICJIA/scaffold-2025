#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default project name with date
DEFAULT_NAME="project-$(date +%Y-%m-%d)"
PROJECT_NAME=""
TARGET_DIR=""

# File options with their default states
declare -A FILES=(
    ["index.html"]=true
    ["style.css"]=true
    ["script.js"]=true
    [".gitignore"]=true
    [".nvmrc"]=true
    ["package.json"]=true
    ["README.md"]=true
    ["LICENSE.md"]=true
)

# Function to check if whiptail is installed
check_whiptail() {
    if ! command -v whiptail &> /dev/null; then
        echo -e "${RED}Error: whiptail is not installed${NC}"
        echo -e "Please install it using:"
        echo -e "  Ubuntu/Debian: sudo apt-get install whiptail"
        echo -e "  macOS: brew install newt"
        exit 1
    fi
}

# Function to create the project directory and files
create_project() {
    local dir=$1
    local files=$2

    # Check if directory exists
    if [ -d "$dir" ]; then
        if is_directory_not_empty "$dir"; then
            read -p "Directory $dir already exists and is not empty. Do you want to overwrite it? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                echo -e "${YELLOW}Operation cancelled.${NC}"
                return 1
            fi
        fi
        rm -rf "$dir"
    fi

    # Create directory
    mkdir -p "$dir"
    echo -e "${GREEN}✓ Created directory: $dir${NC}"

    # Create files
    for file in "${!files[@]}"; do
        if [ "${files[$file]}" = true ]; then
            case $file in
                ".gitignore")
                    cat > "$dir/$file" << EOL
node_modules/
.DS_Store
.env
*.log
.yarn/*
!.yarn/patches
!.yarn/plugins
!.yarn/releases
!.yarn/sdks
!.yarn/versions
EOL
                    ;;
                ".nvmrc")
                    echo "v20.19.0" > "$dir/$file"
                    ;;
                "package.json")
                    cat > "$dir/$file" << EOL
{
  "name": "$(basename "$dir")",
  "version": "1.0.0",
  "description": "",
  "main": "script.js",
  "scripts": {
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "keywords": [],
  "author": "",
  "license": "MIT",
  "packageManager": "yarn@4.1.1"
}
EOL
                    ;;
                "LICENSE.md")
                    cat > "$dir/$file" << EOL
MIT License

Copyright (c) $(date +%Y)

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
SOFTWARE.
EOL
                    ;;
                "README.md")
                    cat > "$dir/$file" << EOL
# $(basename "$dir")

A web project created on $(date +%Y-%m-%d).

## Getting Started

1. Install dependencies:
   \`\`\`bash
   yarn install
   \`\`\`

2. Start the development server:
   \`\`\`bash
   yarn start
   \`\`\`
EOL
                    ;;
                *)
                    touch "$dir/$file"
                    ;;
            esac
            echo -e "${GREEN}✓ Created: $file${NC}"
        fi
    done

    return 0
}

# Main script
check_whiptail

# Welcome screen
whiptail --title "Web Project Scaffolder" --msgbox "Welcome to the Web Project Scaffolder!\n\nThis tool will help you create a new web project with commonly used files." 10 60

# Get project name
PROJECT_NAME=$(whiptail --inputbox "Enter project name:" 8 60 "$DEFAULT_NAME" 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Installation cancelled${NC}"
    exit 0
fi

# Get target directory
TARGET_DIR=$(whiptail --inputbox "Enter target directory (press Enter for current directory):" 8 60 "." 3>&1 1>&2 2>&3)
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Installation cancelled${NC}"
    exit 0
fi

# File selection
echo -e "\nSelect files to include in your project:"
for file in "${!FILES[@]}"; do
    read -p "Include $file? (Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        FILES[$file]=false
    fi
done

# Create the project
if create_project "$TARGET_DIR/$PROJECT_NAME" FILES; then
    whiptail --title "Success" --msgbox "Project scaffolded successfully!\n\nLocation: $TARGET_DIR/$PROJECT_NAME" 10 60
else
    whiptail --title "Error" --msgbox "Failed to scaffold project. Please check the error messages above." 10 60
    exit 1
fi 