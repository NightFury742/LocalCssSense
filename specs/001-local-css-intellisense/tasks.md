---
description: "Task list for Local CSS IntelliSense Extension implementation"
---

# Tasks: Local CSS IntelliSense Extension

**Input**: Design documents from `/specs/001-local-css-intellisense/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: Tests are OPTIONAL per specification. Unit and integration tests are included for core functionality.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/`, `tests/` at repository root
- Paths shown below follow the structure from plan.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create VS Code extension project structure with package.json in root directory
- [X] T002 Initialize TypeScript project with tsconfig.json (strict mode enabled) in root directory
- [X] T003 [P] Configure VS Code extension manifest (package.json) with activation events for typescriptreact and javascriptreact
- [X] T004 [P] Setup Vitest testing framework configuration in root directory
- [X] T005 [P] Create project directory structure: src/, src/providers/, src/services/, src/models/, src/utils/, tests/unit/, tests/integration/
- [X] T006 [P] Configure VS Code extension build scripts and launch configuration in .vscode/launch.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create base extension entry point with activation/deactivation hooks in src/extension.ts
- [X] T008 [P] Implement logger utility with VS Code output channel in src/utils/logger.ts
- [X] T009 [P] Implement path resolver utility for resolving relative CSS import paths in src/utils/pathResolver.ts
- [X] T010 Create CSSFile model class in src/models/cssFile.ts
- [X] T011 [P] Create CSSClass model class in src/models/cssClass.ts
- [X] T012 [P] Create ImportStatement model class in src/models/importStatement.ts
- [X] T013 Create CSSIndex service for managing in-memory CSS class index in src/services/cssIndex.ts
- [X] T014 Create CSSFileCache service for caching parsed CSS files in src/services/cssIndex.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - IntelliSense for styleName Prop with Imported CSS Files (Priority: P1) 🎯 MVP

**Goal**: Provide autocomplete suggestions and hover tooltips for CSS class names when using `styleName` prop in React/Next.js components. Autocomplete shows classes from CSS files imported in the current component. Hover displays CSS definitions for class names.

**Independent Test**: Open a React/Next.js file that imports a CSS file (e.g., `import './styles.css';`), type `styleName="`, and verify that autocomplete suggestions appear only with CSS class names from the imported CSS file. Hover over a class name to see its CSS definition. The test delivers immediate value by enabling developers to discover and use local CSS classes without manually checking CSS files.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T015 [P] [US1] Create unit test for CSSParser.extractClasses() in tests/unit/cssParser.test.ts
- [X] T016 [P] [US1] Create unit test for CSSParser.parseCSSContent() in tests/unit/cssParser.test.ts
- [X] T017 [P] [US1] Create unit test for ImportParser.extractImportPaths() in tests/unit/importParser.test.ts
- [X] T018 [P] [US1] Create unit test for ImportParser.resolveImportPath() in tests/unit/importParser.test.ts
- [X] T019 [P] [US1] Create unit test for CSSIndex service operations in tests/unit/cssIndex.test.ts
- [X] T020 [P] [US1] Create integration test for CompletionProvider in tests/integration/completionProvider.test.ts
- [X] T021 [P] [US1] Create integration test for HoverProvider in tests/integration/hoverProvider.test.ts
- [X] T039 [P] [US1] Create integration test for DefinitionProvider.provideDefinition() in tests/integration/definitionProvider.test.ts
- [X] T040 [P] [US1] Create integration test for DiagnosticProvider invalid class name detection in tests/integration/diagnosticProvider.test.ts

### Implementation for User Story 1

