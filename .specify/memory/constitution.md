<!--
  Sync Impact Report:
  Version change: N/A → 1.0.0 (initial constitution)
  Modified principles: N/A (all new)
  Added sections: Performance Standards, Dependency Management, Documentation Requirements, Development Workflow
  Removed sections: N/A
  Templates requiring updates:
    ✅ plan-template.md - Constitution Check section aligns with VS Code extension principles
    ✅ spec-template.md - No changes needed, generic template compatible
    ✅ tasks-template.md - No changes needed, generic template compatible
  Follow-up TODOs: None
-->

# Local CSS Sense Constitution

## Core Principles

### I. Performance First (NON-NEGOTIABLE)
All extension features MUST be designed for minimal performance impact. Extension activation MUST be lazy (on-demand), heavy operations MUST be asynchronous, and UI operations MUST not block the main thread. Performance budgets: activation time < 100ms, command execution < 500ms for typical operations, memory footprint < 50MB idle. Rationale: VS Code extensions run in the same process as the editor; poor performance degrades the entire user experience.

### II. Minimal Dependencies
Dependencies MUST be justified with clear rationale. Prefer built-in Node.js APIs and VS Code APIs over external packages. Each dependency addition requires: (1) explicit need statement, (2) evaluation of alternatives, (3) bundle size impact assessment. Rationale: Fewer dependencies reduce security surface, bundle size, and maintenance burden while improving startup time.

### III. TypeScript Strict Mode
All code MUST be written in TypeScript with strict mode enabled (`strict: true`). Type definitions MUST be complete; `any` types require explicit justification. Rationale: Type safety prevents runtime errors, improves maintainability, and enables better IDE support.

### IV. Documentation-Driven Development
Every feature MUST be documented before implementation. Documentation includes: (1) feature specification with user scenarios, (2) API documentation for public interfaces, (3) inline code comments for complex logic, (4) README updates for user-facing changes. Rationale: Documentation ensures clarity, enables proper planning, and reduces onboarding time.

### V. Test Coverage for Core Logic
Core functionality (parsing, analysis, transformations) MUST have unit tests. Integration tests required for VS Code API interactions. Test coverage target: >80% for core modules. Rationale: Tests ensure reliability and enable confident refactoring.

### VI. VS Code API Best Practices
MUST use VS Code extension API patterns correctly: proper disposal of resources, correct use of `Disposable` pattern, appropriate event handling, and activation events optimization. Rationale: Correct API usage ensures extension stability and compatibility with VS Code updates.

## Performance Standards

### Activation Performance
- Extension MUST activate lazily (on-demand via activation events)
- Initial activation time MUST be < 100ms
- No heavy computation during activation
- Use `onLanguage`, `onCommand`, or `onStartupFinished` activation events appropriately

### Runtime Performance
- Command execution MUST complete within 500ms for typical operations
- Long-running operations (>1s) MUST show progress indicators
- File system operations MUST be asynchronous
- Language server operations MUST not block UI thread

### Resource Management
- Memory usage MUST remain < 50MB when idle
- All resources (file watchers, event listeners, timers) MUST be properly disposed
- Implement proper cleanup in `deactivate()` function
- Avoid memory leaks from event listeners or subscriptions

## Dependency Management

### Dependency Evaluation Criteria
Before adding any dependency, evaluate:
1. **Necessity**: Is this dependency truly required, or can we use built-in APIs?
2. **Size**: What is the bundle size impact? (check with `npm ls --depth=0`)
3. **Maintenance**: Is the package actively maintained? (check last update date, issue count)
4. **Alternatives**: Are there lighter alternatives or can we implement a minimal version?

### Prohibited Dependency Patterns
- Avoid large frameworks for simple tasks
- Avoid dependencies that pull in transitive dependencies unnecessarily
- Avoid dependencies with known security vulnerabilities
- Avoid dependencies that duplicate VS Code API functionality

### Required Dependencies
- `@types/vscode`: TypeScript definitions for VS Code API (dev dependency)
- TypeScript compiler and related tooling (dev dependencies)
- Testing framework (dev dependency, e.g., Mocha, Jest, or Vitest)

## Documentation Requirements

### Feature Documentation
Each feature MUST include:
1. **Specification** (`specs/[feature]/spec.md`): User scenarios, requirements, acceptance criteria
2. **API Documentation**: JSDoc comments for all public functions, classes, and interfaces
3. **User Documentation**: README updates explaining new features and usage
4. **Code Comments**: Inline comments for complex algorithms and non-obvious logic

### Documentation Standards
- Use clear, concise language
- Include code examples for public APIs
- Document edge cases and error conditions
- Keep documentation up-to-date with code changes
- Use markdown formatting consistently

## Development Workflow

### Code Quality Gates
1. **Linting**: All code MUST pass ESLint with project configuration
2. **Formatting**: Code MUST be formatted with Prettier (or project formatter)
3. **Type Checking**: TypeScript compilation MUST succeed with no errors
4. **Tests**: New features MUST include tests; existing tests MUST pass

### Review Process
1. All changes MUST be reviewed before merge
2. Reviewers MUST verify constitution compliance
3. Performance impact MUST be assessed for new features
4. Documentation MUST be reviewed alongside code

### Versioning
- Follow Semantic Versioning (MAJOR.MINOR.PATCH)
- MAJOR: Breaking API changes or major feature removals
- MINOR: New features (backward compatible)
- PATCH: Bug fixes and minor improvements
- Update CHANGELOG.md for all releases

## Governance

This constitution supersedes all other development practices. All code contributions MUST comply with these principles. Amendments to this constitution require:

1. **Proposal**: Document the proposed change with rationale
2. **Review**: Consensus from maintainers
3. **Update**: Version bump and update of dependent templates
4. **Communication**: Announce changes to all contributors

All pull requests MUST verify compliance with constitution principles. Complexity additions MUST be justified in the Complexity Tracking section of implementation plans. Use `.specify/templates/plan-template.md` for feature planning and ensure constitution checks are performed.

**Version**: 1.0.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27
