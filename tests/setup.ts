import { vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

// Mock VS Code API
class MockPosition {
  constructor(public line: number, public character: number) {}
}

class MockRange {
  public start: MockPosition;
  public end: MockPosition;
  
  constructor(startOrLine: MockPosition | number, endOrCharacter?: MockPosition | number, endLine?: number, endCharacter?: number) {
    if (startOrLine instanceof MockPosition && endOrCharacter instanceof MockPosition) {
      // Range(start, end)
      this.start = startOrLine;
      this.end = endOrCharacter;
    } else if (typeof startOrLine === 'number' && typeof endOrCharacter === 'number' && typeof endLine === 'number' && typeof endCharacter === 'number') {
      // Range(startLine, startCharacter, endLine, endCharacter)
      this.start = new MockPosition(startOrLine, endOrCharacter);
      this.end = new MockPosition(endLine, endCharacter);
    } else {
      // Fallback
      this.start = new MockPosition(0, 0);
      this.end = new MockPosition(0, 0);
    }
  }
  
  static fromPositions(start: MockPosition, end: MockPosition): MockRange {
    return new MockRange(start, end);
  }
}

class MockMarkdownString {
  public value: string = '';
  public isTrusted: boolean = false;
  
  constructor(value?: string) {
    if (value) {
      this.value = value;
    }
  }
  
  appendMarkdown(value: string) {
    this.value += value;
  }
  appendCodeblock(value: string, language?: string) {
    this.value += `\`\`\`${language || ''}\n${value}\n\`\`\``;
  }
}

class MockHover {
  constructor(public contents: any, public range?: any) {}
}

class MockCompletionItem {
  label: string;
  kind?: number;
  detail?: string;
  documentation?: any;
  insertText?: string;
  range?: any;
  
  constructor(label: string, kind?: number) {
    this.label = label;
    this.kind = kind;
  }
}

class MockCompletionList {
  constructor(public items: any[]) {}
}

const createMockDocument = (filePath: string) => {
  const content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';
  const lines = content.split('\n');
  
  return {
    uri: { fsPath: filePath },
    getText: (range?: any) => {
      if (!range) {
        return content;
      }
      // If range is provided, extract text within that range
      const startLine = range.start.line;
      const endLine = range.end.line;
      const startChar = range.start.character;
      const endChar = range.end.character;
      
      if (startLine === endLine) {
        // Single line range
        return lines[startLine]?.substring(startChar, endChar) || '';
      } else {
        // Multi-line range
        let result = lines[startLine]?.substring(startChar) || '';
        for (let i = startLine + 1; i < endLine; i++) {
          result += '\n' + (lines[i] || '');
        }
        result += '\n' + (lines[endLine]?.substring(0, endChar) || '');
        return result;
      }
    },
    lineAt: (line: number) => ({
      text: lines[line] || '',
      lineNumber: line,
    }),
    getWordRangeAtPosition: (position: MockPosition, regex?: RegExp) => {
      const line = lines[position.line] || '';
      if (regex) {
        // Try to find a match at or before the position
        // Find all matches and get the one that contains the position
        let match;
        // Create a non-global version for single match, but we'll iterate manually
        const regexSource = regex.source;
        const regexFlags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
        const regexGlobal = new RegExp(regexSource, regexFlags);
        
        // Reset lastIndex to ensure we search from the beginning
        regexGlobal.lastIndex = 0;
        while ((match = regexGlobal.exec(line)) !== null) {
          const matchStart = match.index;
          const matchEnd = match.index + match[0].length;
          // Check if position is within this match
          if (position.character >= matchStart && position.character < matchEnd) {
            return new MockRange(
              new MockPosition(position.line, matchStart),
              new MockPosition(position.line, matchEnd)
            );
          }
        }
        // If no match found with regex, fall through to default behavior
      }
      // Default: find word boundaries using CSS class name pattern
      let start = position.character;
      let end = position.character;
      // Move start backwards while we have valid CSS class name characters
      while (start > 0 && /[a-zA-Z0-9_-]/.test(line[start - 1])) start--;
      // Move end forwards while we have valid CSS class name characters
      while (end < line.length && /[a-zA-Z0-9_-]/.test(line[end])) end++;
      if (start < end && /[a-zA-Z_-]/.test(line[start])) {
        // Make sure it starts with a valid first character
        return new MockRange(
          new MockPosition(position.line, start),
          new MockPosition(position.line, end)
        );
      }
      return null;
    },
    languageId: filePath.endsWith('.tsx') ? 'typescriptreact' : filePath.endsWith('.jsx') ? 'javascriptreact' : filePath.endsWith('.ts') ? 'typescript' : filePath.endsWith('.js') ? 'javascript' : 'plaintext',
  };
};

const mockVSCode = {
  window: {
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      show: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  workspace: {
    openTextDocument: vi.fn(async (uri: any) => {
      const filePath = typeof uri === 'string' ? uri : uri.fsPath || uri.path;
      return createMockDocument(filePath);
    }),
    asRelativePath: vi.fn((filePath: string) => {
      // Return relative path from current working directory
      try {
        return path.relative(process.cwd(), filePath);
      } catch {
        return filePath;
      }
    }),
    textDocuments: [],
    onDidChangeTextDocument: vi.fn(),
    onDidOpenTextDocument: vi.fn(),
    onDidSaveTextDocument: vi.fn(),
    workspaceFolders: [],
  },
  languages: {
    registerCompletionItemProvider: vi.fn(),
    registerHoverProvider: vi.fn(),
    registerDefinitionProvider: vi.fn(),
    createDiagnosticCollection: vi.fn((name: string) => {
      const diagnostics = new Map<string, any[]>();
      return {
        set: vi.fn((uri: any, diags: any[]) => {
          diagnostics.set(uri.fsPath || uri.path || uri.toString(), diags || []);
        }),
        get: vi.fn((uri: any) => {
          return diagnostics.get(uri.fsPath || uri.path || uri.toString());
        }),
        delete: vi.fn((uri: any) => {
          diagnostics.delete(uri.fsPath || uri.path || uri.toString());
        }),
        clear: vi.fn(() => {
          diagnostics.clear();
        }),
        dispose: vi.fn(() => {
          diagnostics.clear();
        }),
        has: vi.fn((uri: any) => {
          return diagnostics.has(uri.fsPath || uri.path || uri.toString());
        }),
      };
    }),
  },
  DiagnosticSeverity: {
    Error: 0,
    Warning: 1,
    Information: 2,
    Hint: 3,
  },
  Diagnostic: class MockDiagnostic {
    constructor(
      public range: any,
      public message: string,
      public severity: number
    ) {}
    source?: string;
  },
  Location: class MockLocation {
    constructor(public uri: any, public range: any) {}
  },
  Uri: {
    file: vi.fn((path: string) => ({ fsPath: path, path })),
  },
  Position: MockPosition,
  Range: MockRange,
  CompletionItemKind: {
    Class: 7,
  },
  MarkdownString: MockMarkdownString,
  Hover: MockHover,
  CompletionItem: MockCompletionItem,
  CompletionList: MockCompletionList,
  CancellationToken: {
    isCancellationRequested: false,
  },
  CompletionContext: {},
};

// Mock the vscode module
vi.mock('vscode', () => mockVSCode);

export { mockVSCode };

