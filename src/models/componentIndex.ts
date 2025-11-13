import { CSSFile } from './cssFile';
import { CSSClass } from './cssClass';

/**
 * Represents the index of CSS classes for a component file.
 */
export class ComponentIndex {
  /**
   * Path to component file.
   */
  readonly componentPath: string;

  /**
   * Map of CSS file path → CSSFile.
   */
  readonly cssFiles: Map<string, CSSFile>;

  /**
   * Flattened map of all class names → CSSClass (for quick lookup).
   */
  readonly allClasses: Map<string, CSSClass>;

  /**
   * Creates a new ComponentIndex instance.
   * 
   * @param componentPath - Path to component file
   * @param cssFiles - Map of CSS file path → CSSFile
   */
  constructor(componentPath: string, cssFiles: Map<string, CSSFile> = new Map()) {
    if (!componentPath) {
      throw new Error('Component path is required');
    }

    this.componentPath = componentPath;
    this.cssFiles = new Map(cssFiles);
    
    // Build flattened map of all classes
    this.allClasses = new Map<string, CSSClass>();
    for (const cssFile of cssFiles.values()) {
      for (const [className, cssClass] of cssFile.classes) {
        // If duplicate class name exists, keep the first one (or could merge)
        if (!this.allClasses.has(className)) {
          this.allClasses.set(className, cssClass);
        }
      }
    }
  }

  /**
   * Gets a CSS class by name from any imported CSS file.
   * 
   * @param className - CSS class name (without leading dot)
   * @returns CSSClass instance or undefined if not found
   */
  getClass(className: string): CSSClass | undefined {
    return this.allClasses.get(className);
  }

  /**
   * Checks if the component has a specific CSS class.
   * 
   * @param className - CSS class name (without leading dot)
   * @returns True if class exists, false otherwise
   */
  hasClass(className: string): boolean {
    return this.allClasses.has(className);
  }

  /**
   * Gets all CSS class names available for this component.
   * 
   * @returns Array of class names
   */
  getClassNames(): string[] {
    return Array.from(this.allClasses.keys());
  }

  /**
   * Updates the index with new CSS files.
   * 
   * @param cssFiles - Map of CSS file path → CSSFile
   */
  update(cssFiles: Map<string, CSSFile>): ComponentIndex {
    return new ComponentIndex(this.componentPath, cssFiles);
  }
}

