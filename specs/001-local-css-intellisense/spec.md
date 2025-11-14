# Feature Specification: Local CSS IntelliSense Extension

**Feature Branch**: `001-local-css-intellisense`  
**Created**: 2025-01-27  
**Status**: Draft  
**Input**: User description: "I want to create a vs code extension which will provide intellisence for local css i.e, for the classes which we manually wrote in css. I want this extension to be wokring with my org's existing setup as priority and then create a general intellisence later on. My org has a setup where we use classname to specify global classes and stylename for local css. This stylename is later converted to classname itself at build time using babel and post css plugins. The projects are build using react/next js."

## Clarifications

### Session 2025-01-27

- Q: Import Path Resolution Scope for P1 - Should P1 support only same-directory imports (`./styles.css`) or also parent directory imports (`../styles.css`)? → A: P1 supports only same-directory imports (`./styles.css`). Parent directory import support (`../styles.css`) deferred to P3.
- Q: CSS Preprocessor Support Scope - For P1, should the extension parse only compiled `.css` files or also source files like `.scss`/`.less`/`.postcss`? → A: P1 supports only compiled `.css` files (after preprocessing). Source file support (`.scss`, `.less`, `.postcss`) deferred to future phases.
- Q: Template Literal and Variable Support in styleName - Should P1 provide IntelliSense/validation for dynamic `styleName` values (variables, template literals) or only string literals? → A: P1 supports only string literals (`styleName="className"`). Dynamic value support (`styleName={variable}`, template literals) deferred to future phases.
- Q: Path Alias Resolution - Should P1 resolve path aliases (e.g., `@/styles.css`) or only relative paths (`./styles.css`)? → A: P1 supports only relative paths (`./styles.css`). Path alias resolution (`@/styles.css`, `~styles.css`) deferred to P3 with configuration support.
- Q: Error Handling for Malformed CSS - How should the extension handle malformed CSS files? → A: Extension parses valid parts and skips invalid sections (graceful degradation). Errors are logged for debugging but do not block functionality.
- Q: Media Query Class Definitions - When the same CSS class name appears multiple times (e.g., base definition + media query variants), how should the hover tooltip display the class declarations? → A: Show all definitions grouped by context (base definition + each media query variant with its breakpoint). This provides complete visibility into how a class behaves across breakpoints.
- Q: Invalid Class Name Validation - When a user types a CSS class name in `styleName` that doesn't exist in any imported CSS file, how should the extension indicate this? → A: Show VS Code diagnostic with Information severity (blue squiggly underline) as the user types. This provides non-blocking feedback since parent directory imports are not yet supported (P1), allowing developers to use classes from unsupported import paths without blocking their workflow.
- Q: Completion Details Panel Format for Multiple Class Definitions - When a CSS class has multiple definitions (base + media queries), how should the completion details panel (shown when scrolling through completions) format these definitions? → A: Match hover format exactly - Base definition first with "Base Definition" label, then media queries with "Breakpoint: @media (...)" labels. This ensures consistent UI across completion and hover experiences.
- Q: Completion Menu Label Format for Classes with Multiple Definitions - When a CSS class has multiple definitions (base + media queries), how should it appear in the completion dropdown menu? → A: Plain class name only (e.g., "container") - no indication of multiple definitions in the dropdown label. The details panel (shown when scrolling) will display all definitions with proper labeling. Only one completion item per class name should appear in the dropdown, not separate items for base and media query variants.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - IntelliSense for styleName Prop with Imported CSS Files (Priority: P1)

A developer working on a React or Next.js component wants to use local CSS classes via the `styleName` prop. The component imports CSS files from the same directory using statements like `import './cssfile.css';`. When they type `styleName="`, the extension should provide autocomplete suggestions showing only CSS class names from CSS files that are imported in the current component file. The developer can select a class name from the suggestions, and the extension should validate that the selected class exists in an imported CSS file. Additionally, when hovering over a CSS class name in the `styleName` prop, the extension should display the CSS definition (properties and values) for that class.

