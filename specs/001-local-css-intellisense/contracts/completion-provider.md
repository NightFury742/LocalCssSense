# Completion Provider Contract

**Provider Type**: VS Code Completion Provider  
**Language**: TypeScript React, JavaScript React  
**Trigger**: `styleName="`

## Interface

```typescript
interface CompletionProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList>;
  
  resolveCompletionItem?(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CompletionItem>;
}
```

## Registration

- **Language**: `typescriptreact`, `javascriptreact`
- **Trigger Characters**: `"` (double quote)
- **Activation**: Lazy (onLanguage events)

## Behavior

### Trigger Condition

Provider activates when:
1. User types `styleName="` in JSX element
2. Cursor position is within a string literal attribute value
3. Document language is `typescriptreact` or `javascriptreact`
4. Supports multiple classes: Works when typing after existing classes (e.g., `styleName="class1 class2|"` where `|` is cursor)

### Completion Items

Each completion item represents a CSS class name from imported CSS files.

**Properties**:
- `label: string` - CSS class name (e.g., `"container"`)
- `kind: vscode.CompletionItemKind.Class` - Item kind
- `detail: string` - Source CSS file path (relative)
- `documentation: vscode.MarkdownString` - Full CSS class declaration with all properties, source file, and line number (shown when scrolling through dropdown)
- `insertText: string` - Class name to insert
- `range: vscode.Range` - Text range to replace (only replaces current word being typed, supports multiple classes)

### Multiple Classes Support

The provider supports multiple space-separated classes in the `styleName` attribute:
- When typing after existing classes (e.g., `styleName="class1 class2|"`), only the current word is replaced
- Already-used classes are filtered out from completion suggestions
- IntelliSense continues to work for each new class being typed

### Documentation Display

When scrolling through completion items using up/down arrows:
- Full CSS class declaration is shown in the details panel
- Includes all CSS properties (not just preview)
- Shows source file path and line number
- Formatted as markdown code block for readability

### Performance Requirements

- **Response Time**: < 500ms (FR-007)
- **Caching**: Results cached per document
- **Async**: Non-blocking, uses async operations

## Examples

### Single Class

**Input**:
```jsx
import './styles.css';

function Component() {
  return <div styleName="
```

**Output**: Completion items for all classes in `./styles.css`:
- `container` (from styles.css) - Shows full CSS declaration when scrolling
- `header` (from styles.css) - Shows full CSS declaration when scrolling
- `content` (from styles.css) - Shows full CSS declaration when scrolling

### Multiple Classes

**Input**:
```jsx
import './styles.css';

function Component() {
  return <div styleName="container header 
```

**Output**: Completion items for remaining classes (excluding `container` and `header`):
- `content` (from styles.css)
- `footer` (from styles.css)
- Only the word after the last space is replaced when selecting a completion

