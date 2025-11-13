import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImportParser } from '../../src/services/importParser';
import { ImportStatement } from '../../src/models/importStatement';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as vscode from 'vscode';

describe('ImportParser', () => {
  let parser: ImportParser;
  let tempDir: string;

  beforeEach(() => {
    parser = new ImportParser();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-parser-test-'));
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('extractImportPaths', () => {
    it('should extract CSS import paths from component content', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'styles.css');
      const animationsPath = path.join(tempDir, 'animations.css');
      
      // Create CSS files so they can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      fs.writeFileSync(animationsPath, '.fade { animation: fade 1s; }');
      
      const componentContent = `
        import React from 'react';
        import './styles.css';
        import './animations.css';
        
        function Component() {
          return <div>Hello</div>;
        }
      `;

      const imports = parser.extractImportPaths(componentContent, componentPath);

      expect(imports.length).toBe(2);
      expect(imports[0].importPath).toBe('./styles.css');
      expect(imports[1].importPath).toBe('./animations.css');
    });

    it('should handle single quotes', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'styles.css');
      
      // Create CSS file so it can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      
      const componentContent = `import './styles.css';`;

      const imports = parser.extractImportPaths(componentContent, componentPath);

      expect(imports.length).toBe(1);
      expect(imports[0].importPath).toBe('./styles.css');
    });

    it('should handle double quotes', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'styles.css');
      
      // Create CSS file so it can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      
      const componentContent = `import "./styles.css";`;

      const imports = parser.extractImportPaths(componentContent, componentPath);

      expect(imports.length).toBe(1);
      expect(imports[0].importPath).toBe('./styles.css');
    });

    it('should handle CSS Modules imports (import styles from)', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'EmandateCard.css');
      
      // Create CSS file so it can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      
      const componentContent = `import styles from './EmandateCard.css';`;

      const imports = parser.extractImportPaths(componentContent, componentPath);

      expect(imports.length).toBe(1);
      expect(imports[0].importPath).toBe('./EmandateCard.css');
    });

    it('should handle CSS Modules imports with * as', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'styles.css');
      
      // Create CSS file so it can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      
      const componentContent = `import * as styles from './styles.css';`;

      const imports = parser.extractImportPaths(componentContent, componentPath);

      expect(imports.length).toBe(1);
      expect(imports[0].importPath).toBe('./styles.css');
    });

    it('should not extract non-CSS imports', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'styles.css');
      
      // Create CSS file so it can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      
      const componentContent = `
        import React from 'react';
        import './styles.css';
        import { useState } from 'react';
        import './utils';
      `;

      const imports = parser.extractImportPaths(componentContent, componentPath);

      expect(imports.length).toBe(1);
      expect(imports[0].importPath).toBe('./styles.css');
    });

    it('should not extract parent directory imports (P1 constraint)', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'styles.css');
      
      // Create CSS file so it can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      
      const componentContent = `
        import './styles.css';
        import '../styles.css';
      `;

      const imports = parser.extractImportPaths(componentContent, componentPath);

      expect(imports.length).toBe(1);
      expect(imports[0].importPath).toBe('./styles.css');
    });

    it('should not extract path alias imports (P1 constraint)', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'styles.css');
      
      // Create CSS file so it can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      
      const componentContent = `
        import './styles.css';
        import '@/styles.css';
        import '~/styles.css';
      `;

      const imports = parser.extractImportPaths(componentContent, componentPath);

      expect(imports.length).toBe(1);
      expect(imports[0].importPath).toBe('./styles.css');
    });

    it('should record correct line numbers', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'styles.css');
      const animationsPath = path.join(tempDir, 'animations.css');
      
      // Create CSS files so they can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      fs.writeFileSync(animationsPath, '.fade { animation: fade 1s; }');
      
      const componentContent = `
        import React from 'react';
        import './styles.css';
        import './animations.css';
      `;

      const imports = parser.extractImportPaths(componentContent, componentPath);

      // Line numbers are 1-based
      // Template literal starts with newline, so:
      // Line 1: blank (from template literal)
      // Line 2: import React...
      // Line 3: import './styles.css'
      // Line 4: import './animations.css'
      expect(imports[0].lineNumber).toBe(3);
      expect(imports[1].lineNumber).toBe(4);
    });
  });

  describe('resolveImportPath', () => {
    it('should resolve same-directory import path', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      fs.writeFileSync(cssPath, '.container { color: red; }');

      const resolved = parser.resolveImportPath('./styles.css', componentPath);

      expect(resolved).toBe(cssPath);
    });

    it('should return null for parent directory imports', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');

      const resolved = parser.resolveImportPath('../styles.css', componentPath);

      expect(resolved).toBeNull();
    });

    it('should return null for path alias imports', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');

      expect(parser.resolveImportPath('@/styles.css', componentPath)).toBeNull();
      expect(parser.resolveImportPath('~/styles.css', componentPath)).toBeNull();
    });

    it('should return null for non-existent files', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');

      const resolved = parser.resolveImportPath('./non-existent.css', componentPath);

      expect(resolved).toBeNull();
    });

    it('should return null for invalid import paths', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');

      expect(parser.resolveImportPath('styles.css', componentPath)).toBeNull();
      expect(parser.resolveImportPath('', componentPath)).toBeNull();
    });
  });

  describe('parseImports', () => {
    it('should parse imports from VS Code document', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const stylesPath = path.join(tempDir, 'styles.css');
      const animationsPath = path.join(tempDir, 'animations.css');
      
      // Create CSS files so they can be resolved
      fs.writeFileSync(stylesPath, '.container { display: flex; }');
      fs.writeFileSync(animationsPath, '.fade { animation: fade 1s; }');
      
      const componentContent = `
        import React from 'react';
        import './styles.css';
        import './animations.css';
      `;
      fs.writeFileSync(componentPath, componentContent);

      // Create mock VS Code document
      const document = await vscode.workspace.openTextDocument(componentPath);

      const imports = parser.parseImports(document);

      expect(imports.length).toBe(2);
      expect(imports[0].importPath).toBe('./styles.css');
      expect(imports[1].importPath).toBe('./animations.css');
      expect(imports[0].componentPath).toBe(componentPath);
      expect(imports[1].componentPath).toBe(componentPath);
    });

    it('should handle documents with no CSS imports', async () => {
      const componentContent = `
        import React from 'react';
        import { useState } from 'react';
      `;
      const componentPath = path.join(tempDir, 'Component.tsx');
      fs.writeFileSync(componentPath, componentContent);

      const document = await vscode.workspace.openTextDocument(componentPath);

      const imports = parser.parseImports(document);

      expect(imports.length).toBe(0);
    });
  });
});

