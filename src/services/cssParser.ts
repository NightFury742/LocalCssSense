import * as fs from 'fs';
import * as path from 'path';
import { CSSFile } from '../models/cssFile';
import { CSSClass } from '../models/cssClass';
import { Logger } from '../utils/logger';

/**
 * CSS Parser service for extracting CSS class names and definitions from CSS files.
 * Uses lightweight regex-based parsing (no external dependencies).
 */
export class CSSParser {
  /**
   * Regex pattern for matching CSS class selectors.
   * Matches: .className { ... }
   * Pattern: /\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g
   */
  private static readonly CLASS_PATTERN = /\.([a-zA-Z_-][a-zA-Z0-9_-]*)\s*\{/g;

  /**
   * Extracts CSS class definitions from CSS content.
   * 
   * @param cssContent - CSS file content
   * @returns Object with classes map (first occurrence) and allOccurrences map (all occurrences)
   */
  extractClasses(cssContent: string): { classes: Map<string, CSSClass>; allOccurrences: Map<string, CSSClass[]> } {
    const classes = new Map<string, CSSClass>();
    const allOccurrences = new Map<string, CSSClass[]>();
    
    if (!cssContent || cssContent.trim().length === 0) {
      return { classes, allOccurrences };
    }

    try {
      // Remove CSS comments before parsing
      const contentWithoutComments = this.removeComments(cssContent);
      
      // Extract class names and their definitions
      const classMatches = this.findClassMatches(contentWithoutComments);
      
      for (const match of classMatches) {
        try {
          const className = match.className;
          const classDefinition = match.definition;
          const lineNumber = match.lineNumber;
          
          // Extract CSS properties from the definition
          const properties = this.extractProperties(classDefinition);
          
          // Create CSSClass instance
          const cssClass = new CSSClass(
            className,
            '', // sourceFile will be set by parseCSSContent/parseCSSFile
            lineNumber,
            properties,
            classDefinition
          );
          
          // Store first occurrence in classes map (for backward compatibility and DefinitionProvider)
          if (!classes.has(className)) {
            classes.set(className, cssClass);
          }
          
          // Store all occurrences in allOccurrences map (for HoverProvider)
          if (!allOccurrences.has(className)) {
            allOccurrences.set(className, []);
          }
          allOccurrences.get(className)!.push(cssClass);
        } catch (error) {
          // Graceful degradation: skip invalid class, continue parsing
          Logger.debug(`Skipped invalid CSS class: ${error}`);
        }
      }
    } catch (error) {
      // Graceful degradation: return partial results
      Logger.warn(`CSS parsing encountered errors, returning partial results: ${error}`);
    }

    return { classes, allOccurrences };
  }

  /**
   * Parses CSS content string and returns a CSSFile object.
   * 
   * @param content - CSS file content
   * @param filePath - File path for reference
   * @returns CSSFile instance
   */
  parseCSSContent(content: string, filePath: string): CSSFile {
    const { classes, allOccurrences } = this.extractClasses(content);
    
    // Update sourceFile for all classes (first occurrence)
    for (const cssClass of classes.values()) {
      // Create new CSSClass with updated sourceFile
      const updatedClass = new CSSClass(
        cssClass.name,
        filePath,
        cssClass.lineNumber,
        cssClass.properties,
        cssClass.fullDefinition
      );
      classes.set(cssClass.name, updatedClass);
    }
    
    // Update sourceFile for all occurrences
    const updatedAllOccurrences = new Map<string, CSSClass[]>();
    for (const [className, occurrences] of allOccurrences.entries()) {
      updatedAllOccurrences.set(className, occurrences.map(cssClass => 
        new CSSClass(
          cssClass.name,
          filePath,
          cssClass.lineNumber,
          cssClass.properties,
          cssClass.fullDefinition
        )
      ));
    }

    // Get file modification time (use current time if file doesn't exist)
    let lastModified = Date.now();
    try {
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        lastModified = stats.mtimeMs;
      }
    } catch (error) {
      Logger.debug(`Could not get file stats for ${filePath}: ${error}`);
    }

    return new CSSFile(filePath, lastModified, classes, content, updatedAllOccurrences);
  }

