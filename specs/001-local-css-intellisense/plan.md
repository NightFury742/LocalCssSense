# Implementation Plan: Local CSS IntelliSense Extension

**Branch**: `001-local-css-intellisense` | **Date**: 2025-01-27 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-local-css-intellisense/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Create a VS Code extension that provides IntelliSense (autocomplete and hover tooltips) for local CSS classes used in React/Next.js components via the `styleName` prop. The extension will parse CSS files imported in component files (same-directory imports only for P1), extract CSS class definitions, and provide real-time autocomplete suggestions and hover tooltips showing CSS definitions. The extension uses VS Code's Language Server Protocol (LSP) features via completion providers and hover providers, with lazy activation and efficient file watching to meet performance requirements.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode enabled)  
**Primary Dependencies**: 
- `@types/vscode`: VS Code API type definitions (dev dependency)
- Built-in Node.js APIs: `fs`, `path`, `util` for file operations
- VS Code APIs: `vscode.languages.registerCompletionItemProvider`, `vscode.languages.registerHoverProvider`, `vscode.workspace.createFileSystemWatcher`
- CSS parsing: Custom lightweight parser (no external CSS parser dependency - use regex/string parsing for class extraction)

**Storage**: In-memory index of CSS classes per workspace (Map-based data structures). No persistent storage required.  
**Testing**: Vitest (lightweight, fast) for unit tests; VS Code extension test framework for integration tests  
**Target Platform**: VS Code extension (runs on Node.js runtime within VS Code)  
**Project Type**: Single project (VS Code extension)  
**Performance Goals**: 
- Activation time < 100ms (lazy activation)
- Autocomplete suggestions < 500ms (FR-007)
- Hover tooltips < 300ms (SC-008)
- File change detection < 2 seconds (SC-005)
- Memory footprint < 50MB idle (constitution requirement)

**Constraints**: 
- Minimal dependencies (prefer built-in APIs)
- Lazy activation required (onLanguage: typescriptreact, javascriptreact)
- Asynchronous file operations
- Proper resource disposal (Disposable pattern)
- TypeScript strict mode

**Scale/Scope**: 
- Single workspace support (P1)
- Handles typical React/Next.js project sizes (100-1000 CSS files)
- Supports multiple CSS files per component (FR-003)
- Real-time updates for file changes (FR-006)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Performance**: 
- ✅ Lazy activation: Extension activates on `onLanguage:typescriptreact` and `onLanguage:javascriptreact` events
- ✅ Activation time: < 100ms (minimal initialization, defer heavy work)
- ✅ Command execution: Autocomplete < 500ms (cached index, async operations)
- ✅ Memory impact: < 50MB (in-memory index, efficient data structures)

**Dependencies**: 
- ✅ Minimal dependencies: Only `@types/vscode` (dev), TypeScript compiler, Vitest (dev)
- ✅ No external CSS parser: Custom lightweight parser using built-in Node.js APIs
- ✅ VS Code APIs: Use built-in extension APIs for completion and hover
- ✅ Bundle size: Minimal (no large dependencies)

**TypeScript**: 
- ✅ Strict mode: `strict: true` in tsconfig.json
- ✅ Type definitions: Complete types for all interfaces and classes
- ✅ No `any` types: All types explicitly defined

**Documentation**: 
- ✅ Feature specification: Complete with user scenarios and acceptance criteria
- ✅ API documentation: JSDoc comments for all public interfaces
- ✅ Inline comments: Complex parsing logic documented
- ✅ README: Will be updated with usage instructions

**Testing**: 
- ✅ Unit tests: Core parsing and indexing logic (>80% coverage target)
- ✅ Integration tests: VS Code API interactions (completion, hover, file watching)
- ✅ Test framework: Vitest for fast execution

**VS Code API**: 
- ✅ Resource disposal: All watchers and providers properly disposed
- ✅ Disposable pattern: Extension implements `Disposable` interface
- ✅ Activation events: Optimized lazy activation (`onLanguage` events)
- ✅ Event handling: Proper cleanup in `deactivate()` function

## Project Structure

### Documentation (this feature)

```text
specs/001-local-css-intellisense/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── extension.ts         # Extension entry point, activation/deactivation
├── providers/
│   ├── completionProvider.ts    # Autocomplete provider for styleName prop
│   └── hoverProvider.ts         # Hover tooltip provider for CSS classes
├── services/
│   ├── cssParser.ts            # CSS class extraction parser
│   ├── importParser.ts          # Import statement parser for JSX/TSX files
│   └── cssIndex.ts              # In-memory CSS class index manager
├── models/
│   ├── cssFile.ts               # CSS file entity model
│   ├── cssClass.ts              # CSS class entity model
│   └── importStatement.ts       # Import statement model
└── utils/
    ├── pathResolver.ts           # Path resolution utilities
    └── logger.ts                 # Logging utilities

tests/
├── unit/
│   ├── cssParser.test.ts
│   ├── importParser.test.ts
│   └── cssIndex.test.ts
└── integration/
    ├── completionProvider.test.ts
    └── hoverProvider.test.ts
```

**Structure Decision**: Single project structure (VS Code extension). Code organized by responsibility: providers (VS Code API integration), services (core logic), models (data structures), and utils (shared utilities). Tests mirror source structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations - all constitution requirements met.

## Phase 0: Research (Complete)

**Status**: ✅ Complete

**Artifacts Generated**:
- `research.md` - Technical research and decision rationale

**Key Decisions**:
1. VS Code CompletionItemProvider and HoverProvider APIs
2. Custom lightweight CSS parser (no external dependencies)
3. Regex-based import statement parsing
4. VS Code FileSystemWatcher for change detection
5. Map-based in-memory index structure
6. Lazy activation via `onLanguage` events

**All NEEDS CLARIFICATION items resolved**: ✅

## Phase 1: Design & Contracts (Complete)

**Status**: ✅ Complete

**Artifacts Generated**:
- `data-model.md` - Entity models and data structures
- `contracts/completion-provider.md` - Completion provider interface
- `contracts/hover-provider.md` - Hover provider interface
- `contracts/css-parser.md` - CSS parser service contract
- `contracts/import-parser.md` - Import parser service contract
- `quickstart.md` - User quick start guide

**Agent Context Updated**: ✅ Cursor IDE context file updated with TypeScript and project details

**Constitution Check Post-Design**: ✅ All requirements still met

## Next Steps

Ready for `/speckit.tasks` command to generate implementation tasks.
