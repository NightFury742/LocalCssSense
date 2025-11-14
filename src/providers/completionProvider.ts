import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { CSSIndex } from '../services/cssIndex';
import { ImportParser } from '../services/importParser';
import { Logger } from '../utils/logger';

/**
 * Completion Provider for CSS class names in styleName prop.
 * Provides autocomplete suggestions when user types styleName="
 */
export class CompletionProvider implements vscode.CompletionItemProvider {
  private cssIndex: CSSIndex;
  private importParser: ImportParser;

  constructor(cssIndex: CSSIndex) {
    this.cssIndex = cssIndex;
    this.importParser = new ImportParser();
  }

  /**
   * Resolves additional information for a completion item.
   * Called when user navigates through completion items (up/down arrows).
   * Shows all definitions (base + media queries) with proper labeling matching hover format.
   * Per FR-018: Details panel displays all definitions with proper labeling.
   * 
   * @param item - Completion item to resolve
   * @param token - Cancellation token
   * @returns Resolved completion item with full documentation
   */
  async resolveCompletionItem(
    item: vscode.CompletionItem,
    token: vscode.CancellationToken
  ): Promise<vscode.CompletionItem> {
    try {
      // Get component path, class name, and all occurrences from item data
      const itemData = (item as any).data as { 
        componentPath?: string; 
        className?: string; 
        allOccurrences?: any[] 
      } | undefined;
      
      const className = itemData?.className || (typeof item.label === 'string' ? item.label : item.label.label);
      
      if (!className || !itemData?.componentPath) {
        return item;
      }

      const componentIndex = this.cssIndex.getComponentIndex(itemData.componentPath);
      if (!componentIndex) {
        return item;
      }

      // Get all occurrences (either from stored data or from component index)
      const allOccurrences = itemData.allOccurrences || componentIndex.getAllClasses(className);
      
      if (allOccurrences.length === 0) {
        return item;
      }

      // Get CSS file content for media query detection
      // Collect all unique source files from occurrences
      const sourceFiles = new Set<string>();
      for (const occurrence of allOccurrences) {
        sourceFiles.add(occurrence.sourceFile);
      }
      
      const cssFileContents = new Map<string, string>();
      // First, try to get from cached CSS files
      // Use normalized paths as keys to ensure consistent matching
      for (const cssFile of componentIndex.cssFiles.values()) {
        if (cssFile.rawContent) {
          const normalizedPath = path.normalize(cssFile.filePath);
          cssFileContents.set(normalizedPath, cssFile.rawContent);
        }
      }
      
      // Fallback: read from file system for any missing files
      // Also normalize source file paths for consistent matching
      for (const sourceFile of sourceFiles) {
        const normalizedSourceFile = path.normalize(sourceFile);
        if (!cssFileContents.has(normalizedSourceFile)) {
          const content = this.getCSSFileContent(sourceFile);
          if (content) {
            cssFileContents.set(normalizedSourceFile, content);
          }
        }
      }

      // Create documentation showing all definitions with proper labeling
      // Format matches hover provider for consistency
      const documentation = this.createCompletionDocumentation(
        className,
        allOccurrences,
        cssFileContents
      );

      if (documentation) {
        const markdownDoc = new vscode.MarkdownString(documentation);
        markdownDoc.isTrusted = true;
        item.documentation = markdownDoc;
      }

      // Ensure detail is set (source file only, no context indication)
      const firstOccurrence = allOccurrences[0];
      const relativePath = vscode.workspace.asRelativePath(firstOccurrence.sourceFile);
      item.detail = `from ${relativePath}`;
      
      return item;
    } catch (error) {
      Logger.error('Error resolving completion item', error as Error);
      return item;
    }
  }

