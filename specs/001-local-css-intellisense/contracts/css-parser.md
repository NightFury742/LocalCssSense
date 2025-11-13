# CSS Parser Contract

**Service**: CSS Parser  
**Purpose**: Extract CSS class names and definitions from CSS files

## Interface

```typescript
interface CSSParser {
  parseCSSFile(filePath: string): Promise<CSSFile>;
  parseCSSContent(content: string, filePath: string): CSSFile;
  extractClasses(cssContent: string): Map<string, CSSClass>;
}
```

## Methods

### parseCSSFile(filePath: string): Promise<CSSFile>

Parses a CSS file and returns a CSSFile object.

**Parameters**:
- `filePath: string` - Absolute path to CSS file

**Returns**: `Promise<CSSFile>` - Parsed CSS file object

**Errors**:
- `FileNotFoundError`: File does not exist
- `ParseError`: CSS parsing failed (partial results returned)

**Performance**: < 100ms for typical CSS file (100 classes)

---

### parseCSSContent(content: string, filePath: string): CSSFile

Parses CSS content string and returns a CSSFile object.

**Parameters**:
- `content: string` - CSS file content
- `filePath: string` - File path for reference

**Returns**: `CSSFile` - Parsed CSS file object

**Errors**:
- `ParseError`: CSS parsing failed (partial results returned)

**Performance**: < 50ms for typical CSS content

---

### extractClasses(cssContent: string): Map<string, CSSClass>

Extracts CSS class definitions from CSS content.

**Parameters**:
- `cssContent: string` - CSS file content

**Returns**: `Map<string, CSSClass>` - Map of class name → CSSClass

**Behavior**:
- Handles comments (skips)
- Handles nested selectors (extracts class names)
- Handles media queries (extracts class names)
- Graceful degradation for malformed CSS

**Performance**: < 20ms for typical CSS content

## CSS Class Pattern

**Regex**: `/\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g`

**Matches**:
- `.className { ... }`
- `.my-class { ... }`
- `.class_name { ... }`

**Does Not Match**:
- `#id { ... }` (IDs)
- `element { ... }` (elements)
- `.class1.class2 { ... }` (multiple classes - extracts first)

## Error Handling

- **Malformed CSS**: Parse valid parts, skip invalid sections
- **Missing Closing Braces**: Extract classes up to error point
- **Invalid Selectors**: Skip invalid selectors, continue parsing
- **Comments**: Strip comments before parsing

## Example

**Input CSS**:
```css
.container {
  display: flex;
  padding: 1rem;
}

.header {
  font-size: 2rem;
  color: blue;
}
```

**Output**:
```typescript
Map {
  "container" => CSSClass {
    name: "container",
    properties: Map {
      "display" => "flex",
      "padding" => "1rem"
    },
    fullDefinition: ".container {\n  display: flex;\n  padding: 1rem;\n}"
  },
  "header" => CSSClass {
    name: "header",
    properties: Map {
      "font-size" => "2rem",
      "color" => "blue"
    },
    fullDefinition: ".header {\n  font-size: 2rem;\n  color: blue;\n}"
  }
}
```

