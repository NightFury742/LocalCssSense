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
    getText: () => content,
    lineAt: (line: number) => ({
      text: lines[line] || '',
      lineNumber: line,
    }),
    getWordRangeAtPosition: (position: MockPosition, regex?: RegExp) => {
      const line = lines[position.line] || '';
      if (regex) {
        // Try to find a match at or before the position
        // Create a string from start of line to position, then search backwards
        const textBefore = line.substring(0, position.character + 1);
        // Find all matches and get the one that contains or is closest to the position
        let match;
        const regexGlobal = new RegExp(regex.source, regex.flags.includes('g') ? regex.flags : regex.flags + 'g');
        while ((match = regexGlobal.exec(line)) !== null) {
          const matchStart = match.index;
          const matchEnd = match.index + match[0].length;
          // Check if position is within this match
          if (position.character >= matchStart && position.character <= matchEnd) {
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
    languageId: filePath.endsWith('.tsx') ? 'typescriptreact' : filePath.endsWith('.jsx') ? 'javascriptreact' : 'plaintext',
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
  },
  languages: {
    registerCompletionItemProvider: vi.fn(),
    registerHoverProvider: vi.fn(),
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

