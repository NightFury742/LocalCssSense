import * as vscode from 'vscode';
import * as fs from 'fs';
import { CSSIndex } from '../services/cssIndex';
import { ImportParser } from '../services/importParser';
import { Logger } from '../utils/logger';

/**
 * Hover Provider for CSS class names in styleName prop.
 * Shows CSS definitions when hovering over class names.
 */
export class HoverProvider implements vscode.HoverProvider {
  private cssIndex: CSSIndex;
  private importParser: ImportParser;

  constructor(cssIndex: CSSIndex) {
    this.cssIndex = cssIndex;
    this.importParser = new ImportParser();
  }

  /**
   * Provides hover information for CSS class names.
   * 
   * @param document - VS Code document
   * @param position - Cursor position
   * @param token - Cancellation token
   * @returns Hover information or undefined
   */
  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken
  ): Promise<vscode.Hover | undefined> {
    try {
      Logger.debug(`Hover requested at line ${position.line + 1}, character ${position.character}`);
      
      // Check if we're in a styleName attribute
      if (!this.isInStyleNameAttribute(document, position)) {
        Logger.debug('Not in styleName attribute, skipping hover');
        return undefined;
      }

      // Get the word at cursor position (CSS class name)
      const wordRange = document.getWordRangeAtPosition(position, /[a-zA-Z_-][a-zA-Z0-9_-]*/);
      if (!wordRange) {
        Logger.debug('No word found at cursor position');
        return undefined;
      }

      const className = document.getText(wordRange);
      Logger.debug(`Hovering over class name: ${className}`);
      
      if (!className || !this.isValidClassName(className)) {
        Logger.debug(`Invalid class name: ${className}`);
        return undefined;
      }

      const componentPath = document.uri.fsPath;
      Logger.debug(`Component path: ${componentPath}`);

      // Parse imports to get CSS file paths
      const imports = this.importParser.parseImports(document);
      Logger.debug(`Found ${imports.length} CSS imports`);
      
      if (imports.length === 0) {
        Logger.debug('No CSS imports found, skipping hover');
        return undefined;
      }

      // Get CSS file paths
      const cssFilePaths = imports.map(imp => imp.resolvedPath);
      Logger.debug(`CSS file paths: ${cssFilePaths.join(', ')}`);

      // Ensure component is indexed
      let componentIndex = this.cssIndex.getComponentIndex(componentPath);
      if (!componentIndex) {
        Logger.debug('Component not indexed, indexing now...');
        // Lazy initialization: index the component
        await this.cssIndex.indexComponent(componentPath, cssFilePaths);
        componentIndex = this.cssIndex.getComponentIndex(componentPath);
      }

      if (!componentIndex) {
        Logger.warn('Failed to get component index after indexing');
        return undefined;
      }

      // Get all CSS class occurrences (base + media queries)
      const allClasses = componentIndex.getAllClasses(className);
      if (allClasses.length === 0) {
        Logger.debug(`CSS class not found: ${className}`);
        return undefined;
      }

      // Create hover content showing all definitions grouped by context
      const hoverContent = this.createHoverContent(allClasses, imports, componentIndex);
      Logger.debug(`Returning hover for class: ${className} with ${allClasses.length} occurrence(s)`);

      return new vscode.Hover(hoverContent, wordRange);
    } catch (error) {
      Logger.error('Error providing hover information', error as Error);
      return undefined;
    }
  }

  /**
   * Checks if cursor position is within a styleName attribute.
   */
  private isInStyleNameAttribute(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position.line);
    const text = line.text;
    const offset = position.character;

    // Look for styleName=" or styleName=' pattern before cursor
    const beforeCursor = text.substring(0, offset);
    const styleNameMatch = beforeCursor.match(/styleName\s*=\s*(["'])/);
    
    if (!styleNameMatch) {
      return false;
    }

    const quoteChar = styleNameMatch[1]; // The quote character used (" or ')
    const quoteStart = styleNameMatch.index! + styleNameMatch[0].length - 1; // Position of the quote
    
    // Check if cursor is after the opening quote
    if (offset <= quoteStart) {
      return false;
    }

    // Check if there's a closing quote before the cursor
    const afterQuote = text.substring(quoteStart + 1, offset);
    const closingQuoteIndex = afterQuote.indexOf(quoteChar);
    
    // If there's a closing quote before cursor, we're not in the attribute value
    if (closingQuoteIndex >= 0) {
      return false;
    }

    // Check if there's a closing quote after cursor (for complete attributes)
    const afterCursor = text.substring(offset);
    const nextQuoteIndex = afterCursor.indexOf(quoteChar);
    
    // If there's a closing quote after cursor, we're in a complete attribute
    // If there's no closing quote, we're still typing (incomplete attribute) - still valid for hover
    return true;
  }

  /**
   * Validates a CSS class name.
   */
  private isValidClassName(className: string): boolean {
    // CSS class names must match: [a-zA-Z_-][a-zA-Z0-9_-]*
    return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(className);
  }

  /**
   * Creates hover content showing only CSS properties without file paths, labels, or metadata.
   * Per FR-001 and FR-002: Shows only CSS properties in code blocks, maintaining property ordering.
   */
  private createHoverContent(allClasses: any[], imports: any[], componentIndex: any): vscode.MarkdownString {
    if (allClasses.length === 0) {
      return new vscode.MarkdownString();
    }

    const firstClass = allClasses[0];
    
    // Get the CSS file content from the component index to detect media query context
    const cssFileContent = this.getCSSFileContent(firstClass, componentIndex);
    
    const markdown = new vscode.MarkdownString();
    
    if (allClasses.length === 1) {
      // Single definition - show with media query context if applicable
      const mediaQueryContext = cssFileContent ? this.findMediaQueryContext(cssFileContent, firstClass.lineNumber) : null;
      if (mediaQueryContext) {
        markdown.appendCodeblock(`${mediaQueryContext} {\n  ${firstClass.fullDefinition}\n}`, 'css');
      } else {
        markdown.appendCodeblock(firstClass.fullDefinition, 'css');
      }
    } else {
      // Multiple definitions - show all, base first, without labels
      // Sort occurrences: base definitions first (no media query), then media query variants
      const sortedClasses = [...allClasses].sort((a, b) => {
        const aHasMediaQuery = cssFileContent ? this.findMediaQueryContext(cssFileContent, a.lineNumber) !== null : false;
        const bHasMediaQuery = cssFileContent ? this.findMediaQueryContext(cssFileContent, b.lineNumber) !== null : false;
        
        // Base definitions (no media query) come first
        if (!aHasMediaQuery && bHasMediaQuery) return -1;
        if (aHasMediaQuery && !bHasMediaQuery) return 1;
        return 0; // Keep original order for same type
      });
      
      for (let i = 0; i < sortedClasses.length; i++) {
        const cssClass = sortedClasses[i];
        const mediaQueryContext = cssFileContent ? this.findMediaQueryContext(cssFileContent, cssClass.lineNumber) : null;
        
        if (i > 0) {
          markdown.appendMarkdown('\n\n');
        }
        
        if (mediaQueryContext) {
          markdown.appendCodeblock(`${mediaQueryContext} {\n  ${cssClass.fullDefinition}\n}`, 'css');
        } else {
          markdown.appendCodeblock(cssClass.fullDefinition, 'css');
        }
      }
    }
    
    return markdown;
  }

  /**
   * Gets the CSS file content for a class to detect media query context.
   * Uses cached rawContent from CSSFile if available.
   */
  private getCSSFileContent(cssClass: any, componentIndex: any): string | null {
    try {
      // Try to get rawContent from CSSFile cache
      for (const cssFile of componentIndex.cssFiles.values()) {
        if (cssFile.filePath === cssClass.sourceFile && cssFile.rawContent) {
          return cssFile.rawContent;
        }
      }
      
      // Fallback: read from file system
      if (fs.existsSync(cssClass.sourceFile)) {
        return fs.readFileSync(cssClass.sourceFile, 'utf-8');
      }
    } catch (error) {
      Logger.debug(`Failed to get CSS file content for media query detection: ${error}`);
    }
    return null;
  }

  /**
   * Enriches class definitions with media query context when applicable.
   * Returns definitions with @media blocks included when the class is inside a media query.
   */
  private enrichDefinitionsWithMediaQueryContext(allClasses: any[], cssFileContent: string | null): string[] {
    if (!cssFileContent) {
      // Fallback: return definitions as-is
      return allClasses.map(cls => cls.fullDefinition);
    }

    const enriched: string[] = [];
    
    for (const cssClass of allClasses) {
      // Check if this definition is inside a media query by looking backwards from the class
      const mediaQueryContext = this.findMediaQueryContext(cssFileContent, cssClass.lineNumber);
      
      if (mediaQueryContext) {
        // Include the media query block with the class definition
        enriched.push(`${mediaQueryContext}\n${cssClass.fullDefinition}`);
      } else {
        // Base definition (not in media query)
        enriched.push(cssClass.fullDefinition);
      }
    }
    
    return enriched;
  }

  /**
   * Finds the @media block that contains a class definition at the given line number.
   * Returns the complete @media declaration (including multi-line) if found, null otherwise.
   */
  private findMediaQueryContext(cssContent: string, lineNumber: number): string | null {
    const lines = cssContent.split('\n');
    if (lineNumber < 1 || lineNumber > lines.length) {
      return null;
    }

    // Look backwards from the class definition line to find the nearest @media block
    let mediaQueryStart = -1;
    let braceCount = 0;
    let inMediaQuery = false;
    
    // Start from the line before the class definition and go backwards
    for (let i = lineNumber - 2; i >= 0; i--) {
      const line = lines[i];
      
      // Check if this line contains @media
      if (line.includes('@media')) {
        mediaQueryStart = i;
        inMediaQuery = true;
        // Check if opening brace is on the same line
        if (line.includes('{')) {
          braceCount = 1;
          break;
        }
        // Otherwise, we'll collect lines until we find the opening brace
        break;
      }
      
      // Count braces to see if we're inside a media query
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
      
      if (braceCount > 0) {
        inMediaQuery = true;
      } else if (inMediaQuery && braceCount === 0) {
        // We've exited the media query, stop looking
        break;
      }
    }
    
    if (mediaQueryStart >= 0) {
      // Collect all lines from @media until we find the opening brace
      const mediaQueryLines: string[] = [];
      let foundOpeningBrace = false;
      
      for (let i = mediaQueryStart; i < lines.length && i < lineNumber; i++) {
        const line = lines[i];
        mediaQueryLines.push(line);
        
        // Check if this line contains the opening brace
        if (line.includes('{')) {
          foundOpeningBrace = true;
          break;
        }
      }
      
      if (foundOpeningBrace) {
        // Join all lines and extract the media query part (everything before the opening brace)
        const fullMediaQuery = mediaQueryLines.join('\n');
        const braceIndex = fullMediaQuery.indexOf('{');
        if (braceIndex >= 0) {
          return fullMediaQuery.substring(0, braceIndex).trim();
        }
      }
    }
    
    return null;
  }
}

