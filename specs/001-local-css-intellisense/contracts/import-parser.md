# Import Parser Contract

**Service**: Import Parser  
**Purpose**: Extract CSS import statements from JSX/TSX component files

## Interface

```typescript
interface ImportParser {
  parseImports(document: vscode.TextDocument): ImportStatement[];
  extractImportPaths(content: string, filePath: string): ImportStatement[];
  resolveImportPath(importPath: string, componentPath: string): string | null;
}
```

## Methods

### parseImports(document: vscode.TextDocument): ImportStatement[]

Parses a VS Code document and extracts CSS import statements.

**Parameters**:
- `document: vscode.TextDocument` - VS Code document object

**Returns**: `ImportStatement[]` - Array of import statements

**Performance**: < 10ms for typical component file

---

### extractImportPaths(content: string, filePath: string): ImportStatement[]

Extracts CSS import paths from file content.

**Parameters**:
- `content: string` - File content
- `filePath: string` - Component file path

**Returns**: `ImportStatement[]` - Array of import statements

**Performance**: < 5ms for typical component file

---

### resolveImportPath(importPath: string, componentPath: string): string | null

Resolves relative import path to absolute file path.

**Parameters**:
- `importPath: string` - Import path (e.g., `'./styles.css'`)
- `componentPath: string` - Component file path

**Returns**: `string | null` - Absolute file path or null if invalid

**Validation**:
- Only supports same-directory imports (`./filename.css`) for P1
- Returns null for parent directory imports (`../`)
- Returns null for path aliases (`@/`, `~`)

**Performance**: < 1ms

## Import Pattern

**Regex**: `/import\s+['"](\.\/[^'"]+\.css)['"]/g`

**Matches**:
- `import './styles.css';`
- `import "./styles.css";`
- `import './animations.css';`

**Does Not Match**:
- `import '../styles.css'` (parent directory - P3)
- `import '@/styles.css'` (path alias - P3)
- `import styles from './styles.css'` (CSS Modules - P3)
- `import './styles.scss'` (preprocessor - deferred)

## Error Handling

- **Invalid Paths**: Skip, log warning, continue processing
- **Missing Files**: Skip, log warning, continue processing
- **Non-CSS Imports**: Ignore (not CSS files)
- **Malformed Imports**: Skip, log error, continue processing

## Example

**Input Component**:
```jsx
import React from 'react';
import './styles.css';
import './animations.css';

function Component() {
  return <div styleName="container">Hello</div>;
}
```

**Output**:
```typescript
[
  ImportStatement {
    importPath: './styles.css',
    resolvedPath: '/project/src/components/styles.css',
    componentPath: '/project/src/components/Component.tsx',
    lineNumber: 2
  },
  ImportStatement {
    importPath: './animations.css',
    resolvedPath: '/project/src/components/animations.css',
    componentPath: '/project/src/components/Component.tsx',
    lineNumber: 3
  }
]
```

