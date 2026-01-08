#!/bin/sh
# Patch @storybook/core package.json to fix missing internal/preview/runtime export
NODE_MODULES="/app/node_modules/@storybook/core"
PACKAGE_JSON="${NODE_MODULES}/package.json"

if [ -f "$PACKAGE_JSON" ]; then
  node -e "
    const fs = require('fs');
    const pkg = JSON.parse(fs.readFileSync('${PACKAGE_JSON}', 'utf8'));
    if (!pkg.exports) pkg.exports = {};
    // Fix missing exports - add all required internal exports
    // First, ensure exports is an object (not an array or string)
    if (typeof pkg.exports !== 'object' || Array.isArray(pkg.exports)) {
      pkg.exports = {};
    }
    
    // Preserve existing exports
    const existingExports = pkg.exports || {};
    if (typeof existingExports === 'string' || Array.isArray(existingExports)) {
      pkg.exports = {};
    }
    
    const exportsToAdd = {
      './internal/preview/runtime': './dist/preview/runtime.js',
      './internal/csf': './dist/internal/csf/index.js',
      './internal/docs-tools': './dist/internal/docs-tools/index.js',
      './internal/preview-api': './dist/preview-api/index.js',
      './internal/preview-errors': './dist/preview-errors/index.js',
      './internal/core-events': './dist/core-events/index.js',
      './internal/channels': './dist/channels/index.js',
      './internal/components': './dist/components/index.js',
      './internal/theming': './dist/theming/index.js',
      './internal/client-logger': './dist/client-logger/index.js'
    };
    
    // Merge existing exports with new ones
    // Handle case where exports might be an object with nested structure
    if (pkg.exports && typeof pkg.exports === 'object' && !Array.isArray(pkg.exports)) {
      // Preserve existing structure but add missing exports
      Object.keys(exportsToAdd).forEach(key => {
        if (!pkg.exports[key]) {
          pkg.exports[key] = exportsToAdd[key];
        }
      });
    } else {
      // Replace with new exports object
      pkg.exports = exportsToAdd;
    }
    fs.writeFileSync('${PACKAGE_JSON}', JSON.stringify(pkg, null, 2));
    console.log('✅ Patched @storybook/core package.json');
  "
fi

