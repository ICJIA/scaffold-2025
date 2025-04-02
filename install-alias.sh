#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the absolute path of the scaffold.sh script
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SCAFFOLD_SCRIPT="$SCRIPT_DIR/scaffold.sh"

# Check if scaffold.sh exists
if [ ! -f "$SCAFFOLD_SCRIPT" ]; then
    echo -e "${RED}Error: scaffold.sh not found in $SCRIPT_DIR${NC}"
    exit 1
fi

# Determine the shell and its config file
if [ -n "$ZSH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.zshrc"
    SHELL_NAME="zsh"
elif [ -n "$BASH_VERSION" ]; then
    SHELL_CONFIG="$HOME/.bashrc"
    SHELL_NAME="bash"
else
    echo -e "${RED}Error: Unsupported shell${NC}"
    exit 1
fi

# Create backup of config file
if [ -f "$SHELL_CONFIG" ]; then
    cp "$SHELL_CONFIG" "${SHELL_CONFIG}.backup"
    echo -e "${YELLOW}Created backup of $SHELL_CONFIG at ${SHELL_CONFIG}.backup${NC}"
fi

# Check if alias already exists
if grep -q "alias scaffold=" "$SHELL_CONFIG"; then
    echo -e "${YELLOW}Alias 'scaffold' already exists in $SHELL_CONFIG${NC}"
    echo -e "Would you like to update it? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Installation cancelled${NC}"
        exit 0
    fi
fi

# Remove existing alias if it exists
sed -i '/alias scaffold=/d' "$SHELL_CONFIG"

# Add new alias
echo -e "\n# Scaffold web project generator" >> "$SHELL_CONFIG"
echo "alias scaffold='$SCAFFOLD_SCRIPT'" >> "$SHELL_CONFIG"

echo -e "${GREEN}Successfully installed 'scaffold' alias in $SHELL_CONFIG${NC}"
echo -e "${YELLOW}To use the alias, either:${NC}"
echo -e "1. Start a new terminal session, or"
echo -e "2. Run: source $SHELL_CONFIG" 