**Why this priority**: This is the core value proposition and addresses the organization's immediate need. The organization's setup uses component-scoped CSS files imported directly in the component, so the extension should only suggest classes from those imported files. Without this, the extension provides no value. This story delivers a complete MVP that solves the primary problem.

**Independent Test**: Can be fully tested by opening a React/Next.js file that imports a CSS file (e.g., `import './styles.css';`), typing `styleName="`, and verifying that autocomplete suggestions appear only with CSS class names from the imported CSS file. Hovering over a class name should show its CSS definition. The test delivers immediate value by enabling developers to discover and use local CSS classes without manually checking CSS files.

**Acceptance Scenarios**:

1. **Given** a React component file imports a CSS file using `import './cssfile.css';`, **When** a developer types `styleName="` in a JSX element, **Then** the extension displays autocomplete suggestions listing only CSS class names found in the imported CSS file(s)
2. **Given** autocomplete suggestions are displayed, **When** a developer selects a class name, **Then** the selected class name is inserted into the `styleName` prop
3. **Given** a developer types a class name in `styleName="..."`, **When** the class name does not exist in any imported CSS file, **Then** the extension shows a VS Code diagnostic with Information severity (blue squiggly underline) indicating the class is not found in indexed CSS files
4. **Given** a component imports multiple CSS files (e.g., `import './styles.css'; import './animations.css';`), **When** autocomplete suggestions are displayed, **Then** all CSS classes from all imported CSS files are included in the suggestions
5. **Given** a developer hovers over a CSS class name in a `styleName` prop, **When** the class exists in an imported CSS file, **Then** the extension displays a hover tooltip showing the CSS definition (properties and values) for that class. If the class appears multiple times (e.g., base definition + media query variants), all definitions are shown grouped by context
6. **Given** a CSS file is in the same directory as the component and imported with a relative path, **When** autocomplete suggestions are displayed, **Then** the extension correctly identifies and includes classes from that CSS file
7. **Given** autocomplete suggestions are displayed, **When** a developer scrolls through the dropdown using up/down arrows, **Then** the extension displays the full CSS class declaration (all properties, source file, line number) in the details panel. If the class has multiple definitions (base + media queries), all definitions are shown with proper labeling (base definition first with "Base Definition" label, followed by each media query variant with "Breakpoint: @media (...)" label)
8. **Given** a CSS class has multiple definitions (base + media queries), **When** autocomplete suggestions are displayed, **Then** only one completion item appears in the dropdown with the plain class name (e.g., "container"), not separate items for base and media query variants
9. **Given** a developer types multiple classes in styleName (e.g., `styleName="class1 class2"`), **When** typing after the first class, **Then** the extension continues to provide autocomplete suggestions for remaining classes
10. **Given** multiple classes are present in styleName (e.g., `styleName="class1 class2|"` where `|` is cursor), **When** selecting a completion, **Then** only the current word being typed is replaced, preserving existing classes
11. **Given** multiple classes are present in styleName, **When** autocomplete suggestions are displayed, **Then** already-used classes are filtered out from the suggestions
12. **Given** a developer Ctrl+clicks (or Cmd+clicks on macOS) on a CSS class name in a `styleName` prop, **When** the class exists in an imported CSS file, **Then** the extension navigates to the CSS file and positions the cursor at the line where the class is defined
13. **Given** a CSS class name appears multiple times in imported CSS files (e.g., base definition + media query variants), **When** a developer Ctrl+clicks on the class name, **Then** the extension navigates to the first occurrence (base definition) of the class

---

### User Story 2 - Real-time CSS File Detection and Indexing (Priority: P2)

A developer adds, modifies, or removes CSS files that are imported in component files. The extension should automatically detect these changes and update its index of available CSS classes without requiring manual refresh or restart. When new CSS classes are added to an imported CSS file, they should immediately become available in autocomplete suggestions for components that import that file. When CSS definitions change, hover tooltips should also update in real-time.

