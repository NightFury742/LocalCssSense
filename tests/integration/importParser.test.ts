import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ImportParser } from '../../src/services/importParser';
import { CSSIndex } from '../../src/services/cssIndex';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('Import Parser Integration', () => {
  let importParser: ImportParser;
  let cssIndex: CSSIndex;
  let tempDir: string;

  beforeEach(() => {
    importParser = new ImportParser();
    cssIndex = new CSSIndex();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'import-parser-test-'));
  });

  afterEach(() => {
    cssIndex.clear();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Import statement change detection', () => {
    it('should detect new CSS import added to component', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath1 = path.join(tempDir, 'styles.css');
      const cssPath2 = path.join(tempDir, 'animations.css');
      
      fs.writeFileSync(cssPath1, '.container { display: flex; }');
      fs.writeFileSync(cssPath2, '.fade-in { animation: fade 1s; }');

      // Initial component with one import
      let componentContent = `import './styles.css';

function Component() {
  return <div styleName="container"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      // Index with initial imports
      const document1 = await vscode.workspace.openTextDocument(componentPath);
      const imports1 = importParser.parseImports(document1);
      await cssIndex.indexComponent(componentPath, imports1.map(imp => imp.resolvedPath));

      // Verify initial state
      let componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();
      expect(componentIndex?.hasClass('container')).toBe(true);
      expect(componentIndex?.hasClass('fade-in')).toBe(false);

      // Add new import
      componentContent = `import './styles.css';
import './animations.css';

function Component() {
  return <div styleName="container"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      // Parse new imports and re-index
      const document2 = await vscode.workspace.openTextDocument(componentPath);
      const imports2 = importParser.parseImports(document2);
      await cssIndex.indexComponent(componentPath, imports2.map(imp => imp.resolvedPath));

      // Verify new class is available
      componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();
      expect(componentIndex?.hasClass('container')).toBe(true);
      expect(componentIndex?.hasClass('fade-in')).toBe(true);
    });

    it('should detect CSS import removed from component', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath1 = path.join(tempDir, 'styles.css');
      const cssPath2 = path.join(tempDir, 'animations.css');
      
      fs.writeFileSync(cssPath1, '.container { display: flex; }');
      fs.writeFileSync(cssPath2, '.fade-in { animation: fade 1s; }');

      // Initial component with two imports
      let componentContent = `import './styles.css';
import './animations.css';

function Component() {
  return <div styleName="container fade-in"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      // Index with both imports
      const document1 = await vscode.workspace.openTextDocument(componentPath);
      const imports1 = importParser.parseImports(document1);
      await cssIndex.indexComponent(componentPath, imports1.map(imp => imp.resolvedPath));

      // Verify initial state
      let componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();
      expect(componentIndex?.hasClass('container')).toBe(true);
      expect(componentIndex?.hasClass('fade-in')).toBe(true);

      // Remove one import
      componentContent = `import './styles.css';

function Component() {
  return <div styleName="container"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      // Parse imports and re-index
      const document2 = await vscode.workspace.openTextDocument(componentPath);
      const imports2 = importParser.parseImports(document2);
      await cssIndex.indexComponent(componentPath, imports2.map(imp => imp.resolvedPath));

      // Verify removed class is no longer available
      componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();
      expect(componentIndex?.hasClass('container')).toBe(true);
      expect(componentIndex?.hasClass('fade-in')).toBe(false);
    });

    it('should handle component change invalidation correctly', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath1 = path.join(tempDir, 'styles.css');
      const cssPath2 = path.join(tempDir, 'animations.css');
      
      fs.writeFileSync(cssPath1, '.container { display: flex; }');
      fs.writeFileSync(cssPath2, '.fade-in { animation: fade 1s; }');

      // Initial component
      let componentContent = `import './styles.css';

function Component() {
  return <div styleName="container"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      // Index component
      const document1 = await vscode.workspace.openTextDocument(componentPath);
      const imports1 = importParser.parseImports(document1);
      await cssIndex.indexComponent(componentPath, imports1.map(imp => imp.resolvedPath));

      // Verify indexed
      expect(cssIndex.getComponentIndex(componentPath)).toBeDefined();

      // Simulate component change (file watcher would call this)
      cssIndex.handleComponentChange(componentPath);

      // Component index should be invalidated
      expect(cssIndex.getComponentIndex(componentPath)).toBeUndefined();

      // Re-index with new imports
      componentContent = `import './styles.css';
import './animations.css';

function Component() {
  return <div styleName="container fade-in"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      const document2 = await vscode.workspace.openTextDocument(componentPath);
      const imports2 = importParser.parseImports(document2);
      await cssIndex.indexComponent(componentPath, imports2.map(imp => imp.resolvedPath));

      // Verify re-indexed with new classes
      const componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();
      expect(componentIndex?.hasClass('container')).toBe(true);
      expect(componentIndex?.hasClass('fade-in')).toBe(true);
    });

    it('should handle multiple CSS imports correctly', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath1 = path.join(tempDir, 'styles.css');
      const cssPath2 = path.join(tempDir, 'animations.css');
      const cssPath3 = path.join(tempDir, 'layout.css');
      
      fs.writeFileSync(cssPath1, '.container { display: flex; }');
      fs.writeFileSync(cssPath2, '.fade-in { animation: fade 1s; }');
      fs.writeFileSync(cssPath3, '.grid { display: grid; }');

      const componentContent = `import './styles.css';
import './animations.css';
import './layout.css';

function Component() {
  return <div styleName="container fade-in grid"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      // Parse and index
      const document = await vscode.workspace.openTextDocument(componentPath);
      const imports = importParser.parseImports(document);
      expect(imports.length).toBe(3);
      
      await cssIndex.indexComponent(componentPath, imports.map(imp => imp.resolvedPath));

      // Verify all classes are available
      const componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();
      expect(componentIndex?.hasClass('container')).toBe(true);
      expect(componentIndex?.hasClass('fade-in')).toBe(true);
      expect(componentIndex?.hasClass('grid')).toBe(true);
    });

    it('should handle import order changes', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath1 = path.join(tempDir, 'styles.css');
      const cssPath2 = path.join(tempDir, 'animations.css');
      
      fs.writeFileSync(cssPath1, '.container { display: flex; }');
      fs.writeFileSync(cssPath2, '.fade-in { animation: fade 1s; }');

      // Initial order
      let componentContent = `import './styles.css';
import './animations.css';

function Component() {
  return <div styleName="container fade-in"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      const document1 = await vscode.workspace.openTextDocument(componentPath);
      const imports1 = importParser.parseImports(document1);
      await cssIndex.indexComponent(componentPath, imports1.map(imp => imp.resolvedPath));

      // Change import order
      componentContent = `import './animations.css';
import './styles.css';

function Component() {
  return <div styleName="container fade-in"></div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      const document2 = await vscode.workspace.openTextDocument(componentPath);
      const imports2 = importParser.parseImports(document2);
      
      // Verify imports are still detected (order shouldn't matter)
      expect(imports2.length).toBe(2);
      
      await cssIndex.indexComponent(componentPath, imports2.map(imp => imp.resolvedPath));

      // Verify classes are still available
      const componentIndex = cssIndex.getComponentIndex(componentPath);
      expect(componentIndex).toBeDefined();
      expect(componentIndex?.hasClass('container')).toBe(true);
      expect(componentIndex?.hasClass('fade-in')).toBe(true);
    });
  });
});

