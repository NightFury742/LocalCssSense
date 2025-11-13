# Research: Local CSS IntelliSense Extension

**Date**: 2025-01-27  
**Feature**: Local CSS IntelliSense Extension  
**Phase**: 0 - Research

## Research Areas

### 1. VS Code Extension Architecture for Language Features

**Decision**: Use VS Code Language Server Protocol (LSP) features via `CompletionItemProvider` and `HoverProvider` APIs.

**Rationale**: 
- VS Code provides built-in APIs for completion (`vscode.languages.registerCompletionItemProvider`) and hover (`vscode.languages.registerHoverProvider`)
- These APIs are lightweight and don't require a full Language Server Protocol implementation
- Supports lazy activation via `onLanguage` activation events
- Provides excellent performance with built-in caching and debouncing

**Alternatives Considered**:
- Full LSP implementation: Overkill for this use case, adds complexity
- Custom command-based approach: Less integrated with VS Code's IntelliSense system
- Language Server: Requires separate process, adds overhead

**References**:
- VS Code Extension API: `vscode.languages.registerCompletionItemProvider`
- VS Code Extension API: `vscode.languages.registerHoverProvider`
- VS Code Activation Events: `onLanguage` events

---

### 2. CSS Parsing Strategy

**Decision**: Custom lightweight CSS parser using regex and string parsing (no external CSS parser dependency).

**Rationale**:
- Constitution requires minimal dependencies
- We only need to extract CSS class names (`.className { ... }`), not full CSS parsing
- Regex-based parsing is fast and sufficient for this use case
- Handles malformed CSS gracefully (parse valid parts, skip invalid sections)
- No bundle size impact from external dependencies

**Alternatives Considered**:
- `css` npm package: Adds dependency, larger bundle size
- `postcss` parser: Overkill, adds significant bundle size
- `css-tree`: More features than needed, adds dependency

**Implementation Approach**:
- Use regex to match CSS class selectors: `/\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g`
- Extract class names and their associated CSS rules
- Handle comments, nested selectors, and media queries
- Graceful error handling for malformed CSS

**References**:
- CSS Selector Specification
- Node.js built-in `fs` and `path` modules

---

### 3. Import Statement Parsing

**Decision**: Custom parser using regex to extract CSS import statements from JSX/TSX files.

**Rationale**:
- Need to parse `import './styles.css';` patterns
- Regex is sufficient for this simple pattern matching
- No need for full JavaScript/TypeScript AST parsing
- Fast and lightweight

**Alternatives Considered**:
- TypeScript compiler API: Adds dependency, more complex
- Babel parser: Overkill, adds significant bundle size
- `@babel/parser`: Too heavy for simple import extraction

**Implementation Approach**:
- Regex pattern: `/import\s+['"](\.\/[^'"]+\.css)['"]/g`
- Extract import paths from component files
- Resolve relative paths to absolute file paths
- Support single and double quotes

**References**:
- ES6 import statement syntax
- Node.js `path.resolve()` for path resolution

---

### 4. File Watching and Change Detection

**Decision**: Use VS Code's `vscode.workspace.createFileSystemWatcher` API for file change detection.

**Rationale**:
- Built-in VS Code API, no external dependencies
- Efficient and optimized by VS Code
- Supports debouncing and proper resource disposal
- Integrates with VS Code's file system abstraction

**Alternatives Considered**:
- Node.js `fs.watch`: Lower-level, requires more manual handling
- `chokidar`: External dependency, adds bundle size
- Polling: Inefficient, wastes resources

**Implementation Approach**:
- Watch CSS files in workspace
- Watch component files for import statement changes
- Debounce file change events (2 second window per SC-005)
- Update index asynchronously

**References**:
- VS Code API: `vscode.workspace.createFileSystemWatcher`
- VS Code API: `vscode.workspace.onDidChangeTextDocument`

---

### 5. Data Structure for CSS Class Index

**Decision**: Use nested Map structures: `Map<componentFilePath, Map<cssFilePath, CSSFile>>` for efficient lookups.

**Rationale**:
- O(1) lookup time for component → CSS files mapping
- Efficient memory usage (only stores what's needed)
- Easy to update and invalidate on file changes
- Supports multiple CSS files per component

**Alternatives Considered**:
- Array-based storage: O(n) lookup time, less efficient
- Single flat Map: Less organized, harder to manage
- Database/file-based storage: Overkill, adds complexity

**Data Structure**:
```typescript
Map<string, Map<string, CSSFile>>
// Key: component file path
// Value: Map of CSS file path → CSSFile object
```

**References**:
- TypeScript Map API
- VS Code workspace file paths

---

### 6. Activation Strategy

**Decision**: Lazy activation using `onLanguage:typescriptreact` and `onLanguage:javascriptreact` activation events.

**Rationale**:
- Meets constitution requirement: activation < 100ms
- Only activates when user opens React/Next.js files
- No activation overhead for non-React projects
- Efficient resource usage

**Alternatives Considered**:
- `onStartupFinished`: Activates too early, wastes resources
- `onCommand`: Requires manual trigger, less seamless
- Always active: Violates performance requirements

**Implementation Approach**:
- Register activation events in `package.json`
- Defer heavy initialization (file indexing) until first completion request
- Use progressive loading: index files on-demand

**References**:
- VS Code Activation Events documentation
- VS Code Extension API: `activate()` function

---

### 7. Performance Optimization Strategies

**Decision**: Implement caching, lazy loading, and debouncing for optimal performance.

**Rationale**:
- Meets performance requirements: <500ms autocomplete, <300ms hover
- Reduces unnecessary file system operations
- Minimizes memory usage

**Strategies**:
1. **Caching**: Cache parsed CSS files and import statements
2. **Lazy Loading**: Index CSS files only when component is opened
3. **Debouncing**: Debounce file change events (2 second window)
4. **Incremental Updates**: Only re-parse changed files
5. **Async Operations**: All file I/O operations are asynchronous

**References**:
- VS Code Performance Best Practices
- Node.js async/await patterns

---

## Summary

All technical decisions align with the constitution:
- ✅ Minimal dependencies (only dev dependencies)
- ✅ Performance-first approach (lazy activation, caching, debouncing)
- ✅ TypeScript strict mode
- ✅ Proper resource management (Disposable pattern)
- ✅ VS Code API best practices

No external runtime dependencies required. All functionality uses built-in Node.js and VS Code APIs.

