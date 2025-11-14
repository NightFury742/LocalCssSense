# Feature Specification: Simplify Hover and Definition Display

**Feature Branch**: `002-simplify-hover-display`  
**Created**: 2025-11-14  
**Status**: Draft  
**Input**: User description: "i want that only the css class definition should be shown in the hover and definition menu. No need to show the file paths or any thing else, just plain simple css properties. please update other related files as well"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Simplified Hover Display (Priority: P1)

When a developer hovers over a CSS class name in the `styleName` prop, they see only the CSS properties without any file paths, labels, or metadata. This provides a cleaner, more focused view of the CSS definition.

**Why this priority**: This is the primary user interaction for viewing CSS definitions. Simplifying the display reduces visual clutter and allows developers to focus on the CSS properties themselves.

**Independent Test**: Can be fully tested by hovering over a CSS class name and verifying that only CSS properties are displayed without file paths or labels. Delivers immediate value by providing a cleaner interface.

**Acceptance Scenarios**:

1. **Given** a React component with `styleName="container"` where `container` is defined in a CSS file, **When** the developer hovers over `container`, **Then** only the CSS properties are shown (e.g., `display: flex; padding: 1rem;`) without file path or class name header
2. **Given** a CSS class with a base definition and media query variants, **When** the developer hovers over the class name, **Then** all CSS definitions are shown without "Base Definition" or "Breakpoint:" labels, just the CSS properties
3. **Given** a CSS class with only a media query definition (no base), **When** the developer hovers over the class name, **Then** only the CSS properties are shown without any labels

---

### User Story 2 - Simplified Completion Details Panel (Priority: P2)

When a developer scrolls through completion items in the autocomplete dropdown, the details panel shows only CSS properties without file paths or labels.

**Why this priority**: Maintains consistency with the hover display and provides a unified, clean experience across all IntelliSense features.

**Independent Test**: Can be fully tested by triggering completion and scrolling through items to verify the details panel shows only CSS properties. Delivers value by maintaining consistency with hover behavior.

**Acceptance Scenarios**:

1. **Given** a developer types `styleName="` and sees completion suggestions, **When** they scroll through completion items using arrow keys, **Then** the details panel shows only CSS properties without file paths or labels
2. **Given** a completion item with multiple CSS definitions (base + media queries), **When** the developer views the details panel, **Then** all CSS properties are shown without "Base Definition" or "Breakpoint:" labels

---

### Edge Cases

- What happens when a CSS class has no properties (empty definition)? Show empty CSS block or nothing?
- How does the system handle CSS classes with only comments? Show comments or skip them?
- What happens when a CSS class has multiple definitions across different files? Show all definitions or just the first one?
- How are media query definitions displayed when there's no base definition? Show just the media query CSS or include the media query wrapper?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Hover provider MUST display only CSS properties without file paths, class names, or metadata headers
- **FR-002**: Hover provider MUST display all CSS definitions (base + media queries) without "Base Definition" or "Breakpoint:" labels
- **FR-003**: Completion provider details panel MUST display only CSS properties without file paths, class names, or metadata headers
- **FR-004**: Completion provider details panel MUST display all CSS definitions (base + media queries) without "Base Definition" or "Breakpoint:" labels
- **FR-005**: System MUST maintain the same CSS property ordering (base definitions first, then media query variants)
- **FR-006**: System MUST preserve CSS code block formatting for readability
- **FR-007**: System MUST handle single definitions, multiple definitions, and media-query-only definitions consistently

### Key Entities

- **CSS Class Definition**: Represents the CSS properties for a class, including base and media query variants
- **Hover Content**: The formatted display shown when hovering over a CSS class name
- **Completion Documentation**: The formatted display shown in the completion details panel

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers see only CSS properties when hovering over class names (no file paths or labels visible)
- **SC-002**: Completion details panel shows only CSS properties (no file paths or labels visible)
- **SC-003**: All CSS definitions (base + media queries) are displayed without metadata labels
- **SC-004**: CSS property display is consistent between hover and completion features
- **SC-005**: Display format remains readable and properly formatted as CSS code blocks

## Assumptions

- CSS properties should be displayed in CSS code blocks for syntax highlighting
- Multiple definitions should be separated visually (e.g., with blank lines or separators) but without labels
- Media query wrappers should be included when showing media query definitions (e.g., `@media (max-width: 768px) { ... }`)
- The definition provider (Ctrl+click navigation) behavior remains unchanged (still navigates to CSS file)

## Dependencies

- Existing CSS index and parsing infrastructure
- Hover provider implementation
- Completion provider implementation
- CSS file content caching

## Out of Scope

- Changing the definition provider navigation behavior (Ctrl+click still navigates to CSS file)
- Modifying how CSS classes are indexed or parsed
- Changing completion item labels or autocomplete behavior
- Adding new features or capabilities beyond simplifying the display format