- [X] T022 [US1] Implement CSSParser service with extractClasses() method using regex pattern `/\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g` in src/services/cssParser.ts
- [X] T023 [US1] Implement CSSParser.parseCSSContent() method for parsing CSS content strings in src/services/cssParser.ts
- [X] T024 [US1] Implement CSSParser.parseCSSFile() async method for reading and parsing CSS files in src/services/cssParser.ts
- [X] T025 [US1] Implement ImportParser service with extractImportPaths() method using regex pattern `/import\s+['"](\.\/[^'"]+\.css)['"]/g` in src/services/importParser.ts
- [X] T026 [US1] Implement ImportParser.resolveImportPath() method for resolving same-directory relative paths in src/services/importParser.ts
- [X] T027 [US1] Implement ImportParser.parseImports() method for VS Code document parsing in src/services/importParser.ts
- [X] T028 [US1] Implement CSSIndex.getComponentIndex() method for retrieving CSS classes for a component in src/services/cssIndex.ts
- [X] T029 [US1] Implement CSSIndex.indexComponent() method for indexing CSS files imported in a component in src/services/cssIndex.ts
- [X] T030 [US1] Implement CompletionProvider.provideCompletionItems() method to return CSS class suggestions in src/providers/completionProvider.ts
- [X] T031 [US1] Implement CompletionProvider trigger detection for `styleName="` pattern in src/providers/completionProvider.ts
- [X] T032 [US1] Implement HoverProvider.provideHover() method to display CSS definitions in src/providers/hoverProvider.ts
- [X] T033 [US1] Implement HoverProvider class name detection within styleName attribute in src/providers/hoverProvider.ts
- [X] T034 [US1] Register CompletionProvider for typescriptreact and javascriptreact languages in src/extension.ts
- [X] T035 [US1] Register HoverProvider for typescriptreact and javascriptreact languages in src/extension.ts
- [X] T036 [US1] Implement lazy initialization of CSS index on first completion request in src/extension.ts
- [X] T037 [US1] Add error handling for malformed CSS (graceful degradation) in src/services/cssParser.ts
- [X] T038 [US1] Add validation for CSS class names used in styleName prop in src/providers/completionProvider.ts
- [X] T041 [US1] Implement CSSIndex.getClass() method for looking up CSS class by name in src/services/cssIndex.ts
- [X] T042 [US1] Implement DefinitionProvider.provideDefinition() method to navigate to CSS class definitions in src/providers/definitionProvider.ts
- [X] T043 [US1] Implement DefinitionProvider class name detection within styleName attribute in src/providers/definitionProvider.ts
- [X] T044 [US1] Implement DefinitionProvider to return first occurrence (base definition) when multiple definitions exist in src/providers/definitionProvider.ts
- [X] T045 [US1] Register DefinitionProvider for typescriptreact, javascriptreact, typescript, and javascript languages in src/extension.ts
- [X] T046 [US1] Implement DiagnosticProvider to show VS Code diagnostics with Information severity for invalid CSS class names in src/providers/diagnosticProvider.ts
- [X] T047 [US1] Implement DiagnosticProvider class name detection within styleName attribute in src/providers/diagnosticProvider.ts
- [X] T048 [US1] Register DiagnosticProvider for typescriptreact and javascriptreact languages in src/extension.ts

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Developers can use autocomplete, hover, go to definition (Ctrl+click), and see diagnostics (squiggly lines) for CSS classes in styleName props.

---

## Phase 4: User Story 2 - Real-time CSS File Detection and Indexing (Priority: P2)

**Goal**: Automatically detect changes to CSS files and component import statements, updating the CSS class index in real-time without requiring manual refresh or restart. New CSS classes become immediately available in autocomplete, and hover tooltips update when CSS definitions change.

**Independent Test**: Edit a CSS file that is imported in a component, add a new CSS class, then immediately check if that class appears in autocomplete suggestions for the component without restarting VS Code or the extension. The test delivers value by ensuring the extension stays synchronized with project changes.

### Tests for User Story 2

- [X] T049 [P] [US2] Create unit test for CSSIndex file change handling in tests/unit/cssIndex.test.ts
- [X] T050 [P] [US2] Create integration test for file watcher updates in tests/integration/fileWatcher.test.ts
- [X] T051 [P] [US2] Create integration test for import statement change detection in tests/integration/importParser.test.ts

### Implementation for User Story 2

- [X] T052 [US2] Implement FileSystemWatcher for CSS files in workspace in src/services/cssIndex.ts
- [X] T053 [US2] Implement FileSystemWatcher for component files to detect import changes in src/services/cssIndex.ts
- [X] T054 [US2] Implement debounced file change handler (2 second window per SC-005) in src/services/cssIndex.ts
- [X] T055 [US2] Implement CSSIndex.updateCSSFile() method for re-parsing modified CSS files in src/services/cssIndex.ts
- [X] T056 [US2] Implement CSSIndex.removeCSSFile() method for handling deleted CSS files in src/services/cssIndex.ts
- [X] T057 [US2] Implement CSSIndex.handleComponentChange() method for detecting new/removed imports in src/services/cssIndex.ts
- [X] T058 [US2] Register file watchers in extension activation and dispose in deactivation in src/extension.ts
- [X] T059 [US2] Implement cache invalidation based on file modification timestamps in src/services/cssIndex.ts
- [X] T060 [US2] Add async file change processing to avoid blocking VS Code UI thread in src/services/cssIndex.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. The extension automatically updates when CSS files or imports change.

---

## Phase 5: User Story 3 - General IntelliSense Support with Configuration (Priority: P3)

**Goal**: Provide configuration options to customize CSS file discovery patterns and attribute names, enabling the extension to work with different project structures and CSS methodologies beyond the organization's specific setup. Support parent directory imports and path aliases when configured.

**Independent Test**: Configure the extension for a different project structure (e.g., CSS Modules, different directory patterns), then verify that autocomplete suggestions work according to the configuration. The test delivers value by making the extension universally applicable.

### Tests for User Story 3

- [ ] T061 [P] [US3] Create unit test for configuration parsing in tests/unit/config.test.ts
- [ ] T062 [P] [US3] Create integration test for parent directory import resolution in tests/integration/importParser.test.ts
- [ ] T063 [P] [US3] Create integration test for path alias resolution in tests/integration/pathResolver.test.ts

### Implementation for User Story 3

