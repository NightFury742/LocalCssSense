"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const cssParser_1 = require("../../src/services/cssParser");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
(0, vitest_1.describe)('CSSParser', () => {
    let parser;
    let tempDir;
    (0, vitest_1.beforeEach)(() => {
        parser = new cssParser_1.CSSParser();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'css-parser-test-'));
    });
    (0, vitest_1.afterEach)(() => {
        // Cleanup temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.describe)('extractClasses', () => {
        (0, vitest_1.it)('should extract simple CSS classes', () => {
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
            (0, vitest_1.expect)(classes.size).toBe(2);
            (0, vitest_1.expect)(classes.has('container')).toBe(true);
            (0, vitest_1.expect)(classes.has('header')).toBe(true);
            const containerClass = classes.get('container');
            (0, vitest_1.expect)(containerClass).toBeDefined();
            (0, vitest_1.expect)(containerClass?.name).toBe('container');
            (0, vitest_1.expect)(containerClass?.properties.get('display')).toBe('flex');
            (0, vitest_1.expect)(containerClass?.properties.get('padding')).toBe('1rem');
        });
        (0, vitest_1.it)('should handle CSS classes with hyphens and underscores', () => {
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
            (0, vitest_1.expect)(classes.size).toBe(3);
            (0, vitest_1.expect)(classes.has('my-class')).toBe(true);
            (0, vitest_1.expect)(classes.has('class_name')).toBe(true);
            (0, vitest_1.expect)(classes.has('class-name_2')).toBe(true);
        });
        (0, vitest_1.it)('should skip comments', () => {
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
            (0, vitest_1.expect)(classes.size).toBe(2);
            (0, vitest_1.expect)(classes.has('container')).toBe(true);
            (0, vitest_1.expect)(classes.has('header')).toBe(true);
        });
        (0, vitest_1.it)('should handle nested selectors', () => {
            const cssContent = `
        .container {
          display: flex;
        }
        .container .nested {
          color: red;
        }
      `;
            const classes = parser.extractClasses(cssContent);
            (0, vitest_1.expect)(classes.size).toBe(2);
            (0, vitest_1.expect)(classes.has('container')).toBe(true);
            (0, vitest_1.expect)(classes.has('nested')).toBe(true);
        });
        (0, vitest_1.it)('should handle media queries', () => {
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
            (0, vitest_1.expect)(classes.size).toBe(2);
            (0, vitest_1.expect)(classes.has('container')).toBe(true);
            (0, vitest_1.expect)(classes.has('mobile')).toBe(true);
        });
        (0, vitest_1.it)('should gracefully handle malformed CSS', () => {
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
            (0, vitest_1.expect)(classes.has('valid')).toBe(true);
            (0, vitest_1.expect)(classes.has('another-valid')).toBe(true);
        });
        (0, vitest_1.it)('should extract full CSS definition for hover tooltips', () => {
            const cssContent = `
        .container {
          display: flex;
          padding: 1rem;
        }
      `;
            const classes = parser.extractClasses(cssContent);
            const containerClass = classes.get('container');
            (0, vitest_1.expect)(containerClass).toBeDefined();
            (0, vitest_1.expect)(containerClass?.fullDefinition).toContain('.container');
            (0, vitest_1.expect)(containerClass?.fullDefinition).toContain('display: flex');
            (0, vitest_1.expect)(containerClass?.fullDefinition).toContain('padding: 1rem');
        });
        (0, vitest_1.it)('should not extract IDs or element selectors', () => {
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
            (0, vitest_1.expect)(classes.size).toBe(1);
            (0, vitest_1.expect)(classes.has('class-selector')).toBe(true);
            (0, vitest_1.expect)(classes.has('id-selector')).toBe(false);
        });
    });
    (0, vitest_1.describe)('parseCSSContent', () => {
        (0, vitest_1.it)('should parse CSS content and return CSSFile', () => {
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
            (0, vitest_1.expect)(cssFile.filePath).toBe(filePath);
            (0, vitest_1.expect)(cssFile.classes.size).toBe(2);
            (0, vitest_1.expect)(cssFile.rawContent).toBe(cssContent);
            (0, vitest_1.expect)(cssFile.lastModified).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should handle empty CSS content', () => {
            const cssContent = '';
            const filePath = path.join(tempDir, 'empty.css');
            const cssFile = parser.parseCSSContent(cssContent, filePath);
            (0, vitest_1.expect)(cssFile.filePath).toBe(filePath);
            (0, vitest_1.expect)(cssFile.classes.size).toBe(0);
            (0, vitest_1.expect)(cssFile.rawContent).toBe('');
        });
    });
    (0, vitest_1.describe)('parseCSSFile', () => {
        (0, vitest_1.it)('should parse CSS file from disk', async () => {
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
            (0, vitest_1.expect)(cssFile.filePath).toBe(filePath);
            (0, vitest_1.expect)(cssFile.classes.size).toBe(2);
            (0, vitest_1.expect)(cssFile.rawContent).toBe(cssContent);
        });
        (0, vitest_1.it)('should throw error for non-existent file', async () => {
            const filePath = path.join(tempDir, 'non-existent.css');
            await (0, vitest_1.expect)(parser.parseCSSFile(filePath)).rejects.toThrow();
        });
        (0, vitest_1.it)('should handle CSS files with various properties', async () => {
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
            (0, vitest_1.expect)(cssFile.classes.size).toBe(1);
            const complexClass = cssFile.classes.get('complex');
            (0, vitest_1.expect)(complexClass).toBeDefined();
            (0, vitest_1.expect)(complexClass?.properties.get('display')).toBe('flex');
            (0, vitest_1.expect)(complexClass?.properties.get('flex-direction')).toBe('column');
            (0, vitest_1.expect)(complexClass?.properties.get('gap')).toBe('1rem');
            (0, vitest_1.expect)(complexClass?.properties.get('padding')).toBe('1rem 2rem');
            (0, vitest_1.expect)(complexClass?.properties.get('background-color')).toBe('#ffffff');
            (0, vitest_1.expect)(complexClass?.properties.get('border-radius')).toBe('8px');
        });
    });
});
//# sourceMappingURL=cssParser.test.js.map