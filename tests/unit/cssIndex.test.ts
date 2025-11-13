import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CSSIndex } from '../../src/services/cssIndex';
import { CSSFile } from '../../src/models/cssFile';
import { CSSClass } from '../../src/models/cssClass';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('CSSIndex', () => {
  let cssIndex: CSSIndex;
  let tempDir: string;

  beforeEach(() => {
    cssIndex = new CSSIndex();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'css-index-test-'));
  });

  afterEach(() => {
    cssIndex.clear();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('getComponentIndex', () => {
    it('should return undefined for non-indexed component', () => {
      const componentPath = path.join(tempDir, 'Component.tsx');

      const index = cssIndex.getComponentIndex(componentPath);

      expect(index).toBeUndefined();
    });

    it('should return ComponentIndex after indexing', async () => {
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
      expect(index).toBeDefined();
      expect(index?.componentPath).toBe(componentPath);
      expect(index?.getClassNames().length).toBeGreaterThan(0);
    });
  });

  describe('indexComponent', () => {
    it('should index multiple CSS files for a component', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath1 = path.join(tempDir, 'styles.css');
      const cssPath2 = path.join(tempDir, 'animations.css');
      
      fs.writeFileSync(cssPath1, '.container { display: flex; }');
      fs.writeFileSync(cssPath2, '.fade-in { animation: fade 1s; }');

      await cssIndex.indexComponent(componentPath, [cssPath1, cssPath2]);

      const index = cssIndex.getComponentIndex(componentPath);
      expect(index).toBeDefined();
      expect(index?.cssFiles.size).toBe(2);
      expect(index?.hasClass('container')).toBe(true);
      expect(index?.hasClass('fade-in')).toBe(true);
    });

    it('should handle missing CSS files gracefully', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath1 = path.join(tempDir, 'styles.css');
      const cssPath2 = path.join(tempDir, 'non-existent.css');
      
      fs.writeFileSync(cssPath1, '.container { display: flex; }');

      await cssIndex.indexComponent(componentPath, [cssPath1, cssPath2]);

      const index = cssIndex.getComponentIndex(componentPath);
      expect(index).toBeDefined();
      expect(index?.hasClass('container')).toBe(true);
    });

    it('should cache parsed CSS files', async () => {
      const componentPath1 = path.join(tempDir, 'Component1.tsx');
      const componentPath2 = path.join(tempDir, 'Component2.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');

      await cssIndex.indexComponent(componentPath1, [cssPath]);
      await cssIndex.indexComponent(componentPath2, [cssPath]);

      const index1 = cssIndex.getComponentIndex(componentPath1);
      const index2 = cssIndex.getComponentIndex(componentPath2);

      expect(index1).toBeDefined();
      expect(index2).toBeDefined();
      expect(index1?.hasClass('container')).toBe(true);
      expect(index2?.hasClass('container')).toBe(true);
    });

    it('should update index when component is re-indexed', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath1 = path.join(tempDir, 'styles.css');
      const cssPath2 = path.join(tempDir, 'animations.css');
      
      fs.writeFileSync(cssPath1, '.container { display: flex; }');
      fs.writeFileSync(cssPath2, '.fade-in { animation: fade 1s; }');

      await cssIndex.indexComponent(componentPath, [cssPath1]);
      let index = cssIndex.getComponentIndex(componentPath);
      expect(index?.cssFiles.size).toBe(1);

      await cssIndex.indexComponent(componentPath, [cssPath1, cssPath2]);
      index = cssIndex.getComponentIndex(componentPath);
      expect(index?.cssFiles.size).toBe(2);
      expect(index?.hasClass('fade-in')).toBe(true);
    });
  });

  describe('updateCSSFile', () => {
    it('should invalidate cache for updated CSS file', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      await cssIndex.indexComponent(componentPath, [cssPath]);

      cssIndex.updateCSSFile(cssPath);

      // Cache should be invalidated
      const fileCache = cssIndex.getFileCache();
      expect(fileCache.isStale(cssPath)).toBe(true);
    });
  });

  describe('removeCSSFile', () => {
    it('should remove CSS file from cache', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      await cssIndex.indexComponent(componentPath, [cssPath]);

      cssIndex.removeCSSFile(cssPath);

      const fileCache = cssIndex.getFileCache();
      expect(fileCache.get(cssPath)).toBeUndefined();
    });
  });

  describe('handleComponentChange', () => {
    it('should invalidate component index', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      await cssIndex.indexComponent(componentPath, [cssPath]);

      expect(cssIndex.getComponentIndex(componentPath)).toBeDefined();

      cssIndex.handleComponentChange(componentPath);

      expect(cssIndex.getComponentIndex(componentPath)).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should clear all indices and caches', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      await cssIndex.indexComponent(componentPath, [cssPath]);

      expect(cssIndex.size()).toBeGreaterThan(0);

      cssIndex.clear();

      expect(cssIndex.size()).toBe(0);
      expect(cssIndex.getComponentIndex(componentPath)).toBeUndefined();
    });
  });
});