**Why this priority**: This ensures the extension remains useful as the project evolves. Without real-time updates, developers would need to restart the extension or manually refresh, creating friction. This story enhances the core functionality with seamless updates.

**Independent Test**: Can be fully tested by editing a CSS file that is imported in a component, adding a new CSS class, then immediately checking if that class appears in autocomplete suggestions for the component without restarting VS Code or the extension. The test delivers value by ensuring the extension stays synchronized with project changes.

**Acceptance Scenarios**:

1. **Given** a CSS file imported in a component is open and being edited, **When** a developer adds a new CSS class, **Then** the new class appears in autocomplete suggestions for `styleName` props in that component within 2 seconds
2. **Given** a CSS class definition is modified in an imported CSS file, **When** a developer hovers over that class name in a `styleName` prop, **Then** the hover tooltip displays the updated CSS definition
3. **Given** a CSS file is deleted, **When** autocomplete suggestions are displayed for a component that previously imported that file, **Then** classes from the deleted file are no longer shown
4. **Given** a CSS class is renamed in an imported CSS file, **When** autocomplete suggestions are displayed, **Then** the old class name is removed and the new class name appears
5. **Given** a developer adds a new import statement for a CSS file in a component, **When** autocomplete suggestions are displayed, **Then** classes from the newly imported CSS file are included in the suggestions

---

### User Story 3 - General IntelliSense Support with Configuration (Priority: P3)

