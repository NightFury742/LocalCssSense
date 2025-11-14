---
description: "Task list for Simplify Hover and Definition Display implementation"
---

# Tasks: Simplify Hover and Definition Display

**Input**: Design documents from `/specs/002-simplify-hover-display/`
**Prerequisites**: plan.md ✅, spec.md ✅

**Tests**: Update existing integration tests to verify new display format.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)

---

## Phase 1: Update Hover Provider (User Story 1)

**Purpose**: Simplify hover display to show only CSS properties

- [X] T001 [US1] Update `createHoverContent()` method in `src/providers/hoverProvider.ts` to remove file paths, class name headers, and labels. Show only CSS properties in code blocks.
- [X] T002 [US1] [P] Update hover provider integration tests in `tests/integration/hoverProvider.test.ts` to verify new display format (no file paths, no labels, only CSS properties)
- [X] T003 [US1] [P] Update hover provider contract in `specs/002-simplify-hover-display/contracts/hover-provider.md` to reflect new display format

---

## Phase 2: Update Completion Provider (User Story 2)

**Purpose**: Simplify completion details panel to show only CSS properties

- [X] T004 [US2] Update `createCompletionDocumentation()` method in `src/providers/completionProvider.ts` to remove file paths, class name headers, and labels. Show only CSS properties in code blocks.
- [X] T005 [US2] [P] Update completion provider integration tests in `tests/integration/completionProvider.test.ts` to verify new display format (no file paths, no labels, only CSS properties)
- [X] T006 [US2] [P] Update completion provider contract in `specs/002-simplify-hover-display/contracts/completion-provider.md` to reflect new display format

---

## Phase 3: Validation

**Purpose**: Verify all changes work correctly together

- [X] T007 Run all integration tests to ensure hover and completion displays work correctly
- [X] T008 Verify CSS code block formatting is preserved (syntax highlighting works)
- [X] T009 Verify CSS property ordering is maintained (base definitions first, then media queries)
- [X] T010 Test edge cases: single definitions, multiple definitions, media-query-only definitions

