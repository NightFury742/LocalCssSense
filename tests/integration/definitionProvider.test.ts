import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DefinitionProvider } from '../../src/providers/definitionProvider';
import { CSSIndex } from '../../src/services/cssIndex';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('DefinitionProvider Integration', () => {
  let provider: DefinitionProvider;
  let cssIndex: CSSIndex;
  let tempDir: string;

  beforeEach(() => {
    cssIndex = new CSSIndex();
    provider = new DefinitionProvider(cssIndex);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'definition-provider-test-'));
  });

  afterEach(() => {
    cssIndex.clear();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('provideDefinition', () => {
    it('should provide definition location for CSS class in styleName attribute', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      const cssContent = `
        .container {
          display: flex;
          padding: 1rem;
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

      const definition = await provider.provideDefinition(
        document,
        position,
        {} as vscode.CancellationToken
      );

      expect(definition).toBeDefined();
      expect(definition?.uri.fsPath).toBe(cssPath);
      // CSS class is defined at line 2 in CSS file (0-indexed = line 1)
      expect(definition?.range.start.line).toBe(1);
      expect(definition?.range.start.character).toBe(0);
    });

    it('should return undefined for non-existent CSS class', async () => {
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

      const definition = await provider.provideDefinition(
        document,
        position,
        {} as vscode.CancellationToken
      );

      // Should not provide definition for non-existent class
      expect(definition).toBeUndefined();
    });

    it('should return undefined outside styleName attribute', async () => {
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

      const definition = await provider.provideDefinition(
        document,
        position,
        {} as vscode.CancellationToken
      );

      // Should not provide definition for className attribute
      expect(definition).toBeUndefined();
    });

    it('should return first occurrence when multiple definitions exist', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      const cssContent = `
        .header {
          font-size: 2rem;
        }
        
        @media (min-width: 768px) {
          .header {
            font-size: 3rem;
          }
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
      const lineText = document.lineAt(3).text;
      const headerIndex = lineText.indexOf('header');
      const position = new vscode.Position(3, headerIndex + 3);

      const definition = await provider.provideDefinition(
        document,
        position,
        {} as vscode.CancellationToken
      );

      expect(definition).toBeDefined();
      // Should navigate to first occurrence (base definition at line 2, 0-indexed = line 1)
      expect(definition?.range.start.line).toBe(1);
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
      const lineText = document.lineAt(3).text;
      
      // Test definition for "container"
      const containerIndex = lineText.indexOf('container');
      const position1 = new vscode.Position(3, containerIndex + 4);
      const definition1 = await provider.provideDefinition(
        document,
        position1,
        {} as vscode.CancellationToken
      );
      expect(definition1).toBeDefined();
      expect(definition1?.uri.fsPath).toBe(cssPath);

      // Test definition for "header"
      const headerIndex = lineText.indexOf('header');
      const position2 = new vscode.Position(3, headerIndex + 3);
      const definition2 = await provider.provideDefinition(
        document,
        position2,
        {} as vscode.CancellationToken
      );
      expect(definition2).toBeDefined();
      expect(definition2?.uri.fsPath).toBe(cssPath);
    });
  });
});

