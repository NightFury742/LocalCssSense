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
const importParser_1 = require("../../src/services/importParser");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const vscode = __importStar(require("vscode"));
(0, vitest_1.describe)('ImportParser', () => {
    let parser;
    let tempDir;
    (0, vitest_1.beforeEach)(() => {
        parser = new importParser_1.ImportParser();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-parser-test-'));
    });
    (0, vitest_1.afterEach)(() => {
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.describe)('extractImportPaths', () => {
        (0, vitest_1.it)('should extract CSS import paths from component content', () => {
            const componentContent = `
        import React from 'react';
        import './styles.css';
        import './animations.css';
        
        function Component() {
          return <div>Hello</div>;
        }
      `;
            const componentPath = path.join(tempDir, 'Component.tsx');
            const imports = parser.extractImportPaths(componentContent, componentPath);
            (0, vitest_1.expect)(imports.length).toBe(2);
            (0, vitest_1.expect)(imports[0].importPath).toBe('./styles.css');
            (0, vitest_1.expect)(imports[1].importPath).toBe('./animations.css');
        });
        (0, vitest_1.it)('should handle single quotes', () => {
            const componentContent = `import './styles.css';`;
            const componentPath = path.join(tempDir, 'Component.tsx');
            const imports = parser.extractImportPaths(componentContent, componentPath);
            (0, vitest_1.expect)(imports.length).toBe(1);
            (0, vitest_1.expect)(imports[0].importPath).toBe('./styles.css');
        });
        (0, vitest_1.it)('should handle double quotes', () => {
            const componentContent = `import "./styles.css";`;
            const componentPath = path.join(tempDir, 'Component.tsx');
            const imports = parser.extractImportPaths(componentContent, componentPath);
            (0, vitest_1.expect)(imports.length).toBe(1);
            (0, vitest_1.expect)(imports[0].importPath).toBe('./styles.css');
        });
        (0, vitest_1.it)('should not extract non-CSS imports', () => {
            const componentContent = `
        import React from 'react';
        import './styles.css';
        import { useState } from 'react';
        import './utils';
      `;
            const componentPath = path.join(tempDir, 'Component.tsx');
            const imports = parser.extractImportPaths(componentContent, componentPath);
            (0, vitest_1.expect)(imports.length).toBe(1);
            (0, vitest_1.expect)(imports[0].importPath).toBe('./styles.css');
        });
        (0, vitest_1.it)('should not extract parent directory imports (P1 constraint)', () => {
            const componentContent = `
        import './styles.css';
        import '../styles.css';
      `;
            const componentPath = path.join(tempDir, 'Component.tsx');
            const imports = parser.extractImportPaths(componentContent, componentPath);
            (0, vitest_1.expect)(imports.length).toBe(1);
            (0, vitest_1.expect)(imports[0].importPath).toBe('./styles.css');
        });
        (0, vitest_1.it)('should not extract path alias imports (P1 constraint)', () => {
            const componentContent = `
        import './styles.css';
        import '@/styles.css';
        import '~/styles.css';
      `;
            const componentPath = path.join(tempDir, 'Component.tsx');
            const imports = parser.extractImportPaths(componentContent, componentPath);
            (0, vitest_1.expect)(imports.length).toBe(1);
            (0, vitest_1.expect)(imports[0].importPath).toBe('./styles.css');
        });
        (0, vitest_1.it)('should record correct line numbers', () => {
            const componentContent = `
        import React from 'react';
        import './styles.css';
        import './animations.css';
      `;
            const componentPath = path.join(tempDir, 'Component.tsx');
            const imports = parser.extractImportPaths(componentContent, componentPath);
            (0, vitest_1.expect)(imports[0].lineNumber).toBe(2);
            (0, vitest_1.expect)(imports[1].lineNumber).toBe(3);
        });
    });
    (0, vitest_1.describe)('resolveImportPath', () => {
        (0, vitest_1.it)('should resolve same-directory import path', () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { color: red; }');
            const resolved = parser.resolveImportPath('./styles.css', componentPath);
            (0, vitest_1.expect)(resolved).toBe(cssPath);
        });
        (0, vitest_1.it)('should return null for parent directory imports', () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const resolved = parser.resolveImportPath('../styles.css', componentPath);
            (0, vitest_1.expect)(resolved).toBeNull();
        });
        (0, vitest_1.it)('should return null for path alias imports', () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            (0, vitest_1.expect)(parser.resolveImportPath('@/styles.css', componentPath)).toBeNull();
            (0, vitest_1.expect)(parser.resolveImportPath('~/styles.css', componentPath)).toBeNull();
        });
        (0, vitest_1.it)('should return null for non-existent files', () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const resolved = parser.resolveImportPath('./non-existent.css', componentPath);
            (0, vitest_1.expect)(resolved).toBeNull();
        });
        (0, vitest_1.it)('should return null for invalid import paths', () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            (0, vitest_1.expect)(parser.resolveImportPath('styles.css', componentPath)).toBeNull();
            (0, vitest_1.expect)(parser.resolveImportPath('', componentPath)).toBeNull();
        });
    });
    (0, vitest_1.describe)('parseImports', () => {
        (0, vitest_1.it)('should parse imports from VS Code document', async () => {
            const componentContent = `
        import React from 'react';
        import './styles.css';
        import './animations.css';
      `;
            const componentPath = path.join(tempDir, 'Component.tsx');
            fs.writeFileSync(componentPath, componentContent);
            // Create mock VS Code document
            const document = await vscode.workspace.openTextDocument(componentPath);
            const imports = parser.parseImports(document);
            (0, vitest_1.expect)(imports.length).toBe(2);
            (0, vitest_1.expect)(imports[0].importPath).toBe('./styles.css');
            (0, vitest_1.expect)(imports[1].importPath).toBe('./animations.css');
            (0, vitest_1.expect)(imports[0].componentPath).toBe(componentPath);
            (0, vitest_1.expect)(imports[1].componentPath).toBe(componentPath);
        });
        (0, vitest_1.it)('should handle documents with no CSS imports', async () => {
            const componentContent = `
        import React from 'react';
        import { useState } from 'react';
      `;
            const componentPath = path.join(tempDir, 'Component.tsx');
            fs.writeFileSync(componentPath, componentContent);
            const document = await vscode.workspace.openTextDocument(componentPath);
            const imports = parser.parseImports(document);
            (0, vitest_1.expect)(imports.length).toBe(0);
        });
    });
});
//# sourceMappingURL=importParser.test.js.map