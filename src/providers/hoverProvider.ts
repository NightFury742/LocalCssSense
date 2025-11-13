import * as vscode from 'vscode';
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

      // Get CSS class definition
      const cssClass = componentIndex.getClass(className);
      if (!cssClass) {
        Logger.debug(`CSS class not found: ${className}`);
        return undefined;
      }

      // Create hover content
      const hoverContent = this.createHoverContent(cssClass, imports);
      Logger.debug(`Returning hover for class: ${className}`);

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
   * Creates hover content showing CSS definition.
   */
  private createHoverContent(cssClass: any, imports: any[]): vscode.MarkdownString {
    // Find source file relative path
    const sourceImport = imports.find(imp => imp.resolvedPath === cssClass.sourceFile);
    const relativePath = sourceImport 
      ? sourceImport.importPath 
      : vscode.workspace.asRelativePath(cssClass.sourceFile);

    // Format CSS definition
    const markdown = new vscode.MarkdownString();
    markdown.appendMarkdown(`**${cssClass.name}** (from ${relativePath})\n\n`);
    markdown.appendCodeblock(cssClass.fullDefinition, 'css');
    
    return markdown;
  }
}

