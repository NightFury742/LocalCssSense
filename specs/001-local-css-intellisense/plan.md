# Implementation Plan: Local CSS IntelliSense Extension

**Branch**: `001-local-css-intellisense` | **Date**: 2025-01-27 | **Spec**: `/specs/001-local-css-intellisense/spec.md`
**Input**: Feature specification from `/specs/001-local-css-intellisense/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Provide IntelliSense (autocomplete, hover tooltips, and go to definition) for local CSS classes used in React/Next.js components via the `styleName` prop. The extension parses CSS import statements from component files, indexes CSS classes from imported CSS files, and provides real-time autocomplete suggestions, hover information, and navigation to CSS class definitions. Uses VS Code's built-in Language Server Protocol features (`CompletionItemProvider`, `HoverProvider`, and `DefinitionProvider`) with custom lightweight CSS and import parsing (no external dependencies). Designed for minimal performance impact with lazy activation, caching, and debouncing.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.
-->

**Language/Version**: TypeScript 5.0+ (strict mode enabled)  
**Primary Dependencies**: VS Code API (`@types/vscode`), Node.js built-in APIs (`fs`, `path`), no runtime dependencies  
**Storage**: In-memory Maps (`Map<string, ComponentIndex>`, `Map<string, CSSFile>`) - no persistent storage  
**Testing**: Vitest 1.0+ (unit tests for core logic, integration tests for VS Code API interactions)  
**Target Platform**: VS Code extension (cross-platform: Windows, macOS, Linux)  
**Project Type**: Single project (VS Code extension)  
**Performance Goals**: 
- Activation time < 100ms (lazy activation via `onLanguage` events)
- Autocomplete suggestions < 500ms (SC-002)
- Hover tooltips < 300ms (SC-008)
- Go to Definition < 300ms (SC-011)
- File change detection updates < 2 seconds (SC-005)
- Memory footprint < 50MB idle (constitution requirement)

**Constraints**: 
- Performance budgets from constitution (activation < 100ms, commands < 500ms, memory < 50MB)
- Must work with React/Next.js projects using relative CSS imports
- P1 scope: Only same-directory imports (`./styles.css`), string literals only, compiled `.css` files only
- Graceful degradation for malformed CSS (parse valid parts, skip invalid sections)

**Scale/Scope**: 
- VS Code extension for React/Next.js projects
- Typical project: 100-1000 CSS files, 10-50 classes per file
- Estimated index size: < 10MB for typical project (1000 CSS files, 10 classes each)
- Supports multiple CSS files per component, multiple classes per `styleName` attribute

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Performance**: ✅ PASS
- Lazy activation: Uses `onLanguage:typescriptreact` and `onLanguage:javascriptreact` activation events (only activates when React/Next.js files are opened)
- Estimated activation time: < 100ms (lightweight initialization, deferred file indexing)
- Command execution: < 500ms (autocomplete < 500ms per SC-002, hover < 300ms per SC-008, go to definition < 300ms per SC-011)
- Memory impact: < 50MB idle (in-memory Maps, estimated < 10MB for typical project per data-model.md)

**Dependencies**: ✅ PASS
- Only dev dependencies: `@types/vscode`, `typescript`, `vitest` (all justified)
- No runtime dependencies: Uses built-in Node.js APIs (`fs`, `path`) and VS Code APIs
- Alternatives evaluated: Custom CSS parser (no `css`/`postcss` dependency), regex-based import parsing (no AST parser dependency)
- Bundle size impact: Minimal (only TypeScript compilation output, no external runtime packages)

**TypeScript**: ✅ PASS
- Strict mode enabled: `tsconfig.json` has `"strict": true`
- Type definitions: Complete type definitions for all models (CSSFile, CSSClass, ImportStatement, ComponentIndex)
- No `any` types: All types explicitly defined in data-model.md

**Documentation**: ✅ PASS
- Feature specification: Complete with user scenarios, requirements, acceptance criteria (spec.md)
- API documentation: Will be added via JSDoc comments for all public functions, classes, and interfaces
- User documentation: README updates planned for user-facing features (including go to definition)
- Code comments: Inline comments for complex logic (CSS parsing, import parsing, definition provider)

**Testing**: ✅ PASS
- Unit tests: Planned for core logic (CSS parsing, import parsing, CSS indexing) - see `tests/unit/`
- Integration tests: Planned for VS Code API interactions (completion provider, hover provider, definition provider, file watchers) - see `tests/integration/`
- Test coverage target: >80% for core modules (per constitution)

**VS Code API**: ✅ PASS
- Resource disposal: All resources (file watchers, event listeners) will be properly disposed using VS Code's `Disposable` pattern
- Activation events: Optimized using `onLanguage` events (lazy activation, not `onStartupFinished`)
- Proper cleanup: `deactivate()` function will dispose all resources
- DefinitionProvider: Uses built-in VS Code API, no additional dependencies

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── extension.ts              # Main extension entry point, activation/deactivation
├── models/
│   ├── componentIndex.ts     # ComponentIndex entity
│   ├── cssClass.ts           # CSSClass entity
│   ├── cssFile.ts            # CSSFile entity
│   └── importStatement.ts    # ImportStatement entity
├── providers/
│   ├── completionProvider.ts # CompletionItemProvider for autocomplete
│   ├── hoverProvider.ts      # HoverProvider for hover tooltips
│   └── definitionProvider.ts # DefinitionProvider for go to definition
├── services/
│   ├── cssIndex.ts           # Main CSS index service (Map-based storage)
│   ├── cssParser.ts          # CSS file parsing (regex-based)
│   └── importParser.ts       # Import statement parsing (regex-based)
└── utils/
    ├── logger.ts             # Logging utility
    └── pathResolver.ts       # Path resolution utilities

tests/
├── setup.ts                  # Test setup/configuration
├── unit/
│   ├── cssIndex.test.ts      # Unit tests for CSS index service
│   ├── cssParser.test.ts     # Unit tests for CSS parser
│   └── importParser.test.ts  # Unit tests for import parser
└── integration/
    ├── completionProvider.test.ts  # Integration tests for completion provider
    ├── hoverProvider.test.ts       # Integration tests for hover provider
    ├── definitionProvider.test.ts  # Integration tests for definition provider
    └── fileWatcher.test.ts         # Integration tests for file watching

out/                          # Compiled JavaScript output (TypeScript compilation)
```

**Structure Decision**: Single project structure (VS Code extension). The structure follows VS Code extension best practices:
- `src/extension.ts`: Main entry point with activation/deactivation logic
- `src/models/`: Domain entities (CSSFile, CSSClass, ImportStatement, ComponentIndex)
- `src/providers/`: VS Code Language Server Protocol providers (CompletionItemProvider, HoverProvider, DefinitionProvider)
- `src/services/`: Core business logic (CSS parsing, import parsing, indexing)
- `src/utils/`: Utility functions (logging, path resolution)
- `tests/`: Separated into unit tests (core logic) and integration tests (VS Code API interactions)
- `out/`: Compiled output directory (excluded from source control)

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations detected. All constitution checks passed. The implementation uses:
- Built-in VS Code APIs (no external runtime dependencies)
- Custom lightweight parsers (no heavy parsing libraries)
- In-memory Maps (no persistent storage complexity)
- Lazy activation (minimal startup overhead)
- Standard VS Code extension patterns (proven architecture)
- DefinitionProvider reuses existing index and logic (no additional complexity)
