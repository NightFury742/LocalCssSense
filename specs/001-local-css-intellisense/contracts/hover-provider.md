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

Hover displays CSS definition for the class.

**Format**:
```markdown
**className** (from styles.css)

```css
.className {
  property: value;
  property: value;
}
```
```

**Properties**:
- `contents: vscode.MarkdownString` - Formatted CSS definition
- `range: vscode.Range` - Text range that triggered hover

### Performance Requirements

- **Response Time**: < 300ms (SC-008)
- **Caching**: CSS definitions cached per file
- **Async**: Non-blocking, uses async operations

## Example

**Input**:
```jsx
import './styles.css';

function Component() {
  return <div styleName="container">
```

**Hover over `container`**:
```
container (from styles.css)

.container {
  display: flex;
  padding: 1rem;
  background-color: white;
}
```