  /**
   * Provides completion items for CSS class names.
   * 
   * @param document - VS Code document
   * @param position - Cursor position
   * @param token - Cancellation token
   * @param context - Completion context
   * @returns Completion items or undefined
   */
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionItem[] | vscode.CompletionList | undefined> {
    try {
      Logger.debug(`Completion requested at line ${position.line + 1}, character ${position.character}`);
      
      // Check if we're in a styleName attribute
      if (!this.isInStyleNameAttribute(document, position)) {
        Logger.debug('Not in styleName attribute, skipping completion');
        return undefined;
      }

      const componentPath = document.uri.fsPath;
      Logger.debug(`Component path: ${componentPath}`);

      // Parse imports to get CSS file paths
      const imports = this.importParser.parseImports(document);
      Logger.debug(`Found ${imports.length} CSS imports`);
      
      if (imports.length === 0) {
        Logger.debug('No CSS imports found, skipping completion');
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

      // Get existing classes in the styleName attribute (to filter them out)
      const existingClasses = this.getExistingClasses(document, position);
      Logger.debug(`Existing classes in styleName: ${existingClasses.join(', ')}`);

      // Create completion items for each CSS class occurrence (base + media queries)
      const completionItems: vscode.CompletionItem[] = [];
      const classNames = componentIndex.getClassNames();
      Logger.debug(`Found ${classNames.length} CSS classes`);

      // Use a Set to ensure we only create one completion item per class name
      // This prevents VS Code from adding suffixes like "(base)" or "(2)"
      const addedClassNames = new Set<string>();

      // Get CSS file content for media query detection
      const cssFileContents = new Map<string, string>();
      // First, try to get from cached CSS files
      // Use normalized paths as keys to ensure consistent matching
      for (const cssFile of componentIndex.cssFiles.values()) {
        if (cssFile.rawContent) {
          const normalizedPath = path.normalize(cssFile.filePath);
          cssFileContents.set(normalizedPath, cssFile.rawContent);
        }
      }

      for (const className of classNames) {
        // Skip if we've already added this class name (defensive check)
        if (addedClassNames.has(className)) {
          Logger.debug(`Skipping duplicate class name: ${className}`);
          continue;
        }

        // Get all occurrences of this class (base + media queries)
        const allOccurrences = componentIndex.getAllClasses(className);
        if (allOccurrences.length === 0) {
          continue;
        }

        // Validate CSS class name
        if (!this.isValidClassName(className)) {
          continue;
        }

        // Skip classes that are already in the styleName attribute
        if (existingClasses.includes(className)) {
          Logger.debug(`Skipping already used class: ${className}`);
          continue;
        }

        // Ensure we have CSS file content for all source files (with fallback)
        // Normalize paths for consistent matching
        for (const occurrence of allOccurrences) {
          const normalizedSourceFile = path.normalize(occurrence.sourceFile);
          if (!cssFileContents.has(normalizedSourceFile)) {
            const content = this.getCSSFileContent(occurrence.sourceFile);
            if (content) {
              cssFileContents.set(normalizedSourceFile, content);
            }
          }
        }

        // Find the base instance (the one without media query context)
        // Only show base instances in completion menu, not media query-only instances
        let baseInstance: any = null;
        for (const occurrence of allOccurrences) {
          const normalizedSourceFile = path.normalize(occurrence.sourceFile);
          const cssFileContent = cssFileContents.get(normalizedSourceFile) || null;
          const mediaQueryContext = this.findMediaQueryContext(cssFileContent, occurrence.lineNumber);
          if (!mediaQueryContext) {
            // This is a base instance (not in a media query)
            baseInstance = occurrence;
            break;
          }
        }

        // Skip if no base instance found (class only exists in media queries)
        if (!baseInstance) {
          Logger.debug(`Skipping class ${className} - no base instance found (only media queries)`);
          continue;
        }

        // Create only ONE completion item per class name (plain class name, no label)
        // Show only base instances in completion menu
        const relativePath = vscode.workspace.asRelativePath(baseInstance.sourceFile);

        const completionItem = new vscode.CompletionItem(
          className, // Plain class name only - no label, just the class name
          vscode.CompletionItemKind.Class
        );

        // Keep label as plain string - VS Code will only add suffixes if it detects duplicates
        // Our Set-based deduplication ensures we only create one item per class name

        // Set detail (source file only)
        completionItem.detail = `from ${relativePath}`;

        // Set insert text - just the class name (no extra space)
        completionItem.insertText = className;

        // Set range to replace (from opening quote to cursor)
        const range = this.getCompletionRange(document, position);
        completionItem.range = range;

        // Store component path, class name, and all occurrences for resolveCompletionItem
        // This allows resolveCompletionItem to show all definitions in the details panel
        (completionItem as any).data = {
          componentPath: componentPath,
          className: className,
          allOccurrences: allOccurrences // Store all occurrences for details panel
        };

        completionItems.push(completionItem);
        addedClassNames.add(className); // Mark as added
      }

      Logger.debug(`Returning ${completionItems.length} completion items`);
      // Return as CompletionList to ensure proper handling by VS Code
      return new vscode.CompletionList(completionItems, false);
    } catch (error) {
      Logger.error('Error providing completion items', error as Error);
      return undefined;
    }
  }

  /**
   * Checks if cursor position is within a styleName attribute.
   * Supports multiple classes separated by spaces.
   */
  private isInStyleNameAttribute(document: vscode.TextDocument, position: vscode.Position): boolean {
    const line = document.lineAt(position.line);
    const text = line.text;
    const offset = position.character;

    // Look for styleName=" or styleName=' pattern before cursor
    const beforeCursor = text.substring(0, offset);
    const styleNameMatch = beforeCursor.match(/styleName\s*=\s*(["'])/);
    
    if (!styleNameMatch) {
      Logger.debug(`No styleName attribute found at line ${position.line + 1}, offset ${offset}`);
      return false;
    }

    const quoteChar = styleNameMatch[1]; // The quote character used (" or ')
    const quoteStart = styleNameMatch.index! + styleNameMatch[0].length - 1; // Position of the quote
    
    // Check if cursor is after the opening quote
    if (offset <= quoteStart) {
      Logger.debug(`Cursor is before or at opening quote at line ${position.line + 1}`);
      return false;
    }

    // Check if there's a closing quote before the cursor
    const afterQuote = text.substring(quoteStart + 1, offset);
    const closingQuoteIndex = afterQuote.indexOf(quoteChar);
    
    // If there's a closing quote before cursor, we're not in the attribute value
    if (closingQuoteIndex >= 0) {
      Logger.debug(`Found closing quote before cursor at line ${position.line + 1}`);
      return false;
    }

    Logger.debug(`Cursor is in styleName attribute at line ${position.line + 1}, offset ${offset}`);
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
   * Gets existing classes already present in the styleName attribute.
   * Used to filter out already-used classes from completion suggestions.
   * 
   * @param document - VS Code document
   * @param position - Cursor position
   * @returns Array of class names already in the attribute
   */
  private getExistingClasses(document: vscode.TextDocument, position: vscode.Position): string[] {
    const line = document.lineAt(position.line);
    const text = line.text;
    const offset = position.character;

    // Find the opening quote after styleName=
    const beforeCursor = text.substring(0, offset);
    const styleNameMatch = beforeCursor.match(/styleName\s*=\s*(["'])/);
    
    if (!styleNameMatch) {
      return [];
    }

    const quoteChar = styleNameMatch[1];
    const quoteStart = styleNameMatch.index! + styleNameMatch[0].length - 1; // Position of the quote
    
    // Get text between opening quote and cursor
    const attributeValue = beforeCursor.substring(quoteStart + 1);
    
    // Split by spaces to get individual classes
    const classes = attributeValue
      .split(/\s+/)
      .map(cls => cls.trim())
      .filter(cls => cls.length > 0 && this.isValidClassName(cls));
    
    return classes;
  }

  /**
   * Creates completion documentation showing only CSS properties without file paths, labels, or metadata.
   * Format matches hover provider for consistency (base definition first, then media queries).
   * Per FR-003 and FR-004: Details panel displays only CSS properties without file paths or labels.
   * 
   * @param className - CSS class name
   * @param allOccurrences - All occurrences of the class (base + media queries)
   * @param cssFileContents - Map of CSS file paths to their raw content
   * @returns Markdown string with all definitions formatted
   */
  private createCompletionDocumentation(
    className: string,
    allOccurrences: any[],
    cssFileContents: Map<string, string>
  ): string {
    if (allOccurrences.length === 0) {
      return '';
    }

    let documentation = '';

    if (allOccurrences.length === 1) {
      // Single definition - show with media query context if applicable
      const cssClass = allOccurrences[0];
      if (!cssClass.fullDefinition) {
        // Fallback: show empty definition if fullDefinition is missing
        documentation += `\`\`\`css\n.${cssClass.name} {\n}\n\`\`\``;
      } else {
        const normalizedSourceFile = path.normalize(cssClass.sourceFile);
        const cssFileContent = cssFileContents.get(normalizedSourceFile) || null;
        const mediaQueryContext = cssFileContent ? this.findMediaQueryContext(cssFileContent, cssClass.lineNumber) : null;
        
        if (mediaQueryContext) {
          documentation += `\`\`\`css\n${mediaQueryContext} {\n  ${cssClass.fullDefinition}\n}\n\`\`\``;
        } else {
          documentation += `\`\`\`css\n${cssClass.fullDefinition}\n\`\`\``;
        }
      }
    } else {
      // Multiple definitions - show all, base first, without labels
      // Sort occurrences: base definitions first (no media query), then media query variants
      const sortedOccurrences = [...allOccurrences].sort((a, b) => {
        const aNormalizedPath = path.normalize(a.sourceFile);
        const bNormalizedPath = path.normalize(b.sourceFile);
        const aContent = cssFileContents.get(aNormalizedPath) || null;
        const bContent = cssFileContents.get(bNormalizedPath) || null;
        const aHasMediaQuery = this.findMediaQueryContext(aContent, a.lineNumber) !== null;
        const bHasMediaQuery = this.findMediaQueryContext(bContent, b.lineNumber) !== null;
        
        // Base definitions (no media query) come first
        if (!aHasMediaQuery && bHasMediaQuery) return -1;
        if (aHasMediaQuery && !bHasMediaQuery) return 1;
        return 0; // Keep original order for same type
      });
      
      for (let i = 0; i < sortedOccurrences.length; i++) {
        const cssClass = sortedOccurrences[i];
        
        if (i > 0) {
          documentation += '\n\n';
        }
        
        if (!cssClass.fullDefinition) {
          // Fallback: show empty definition if fullDefinition is missing
          documentation += `\`\`\`css\n.${cssClass.name} {\n}\n\`\`\``;
        } else {
          const normalizedSourceFile = path.normalize(cssClass.sourceFile);
          const cssFileContent = cssFileContents.get(normalizedSourceFile) || null;
          const mediaQueryContext = cssFileContent ? this.findMediaQueryContext(cssFileContent, cssClass.lineNumber) : null;
          
          if (mediaQueryContext) {
            documentation += `\`\`\`css\n${mediaQueryContext} {\n  ${cssClass.fullDefinition}\n}\n\`\`\``;
          } else {
            documentation += `\`\`\`css\n${cssClass.fullDefinition}\n\`\`\``;
          }
        }
      }
    }
    
    return documentation;
  }

  /**
   * Finds the @media block that contains a class definition at the given line number.
   * Returns the complete @media declaration (including multi-line) if found, null otherwise.
   */
  private findMediaQueryContext(cssContent: string | null, lineNumber: number): string | null {
    if (!cssContent) {
      return null;
    }

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

  /**
   * Gets the CSS file content for a file path.
   * Reads from file system as fallback when cached content is not available.
   * 
   * @param filePath - Absolute path to CSS file
   * @returns CSS file content or null if file cannot be read
   */
  private getCSSFileContent(filePath: string): string | null {
    try {
      // Read from file system (fallback when cached content is not available)
      if (fs.existsSync(filePath)) {
        return fs.readFileSync(filePath, 'utf-8');
      }
    } catch (error) {
      Logger.debug(`Failed to get CSS file content for ${filePath}: ${error}`);
    }
    return null;
  }

  /**
   * Gets the text range for completion replacement.
   * Supports multiple classes by only replacing the current word being typed.
   */
  private getCompletionRange(document: vscode.TextDocument, position: vscode.Position): vscode.Range {
    const line = document.lineAt(position.line);
    const text = line.text;
    const offset = position.character;

    // Find the opening quote after styleName=
    const beforeCursor = text.substring(0, offset);
    const styleNameMatch = beforeCursor.match(/styleName\s*=\s*(["'])/);
    
    if (!styleNameMatch) {
      // Fallback: replace from cursor position
      return new vscode.Range(position, position);
    }

    const quoteChar = styleNameMatch[1];
    const quoteStart = styleNameMatch.index! + styleNameMatch[0].length - 1; // Position of the quote
    
    // Find the start of the current word (backtrack to find word boundary or space)
    // Look backwards from cursor to find the start of current word
    let wordStart = quoteStart + 1; // Start after opening quote
    
    // Check if there are any classes before the cursor (look for space-separated classes)
    const textAfterQuote = beforeCursor.substring(quoteStart + 1);
    const lastSpaceIndex = textAfterQuote.lastIndexOf(' ');
    
    if (lastSpaceIndex >= 0) {
      // There's a space before cursor, so we're typing a new class
      // Word starts after the last space
      wordStart = quoteStart + 1 + lastSpaceIndex + 1;
    }
    // Otherwise, wordStart is right after the quote (typing first class)
    
    // Find end of current word (next space or closing quote)
    let wordEnd = offset;
    const afterCursor = text.substring(offset);
    const nextQuote = afterCursor.indexOf(quoteChar);
    const nextSpace = afterCursor.indexOf(' ');
    
    // End is the minimum of next space or next quote (if they exist)
    if (nextSpace >= 0 && (nextQuote < 0 || nextSpace < nextQuote)) {
      wordEnd = offset + nextSpace;
    } else if (nextQuote >= 0) {
      wordEnd = offset + nextQuote;
    }
    // Otherwise, wordEnd stays at offset (end of current word)

    return new vscode.Range(
      new vscode.Position(position.line, wordStart),
      new vscode.Position(position.line, wordEnd)
    );
  }
}

