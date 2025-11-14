import * as vscode from 'vscode';
import { CSSIndex } from '../services/cssIndex';
import { ImportParser } from '../services/importParser';
import { Logger } from '../utils/logger';

/**
 * Diagnostic Provider for CSS class names in styleName prop.
 * Shows VS Code diagnostics with Information severity for invalid CSS class names.
 */
export class DiagnosticProvider {
  private cssIndex: CSSIndex;
  private importParser: ImportParser;
  private diagnosticCollection: vscode.DiagnosticCollection;

  constructor(cssIndex: CSSIndex, diagnosticCollection: vscode.DiagnosticCollection) {
    this.cssIndex = cssIndex;
    this.importParser = new ImportParser();
    this.diagnosticCollection = diagnosticCollection;
  }

  /**
   * Updates diagnostics for a document.
   * Scans styleName attributes and validates CSS class names.
   * 
   * @param document - VS Code document to analyze
   */
  async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
    try {
      const diagnostics: vscode.Diagnostic[] = [];

      // Only process React/Next.js files
      if (!['typescriptreact', 'javascriptreact', 'typescript', 'javascript'].includes(document.languageId)) {
        this.diagnosticCollection.set(document.uri, []);
        return;
      }

      const componentPath = document.uri.fsPath;
      
      // Parse imports to get CSS file paths
      const imports = this.importParser.parseImports(document);
      if (imports.length === 0) {
        // No CSS imports, clear diagnostics
        this.diagnosticCollection.set(document.uri, []);
        return;
      }

      // Get CSS file paths
      const cssFilePaths = imports.map(imp => imp.resolvedPath);

      // Ensure component is indexed
      let componentIndex = this.cssIndex.getComponentIndex(componentPath);
      if (!componentIndex) {
        // Lazy initialization: index the component
        await this.cssIndex.indexComponent(componentPath, cssFilePaths);
        componentIndex = this.cssIndex.getComponentIndex(componentPath);
      }

      if (!componentIndex) {
        // Failed to index, clear diagnostics
        this.diagnosticCollection.set(document.uri, []);
        return;
      }

      // Scan document for styleName attributes
      const text = document.getText();
      const lines = text.split('\n');

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const styleNameMatches = this.findStyleNameAttributes(line);

        for (const match of styleNameMatches) {
          // Extract class names from styleName attribute value with their positions
          const classNameMatches = this.extractClassNamesWithPositions(match.value, match.startIndex);
          
          for (const classNameMatch of classNameMatches) {
            const className = classNameMatch.name;
            
            // Validate class name format
            if (!this.isValidClassName(className)) {
              continue; // Skip invalid format
            }

            // Check if class exists in imported CSS files
            if (!componentIndex.hasClass(className)) {
              // Use the exact position from the match
              const range = new vscode.Range(
                new vscode.Position(lineIndex, classNameMatch.startPos),
                new vscode.Position(lineIndex, classNameMatch.endPos)
              );

              const diagnostic = new vscode.Diagnostic(
                range,
                `CSS class "${className}" not found in imported CSS files`,
                vscode.DiagnosticSeverity.Information
              );
              
              diagnostic.source = 'localCssSense';
              diagnostics.push(diagnostic);
            }
          }
        }
      }

      // Set diagnostics for this document
      this.diagnosticCollection.set(document.uri, diagnostics);
      
      if (diagnostics.length > 0) {
        Logger.debug(`Found ${diagnostics.length} invalid CSS class name(s) in ${componentPath}`);
      }
    } catch (error) {
      Logger.error('Error updating diagnostics', error as Error);
      // Clear diagnostics on error
      this.diagnosticCollection.set(document.uri, []);
    }
  }

  /**
   * Finds all styleName attributes in a line of text.
   * 
   * @param line - Line of text to scan
   * @returns Array of matches with value and start index
   */
  private findStyleNameAttributes(line: string): Array<{ value: string; startIndex: number }> {
    const matches: Array<{ value: string; startIndex: number }> = [];
    const regex = /styleName\s*=\s*(["'])([^"']*)\1/g;
    
    let match;
    while ((match = regex.exec(line)) !== null) {
      // Find the position where the value starts (after the opening quote)
      const quoteStart = match.index + match[0].indexOf(match[1]);
      const valueStartIndex = quoteStart + 1; // After opening quote
      
      matches.push({
        value: match[2], // The attribute value (without quotes)
        startIndex: valueStartIndex // Start of value within line (after opening quote)
      });
    }
    
    return matches;
  }

  /**
   * Extracts CSS class names from a styleName attribute value.
   * Supports multiple space-separated classes.
   * 
   * @param value - Attribute value string
   * @returns Array of class names
   */
  private extractClassNames(value: string): string[] {
    return value
      .split(/\s+/)
      .map(cls => cls.trim())
      .filter(cls => cls.length > 0);
  }

  /**
   * Extracts CSS class names from a styleName attribute value with their positions.
   * Supports multiple space-separated classes and returns exact positions for diagnostics.
   * 
   * @param value - Attribute value string (without quotes)
   * @param valueStartIndex - Start index of the value within the line (after opening quote)
   * @returns Array of class name matches with positions
   */
  private extractClassNamesWithPositions(value: string, valueStartIndex: number): Array<{ name: string; startPos: number; endPos: number }> {
    const matches: Array<{ name: string; startPos: number; endPos: number }> = [];
    
    // Split by whitespace and track positions
    let currentPos = 0;
    const parts = value.split(/(\s+)/); // Split but keep separators
    
    for (const part of parts) {
      if (part.trim().length === 0) {
        // Whitespace - advance position
        currentPos += part.length;
        continue;
      }
      
      // This is a class name
      const className = part.trim();
      if (className.length > 0 && this.isValidClassName(className)) {
        // Find the exact start position of this class name in the value
        const classStartInValue = value.indexOf(className, currentPos);
        if (classStartInValue >= 0) {
          matches.push({
            name: className,
            startPos: valueStartIndex + classStartInValue,
            endPos: valueStartIndex + classStartInValue + className.length
          });
          currentPos = classStartInValue + className.length;
        } else {
          // Fallback: use current position
          matches.push({
            name: className,
            startPos: valueStartIndex + currentPos,
            endPos: valueStartIndex + currentPos + className.length
          });
          currentPos += part.length;
        }
      } else {
        // Invalid class name or whitespace - just advance position
        currentPos += part.length;
      }
    }
    
    return matches;
  }

  /**
   * Validates a CSS class name format.
   */
  private isValidClassName(className: string): boolean {
    // CSS class names must match: [a-zA-Z_-][a-zA-Z0-9_-]*
    return /^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(className);
  }

  /**
   * Clears diagnostics for a document.
   * 
   * @param uri - Document URI
   */
  clearDiagnostics(uri: vscode.Uri): void {
    this.diagnosticCollection.delete(uri);
  }
}

