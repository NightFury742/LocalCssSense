import * as path from 'path';
import { CSSClass } from './cssClass';

/**
 * Represents a CSS file imported in a component.
 */
export class CSSFile {
  /**
   * Absolute path to the CSS file.
   */
  readonly filePath: string;

  /**
   * Timestamp of last modification (for cache invalidation).
   */
  readonly lastModified: number;

  /**
   * Map of class name → CSSClass object.
   */
  readonly classes: Map<string, CSSClass>;

  /**
   * Raw CSS file content (cached for hover tooltips).
   */
  readonly rawContent: string;

  /**
   * Creates a new CSSFile instance.
   * 
   * @param filePath - Absolute path to the CSS file
   * @param lastModified - Timestamp of last modification
   * @param classes - Map of class name → CSSClass object
   * @param rawContent - Raw CSS file content
   */
  constructor(
    filePath: string,
    lastModified: number,
    classes: Map<string, CSSClass>,
    rawContent: string
  ) {
    // Validate file path is absolute
    if (!filePath || !path.isAbsolute(filePath)) {
      throw new Error(`Invalid file path (must be absolute): ${filePath}`);
    }

    if (lastModified < 0) {
      throw new Error(`Invalid lastModified timestamp: ${lastModified}`);
    }

    this.filePath = filePath;
    this.lastModified = lastModified;
    this.classes = new Map(classes);
    this.rawContent = rawContent;
  }

  /**
   * Gets a CSS class by name.
   * 
   * @param className - CSS class name (without leading dot)
   * @returns CSSClass instance or undefined if not found
   */
  getClass(className: string): CSSClass | undefined {
    return this.classes.get(className);
  }

  /**
   * Checks if the file contains a specific CSS class.
   * 
   * @param className - CSS class name (without leading dot)
   * @returns True if class exists, false otherwise
   */
  hasClass(className: string): boolean {
    return this.classes.has(className);
  }

  /**
   * Gets all CSS class names in this file.
   * 
   * @returns Array of class names
   */
  getClassNames(): string[] {
    return Array.from(this.classes.keys());
  }

  /**
   * Creates a copy of this CSSFile with updated data.
   */
  clone(): CSSFile {
    return new CSSFile(
      this.filePath,
      this.lastModified,
      this.classes,
      this.rawContent
    );
  }
}

