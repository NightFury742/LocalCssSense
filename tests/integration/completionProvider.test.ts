import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CompletionProvider } from '../../src/providers/completionProvider';
import { CSSIndex } from '../../src/services/cssIndex';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('CompletionProvider Integration', () => {
  let provider: CompletionProvider;
  let cssIndex: CSSIndex;
  let tempDir: string;

  beforeEach(() => {
    cssIndex = new CSSIndex();
    provider = new CompletionProvider(cssIndex);
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'completion-provider-test-'));
  });

  afterEach(() => {
    cssIndex.clear();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('provideCompletionItems', () => {
    it('should provide completion items for CSS classes when styleName=" is typed', async () => {
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

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="`;
      fs.writeFileSync(componentPath, componentContent);

      // Index the component
      await cssIndex.indexComponent(componentPath, [cssPath]);

      // Open document
      const document = await vscode.workspace.openTextDocument(componentPath);
      // Position after styleName=" on line 3 (0-indexed)
      const lineText = document.lineAt(3).text;
      const quoteIndex = lineText.indexOf('styleName="') + 'styleName="'.length;
      const position = new vscode.Position(3, quoteIndex); // Position after styleName="

      const completionItems = await provider.provideCompletionItems(
        document,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      expect(completionItems).toBeDefined();
      
      const items = Array.isArray(completionItems) 
        ? completionItems 
        : (completionItems as vscode.CompletionList).items;

      expect(items.length).toBeGreaterThanOrEqual(3);
      
      const classNames = items.map(item => item.label);
      expect(classNames).toContain('container');
      expect(classNames).toContain('header');
      expect(classNames).toContain('content');
    });

    it('should not provide completions when not in styleName attribute', async () => {
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

      const completionItems = await provider.provideCompletionItems(
        document,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      // Should not provide completions for className
      expect(completionItems).toBeUndefined();
    });

    it('should provide completion items with correct properties', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; padding: 1rem; }');

      const componentContent = `import './styles.css'; function Component() { return <div styleName="`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      const position = new vscode.Position(0, componentContent.length);

      const completionItems = await provider.provideCompletionItems(
        document,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      const items = Array.isArray(completionItems) 
        ? completionItems 
        : (completionItems as vscode.CompletionList).items;

      const containerItem = items.find(item => item.label === 'container');
      expect(containerItem).toBeDefined();
      expect(containerItem?.kind).toBe(vscode.CompletionItemKind.Class);
      expect(containerItem?.insertText).toBe('container');
      expect(containerItem?.detail).toBeDefined();
    });

    it('should handle components with no CSS imports', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');

      const componentContent = `function Component() { return <div styleName="`;
      fs.writeFileSync(componentPath, componentContent);

      const document = await vscode.workspace.openTextDocument(componentPath);
      const position = new vscode.Position(0, componentContent.length);

      const completionItems = await provider.provideCompletionItems(
        document,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      // Should return empty or undefined when no CSS imports
      if (completionItems) {
        const items = Array.isArray(completionItems) 
          ? completionItems 
          : (completionItems as vscode.CompletionList).items;
        expect(items.length).toBe(0);
      }
    });

    it('should not add extra space after insertText', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; }');

      const componentContent = `import './styles.css'; function Component() { return <div styleName="`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      const position = new vscode.Position(0, componentContent.length);

      const completionItems = await provider.provideCompletionItems(
        document,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      const items = Array.isArray(completionItems) 
        ? completionItems 
        : (completionItems as vscode.CompletionList).items;

      const containerItem = items.find(item => item.label === 'container');
      expect(containerItem).toBeDefined();
      // Verify no extra space is added
      expect(containerItem?.insertText).toBe('container');
      expect(containerItem?.insertText).not.toBe('container ');
    });
  });

  describe('resolveCompletionItem', () => {
    it('should resolve completion item with CSS declaration documentation when scrolling', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      const cssContent = `
        .container {
          display: flex;
          padding: 1rem;
          margin: 0 auto;
          max-width: 1200px;
        }
        .header {
          color: blue;
          font-size: 2rem;
        }
      `;
      fs.writeFileSync(cssPath, cssContent);

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="`;
      fs.writeFileSync(componentPath, componentContent);

      // Index the component
      await cssIndex.indexComponent(componentPath, [cssPath]);

      // Get completion items first
      const document = await vscode.workspace.openTextDocument(componentPath);
      const lineText = document.lineAt(3).text;
      const quoteIndex = lineText.indexOf('styleName="') + 'styleName="'.length;
      const position = new vscode.Position(3, quoteIndex);

      const completionItems = await provider.provideCompletionItems(
        document,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      const items = Array.isArray(completionItems) 
        ? completionItems 
        : (completionItems as vscode.CompletionList).items;

      const containerItem = items.find(item => item.label === 'container');
      expect(containerItem).toBeDefined();

      // Initially, documentation should not be set (lazy resolution)
      // But item should have data for resolution
      expect((containerItem as any).data).toBeDefined();
      expect((containerItem as any).data.componentPath).toBe(componentPath);
      expect((containerItem as any).data.className).toBe('container');

      // Now resolve the item (simulating user scrolling through items)
      const resolvedItem = await provider.resolveCompletionItem(
        containerItem!,
        {} as vscode.CancellationToken
      );

      // Verify documentation is now set
      expect(resolvedItem.documentation).toBeDefined();
      expect(resolvedItem.documentation).toBeInstanceOf(vscode.MarkdownString);
      
      const markdownDoc = resolvedItem.documentation as vscode.MarkdownString;
      expect(markdownDoc.isTrusted).toBe(true);
      
      // Verify documentation contains CSS class definition
      const docValue = markdownDoc.value;
      expect(docValue).toContain('container');
      expect(docValue).toContain('display: flex');
      expect(docValue).toContain('padding: 1rem');
      expect(docValue).toContain('margin: 0 auto');
      expect(docValue).toContain('max-width: 1200px');
      
      // Verify it includes source file information
      expect(docValue).toContain('Source:');
      expect(docValue).toContain('styles.css');
      
      // Verify detail is set
      expect(resolvedItem.detail).toBeDefined();
      expect(resolvedItem.detail).toContain('styles.css');
    });

    it('should resolve multiple completion items with their respective CSS declarations', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      const cssContent = `
        .container {
          display: flex;
        }
        .header {
          color: blue;
          font-weight: bold;
        }
        .content {
          padding: 1rem;
          background: white;
        }
      `;
      fs.writeFileSync(cssPath, cssContent);

      const componentContent = `import './styles.css';

function Component() {
  return <div styleName="`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      const lineText = document.lineAt(3).text;
      const quoteIndex = lineText.indexOf('styleName="') + 'styleName="'.length;
      const position = new vscode.Position(3, quoteIndex);

      const completionItems = await provider.provideCompletionItems(
        document,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      const items = Array.isArray(completionItems) 
        ? completionItems 
        : (completionItems as vscode.CompletionList).items;

      // Resolve each item and verify their documentation
      const containerItem = items.find(item => item.label === 'container');
      const headerItem = items.find(item => item.label === 'header');
      const contentItem = items.find(item => item.label === 'content');

      expect(containerItem).toBeDefined();
      expect(headerItem).toBeDefined();
      expect(contentItem).toBeDefined();

      // Resolve container item
      const resolvedContainer = await provider.resolveCompletionItem(
        containerItem!,
        {} as vscode.CancellationToken
      );
      expect(resolvedContainer.documentation).toBeDefined();
      const containerDoc = (resolvedContainer.documentation as vscode.MarkdownString).value;
      expect(containerDoc).toContain('display: flex');
      expect(containerDoc).not.toContain('color: blue'); // Should only contain container's properties

      // Resolve header item
      const resolvedHeader = await provider.resolveCompletionItem(
        headerItem!,
        {} as vscode.CancellationToken
      );
      expect(resolvedHeader.documentation).toBeDefined();
      const headerDoc = (resolvedHeader.documentation as vscode.MarkdownString).value;
      expect(headerDoc).toContain('color: blue');
      expect(headerDoc).toContain('font-weight: bold');
      expect(headerDoc).not.toContain('display: flex'); // Should only contain header's properties

      // Resolve content item
      const resolvedContent = await provider.resolveCompletionItem(
        contentItem!,
        {} as vscode.CancellationToken
      );
      expect(resolvedContent.documentation).toBeDefined();
      const contentDoc = (resolvedContent.documentation as vscode.MarkdownString).value;
      expect(contentDoc).toContain('padding: 1rem');
      expect(contentDoc).toContain('background: white');
    });

    it('should format CSS declaration as markdown code block', async () => {
      const componentPath = path.join(tempDir, 'Component.tsx');
      const cssPath = path.join(tempDir, 'styles.css');
      
      fs.writeFileSync(cssPath, '.container { display: flex; padding: 1rem; }');

      const componentContent = `import './styles.css'; function Component() { return <div styleName="`;
      fs.writeFileSync(componentPath, componentContent);

      await cssIndex.indexComponent(componentPath, [cssPath]);

      const document = await vscode.workspace.openTextDocument(componentPath);
      const position = new vscode.Position(0, componentContent.length);

      const completionItems = await provider.provideCompletionItems(
        document,
        position,
        {} as vscode.CancellationToken,
        {} as vscode.CompletionContext
      );

      const items = Array.isArray(completionItems) 
        ? completionItems 
        : (completionItems as vscode.CompletionList).items;

      const containerItem = items.find(item => item.label === 'container');
      const resolvedItem = await provider.resolveCompletionItem(
        containerItem!,
        {} as vscode.CancellationToken
      );

      const docValue = (resolvedItem.documentation as vscode.MarkdownString).value;
      
      // Verify markdown code block format
      expect(docValue).toContain('```css');
      expect(docValue).toContain('.container {');
      expect(docValue).toContain('}');
      expect(docValue).toContain('```');
    });

    it('should handle completion items without data gracefully', async () => {
      const item = new vscode.CompletionItem('test', vscode.CompletionItemKind.Class);
      // Item without data property
      
      const resolvedItem = await provider.resolveCompletionItem(
        item,
        {} as vscode.CancellationToken
      );

      // Should return item as-is without throwing
      expect(resolvedItem).toBeDefined();
      expect(resolvedItem).toBe(item);
    });
  });
});

