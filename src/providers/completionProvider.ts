import * as vscode from 'vscode';
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
   * Ensures class declaration is shown in the details panel.
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
      // Get component path and class name from item data
      const itemData = (item as any).data as { componentPath?: string; className?: string } | undefined;
      const className = itemData?.className || (typeof item.label === 'string' ? item.label : item.label.label);
      
      if (!className) {
        return item;
      }

      // Always try to get the CSS class to ensure documentation is set
      // This is called when user scrolls through completion items
      if (itemData?.componentPath) {
        const componentIndex = this.cssIndex.getComponentIndex(itemData.componentPath);
        if (componentIndex) {
          const cssClass = componentIndex.getClass(className);
          if (cssClass) {
            // Set documentation with full CSS definition
            // This will be shown in the details panel when scrolling
            const preview = this.getCSSDefinitionPreview(cssClass);
            const markdownDoc = new vscode.MarkdownString(preview);
            markdownDoc.isTrusted = true;
            item.documentation = markdownDoc;
            
            // Ensure detail is set
            const relativePath = vscode.workspace.asRelativePath(cssClass.sourceFile);
            item.detail = `from ${relativePath}`;
            
            return item;
          }
        }
      }
      
      // If we couldn't resolve the CSS class, return item as-is
      // (This shouldn't happen in normal operation)
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

      // Create completion items for each CSS class
      const completionItems: vscode.CompletionItem[] = [];
      const classNames = componentIndex.getClassNames();
      Logger.debug(`Found ${classNames.length} CSS classes`);

      for (const className of classNames) {
        const cssClass = componentIndex.getClass(className);
        if (!cssClass) {
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

        const completionItem = new vscode.CompletionItem(
          className,
          vscode.CompletionItemKind.Class
        );

        // Set detail (source file)
        const relativePath = vscode.workspace.asRelativePath(cssClass.sourceFile);
        completionItem.detail = `from ${relativePath}`;

        // Set insert text - just the class name (no extra space)
        completionItem.insertText = className;

        // Set documentation immediately so it's always shown in the details panel
        // This ensures the CSS class properties are visible when scrolling through items
        const preview = this.getCSSDefinitionPreview(cssClass);
        const markdownDoc = new vscode.MarkdownString(preview);
        markdownDoc.isTrusted = true;
        completionItem.documentation = markdownDoc;

        // Set range to replace (from opening quote to cursor)
        const range = this.getCompletionRange(document, position);
        completionItem.range = range;

        // Store component path and class name in item data for resolveCompletionItem
        // This allows us to resolve documentation even if it wasn't set initially
        // Using type assertion since data property exists in VS Code API but may not be in type definitions
        (completionItem as any).data = {
          componentPath: componentPath,
          className: className
        };

        completionItems.push(completionItem);
      }

      Logger.debug(`Returning ${completionItems.length} completion items`);
      return completionItems;
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
   * Gets a preview of CSS definition for documentation.
   * Shows full class declaration for better visibility when scrolling through dropdown.
   */
  private getCSSDefinitionPreview(cssClass: any): string {
    // Show all properties for complete class declaration
    const properties = Array.from(cssClass.properties.entries()) as Array<[string, string]>;
    const preview = properties.map((entry) => `  ${entry[0]}: ${entry[1]};`).join('\n');
    
    // Include source file and line number for context
    const relativePath = vscode.workspace.asRelativePath(cssClass.sourceFile);
    const sourceInfo = `**Source:** ${relativePath} (line ${cssClass.lineNumber})`;
    
    if (preview) {
      return `${sourceInfo}\n\n\`\`\`css\n.${cssClass.name} {\n${preview}\n}\n\`\`\``;
    }
    
    return `${sourceInfo}\n\n\`\`\`css\n.${cssClass.name} {\n  /* No properties */\n}\n\`\`\``;
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

