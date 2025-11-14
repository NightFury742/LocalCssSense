# Implementation Plan: Simplify Hover and Definition Display

**Branch**: `002-simplify-hover-display` | **Date**: 2025-11-14 | **Spec**: `/specs/002-simplify-hover-display/spec.md`
**Input**: Feature specification from `/specs/002-simplify-hover-display/spec.md`

## Summary

Simplify the hover and completion display to show only CSS properties without file paths, class name headers, or metadata labels. This provides a cleaner, more focused view of CSS definitions for developers. The changes affect the hover provider and completion provider details panel, removing all metadata while preserving CSS code block formatting and property ordering.

## Technical Context

**Language/Version**: TypeScript 5.0+ (strict mode enabled)  
**Primary Dependencies**: VS Code API (`@types/vscode`), existing CSS index infrastructure  
**Storage**: No changes to storage (uses existing in-memory Maps)  
**Testing**: Vitest 1.0+ (update existing integration tests)  
**Target Platform**: VS Code extension (cross-platform: Windows, macOS, Linux)  
**Project Type**: Single project (VS Code extension)  
**Performance Goals**: 
- No performance impact (removing display elements, not adding logic)
- Hover tooltips remain < 300ms
- Completion details panel remains < 500ms

**Constraints**: 
- Must preserve CSS code block formatting for syntax highlighting
- Must maintain CSS property ordering (base definitions first, then media query variants)
- Must handle single definitions, multiple definitions, and media-query-only definitions consistently
- Definition provider (Ctrl+click navigation) behavior remains unchanged

**Scale/Scope**: 
- Updates to hover provider display formatting
- Updates to completion provider details panel formatting
- No changes to CSS parsing, indexing, or file watching logic

## Constitution Check

**Performance**: ✅ PASS
- No new logic added, only display formatting changes
- Removing elements reduces rendering overhead
- Existing performance budgets maintained

**Dependencies**: ✅ PASS
- No new dependencies required
- Uses existing VS Code APIs and infrastructure

**TypeScript**: ✅ PASS
- No new types required
- Existing type definitions sufficient

**Documentation**: ✅ PASS
- Contract files will be updated to reflect new display format
- Code comments updated where display logic changes

**Testing**: ✅ PASS
- Existing integration tests updated to verify new display format
- No new test infrastructure required

**VS Code API**: ✅ PASS
- No changes to VS Code API usage patterns
- Display formatting only, no API changes

## Project Structure

### Files to Modify

```text
src/
├── providers/
│   ├── hoverProvider.ts          # Update createHoverContent() method
│   └── completionProvider.ts     # Update createCompletionDocumentation() method

specs/002-simplify-hover-display/
├── contracts/
│   ├── hover-provider.md         # Update to reflect new display format
│   └── completion-provider.md   # Update to reflect new display format

tests/integration/
├── hoverProvider.test.ts         # Update tests to verify new format
└── completionProvider.test.ts   # Update tests to verify new format
```

**Structure Decision**: Minimal changes to existing files. Only display formatting logic is modified, no structural changes to models, services, or infrastructure.

## Implementation Approach

1. **Update Hover Provider**: Modify `createHoverContent()` to remove file paths, class name headers, and labels. Show only CSS properties in code blocks.

2. **Update Completion Provider**: Modify `createCompletionDocumentation()` to remove file paths, class name headers, and labels. Show only CSS properties in code blocks.

3. **Update Contracts**: Update contract documentation to reflect the simplified display format.

4. **Update Tests**: Modify integration tests to verify the new display format (no file paths, no labels, only CSS properties).

## Complexity Tracking

No violations detected. This is a straightforward display formatting change with minimal complexity:
- Simple string manipulation changes
- No new dependencies
- No new infrastructure
- Existing tests can be updated easily

