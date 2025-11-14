# Change Log

All notable changes to the "Local CSS IntelliSense" extension will be documented in this file.

## [0.1.0] - 2025-01-27

### Added

- Initial release of Local CSS IntelliSense extension
- Autocomplete suggestions for CSS class names in `styleName` prop
- Hover tooltips showing CSS properties for class names
- Go to Definition support (Ctrl+Click / Cmd+Click) to navigate to CSS class definitions
- Real-time file watching and indexing of CSS files
- Diagnostics for non-existent CSS classes
- Support for multiple CSS imports per component
- Support for CSS classes with multiple definitions (base + media queries)
- Simplified hover and completion display showing only CSS properties

### Features

- Parses import statements to identify imported CSS files
- Indexes CSS classes from imported CSS files
- Provides IntelliSense within 500ms of typing `styleName="`
- Updates index within 2 seconds of CSS file changes
- Supports same-directory CSS imports (`./filename.css`)

### Known Limitations

- Only supports same-directory CSS imports
- Parent directory imports and path aliases not yet supported
- Only supports string literals in `styleName` prop

