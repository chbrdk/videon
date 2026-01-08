#!/bin/bash

# PrismVid CEP Plugin Installation Script
# This script installs the plugin to the Adobe CEP Extensions folder

set -e

echo "=========================================="
echo "PrismVid CEP Plugin Installation"
echo "=========================================="
echo ""

# Check if build exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist/ folder not found"
    echo "Please run 'npm run build' first"
    exit 1
fi

# Extension folder
EXTENSIONS_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions"
TARGET_DIR="$EXTENSIONS_DIR/prismvid-search"

echo "📦 Source: dist/"
echo "📁 Target: $TARGET_DIR"
echo ""

# Create extensions directory if it doesn't exist
mkdir -p "$EXTENSIONS_DIR"

# Backup existing installation if it exists
if [ -d "$TARGET_DIR" ]; then
    echo "⚠️  Existing installation found. Creating backup..."
    BACKUP_DIR="${TARGET_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    mv "$TARGET_DIR" "$BACKUP_DIR"
    echo "✅ Backup created: $BACKUP_DIR"
    echo ""
fi

# Copy dist to target
echo "📋 Installing plugin..."
cp -r dist "$TARGET_DIR"

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next steps:"
echo "1. Enable debug mode: npm run enable-debug:mac"
echo "2. Restart After Effects"
echo "3. Open: Window > Extensions > PrismVid Search"
echo ""
echo "=========================================="

