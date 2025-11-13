import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CSSParser } from '../../src/services/cssParser';
import { CSSClass } from '../../src/models/cssClass';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('CSSParser', () => {
  let parser: CSSParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new CSSParser();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'css-parser-test-'));
  });

  afterEach(() => {
    // Cleanup temp directory
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('extractClasses', () => {
    it('should extract simple CSS classes', () => {
      const cssContent = `
        .container {
          display: flex;
          padding: 1rem;
        }
        .header {
          font-size: 2rem;
          color: blue;
        }
      `;

      const classes = parser.extractClasses(cssContent);

      expect(classes.size).toBe(2);
      expect(classes.has('container')).toBe(true);
      expect(classes.has('header')).toBe(true);

      const containerClass = classes.get('container');
      expect(containerClass).toBeDefined();
      expect(containerClass?.name).toBe('container');
      expect(containerClass?.properties.get('display')).toBe('flex');
      expect(containerClass?.properties.get('padding')).toBe('1rem');
    });

    it('should handle CSS classes with hyphens and underscores', () => {
      const cssContent = `
        .my-class {
          color: red;
        }
        .class_name {
          color: blue;
        }
        .class-name_2 {
          color: green;
        }
      `;

      const classes = parser.extractClasses(cssContent);

      expect(classes.size).toBe(3);
      expect(classes.has('my-class')).toBe(true);
      expect(classes.has('class_name')).toBe(true);
      expect(classes.has('class-name_2')).toBe(true);
    });

    it('should skip comments', () => {
      const cssContent = `
        /* This is a comment */
        .container {
          display: flex;
        }
        /* Another comment */
        .header {
          color: blue;
        }
      `;

      const classes = parser.extractClasses(cssContent);

      expect(classes.size).toBe(2);
      expect(classes.has('container')).toBe(true);
      expect(classes.has('header')).toBe(true);
    });

    it('should handle nested selectors', () => {
      const cssContent = `
        .container {
          display: flex;
        }
        .container .nested {
          color: red;
        }
      `;

      const classes = parser.extractClasses(cssContent);

      expect(classes.size).toBe(2);
      expect(classes.has('container')).toBe(true);
      expect(classes.has('nested')).toBe(true);
    });

    it('should handle media queries', () => {
      const cssContent = `
        .container {
          display: flex;
        }
        @media (max-width: 768px) {
          .mobile {
            display: block;
          }
        }
      `;

      const classes = parser.extractClasses(cssContent);

      expect(classes.size).toBe(2);
      expect(classes.has('container')).toBe(true);
      expect(classes.has('mobile')).toBe(true);
    });

    it('should gracefully handle malformed CSS', () => {
      const cssContent = `
        .valid {
          color: red;
        }
        .invalid {
          color: blue
          /* Missing closing brace */
        .another-valid {
          color: green;
        }
      `;

      const classes = parser.extractClasses(cssContent);

      // Should extract valid classes
      expect(classes.has('valid')).toBe(true);
      expect(classes.has('another-valid')).toBe(true);
    });

    it('should extract full CSS definition for hover tooltips', () => {
      const cssContent = `
        .container {
          display: flex;
          padding: 1rem;
        }
      `;

      const classes = parser.extractClasses(cssContent);
      const containerClass = classes.get('container');

      expect(containerClass).toBeDefined();
      expect(containerClass?.fullDefinition).toContain('.container');
      expect(containerClass?.fullDefinition).toContain('display: flex');
      expect(containerClass?.fullDefinition).toContain('padding: 1rem');
    });

    it('should not extract IDs or element selectors', () => {
      const cssContent = `
        #id-selector {
          color: red;
        }
        div {
          color: blue;
        }
        .class-selector {
          color: green;
        }
      `;

      const classes = parser.extractClasses(cssContent);

      expect(classes.size).toBe(1);
      expect(classes.has('class-selector')).toBe(true);
      expect(classes.has('id-selector')).toBe(false);
    });
  });

  describe('parseCSSContent', () => {
    it('should parse CSS content and return CSSFile', () => {
      const cssContent = `
        .container {
          display: flex;
        }
        .header {
          color: blue;
        }
      `;
      const filePath = path.join(tempDir, 'styles.css');

      const cssFile = parser.parseCSSContent(cssContent, filePath);

      expect(cssFile.filePath).toBe(filePath);
      expect(cssFile.classes.size).toBe(2);
      expect(cssFile.rawContent).toBe(cssContent);
      expect(cssFile.lastModified).toBeGreaterThan(0);
    });

    it('should handle empty CSS content', () => {
      const cssContent = '';
      const filePath = path.join(tempDir, 'empty.css');

      const cssFile = parser.parseCSSContent(cssContent, filePath);

      expect(cssFile.filePath).toBe(filePath);
      expect(cssFile.classes.size).toBe(0);
      expect(cssFile.rawContent).toBe('');
    });
  });

  describe('parseCSSFile', () => {
    it('should parse CSS file from disk', async () => {
      const cssContent = `
        .container {
          display: flex;
        }
        .header {
          color: blue;
        }
      `;
      const filePath = path.join(tempDir, 'styles.css');
      fs.writeFileSync(filePath, cssContent);

      const cssFile = await parser.parseCSSFile(filePath);

      expect(cssFile.filePath).toBe(filePath);
      expect(cssFile.classes.size).toBe(2);
      expect(cssFile.rawContent).toBe(cssContent);
    });

    it('should throw error for non-existent file', async () => {
      const filePath = path.join(tempDir, 'non-existent.css');

      await expect(parser.parseCSSFile(filePath)).rejects.toThrow();
    });

    it('should handle CSS files with various properties', async () => {
      const cssContent = `
        .complex {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1rem 2rem;
          background-color: #ffffff;
          border-radius: 8px;
        }
      `;
      const filePath = path.join(tempDir, 'complex.css');
      fs.writeFileSync(filePath, cssContent);

      const cssFile = await parser.parseCSSFile(filePath);

      expect(cssFile.classes.size).toBe(1);
      const complexClass = cssFile.classes.get('complex');
      expect(complexClass).toBeDefined();
      expect(complexClass?.properties.get('display')).toBe('flex');
      expect(complexClass?.properties.get('flex-direction')).toBe('column');
      expect(complexClass?.properties.get('gap')).toBe('1rem');
      expect(complexClass?.properties.get('padding')).toBe('1rem 2rem');
      expect(complexClass?.properties.get('background-color')).toBe('#ffffff');
      expect(complexClass?.properties.get('border-radius')).toBe('8px');
    });
  });
});

