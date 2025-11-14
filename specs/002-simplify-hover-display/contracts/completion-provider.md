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

Each completion item represents a CSS class name from imported CSS files. When a class has multiple definitions (base + media queries), only one completion item appears in the dropdown.

**Properties**:
- `label: string` - Plain CSS class name only (e.g., `"container"`). No indication of multiple definitions in the label, even when the class has base + media query variants
- `kind: vscode.CompletionItemKind.Class` - Item kind
- `detail: string` - Source CSS file path (relative)
- `documentation: vscode.MarkdownString` - CSS class declaration(s) with all properties (shown when scrolling through dropdown). When a class has multiple definitions (base + media queries), all definitions are shown without file paths or labels, matching the hover format
- `insertText: string` - Class name to insert
- `range: vscode.Range` - Text range to replace (only replaces current word being typed, supports multiple classes)

### Multiple Classes Support

The provider supports multiple space-separated classes in the `styleName` attribute:
- When typing after existing classes (e.g., `styleName="class1 class2|"`), only the current word is replaced
- Already-used classes are filtered out from completion suggestions
- IntelliSense continues to work for each new class being typed

### Documentation Display

When scrolling through completion items using up/down arrows:
- CSS class declaration(s) is shown in the details panel
- Includes all CSS properties (not just preview)
- Formatted as markdown code block for readability
- When a class has multiple definitions (base + media queries), all definitions are displayed without file paths or labels:
  - Base definition first (no label)
  - Each media query variant follows (no label)
  - Format matches the hover tooltip for consistency

### Performance Requirements

- **Response Time**: < 500ms (per plan.md performance goals)
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
- `container` (from styles.css) - Shows CSS declaration when scrolling
- `header` (from styles.css) - Shows CSS declaration when scrolling
- `content` (from styles.css) - Shows CSS declaration when scrolling

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

### Class with Multiple Definitions (Base + Media Queries)

**Input**:
```jsx
import './styles.css';

function Component() {
  return <div styleName="
```

**CSS File** (`styles.css`):
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

@media (min-width: 1200px) {
  .container {
    padding: 2rem;
  }
}
```

**Output**: Only one completion item appears:
- `container` (from styles.css) - Label shows plain class name only

**When scrolling through completion** (details panel shows):
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

@media (min-width: 1200px) {
  .container {
    padding: 2rem;
  }
}
```

