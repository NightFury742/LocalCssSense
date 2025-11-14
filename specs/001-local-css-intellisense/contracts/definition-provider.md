# Definition Provider Contract

**Provider Type**: VS Code Definition Provider  
**Language**: TypeScript React, JavaScript React, TypeScript, JavaScript  
**Trigger**: Ctrl+click (Cmd+click on macOS) on CSS class name in `styleName` prop

## Interface

```typescript
interface DefinitionProvider {
  provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Location | vscode.Location[] | vscode.LocationLink[]>;
}
```

## Registration

- **Language**: `typescriptreact`, `javascriptreact`, `typescript`, `javascript`
- **Activation**: Lazy (onLanguage events)

## Behavior

### Trigger Condition

Provider activates when:
1. User Ctrl+clicks (Cmd+clicks on macOS) on text within `styleName="..."` attribute value
2. Text matches a CSS class name from imported CSS files
3. Document language is `typescriptreact`, `javascriptreact`, `typescript`, or `javascript`

### Definition Location

Returns a `Location` object pointing to the CSS file where the class is defined.

**Properties**:
- `uri: vscode.Uri` - URI of the CSS file containing the class definition
- `range: vscode.Range` - Range in the CSS file (line number where class is defined, character 0)

### Multiple Definitions Handling

When a CSS class appears multiple times (e.g., base definition + media query variants):
- **Returns**: First occurrence (base definition) per FR-023
- **Rationale**: Base definition is the primary definition; media query variants are modifications shown in hover tooltips

### Edge Cases

- **Class not found**: Returns `undefined` (no navigation occurs)
- **Multiple CSS files with same class**: Navigates to first occurrence (base definition in first file)
- **Class in media query**: Navigates to base definition first

### Performance Requirements

- **Response Time**: < 300ms (SC-011)
- **Caching**: Uses existing CSS index (no additional storage)
- **Async**: Non-blocking, leverages existing index lookups

## Example

**Input**:
```jsx
import './styles.css';

function Component() {
  return <div styleName="container">
```

**Ctrl+click on `container`**:
- **Navigates to**: `styles.css` at line 5 (where `.container` is defined)
- **Opens**: CSS file with cursor positioned at the class definition

**CSS File** (`styles.css`):
```css
.header {
  font-size: 2rem;
}

.container {
  display: flex;
  padding: 1rem;
}

.footer {
  margin-top: 2rem;
}
```

**Result**: VS Code opens `styles.css` and positions cursor at line 5 (`.container` definition)

## Implementation Notes

- Reuses `isInStyleNameAttribute()` logic from HoverProvider
- Uses existing `CSSIndex.getClass()` method for lookups
- Returns `vscode.Location` with URI from `CSSClass.sourceFile` and position from `CSSClass.lineNumber`
- No additional dependencies required (uses built-in VS Code API)

