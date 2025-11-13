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
const hoverProvider_1 = require("../../src/providers/hoverProvider");
const cssIndex_1 = require("../../src/services/cssIndex");
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
(0, vitest_1.describe)('HoverProvider Integration', () => {
    let provider;
    let cssIndex;
    let tempDir;
    (0, vitest_1.beforeEach)(() => {
        cssIndex = new cssIndex_1.CSSIndex();
        provider = new hoverProvider_1.HoverProvider(cssIndex);
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hover-provider-test-'));
    });
    (0, vitest_1.afterEach)(() => {
        cssIndex.clear();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.describe)('provideHover', () => {
        (0, vitest_1.it)('should provide hover information for CSS class in styleName attribute', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            const cssContent = `
        .container {
          display: flex;
          padding: 1rem;
          background-color: white;
        }
      `;
            fs.writeFileSync(cssPath, cssContent);
            const componentContent = `
        import './styles.css';
        
        function Component() {
          return <div styleName="container">Hello</div>;
        }
      `;
            fs.writeFileSync(componentPath, componentContent);
            // Index the component
            await cssIndex.indexComponent(componentPath, [cssPath]);
            const document = await vscode.workspace.openTextDocument(componentPath);
            // Position on "container" text
            const position = new vscode.Position(4, 30);
            const hover = await provider.provideHover(document, position, {});
            (0, vitest_1.expect)(hover).toBeDefined();
            (0, vitest_1.expect)(hover?.contents).toBeDefined();
            const contents = Array.isArray(hover?.contents)
                ? hover?.contents
                : [hover?.contents];
            const markdownContent = contents.find(c => c instanceof vscode.MarkdownString);
            (0, vitest_1.expect)(markdownContent).toBeDefined();
            if (markdownContent instanceof vscode.MarkdownString) {
                const value = markdownContent.value;
                (0, vitest_1.expect)(value).toContain('container');
                (0, vitest_1.expect)(value).toContain('display: flex');
                (0, vitest_1.expect)(value).toContain('padding: 1rem');
            }
        });
        (0, vitest_1.it)('should not provide hover for non-CSS class text', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { display: flex; }');
            const componentContent = `
        import './styles.css';
        
        function Component() {
          return <div styleName="not-a-class">Hello</div>;
        }
      `;
            fs.writeFileSync(componentPath, componentContent);
            await cssIndex.indexComponent(componentPath, [cssPath]);
            const document = await vscode.workspace.openTextDocument(componentPath);
            const position = new vscode.Position(4, 30); // Position on "not-a-class"
            const hover = await provider.provideHover(document, position, {});
            // Should not provide hover for non-existent class
            (0, vitest_1.expect)(hover).toBeUndefined();
        });
        (0, vitest_1.it)('should not provide hover outside styleName attribute', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { display: flex; }');
            const componentContent = `
        import './styles.css';
        
        function Component() {
          return <div className="container">Hello</div>;
        }
      `;
            fs.writeFileSync(componentPath, componentContent);
            await cssIndex.indexComponent(componentPath, [cssPath]);
            const document = await vscode.workspace.openTextDocument(componentPath);
            const position = new vscode.Position(4, 32); // Position on "container" in className
            const hover = await provider.provideHover(document, position, {});
            // Should not provide hover for className attribute
            (0, vitest_1.expect)(hover).toBeUndefined();
        });
        (0, vitest_1.it)('should provide hover with CSS definition format', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            const cssContent = `
        .header {
          font-size: 2rem;
          color: #333333;
          font-weight: bold;
        }
      `;
            fs.writeFileSync(cssPath, cssContent);
            const componentContent = `import './styles.css'; function Component() { return <div styleName="header">`;
            fs.writeFileSync(componentPath, componentContent);
            await cssIndex.indexComponent(componentPath, [cssPath]);
            const document = await vscode.workspace.openTextDocument(componentPath);
            const position = new vscode.Position(0, 78); // Position on "header"
            const hover = await provider.provideHover(document, position, {});
            (0, vitest_1.expect)(hover).toBeDefined();
            const contents = Array.isArray(hover?.contents)
                ? hover?.contents
                : [hover?.contents];
            const markdownContent = contents.find(c => c instanceof vscode.MarkdownString);
            if (markdownContent instanceof vscode.MarkdownString) {
                const value = markdownContent.value;
                (0, vitest_1.expect)(value).toContain('header');
                (0, vitest_1.expect)(value).toContain('font-size');
                (0, vitest_1.expect)(value).toContain('color');
            }
        });
        (0, vitest_1.it)('should handle multiple CSS classes in styleName', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            const cssContent = `
        .container {
          display: flex;
        }
        .header {
          color: blue;
        }
      `;
            fs.writeFileSync(cssPath, cssContent);
            const componentContent = `
        import './styles.css';
        
        function Component() {
          return <div styleName="container header">Hello</div>;
        }
      `;
            fs.writeFileSync(componentPath, componentContent);
            await cssIndex.indexComponent(componentPath, [cssPath]);
            const document = await vscode.workspace.openTextDocument(componentPath);
            // Position on "container"
            const position1 = new vscode.Position(4, 30);
            // Position on "header"
            const position2 = new vscode.Position(4, 40);
            const hover1 = await provider.provideHover(document, position1, {});
            const hover2 = await provider.provideHover(document, position2, {});
            (0, vitest_1.expect)(hover1).toBeDefined();
            (0, vitest_1.expect)(hover2).toBeDefined();
        });
    });
});
//# sourceMappingURL=hoverProvider.test.js.map