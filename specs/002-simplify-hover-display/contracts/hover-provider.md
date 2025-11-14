# Hover Provider Contract

**Provider Type**: VS Code Hover Provider  
**Language**: TypeScript React, JavaScript React  
**Trigger**: Hover over CSS class name in `styleName` prop

## Interface

```typescript
interface HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover>;
}
```

## Registration

- **Language**: `typescriptreact`, `javascriptreact`
- **Activation**: Lazy (onLanguage events)

## Behavior

### Trigger Condition

Provider activates when:
1. User hovers over text within `styleName="..."` attribute value
2. Text matches a CSS class name from imported CSS files
3. Document language is `typescriptreact` or `javascriptreact`

### Hover Content

Hover displays only CSS properties without file paths, class name headers, or metadata labels. When a class appears multiple times (e.g., base definition + media query variants), all definitions are shown without labels.

**Format (single definition)**:
```css
.className {
  property: value;
  property: value;
}
```

**Format (multiple definitions with media queries)**:
```css
.className {
  property: value;
  property: value;
}

@media (max-width: 768px) {
  .className {
    property: value;
  }
}
```

**Properties**:
- `contents: vscode.MarkdownString` - Formatted CSS definition (CSS code block only, no metadata)
- `range: vscode.Range` - Text range that triggered hover

### Performance Requirements

- **Response Time**: < 300ms (per plan.md performance goals)
- **Caching**: CSS definitions cached per file
- **Async**: Non-blocking, uses async operations

## Example

**Input**:
```jsx
import './styles.css';

function Component() {
  return <div styleName="container">
```

**Hover over `container` (single definition)**:
```css
.container {
  display: flex;
  padding: 1rem;
  background-color: white;
}
```

**Hover over `container` (with media query)**:
```css
.container {
  display: flex;
  padding: 1rem;
}

@media (max-width: 768px) {
  .container {
    display: block;
    padding: 0.5rem;
  }
}
```

