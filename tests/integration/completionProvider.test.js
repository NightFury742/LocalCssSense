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
const completionProvider_1 = require("../../src/providers/completionProvider");
const cssIndex_1 = require("../../src/services/cssIndex");
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
(0, vitest_1.describe)('CompletionProvider Integration', () => {
    let provider;
    let cssIndex;
    let tempDir;
    (0, vitest_1.beforeEach)(() => {
        cssIndex = new cssIndex_1.CSSIndex();
        provider = new completionProvider_1.CompletionProvider(cssIndex);
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'completion-provider-test-'));
    });
    (0, vitest_1.afterEach)(() => {
        cssIndex.clear();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.describe)('provideCompletionItems', () => {
        (0, vitest_1.it)('should provide completion items for CSS classes when styleName=" is typed', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            const cssContent = `
        .container {
          display: flex;
        }
        .header {
          color: blue;
        }
        .content {
          padding: 1rem;
        }
      `;
            fs.writeFileSync(cssPath, cssContent);
            const componentContent = `
        import './styles.css';
        
        function Component() {
          return <div styleName="
        `;
            fs.writeFileSync(componentPath, componentContent);
            // Index the component
            await cssIndex.indexComponent(componentPath, [cssPath]);
            // Open document
            const document = await vscode.workspace.openTextDocument(componentPath);
            const position = new vscode.Position(4, 30); // Position after styleName="
            const completionItems = await provider.provideCompletionItems(document, position, {}, {});
            (0, vitest_1.expect)(completionItems).toBeDefined();
            const items = Array.isArray(completionItems)
                ? completionItems
                : completionItems.items;
            (0, vitest_1.expect)(items.length).toBeGreaterThanOrEqual(3);
            const classNames = items.map(item => item.label);
            (0, vitest_1.expect)(classNames).toContain('container');
            (0, vitest_1.expect)(classNames).toContain('header');
            (0, vitest_1.expect)(classNames).toContain('content');
        });
        (0, vitest_1.it)('should not provide completions when not in styleName attribute', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { display: flex; }');
            const componentContent = `
        import './styles.css';
        
        function Component() {
          return <div className="
        `;
            fs.writeFileSync(componentPath, componentContent);
            await cssIndex.indexComponent(componentPath, [cssPath]);
            const document = await vscode.workspace.openTextDocument(componentPath);
            const position = new vscode.Position(4, 32); // Position after className="
            const completionItems = await provider.provideCompletionItems(document, position, {}, {});
            // Should not provide completions for className
            (0, vitest_1.expect)(completionItems).toBeUndefined();
        });
        (0, vitest_1.it)('should provide completion items with correct properties', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { display: flex; padding: 1rem; }');
            const componentContent = `import './styles.css'; function Component() { return <div styleName="`;
            fs.writeFileSync(componentPath, componentContent);
            await cssIndex.indexComponent(componentPath, [cssPath]);
            const document = await vscode.workspace.openTextDocument(componentPath);
            const position = new vscode.Position(0, componentContent.length);
            const completionItems = await provider.provideCompletionItems(document, position, {}, {});
            const items = Array.isArray(completionItems)
                ? completionItems
                : completionItems.items;
            const containerItem = items.find(item => item.label === 'container');
            (0, vitest_1.expect)(containerItem).toBeDefined();
            (0, vitest_1.expect)(containerItem?.kind).toBe(vscode.CompletionItemKind.Class);
            (0, vitest_1.expect)(containerItem?.insertText).toBe('container');
            (0, vitest_1.expect)(containerItem?.detail).toBeDefined();
        });
        (0, vitest_1.it)('should handle components with no CSS imports', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const componentContent = `function Component() { return <div styleName="`;
            fs.writeFileSync(componentPath, componentContent);
            const document = await vscode.workspace.openTextDocument(componentPath);
            const position = new vscode.Position(0, componentContent.length);
            const completionItems = await provider.provideCompletionItems(document, position, {}, {});
            // Should return empty or undefined when no CSS imports
            if (completionItems) {
                const items = Array.isArray(completionItems)
                    ? completionItems
                    : completionItems.items;
                (0, vitest_1.expect)(items.length).toBe(0);
            }
        });
    });
});
//# sourceMappingURL=completionProvider.test.js.map