A developer working on any project (not just the organization's specific setup) wants IntelliSense for local CSS classes. The extension should provide configuration options to customize how CSS files are discovered and which attributes trigger autocomplete. This allows the extension to work with different project structures and CSS methodologies beyond the organization's specific setup.

**Why this priority**: This expands the extension's utility beyond the organization's specific setup, making it useful for a broader range of projects. However, this will be handled later with configuration options, as the organization's specific setup is the priority. This story can be delivered after the core org-specific functionality is proven.

**Independent Test**: Can be fully tested by configuring the extension for a different project structure (e.g., CSS Modules, different directory patterns), then verifying that autocomplete suggestions work according to the configuration. The test delivers value by making the extension universally applicable.

**Acceptance Scenarios**:

1. **Given** configuration options are available, **When** a developer configures CSS file discovery patterns (e.g., directory patterns, file naming conventions), **Then** the extension uses those patterns to find and index CSS files
2. **Given** a project uses a different attribute name for local CSS (e.g., `localClass`, `cssClass`), **When** configured, **Then** the extension provides autocomplete for that attribute
3. **Given** a project uses a different CSS import pattern (e.g., CSS Modules with `import styles from './styles.module.css'`), **When** configured, **Then** the extension supports IntelliSense for the configured pattern
4. **Given** configuration allows scanning CSS files beyond imported files, **When** configured, **Then** the extension can provide autocomplete suggestions from CSS files across the project based on the configuration
5. **Given** a component imports a CSS file from a parent directory (e.g., `import '../shared.css'`), **When** configured for P3, **Then** the extension resolves and indexes classes from parent directory CSS files

---

### Edge Cases

- What happens when a CSS file contains syntax errors or is malformed? Extension parses valid parts and skips invalid sections. Errors are logged for debugging but do not prevent parsing of valid CSS classes.
- How does the extension handle CSS files with very large numbers of classes (1000+)?
- What happens when CSS classes are defined using CSS preprocessors (SASS, LESS) or PostCSS? (Deferred - P1 supports only compiled `.css` files; source file support can be added in future phases)
- How does the extension handle CSS classes defined in nested selectors or media queries? Extension indexes classes defined in media queries and nested selectors. When the same class name appears multiple times (e.g., base definition + media query variants), only one completion item appears in the dropdown with the plain class name. The completion details panel and hover tooltips show all definitions grouped by context (base definition first with "Base Definition" label, followed by each media query variant with "Breakpoint: @media (...)" label).
- What happens when multiple imported CSS files define classes with the same name?
- What happens when an import statement uses a non-standard path format (e.g., `import '../styles.css'` or `import '@/styles.css'`)? (Deferred to P3 - P1 supports only same-directory relative paths `./filename.css`; parent directory and path alias support can be added in P3)
- What happens when a CSS file referenced in an import statement doesn't exist?
- What happens when a developer uses template literals or variables in styleName (e.g., `styleName={someVariable}`)? (Deferred - P1 supports only string literals; dynamic value support can be added in future phases)
- How does the extension handle CSS files that are conditionally imported (e.g., `if (condition) import './styles.css'`)?
- What happens when the project structure changes (CSS files moved, renamed, or deleted)?
- How does the extension handle CSS classes defined using CSS-in-JS libraries that also generate CSS files?
- What happens when a component imports a CSS file from a parent directory (e.g., `import '../shared.css'`)? (Deferred to P3 - P1 only supports same-directory imports)
- How does the extension handle CSS files imported using different quote styles (single vs double quotes)?
- What happens when hover is triggered on a CSS class that was just deleted from the CSS file?
- What happens when a developer types a CSS class name that doesn't exist in any imported CSS file? Extension shows a VS Code diagnostic with Information severity (blue squiggly underline) as the user types. This provides non-blocking feedback since parent directory imports are not yet supported in P1, allowing developers to use classes from unsupported import paths without blocking their workflow.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Extension MUST provide autocomplete suggestions for CSS class names when `styleName="` is typed in React/Next.js JSX files (string literals only for P1; dynamic values deferred to future phases)
- **FR-002**: Extension MUST parse import statements in component files to identify CSS files imported using patterns like `import './cssfile.css';`
- **FR-003**: Extension MUST scan and index only CSS files that are imported in the current component file to discover available CSS class names. When encountering malformed CSS, the extension MUST parse valid sections and skip invalid parts (graceful degradation).
- **FR-004**: Extension MUST resolve relative import paths (e.g., `'./styles.css'`) to actual CSS file paths relative to the component file's directory. For P1, only same-directory relative imports (`./filename.css`) are supported; parent directory imports (`../filename.css`) and path aliases (`@/styles.css`) are deferred to P3.
- **FR-005**: Extension MUST validate that CSS class names used in `styleName` props exist in imported CSS files and show VS Code diagnostics with Information severity (blue squiggly underline) for non-existent classes. Diagnostics appear as the user types and provide non-blocking feedback, allowing developers to use classes from unsupported import paths (e.g., parent directory imports) without blocking their workflow
- **FR-006**: Extension MUST update its index of CSS classes when imported CSS files are created, modified, or deleted
- **FR-007**: Extension MUST provide autocomplete suggestions within 500ms of typing `styleName="`
- **FR-008**: Extension MUST support CSS files with standard `.css` extension (compiled CSS only for P1; source files like `.scss`, `.less`, `.postcss` deferred to future phases)
- **FR-009**: Extension MUST handle CSS files located in the same directory as the component file (same-directory imports only for P1; parent directory imports deferred to P3)
- **FR-010**: Extension MUST provide hover tooltips showing CSS definitions (properties and values) when hovering over CSS class names in `styleName` props. When a class appears multiple times (e.g., base definition + media query variants), the hover MUST display all definitions grouped by context (base definition first, followed by each media query variant with its breakpoint condition)
- **FR-011**: Extension MUST update hover tooltips in real-time when CSS definitions change in imported CSS files
- **FR-012**: Extension MUST work with React and Next.js project structures
- **FR-013**: Extension MUST detect when new import statements are added to a component and update autocomplete suggestions accordingly
- **FR-014**: Extension MUST provide configuration options to customize CSS file discovery patterns for general use cases (P3 feature)
- **FR-015**: Extension MUST provide configuration options to specify the attribute name for local CSS (default: `styleName`) for general use cases (P3 feature)
- **FR-016**: Extension MUST support general IntelliSense for `class` attribute in HTML files when configured (P3 feature)
- **FR-017**: Extension MUST support parent directory import paths (e.g., `../styles.css`) when configured for P3
- **FR-018**: Extension MUST show full CSS class declaration (all properties, source file, line number) when scrolling through completion dropdown using up/down arrows. When a class has multiple definitions (base + media queries), the details panel MUST display all definitions with proper labeling matching the hover format (base definition first with "Base Definition" label, followed by each media query variant with "Breakpoint: @media (...)" label)
- **FR-024**: Extension MUST show only one completion item per CSS class name in the completion dropdown menu, even when the class has multiple definitions (base + media queries). The completion item label MUST be the plain class name only (e.g., "container"), with no indication of multiple definitions in the dropdown label
- **FR-019**: Extension MUST support multiple space-separated classes in styleName attribute (e.g., `styleName="class1 class2"`)
- **FR-020**: Extension MUST filter out already-used classes from completion suggestions when multiple classes are present
- **FR-021**: Extension MUST only replace the current word being typed when inserting completion in a multi-class scenario
- **FR-022**: Extension MUST provide "Go to Definition" functionality when Ctrl+clicking (Cmd+clicking on macOS) on a CSS class name in `styleName` props, navigating to the CSS file and positioning the cursor at the line where the class is defined
- **FR-023**: Extension MUST navigate to the first occurrence (base definition) of a CSS class when multiple definitions exist (e.g., base + media query variants)

### Key Entities *(include if feature involves data)*

- **CSS File**: Represents a CSS file imported in a component. Key attributes: file path (resolved from import statement), last modified timestamp, list of CSS class names defined in the file, CSS definitions (properties and values) for each class
- **CSS Class**: Represents a CSS class definition. Key attributes: class name, source file path, line number where defined, CSS properties and values
- **Import Statement**: Represents a CSS import in a component file. Key attributes: import path (e.g., `'./styles.css'`), resolved file path, component file path
- **Project Configuration**: Represents extension settings for a project (P3 feature). Key attributes: CSS file discovery patterns, attribute names for local CSS, excluded directories, file patterns to scan
- **Autocomplete Suggestion**: Represents a suggestion shown to the user. Key attributes: class name, source file, CSS definition preview (if available)
- **Hover Tooltip**: Represents the hover information displayed. Key attributes: CSS class name, full CSS definition(s) (properties and values), source file path. When a class has multiple definitions (base + media queries), all definitions are shown grouped by context

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can discover and use local CSS class names via autocomplete without manually opening CSS files 90% of the time
- **SC-002**: Autocomplete suggestions appear within 500ms of typing the trigger sequence (`styleName="`)
- **SC-003**: Extension correctly identifies and indexes CSS classes from imported CSS files with 95% accuracy (handles edge cases like comments, nested selectors, etc.)
- **SC-004**: Extension correctly resolves import paths and identifies imported CSS files with 98% accuracy
- **SC-005**: Extension updates its index of CSS classes within 2 seconds of file changes (create, modify, delete) to imported CSS files
- **SC-006**: Developers report a 50% reduction in time spent searching for CSS class names compared to manual file inspection
- **SC-007**: Extension successfully validates CSS class names and shows Information severity diagnostics for non-existent classes with 100% accuracy
- **SC-008**: Hover tooltips display CSS definitions within 300ms of hovering over a CSS class name
- **SC-009**: Extension works correctly with React and Next.js projects using relative CSS imports without requiring additional configuration in 90% of standard project structures
- **SC-010**: Developers can view CSS definitions via hover tooltips without opening CSS files 95% of the time
- **SC-011**: Developers can navigate to CSS class definitions via Ctrl+click (Cmd+click on macOS) within 300ms of clicking on a class name
- **SC-012**: Extension correctly navigates to the CSS file and line number where a class is defined with 100% accuracy
