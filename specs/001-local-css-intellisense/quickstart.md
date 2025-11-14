# Quick Start: Local CSS IntelliSense Extension

**Feature**: Local CSS IntelliSense Extension  
**Date**: 2025-01-27

## Overview

This VS Code extension provides IntelliSense (autocomplete and hover tooltips) for local CSS classes used in React/Next.js components via the `styleName` prop.

## Prerequisites

- VS Code 1.60.0 or higher
- React/Next.js project with CSS files
- CSS files imported using `import './filename.css';` pattern (same directory)

## Installation

1. Install extension from VS Code Marketplace (when published)
2. Or install from VSIX file:
   ```bash
   code --install-extension local-css-sense-0.1.0.vsix
   ```

## Usage

### Basic Setup

1. Create a CSS file in the same directory as your component:
   ```css
   /* styles.css */
   .container {
     display: flex;
     padding: 1rem;
   }
   
   .header {
     font-size: 2rem;
     color: blue;
   }
   ```

2. Import the CSS file in your component:
   ```jsx
   import './styles.css';
   
   function MyComponent() {
     return <div styleName="
   ```

3. Type `styleName="` and see autocomplete suggestions:
   - `container`
   - `header`

4. Hover over a class name to see CSS definition:
   ```
   container (from styles.css)
   
   .container {
     display: flex;
     padding: 1rem;
   }
   ```

5. Ctrl+click (Cmd+click on macOS) on a class name to navigate to its definition:
   - Opens the CSS file
   - Positions cursor at the line where the class is defined

### Multiple CSS Files

Import multiple CSS files in the same component:

```jsx
import './styles.css';
import './animations.css';

function Component() {
  return <div styleName="
  // Autocomplete shows classes from both files
}
```

### Validation

The extension validates CSS class names:
- ✅ Valid classes: No error indicator
- ❌ Invalid classes: Red squiggly line with error message

## Features

### Autocomplete (P1)

- **Trigger**: Type `styleName="` in JSX element
- **Shows**: All CSS classes from imported CSS files
- **Performance**: < 500ms response time

### Hover Tooltips (P1)

- **Trigger**: Hover over CSS class name in `styleName` prop
- **Shows**: Full CSS definition (properties and values)
- **Performance**: < 300ms response time

### Go to Definition (P1)

- **Trigger**: Ctrl+click (Cmd+click on macOS) on CSS class name in `styleName` prop
- **Action**: Navigates to CSS file and positions cursor at class definition
- **Performance**: < 300ms response time

### Real-time Updates (P2)

- **Automatic**: Detects CSS file changes and updates suggestions
- **Performance**: Updates within 2 seconds of file change

## Limitations (P1)

- ✅ Same-directory imports only (`./filename.css`)
- ✅ Compiled CSS files only (`.css` extension)
- ✅ String literals only (`styleName="className"`)
- ❌ Parent directory imports (`../styles.css`) - P3
- ❌ Path aliases (`@/styles.css`) - P3
- ❌ Dynamic values (`styleName={variable}`) - Future
- ❌ CSS preprocessors (`.scss`, `.less`) - Future

## Troubleshooting

### Autocomplete Not Showing

1. Check CSS file is imported: `import './styles.css';`
2. Verify CSS file exists in same directory
3. Check file extension is `.css` (not `.scss` or `.less`)
4. Reload VS Code window: `Cmd+Shift+P` → "Reload Window"

### Hover Not Working

1. Verify class name exists in imported CSS file
2. Check CSS file syntax is valid
3. Ensure class name matches exactly (case-sensitive)

### Performance Issues

1. Check for very large CSS files (>1000 classes)
2. Verify workspace is not too large
3. Check VS Code extension host process memory usage

## Configuration

No configuration required for P1. Extension works out of the box with standard React/Next.js project structure.

## Examples

### Example 1: Basic Component

```jsx
// Component.tsx
import './Component.css';

function Component() {
  return (
    <div styleName="container">
      <h1 styleName="title">Hello World</h1>
    </div>
  );
}
```

```css
/* Component.css */
.container {
  display: flex;
  flex-direction: column;
}

.title {
  font-size: 2rem;
  font-weight: bold;
}
```

### Example 2: Multiple CSS Files

```jsx
// Button.tsx
import './Button.css';
import './animations.css';

function Button() {
  return (
    <button styleName="btn primary fade-in">
      Click Me
    </button>
  );
}
```

```css
/* Button.css */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  cursor: pointer;
}

.primary {
  background-color: blue;
  color: white;
}
```

```css
/* animations.css */
.fade-in {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

## Next Steps

- Implement P2 features (real-time updates)
- Add P3 features (configuration, path aliases)
- Extend to support CSS preprocessors
- Add support for dynamic `styleName` values

