/**
 * Represents a CSS import statement in a component file.
 */
export class ImportStatement {
  /**
   * Import path as written (e.g., './styles.css').
   */
  readonly importPath: string;

  /**
   * Absolute resolved file path.
   */
  readonly resolvedPath: string;

  /**
   * Path to component file containing the import.
   */
  readonly componentPath: string;

  /**
   * Line number of import statement (1-based).
   */
  readonly lineNumber: number;

  /**
   * Creates a new ImportStatement instance.
   * 
   * @param importPath - Import path as written (e.g., './styles.css')
   * @param resolvedPath - Absolute resolved file path
   * @param componentPath - Path to component file containing the import
   * @param lineNumber - Line number of import statement (1-based)
   */
  constructor(
    importPath: string,
    resolvedPath: string,
    componentPath: string,
    lineNumber: number
  ) {
    // Validate import path is relative and starts with ./
    if (!importPath || !importPath.startsWith('./')) {
      throw new Error(`Invalid import path (must start with ./): ${importPath}`);
    }

    // Validate resolved path is absolute
    if (!resolvedPath || !this.isAbsolute(resolvedPath)) {
      throw new Error(`Invalid resolved path (must be absolute): ${resolvedPath}`);
    }

    // Validate component path is absolute
    if (!componentPath || !this.isAbsolute(componentPath)) {
      throw new Error(`Invalid component path (must be absolute): ${componentPath}`);
    }

    if (lineNumber < 1) {
      throw new Error(`Invalid line number: ${lineNumber}`);
    }

    this.importPath = importPath;
    this.resolvedPath = resolvedPath;
    this.componentPath = componentPath;
    this.lineNumber = lineNumber;
  }

  /**
   * Checks if a path is absolute.
   */
  private isAbsolute(filePath: string): boolean {
    // Simple check: absolute paths start with / on Unix or have drive letter on Windows
    return filePath.startsWith('/') || /^[A-Za-z]:/.test(filePath);
  }

  /**
   * Creates a copy of this ImportStatement.
   */
  clone(): ImportStatement {
    return new ImportStatement(
      this.importPath,
      this.resolvedPath,
      this.componentPath,
      this.lineNumber
    );
  }
}

