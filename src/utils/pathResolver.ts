import * as path from 'path';
import * as fs from 'fs';

/**
 * Path resolver utility for resolving relative CSS import paths.
 * Supports same-directory imports (./filename.css) for P1.
 */
export class PathResolver {
  /**
   * Resolves a relative CSS import path to an absolute file path.
   * 
   * @param importPath - Import path as written (e.g., './styles.css')
   * @param componentPath - Absolute path to the component file containing the import
   * @returns Absolute file path or null if invalid
   * 
   * @remarks
   * For P1, only supports same-directory imports (./filename.css).
   * Parent directory imports (../) and path aliases (@/, ~) return null.
   */
  static resolveImportPath(importPath: string, componentPath: string): string | null {
    // Validate input
    if (!importPath || !componentPath) {
      return null;
    }

    // P1 constraint: Only support same-directory imports starting with ./
    if (!importPath.startsWith('./')) {
      return null;
    }

    // Check for parent directory imports (not supported in P1)
    if (importPath.includes('../')) {
      return null;
    }

    // Check for path aliases (not supported in P1)
    if (importPath.startsWith('@/') || importPath.startsWith('~')) {
      return null;
    }

    // Extract filename from import path (remove ./ prefix)
    const filename = importPath.substring(2);
    
    // Get directory of component file
    const componentDir = path.dirname(componentPath);
    
    // Resolve absolute path
    const resolvedPath = path.resolve(componentDir, filename);
    
    // Normalize path separators
    const normalizedPath = path.normalize(resolvedPath);
    
    // Verify file exists
    if (!fs.existsSync(normalizedPath)) {
      return null;
    }

    return normalizedPath;
  }

  /**
   * Checks if a path is absolute.
   */
  static isAbsolute(filePath: string): boolean {
    return path.isAbsolute(filePath);
  }

  /**
   * Normalizes a file path.
   */
  static normalize(filePath: string): string {
    return path.normalize(filePath);
  }
}

