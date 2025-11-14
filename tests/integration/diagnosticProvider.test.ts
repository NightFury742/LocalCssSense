import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DiagnosticProvider } from '../../src/providers/diagnosticProvider';
import { CSSIndex } from '../../src/services/cssIndex';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('DiagnosticProvider Integration', () => {
  let provider: DiagnosticProvider;
  let cssIndex: CSSIndex;
  let diagnosticCollection: vscode.DiagnosticCollection;
  let tempDir: string;

  beforeEach(() => {
    cssIndex = new CSSIndex();
    diagnosticCollection = vscode.languages.createDiagnosticCollection('test');
    provider = new DiagnosticProvider(cssIndex, diagnosticCollection);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'diagnostic-provider-test-'));
  });

  afterEach(() => {
    cssIndex.clear();
    diagnosticCollection.dispose();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('updateDiagnostics', () => {
    it('should create diagnostic for invalid CSS class name', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      const cssContent = `
        .container {
          display: flex;
        }
      `;
      fs.writeFileSync(cssPath, cssContent);

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="invalid-class">Hello</div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      // Index the component
      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      await provider.updateDiagnostics(document);

      const diagnostics = diagnosticCollection.get(document.uri);
      expect(diagnostics).toBeDefined();
      expect(diagnostics?.length).toBe(1);
      expect(diagnostics?.[0].message).toContain('invalid-class');
      expect(diagnostics?.[0].severity).toBe(vscode.DiagnosticSeverity.Information);
    });

    it('should not create diagnostic for valid CSS class name', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      const cssContent = `
        .container {
          display: flex;
        }
      `;
      fs.writeFileSync(cssPath, cssContent);

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="container">Hello</div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      await provider.updateDiagnostics(document);

      const diagnostics = diagnosticCollection.get(document.uri);
      if (diagnostics) {
        expect(diagnostics.length).toBe(0);
      } else {
        expect(diagnostics).toBeUndefined();
      }
    });

    it('should create diagnostics for multiple invalid classes', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      const cssContent = `
        .container {
          display: flex;
        }
      `;
      fs.writeFileSync(cssPath, cssContent);

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="invalid1 invalid2">Hello</div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      await provider.updateDiagnostics(document);

      const diagnostics = diagnosticCollection.get(document.uri);
      expect(diagnostics).toBeDefined();
      expect(diagnostics?.length).toBe(2);
      expect(diagnostics?.some(d => d.message.includes('invalid1'))).toBe(true);
      expect(diagnostics?.some(d => d.message.includes('invalid2'))).toBe(true);
    });

    it('should handle multiple styleName attributes', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      const cssContent = `
        .container {
          display: flex;
        }
      `;
      fs.writeFileSync(cssPath, cssContent);

      const componentContent = `import './styles.css';

function Component() {
  return (
    <div styleName="container">
      <span styleName="invalid-class">Text</span>
    </div>
  );
}`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      await provider.updateDiagnostics(document);

      const diagnostics = diagnosticCollection.get(document.uri);
      expect(diagnostics).toBeDefined();
      expect(diagnostics?.length).toBe(1);
      expect(diagnostics?.[0].message).toContain('invalid-class');
    });

    it('should not create diagnostics for non-React files', async () => {
      const componentPath = path.join(tempDir, 'Component.txt');
      
      const componentContent = `styleName="invalid-class"`;
      fs.writeFileSync(componentPath, componentContent);

      const document = await vscode.workspace.openTextDocument(componentPath);
      await provider.updateDiagnostics(document);

      const diagnostics = diagnosticCollection.get(document.uri);
      if (diagnostics) {
        expect(diagnostics.length).toBe(0);
      } else {
        expect(diagnostics).toBeUndefined();
      }
    });

    it('should clear diagnostics when no CSS imports found', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      
      const componentContent = `function Component() {
  return <div styleName="some-class">Hello</div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      const document = await vscode.workspace.openTextDocument(componentPath);
      await provider.updateDiagnostics(document);

      const diagnostics = diagnosticCollection.get(document.uri);
      if (diagnostics) {
        expect(diagnostics.length).toBe(0);
      } else {
        expect(diagnostics).toBeUndefined();
      }
    });

    it('should handle valid and invalid classes in same styleName', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      const cssContent = `
        .container {
          display: flex;
        }
      `;
      fs.writeFileSync(cssPath, cssContent);

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="container invalid-class">Hello</div>;
}`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      await provider.updateDiagnostics(document);

      const diagnostics = diagnosticCollection.get(document.uri);
      expect(diagnostics).toBeDefined();
      expect(diagnostics?.length).toBe(1);
      expect(diagnostics?.[0].message).toContain('invalid-class');
    });
  });
});

