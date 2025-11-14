import * as vscode from 'vscode';
import { CSSIndex } from './services/cssIndex';
import { CompletionProvider } from './providers/completionProvider';
import { HoverProvider } from './providers/hoverProvider';
import { DefinitionProvider } from './providers/definitionProvider';
import { DiagnosticProvider } from './providers/diagnosticProvider';
import { Logger } from './utils/logger';

// Global CSS index instance (lazy initialized)
let cssIndex: CSSIndex | undefined;

/**
 * Gets or creates the CSS index instance (lazy initialization).
 */
function getCSSIndex(): CSSIndex {
  if (!cssIndex) {
    cssIndex = new CSSIndex();
    Logger.debug('CSS index initialized');
  }
  return cssIndex;
}

/**
 * Extension activation function.
 * Called when VS Code activates the extension (onLanguage:typescriptreact, javascriptreact, typescript, or javascript).
 */
export function activate(context: vscode.ExtensionContext): void {
  // Initialize logger
  Logger.initialize('Local CSS IntelliSense');
  Logger.info('Extension activating...');

  // Lazy initialization: Create CSS index on first use
  // Providers will initialize it when needed

  // Register completion provider for typescriptreact, javascriptreact, typescript, and javascript
  const completionProvider = new CompletionProvider(getCSSIndex());
  const completionDisposable = vscode.languages.registerCompletionItemProvider(
    [
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'javascript' }
    ],
    completionProvider,
    '"', // Trigger character: double quote
    "'", // Trigger character: single quote
    ' '  // Trigger character: space (to auto-trigger after selecting a class)
  );
  context.subscriptions.push(completionDisposable);

  // Register hover provider for typescriptreact, javascriptreact, typescript, and javascript
  const hoverProvider = new HoverProvider(getCSSIndex());
  const hoverDisposable = vscode.languages.registerHoverProvider(
    [
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'javascript' }
    ],
    hoverProvider
  );
  context.subscriptions.push(hoverDisposable);

  // Register definition provider for typescriptreact, javascriptreact, typescript, and javascript
  const definitionProvider = new DefinitionProvider(getCSSIndex());
  const definitionDisposable = vscode.languages.registerDefinitionProvider(
    [
      { scheme: 'file', language: 'typescriptreact' },
      { scheme: 'file', language: 'javascriptreact' },
      { scheme: 'file', language: 'typescript' },
      { scheme: 'file', language: 'javascript' }
    ],
    definitionProvider
  );
  context.subscriptions.push(definitionDisposable);

  // Register diagnostic provider for typescriptreact and javascriptreact
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('localCssSense');
  context.subscriptions.push(diagnosticCollection);
  const diagnosticProvider = new DiagnosticProvider(getCSSIndex(), diagnosticCollection);
  
  // Update diagnostics when document changes
  const updateDiagnostics = async (document: vscode.TextDocument) => {
    if (['typescriptreact', 'javascriptreact', 'typescript', 'javascript'].includes(document.languageId)) {
      await diagnosticProvider.updateDiagnostics(document);
    }
  };

  // Update diagnostics for all open documents
  vscode.workspace.textDocuments.forEach(updateDiagnostics);

  // Update diagnostics when document is opened, changed, or saved
  const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument(
    async (event) => {
      await updateDiagnostics(event.document);
    }
  );
  context.subscriptions.push(onDidChangeTextDocument);

  const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument(
    async (document) => {
      await updateDiagnostics(document);
    }
  );
  context.subscriptions.push(onDidOpenTextDocument);

  const onDidSaveTextDocument = vscode.workspace.onDidSaveTextDocument(
    async (document) => {
      await updateDiagnostics(document);
    }
  );
  context.subscriptions.push(onDidSaveTextDocument);

  // Register command to trigger completion manually (Ctrl+Enter)
  const triggerCompletionCommand = vscode.commands.registerCommand(
    'localCssSense.triggerCompletion',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      // Trigger the built-in VS Code completion command
      await vscode.commands.executeCommand('editor.action.triggerSuggest');
    }
  );
  context.subscriptions.push(triggerCompletionCommand);

  // Set up file watchers for CSS files and component files (Phase 4)
  const fileWatcherDisposables = getCSSIndex().setupFileWatchers();
  for (const disposable of fileWatcherDisposables) {
    context.subscriptions.push(disposable);
  }

  Logger.info('Extension activated successfully');
}

/**
 * Extension deactivation function.
 * Called when VS Code deactivates the extension.
 */
export function deactivate(): void {
  // Clear CSS index and dispose resources
  if (cssIndex) {
    cssIndex.clear();
    cssIndex = undefined;
  }

  // Dispose logger
  Logger.dispose();

  Logger.info('Extension deactivated');
}

