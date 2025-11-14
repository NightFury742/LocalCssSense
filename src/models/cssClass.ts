/**
 * Represents a CSS class definition within a CSS file.
 */
export class CSSClass {
  /**
   * CSS class name (without leading dot).
   */
  readonly name: string;

  /**
   * Path to source CSS file.
   */
  readonly sourceFile: string;

  /**
   * Line number where class is defined (1-based).
   */
  readonly lineNumber: number;

  /**
   * Map of CSS property → value.
   */
  readonly properties: Map<string, string>;

  /**
   * Complete CSS rule text (for hover tooltips).
   */
  readonly fullDefinition: string;

  /**
   * Creates a new CSSClass instance.
   * 
   * @param name - CSS class name (without leading dot)
   * @param sourceFile - Path to source CSS file
   * @param lineNumber - Line number where class is defined (1-based)
   * @param properties - Map of CSS property → value
   * @param fullDefinition - Complete CSS rule text
   */
  constructor(
    name: string,
    sourceFile: string,
    lineNumber: number,
    properties: Map<string, string>,
    fullDefinition: string
  ) {
    // Validate class name matches CSS identifier rules
    if (!/^[a-zA-Z_-][a-zA-Z0-9_-]*$/.test(name)) {
      throw new Error(`Invalid CSS class name: ${name}`);
    }

    if (lineNumber < 1) {
      throw new Error(`Invalid line number: ${lineNumber}`);
    }

    this.name = name;
    this.sourceFile = sourceFile;
    this.lineNumber = lineNumber;
    this.properties = new Map(properties);
    this.fullDefinition = fullDefinition;
  }

  /**
   * Creates a copy of this CSSClass with updated properties.
   */
  clone(): CSSClass {
    return new CSSClass(
      this.name,
      this.sourceFile,
      this.lineNumber,
      this.properties,
      this.fullDefinition
    );
  }
}