- [ ] T064 [US3] Create configuration model for extension settings in src/models/config.ts
- [ ] T065 [US3] Implement configuration service for reading VS Code settings in src/services/config.ts
- [ ] T066 [US3] Extend ImportParser.resolveImportPath() to support parent directory imports (`../`) in src/services/importParser.ts
- [ ] T067 [US3] Extend pathResolver to support path aliases (`@/`, `~`) with configuration in src/utils/pathResolver.ts
- [ ] T068 [US3] Extend ImportParser to support CSS Modules import pattern (`import styles from './styles.module.css'`) in src/services/importParser.ts
- [ ] T069 [US3] Add configuration option for CSS file discovery patterns in package.json (contributes.configuration)
- [ ] T070 [US3] Add configuration option for custom attribute names (default: styleName) in package.json
- [ ] T071 [US3] Update CompletionProvider to use configured attribute name in src/providers/completionProvider.ts
- [ ] T072 [US3] Implement CSS file scanning based on configuration patterns in src/services/cssIndex.ts
- [ ] T073 [US3] Add support for HTML files with `class` attribute when configured in src/providers/completionProvider.ts

**Checkpoint**: All user stories should now be independently functional. The extension supports both org-specific setup and general use cases with configuration.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T074 [P] Update README.md with installation and usage instructions
- [ ] T075 [P] Add JSDoc comments for all public interfaces and methods
- [ ] T076 Code cleanup and refactoring across all services
- [ ] T077 Performance optimization: verify autocomplete < 500ms, hover < 300ms, go to definition < 300ms, file updates < 2s
- [ ] T078 [P] Add comprehensive error handling and logging throughout extension
- [ ] T079 [P] Add unit test coverage for edge cases (malformed CSS, missing files, invalid paths) in tests/unit/
- [ ] T080 Memory usage optimization: verify < 50MB idle memory footprint
- [ ] T081 Run quickstart.md validation scenarios
- [ ] T082 [P] Add VS Code extension icon and marketplace assets
- [ ] T083 Verify lazy activation works correctly (< 100ms activation time)
- [ ] T084 [P] Add extension changelog and version management

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories. This is the MVP.
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Depends on US1 components (CSSIndex, CSSParser, ImportParser) but should be independently testable
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Extends US1/US2 components with configuration support but should be independently testable

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementation
- Models before services
- Services before providers
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003-T006)
- All Foundational tasks marked [P] can run in parallel (T008-T012)
- Once Foundational phase completes, user stories can start in parallel (if team capacity allows)
- All tests for a user story marked [P] can run in parallel
- Models within a story marked [P] can run in parallel
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all tests for User Story 1 together:
Task: T015 - Create unit test for CSSParser.extractClasses() in tests/unit/cssParser.test.ts
Task: T016 - Create unit test for CSSParser.parseCSSContent() in tests/unit/cssParser.test.ts
Task: T017 - Create unit test for ImportParser.extractImportPaths() in tests/unit/importParser.test.ts
Task: T018 - Create unit test for ImportParser.resolveImportPath() in tests/unit/importParser.test.ts
Task: T019 - Create unit test for CSSIndex service operations in tests/unit/cssIndex.test.ts
Task: T020 - Create integration test for CompletionProvider in tests/integration/completionProvider.test.ts
Task: T021 - Create integration test for HoverProvider in tests/integration/hoverProvider.test.ts

# Launch core services implementation together (after tests):
Task: T022 - Implement CSSParser service with extractClasses() method in src/services/cssParser.ts
Task: T025 - Implement ImportParser service with extractImportPaths() method in src/services/importParser.ts
Task: T028 - Implement CSSIndex.getComponentIndex() method in src/services/cssIndex.ts
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy/demo if ready

**MVP Scope**: User Story 1 delivers complete autocomplete and hover functionality for styleName prop with imported CSS files. This solves the primary problem and provides immediate value.

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo (Real-time updates)
4. Add User Story 3 → Test independently → Deploy/Demo (General support)
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (MVP - highest priority)
   - Developer B: User Story 2 (can start after US1 services are ready)
   - Developer C: User Story 3 (can start after US1/US2 are ready)
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Verify tests fail before implementing
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Performance targets: Activation < 100ms, Autocomplete < 500ms, Hover < 300ms, Go to Definition < 300ms, File updates < 2s
- Memory target: < 50MB idle
- All file paths use absolute paths or paths relative to repository root

---

## Task Summary

- **Total Tasks**: 84
- **Setup Tasks**: 6 (T001-T006)
- **Foundational Tasks**: 8 (T007-T014)
- **User Story 1 Tasks**: 34 (T015-T048) - MVP
- **User Story 2 Tasks**: 12 (T049-T060)
- **User Story 3 Tasks**: 13 (T061-T073)
- **Polish Tasks**: 11 (T074-T084)
- **Parallel Opportunities**: 30+ tasks can run in parallel
- **Independent Test Criteria**: Each user story has clear independent test criteria
- **Suggested MVP Scope**: User Story 1 only (34 tasks + setup/foundational = 48 tasks total)

