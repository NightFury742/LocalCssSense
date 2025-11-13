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
const cssIndex_1 = require("../../src/services/cssIndex");
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
(0, vitest_1.describe)('CSSIndex', () => {
    let cssIndex;
    let tempDir;
    (0, vitest_1.beforeEach)(() => {
        cssIndex = new cssIndex_1.CSSIndex();
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'css-index-test-'));
    });
    (0, vitest_1.afterEach)(() => {
        cssIndex.clear();
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });
    (0, vitest_1.describe)('getComponentIndex', () => {
        (0, vitest_1.it)('should return undefined for non-indexed component', () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const index = cssIndex.getComponentIndex(componentPath);
            (0, vitest_1.expect)(index).toBeUndefined();
        });
        (0, vitest_1.it)('should return ComponentIndex after indexing', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            // Create CSS file with classes
            const cssContent = `
        .container {
          display: flex;
        }
        .header {
          color: blue;
        }
      `;
            fs.writeFileSync(cssPath, cssContent);
            await cssIndex.indexComponent(componentPath, [cssPath]);
            const index = cssIndex.getComponentIndex(componentPath);
            (0, vitest_1.expect)(index).toBeDefined();
            (0, vitest_1.expect)(index?.componentPath).toBe(componentPath);
            (0, vitest_1.expect)(index?.getClassNames().length).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('indexComponent', () => {
        (0, vitest_1.it)('should index multiple CSS files for a component', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath1 = path.join(tempDir, 'styles.css');
            const cssPath2 = path.join(tempDir, 'animations.css');
            fs.writeFileSync(cssPath1, '.container { display: flex; }');
            fs.writeFileSync(cssPath2, '.fade-in { animation: fade 1s; }');
            await cssIndex.indexComponent(componentPath, [cssPath1, cssPath2]);
            const index = cssIndex.getComponentIndex(componentPath);
            (0, vitest_1.expect)(index).toBeDefined();
            (0, vitest_1.expect)(index?.cssFiles.size).toBe(2);
            (0, vitest_1.expect)(index?.hasClass('container')).toBe(true);
            (0, vitest_1.expect)(index?.hasClass('fade-in')).toBe(true);
        });
        (0, vitest_1.it)('should handle missing CSS files gracefully', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath1 = path.join(tempDir, 'styles.css');
            const cssPath2 = path.join(tempDir, 'non-existent.css');
            fs.writeFileSync(cssPath1, '.container { display: flex; }');
            await cssIndex.indexComponent(componentPath, [cssPath1, cssPath2]);
            const index = cssIndex.getComponentIndex(componentPath);
            (0, vitest_1.expect)(index).toBeDefined();
            (0, vitest_1.expect)(index?.hasClass('container')).toBe(true);
        });
        (0, vitest_1.it)('should cache parsed CSS files', async () => {
            const componentPath1 = path.join(tempDir, 'Component1.tsx');
            const componentPath2 = path.join(tempDir, 'Component2.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { display: flex; }');
            await cssIndex.indexComponent(componentPath1, [cssPath]);
            await cssIndex.indexComponent(componentPath2, [cssPath]);
            const index1 = cssIndex.getComponentIndex(componentPath1);
            const index2 = cssIndex.getComponentIndex(componentPath2);
            (0, vitest_1.expect)(index1).toBeDefined();
            (0, vitest_1.expect)(index2).toBeDefined();
            (0, vitest_1.expect)(index1?.hasClass('container')).toBe(true);
            (0, vitest_1.expect)(index2?.hasClass('container')).toBe(true);
        });
        (0, vitest_1.it)('should update index when component is re-indexed', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath1 = path.join(tempDir, 'styles.css');
            const cssPath2 = path.join(tempDir, 'animations.css');
            fs.writeFileSync(cssPath1, '.container { display: flex; }');
            fs.writeFileSync(cssPath2, '.fade-in { animation: fade 1s; }');
            await cssIndex.indexComponent(componentPath, [cssPath1]);
            let index = cssIndex.getComponentIndex(componentPath);
            (0, vitest_1.expect)(index?.cssFiles.size).toBe(1);
            await cssIndex.indexComponent(componentPath, [cssPath1, cssPath2]);
            index = cssIndex.getComponentIndex(componentPath);
            (0, vitest_1.expect)(index?.cssFiles.size).toBe(2);
            (0, vitest_1.expect)(index?.hasClass('fade-in')).toBe(true);
        });
    });
    (0, vitest_1.describe)('updateCSSFile', () => {
        (0, vitest_1.it)('should invalidate cache for updated CSS file', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { display: flex; }');
            await cssIndex.indexComponent(componentPath, [cssPath]);
            cssIndex.updateCSSFile(cssPath);
            // Cache should be invalidated
            const fileCache = cssIndex.getFileCache();
            (0, vitest_1.expect)(fileCache.isStale(cssPath)).toBe(true);
        });
    });
    (0, vitest_1.describe)('removeCSSFile', () => {
        (0, vitest_1.it)('should remove CSS file from cache', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { display: flex; }');
            await cssIndex.indexComponent(componentPath, [cssPath]);
            cssIndex.removeCSSFile(cssPath);
            const fileCache = cssIndex.getFileCache();
            (0, vitest_1.expect)(fileCache.get(cssPath)).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('handleComponentChange', () => {
        (0, vitest_1.it)('should invalidate component index', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { display: flex; }');
            await cssIndex.indexComponent(componentPath, [cssPath]);
            (0, vitest_1.expect)(cssIndex.getComponentIndex(componentPath)).toBeDefined();
            cssIndex.handleComponentChange(componentPath);
            (0, vitest_1.expect)(cssIndex.getComponentIndex(componentPath)).toBeUndefined();
        });
    });
    (0, vitest_1.describe)('clear', () => {
        (0, vitest_1.it)('should clear all indices and caches', async () => {
            const componentPath = path.join(tempDir, 'Component.tsx');
            const cssPath = path.join(tempDir, 'styles.css');
            fs.writeFileSync(cssPath, '.container { display: flex; }');
            await cssIndex.indexComponent(componentPath, [cssPath]);
            (0, vitest_1.expect)(cssIndex.size()).toBeGreaterThan(0);
            cssIndex.clear();
            (0, vitest_1.expect)(cssIndex.size()).toBe(0);
            (0, vitest_1.expect)(cssIndex.getComponentIndex(componentPath)).toBeUndefined();
        });
    });
});
//# sourceMappingURL=cssIndex.test.js.map