  /**
   * Parses a CSS file and returns a CSSFile object.
   * 
   * @param filePath - Absolute path to CSS file
   * @returns Promise that resolves to CSSFile instance
   * @throws Error if file does not exist or cannot be read
   */
  async parseCSSFile(filePath: string): Promise<CSSFile> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`CSS file not found: ${filePath}`);
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8');
      return this.parseCSSContent(content, filePath);
    } catch (error) {
      throw new Error(`Failed to read CSS file ${filePath}: ${error}`);
    }
  }

  /**
   * Removes CSS comments from content.
   * Handles both block comments and line comments.
   */
  private removeComments(content: string): string {
    // Remove /* ... */ comments
    let result = content.replace(/\/\*[\s\S]*?\*\//g, '');
    
    // Remove // ... comments (though not standard CSS, some preprocessors use them)
    result = result.replace(/\/\/.*$/gm, '');
    
    return result;
  }

  /**
   * Finds all CSS class matches in content.
   * Returns matches with class name, definition, line number, and match index.
   */
  private findClassMatches(content: string): Array<{ className: string; definition: string; lineNumber: number; matchIndex: number }> {
    const matches: Array<{ className: string; definition: string; lineNumber: number; matchIndex: number }> = [];
    const lines = content.split('\n');
    
    // Reset regex lastIndex
    CSSParser.CLASS_PATTERN.lastIndex = 0;
    
    let match;
    while ((match = CSSParser.CLASS_PATTERN.exec(content)) !== null) {
      const className = match[1];
      const matchStart = match.index;
      const matchEnd = matchStart + match[0].length;
      
      // Find line number
      let lineNumber = 1;
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        if (charCount + lines[i].length + 1 > matchStart) {
          lineNumber = i + 1;
          break;
        }
        charCount += lines[i].length + 1; // +1 for newline
      }
      
      // Extract class definition (from class selector to matching closing brace)
      const definition = this.extractClassDefinition(content, matchStart, matchEnd - 1);
      
      if (definition) {
        matches.push({ className, definition, lineNumber, matchIndex: matchStart });
      }
    }
    
    return matches;
  }

  /**
   * Extracts a complete CSS class definition from content.
   * Includes the class selector and content between braces.
   * 
   * @param content - CSS content
   * @param selectorStart - Start position of class selector (e.g., position of '.')
   * @param braceStart - Start position to search for opening brace
   * @returns Complete class definition including selector, or null if not found
   */
  private extractClassDefinition(content: string, selectorStart: number, braceStart: number): string | null {
    if (braceStart >= content.length) {
      return null;
    }

    // Find opening brace
    let pos = braceStart;
    while (pos < content.length && content[pos] !== '{') {
      pos++;
    }

    if (pos >= content.length) {
      return null;
    }

    const openBracePos = pos;
    let braceCount = 0;
    let inString = false;
    let stringChar = '';

    // Find matching closing brace
    while (pos < content.length) {
      const char = content[pos];

      if (!inString && (char === '"' || char === "'")) {
        inString = true;
        stringChar = char;
      } else if (inString && char === stringChar && content[pos - 1] !== '\\') {
        inString = false;
      } else if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (braceCount === 0) {
            // Found matching closing brace - include selector and full definition
            return content.substring(selectorStart, pos + 1).trim();
          }
        }
      }

      pos++;
    }

    // No matching closing brace found - return partial definition
    return content.substring(selectorStart, content.length).trim();
  }

  /**
   * Extracts CSS properties from a class definition.
   * Returns a Map of property name → value.
   */
  private extractProperties(definition: string): Map<string, string> {
    const properties = new Map<string, string>();
    
    // Extract content between braces
    const braceMatch = definition.match(/\{([\s\S]*)\}/);
    if (!braceMatch) {
      return properties;
    }

    const content = braceMatch[1];
    
    // Split by semicolons and process each property
    const propertyLines = content.split(';');
    
    for (const line of propertyLines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }

      // Match property: value pattern
      const propertyMatch = trimmed.match(/^([^:]+):(.+)$/);
      if (propertyMatch) {
        const propertyName = propertyMatch[1].trim();
        const propertyValue = propertyMatch[2].trim();
        
        if (propertyName && propertyValue) {
          properties.set(propertyName, propertyValue);
        }
      }
    }

    return properties;
  }
}

