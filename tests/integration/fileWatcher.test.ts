import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CSSIndex } from '../../src/services/cssIndex';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('File Watcher Integration', () => {
  let cssIndex: CSSIndex;
  let tempDir: string;
  let workspaceFolder: vscode.WorkspaceFolder;
  let disposables: vscode.Disposable[];

  beforeEach(() => {
    cssIndex = new CSSIndex();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-watcher-test-'));
    
    // Create a mock workspace folder
    workspaceFolder = {
      uri: vscode.Uri.file(tempDir),
      name: path.basename(tempDir),
      index: 0
    } as vscode.WorkspaceFolder;

    // Set up file watchers
    disposables = cssIndex.setupFileWatchers(workspaceFolder);
  });

  afterEach(() => {
    // Dispose watchers
    for (const disposable of disposables) {
      disposable.dispose();
    }
    
    cssIndex.clear();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('CSS file change detection', () => {
    it('should detect CSS file changes and update index', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      // Create initial CSS file
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      
      // Create component file
      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="container"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      // Index the component
      await cssIndex.indexComponent(componentPath, [cssPath]);
      
      // Verify initial state
      let componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();
      expect(componentIndex?.hasClass('container')).toBe(true);
      expect(componentIndex?.hasClass('new-class')).toBe(false);

      // Update CSS file (add new class)
      fs.writeFileSync(cssPath, `.container { display: flex; }
.new-class { color: red; }`);

      // Wait for debounce delay (2 seconds) + processing time
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Verify cache is invalidated
      const fileCache = cssIndex.getFileCache();
      expect(fileCache.isStale(cssPath)).toBe(true);

      // Re-index to pick up changes
      await cssIndex.indexComponent(componentPath, [cssPath]);
      
      // Verify new class is available
      componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();
      expect(componentIndex?.hasClass('new-class')).toBe(true);
    });

    it('should debounce rapid CSS file changes', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      fs.writeFileSync(componentPath, `import './styles.css';`);
      
      await cssIndex.indexComponent(componentPath, [cssPath]);

      // Make rapid changes
      fs.writeFileSync(cssPath, '.container { display: block; }');
      await new Promise(resolve => setTimeout(resolve, 500));
      fs.writeFileSync(cssPath, '.container { display: grid; }');
      await new Promise(resolve => setTimeout(resolve, 500));
      fs.writeFileSync(cssPath, '.container { display: flex; }');

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Cache should be invalidated (only one update should have been processed)
      const fileCache = cssIndex.getFileCache();
      expect(fileCache.isStale(cssPath)).toBe(true);
    });

    it('should handle CSS file deletion', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      fs.writeFileSync(componentPath, `import './styles.css';`);
      
      await cssIndex.indexComponent(componentPath, [cssPath]);

      // Verify component is indexed
      let componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();

      // Delete CSS file
      fs.unlinkSync(cssPath);

      // Wait a bit for deletion to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Component index should be invalidated
      componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeUndefined();

      // Cache should be cleared
      const fileCache = cssIndex.getFileCache();
      expect(fileCache.get(cssPath)).toBeUndefined();
    });
  });

  describe('Component file change detection', () => {
    it('should detect component file changes and invalidate index', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      
      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="container"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      // Verify component is indexed
      let componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();

      // Modify component file (change import)
      const newComponentContent = `import './styles.css';
import './animations.css';

function Component() {
  return <div styleName="container"></div>;
}`;
      fs.writeFileSync(componentPath, newComponentContent);

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Component index should be invalidated (will be re-indexed on next access)
      componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeUndefined();
    });

    it('should debounce rapid component file changes', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      
      const componentContent = `import './styles.css';`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      // Make rapid changes
      fs.writeFileSync(componentPath, `import './styles.css';
// comment`);
      await new Promise(resolve => setTimeout(resolve, 500));
      fs.writeFileSync(componentPath, `import './styles.css';
// another comment`);
      await new Promise(resolve => setTimeout(resolve, 500));
      fs.writeFileSync(componentPath, `import './styles.css';`);

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Component index should be invalidated (only one invalidation should have occurred)
      const componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeUndefined();
    });
  });

  describe('Multiple components referencing same CSS file', () => {
    it('should update all components when CSS file changes', async () => {
      const component1Path = path.join(tempDir, 'Component1.tsx');
      const component2Path = path.join(tempDir, 'Component2.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      fs.writeFileSync(component1Path, `import './styles.css';`);
      fs.writeFileSync(component2Path, `import './styles.css';`);

      await cssIndex.indexComponent(component1Path, [cssPath]);
      await cssIndex.indexComponent(component2Path, [cssPath]);

      // Verify both components are indexed
      expect(cssIndex.getComponentIndex(component1Path)).toBeDefined();
      expect(cssIndex.getComponentIndex(component2Path)).toBeDefined();

      // Update CSS file
      fs.writeFileSync(cssPath, `.container { display: flex; }
.new-class { color: red; }`);

      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Cache should be invalidated
      const fileCache = cssIndex.getFileCache();
      expect(fileCache.isStale(cssPath)).toBe(true);

      // Re-index both components to pick up changes
      await cssIndex.indexComponent(component1Path, [cssPath]);
      await cssIndex.indexComponent(component2Path, [cssPath]);

      // Verify both components have the new class
      const index1 = cssIndex.getComponentIndex(component1Path);
      const index2 = cssIndex.getComponentIndex(component2Path);
      expect(index1?.hasClass('new-class')).toBe(true);
      expect(index2?.hasClass('new-class')).toBe(true);
    });

    it('should invalidate all components when CSS file is deleted', async () => {
      const component1Path = path.join(tempDir, 'Component1.tsx');
      const component2Path = path.join(tempDir, 'Component2.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');
      fs.writeFileSync(component1Path, `import './styles.css';`);
      fs.writeFileSync(component2Path, `import './styles.css';`);

      await cssIndex.indexComponent(component1Path, [cssPath]);
      await cssIndex.indexComponent(component2Path, [cssPath]);

      // Delete CSS file
      fs.unlinkSync(cssPath);

      // Wait a bit for deletion to be processed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Both component indices should be invalidated
      expect(cssIndex.getComponentIndex(component1Path)).toBeUndefined();
      expect(cssIndex.getComponentIndex(component2Path)).toBeUndefined();
    });
  });
});

