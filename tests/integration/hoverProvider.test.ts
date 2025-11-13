import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { HoverProvider } from '../../src/providers/hoverProvider';
import { CSSIndex } from '../../src/services/cssIndex';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('HoverProvider Integration', () => {
  let provider: HoverProvider;
  let cssIndex: CSSIndex;
  let tempDir: string;

  beforeEach(() => {
    cssIndex = new CSSIndex();
    provider = new HoverProvider(cssIndex);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hover-provider-test-'));
  });

  afterEach(() => {
    cssIndex.clear();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('provideHover', () => {
    it('should provide hover information for CSS class in styleName attribute', async () => {
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

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="container">Hello</div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      // Index the component
      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      // Position on "container" text (line 3, find the word)
      const lineText = document.lineAt(3).text;
      const containerIndex = lineText.indexOf('container');
      const position = new vscode.Position(3, containerIndex + 4); // Position in middle of "container"

      const hover = await provider.provideHover(
        document,
        position,
        {} as vscode.CancellationToken
      );

      expect(hover).toBeDefined();
      expect(hover?.contents).toBeDefined();
      
      const contents = Array.isArray(hover?.contents) 
        ? hover?.contents 
        : [hover?.contents];
      
      const markdownContent = contents.find(c => c instanceof vscode.MarkdownString);
      expect(markdownContent).toBeDefined();
      
      if (markdownContent instanceof vscode.MarkdownString) {
        const value = markdownContent.value;
        expect(value).toContain('container');
        expect(value).toContain('display: flex');
        expect(value).toContain('padding: 1rem');
      }
    });

    it('should not provide hover for non-CSS class text', async () => {
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

      const hover = await provider.provideHover(
        document,
        position,
        {} as vscode.CancellationToken
      );

      // Should not provide hover for non-existent class
      expect(hover).toBeUndefined();
    });

    it('should not provide hover outside styleName attribute', async () => {
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

      const hover = await provider.provideHover(
        document,
        position,
        {} as vscode.CancellationToken
      );

      // Should not provide hover for className attribute
      expect(hover).toBeUndefined();
    });

    it('should provide hover with CSS definition format', async () => {
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

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="header">Hello</div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      // Position on "header" text (line 3)
      const lineText = document.lineAt(3).text;
      const headerIndex = lineText.indexOf('header');
      const position = new vscode.Position(3, headerIndex + 3); // Position in middle of "header"

      const hover = await provider.provideHover(
        document,
        position,
        {} as vscode.CancellationToken
      );

      expect(hover).toBeDefined();
      
      const contents = Array.isArray(hover?.contents) 
        ? hover?.contents 
        : [hover?.contents];
      
      const markdownContent = contents.find(c => c instanceof vscode.MarkdownString);
      if (markdownContent instanceof vscode.MarkdownString) {
        const value = markdownContent.value;
        expect(value).toContain('header');
        expect(value).toContain('font-size');
        expect(value).toContain('color');
      }
    });

    it('should handle multiple CSS classes in styleName', async () => {
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

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="container header">Hello</div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      // Position on "container" (line 3)
      const lineText = document.lineAt(3).text;
      const containerIndex = lineText.indexOf('container');
      const position1 = new vscode.Position(3, containerIndex + 4); // Position in middle of "container"
      // Position on "header"
      const headerIndex = lineText.indexOf('header');
      const position2 = new vscode.Position(3, headerIndex + 3); // Position in middle of "header"

      const hover1 = await provider.provideHover(document, position1, {} as vscode.CancellationToken);
      const hover2 = await provider.provideHover(document, position2, {} as vscode.CancellationToken);

      expect(hover1).toBeDefined();
      expect(hover2).toBeDefined();
    });
  });
});

