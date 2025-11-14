import * as vscode from 'vscode';
import { ImportStatement } from '../models/importStatement';
import { PathResolver } from '../utils/pathResolver';
import { Logger } from '../utils/logger';

/**
 * Import Parser service for extracting CSS import statements from JSX/TSX component files.
 * Supports same-directory imports (./filename.css) for P1.
 */
export class ImportParser {
  /**
   * Regex pattern for matching CSS import statements.
   * Matches:
   * - Direct imports: import './styles.css' or import "./styles.css"
   * - CSS Modules imports: import styles from './styles.css' or import * as styles from './styles.css'
   * Pattern: /import\s+(?:[\w*{}\s]+\s+from\s+)?['"](\.\/[^'"]+\.css)['"]/g
   */
  private static readonly IMPORT_PATTERN = /import\s+(?:[\w*{}\s]+\s+from\s+)?['"](\.\/[^'"]+\.css)['"]/g;

  /**
   * Extracts CSS import paths from file content.
   * 
   * @param content - File content
   * @param filePath - Component file path
   * @returns Array of ImportStatement instances
   */
  extractImportPaths(content: string, filePath: string): ImportStatement[] {
    const imports: ImportStatement[] = [];
    
    if (!content || !filePath) {
      return imports;
    }

    try {
      const lines = content.split('\n');
      let match;
      
      // Reset regex lastIndex
      ImportParser.IMPORT_PATTERN.lastIndex = 0;
      
      while ((match = ImportParser.IMPORT_PATTERN.exec(content)) !== null) {
        const importPath = match[1];
        
        // Validate import path (must start with ./ and not contain ../)
        if (!importPath.startsWith('./') || importPath.includes('../')) {
          Logger.debug(`Skipping invalid import path: ${importPath}`);
          continue;
        }

        // Check for path aliases (not supported in P1)
        if (importPath.startsWith('@/') || importPath.startsWith('~')) {
          Logger.debug(`Skipping path alias import (not supported in P1): ${importPath}`);
          continue;
        }

        // Resolve import path to absolute path
        const resolvedPath = this.resolveImportPath(importPath, filePath);
        if (!resolvedPath) {
          Logger.warn(`Could not resolve import path: ${importPath} from ${filePath}`);
          continue;
        }

        // Find line number
        let lineNumber = 1;
        let charCount = 0;
        for (let i = 0; i < lines.length; i++) {
          if (charCount + lines[i].length + 1 > match.index) {
            lineNumber = i + 1;
            break;
          }
          charCount += lines[i].length + 1; // +1 for newline
        }

        try {
          const importStatement = new ImportStatement(
            importPath,
            resolvedPath,
            filePath,
            lineNumber
          );
          imports.push(importStatement);
        } catch (error) {
          Logger.warn(`Failed to create ImportStatement for ${importPath}: ${error}`);
        }
      }
    } catch (error) {
      Logger.warn(`Error extracting import paths from ${filePath}: ${error}`);
    }

    return imports;
  }

  /**
   * Resolves relative import path to absolute file path.
   * For P1, only supports same-directory imports (./filename.css).
   * 
   * @param importPath - Import path as written (e.g., './styles.css')
   * @param componentPath - Component file path
   * @returns Absolute file path or null if invalid
   */
  resolveImportPath(importPath: string, componentPath: string): string | null {
    return PathResolver.resolveImportPath(importPath, componentPath);
  }

  /**
   * Parses a VS Code document and extracts CSS import statements.
   * 
   * @param document - VS Code document object
   * @returns Array of ImportStatement instances
   */
  parseImports(document: vscode.TextDocument): ImportStatement[] {
    if (!document) {
      return [];
    }

    const content = document.getText();
    const filePath = document.uri.fsPath;

    return this.extractImportPaths(content, filePath);
  }
}

