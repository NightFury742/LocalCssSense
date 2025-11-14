# Data Model: Local CSS IntelliSense Extension

**Date**: 2025-01-27  
**Feature**: Local CSS IntelliSense Extension  
**Phase**: 1 - Design

## Entities

### CSSFile

Represents a CSS file imported in a component.

**Attributes**:
- `filePath: string` - Absolute path to the CSS file
- `lastModified: number` - Timestamp of last modification (for cache invalidation)
- `classes: Map<string, CSSClass>` - Map of class name → CSSClass object
- `rawContent: string` - Raw CSS file content (cached for hover tooltips)

**Relationships**:
- Referenced by: `ImportStatement` (many-to-one)
- Contains: `CSSClass` (one-to-many)

**Validation Rules**:
- `filePath` must be absolute and exist in workspace
- `lastModified` must be a valid timestamp
- `classes` map keys must be valid CSS class names (alphanumeric, hyphens, underscores)

**State Transitions**:
- **Initial**: File parsed and indexed
- **Updated**: File modified, re-parsed and re-indexed
- **Deleted**: File removed, removed from index

---

### CSSClass

Represents a CSS class definition within a CSS file.

**Attributes**:
- `name: string` - CSS class name (without leading dot)
- `sourceFile: string` - Path to source CSS file
- `lineNumber: number` - Line number where class is defined
- `properties: Map<string, string>` - Map of CSS property → value
- `fullDefinition: string` - Complete CSS rule text (for hover tooltips)

**Relationships**:
- Belongs to: `CSSFile` (many-to-one)

**Validation Rules**:
- `name` must match CSS identifier rules: `[a-zA-Z_-][a-zA-Z0-9_-]*`
- `lineNumber` must be positive integer
- `properties` map must contain valid CSS property-value pairs

**State Transitions**:
- **Defined**: Class parsed from CSS file
- **Modified**: Class definition changed, properties updated
- **Removed**: Class deleted from CSS file

---

### ImportStatement

Represents a CSS import statement in a component file.

**Attributes**:
- `importPath: string` - Import path as written (e.g., `'./styles.css'`)
- `resolvedPath: string` - Absolute resolved file path
- `componentPath: string` - Path to component file containing the import
- `lineNumber: number` - Line number of import statement

**Relationships**:
- Belongs to: Component file (many-to-one)
- References: `CSSFile` (many-to-one)

**Validation Rules**:
- `importPath` must be a relative path starting with `./` (P1 constraint)
- `resolvedPath` must be absolute and exist in workspace
- `componentPath` must be absolute path to JSX/TSX file

**State Transitions**:
- **Added**: New import statement detected
- **Removed**: Import statement deleted from component
- **Modified**: Import path changed

---

### ComponentIndex

Represents the index of CSS classes for a component file.

**Attributes**:
- `componentPath: string` - Path to component file
- `cssFiles: Map<string, CSSFile>` - Map of CSS file path → CSSFile
- `allClasses: Map<string, CSSClass>` - Flattened map of all class names → CSSClass (for quick lookup)

**Relationships**:
- Belongs to: Component file (one-to-one)
- Contains: `CSSFile` (one-to-many)
- Contains: `CSSClass` (one-to-many, via CSSFile)

**Validation Rules**:
- `componentPath` must be absolute path to JSX/TSX file
- `cssFiles` map must contain valid CSSFile objects
- `allClasses` map must contain all classes from all imported CSS files

**State Transitions**:
- **Initialized**: Component indexed with imported CSS files
- **Updated**: CSS file added/removed/modified, index updated
- **Invalidated**: Component file changed, index needs refresh

---

## Data Structures

### CSSIndex (Main Index)

**Structure**: `Map<string, ComponentIndex>`

**Key**: Component file path (absolute)
**Value**: ComponentIndex object

**Purpose**: Main in-memory index for fast lookups by component file.

**Operations**:
- `get(componentPath: string): ComponentIndex | undefined` - Get index for component
- `set(componentPath: string, index: ComponentIndex): void` - Set/update index
- `delete(componentPath: string): void` - Remove component index
- `clear(): void` - Clear all indices

---

### CSSFileCache

**Structure**: `Map<string, CSSFile>`

**Key**: CSS file path (absolute)
**Value**: CSSFile object

**Purpose**: Cache parsed CSS files to avoid re-parsing unchanged files.

**Operations**:
- `get(filePath: string): CSSFile | undefined` - Get cached CSS file
- `set(filePath: string, cssFile: CSSFile): void` - Cache CSS file
- `invalidate(filePath: string): void` - Remove from cache
- `isStale(filePath: string): boolean` - Check if cache is stale

---

## Relationships Diagram

```
Component File (JSX/TSX)
    │
    ├── ImportStatement (1..N)
    │       │
    │       └── CSSFile (1)
    │               │
    │               └── CSSClass (1..N)
    │
    └── ComponentIndex (1)
            │
            ├── CSSFile (1..N)
            │
            └── CSSClass (1..N, flattened)
```

---

## Validation Rules Summary

1. **CSS Class Names**: Must match pattern `[a-zA-Z_-][a-zA-Z0-9_-]*`
2. **Import Paths**: Must be relative paths starting with `./` (P1)
3. **File Paths**: Must be absolute paths within workspace
4. **Line Numbers**: Must be positive integers
5. **CSS Properties**: Must be valid CSS property names
6. **CSS Values**: Must be valid CSS values (basic validation)

---

## Error Handling

- **Malformed CSS**: Parse valid parts, skip invalid sections, log errors
- **Missing Files**: Skip import, log warning, continue processing
- **Invalid Paths**: Skip import, log error, continue processing
- **Parse Errors**: Graceful degradation, return partial results

---

## Performance Considerations

- **Index Size**: Estimated < 10MB for typical project (1000 CSS files, 10 classes each)
- **Lookup Time**: O(1) for component → CSS classes lookup
- **Update Time**: O(n) where n = number of classes in changed file
- **Memory**: Efficient Map-based structures, minimal overhead

