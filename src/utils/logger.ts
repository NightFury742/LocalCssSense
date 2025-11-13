import * as vscode from 'vscode';

/**
 * Logger utility for VS Code extension.
 * Provides logging functionality via VS Code output channel.
 */
export class Logger {
  private static outputChannel: vscode.OutputChannel | undefined;

  /**
   * Initialize the logger with a VS Code output channel.
   */
  static initialize(channelName: string = 'Local CSS IntelliSense'): void {
    if (!this.outputChannel) {
      this.outputChannel = vscode.window.createOutputChannel(channelName);
    }
  }

  /**
   * Log an informational message.
   */
  static info(message: string): void {
    this.log('INFO', message);
  }

  /**
   * Log a warning message.
   */
  static warn(message: string): void {
    this.log('WARN', message);
  }

  /**
   * Log an error message.
   */
  static error(message: string, error?: Error): void {
    const errorMessage = error ? `${message}: ${error.message}` : message;
    this.log('ERROR', errorMessage);
    if (error && error.stack) {
      this.outputChannel?.appendLine(error.stack);
    }
  }

  /**
   * Log a debug message.
   */
  static debug(message: string): void {
    this.log('DEBUG', message);
  }

  /**
   * Internal logging method.
   */
  private static log(level: string, message: string): void {
    if (!this.outputChannel) {
      // Fallback to console if not initialized
      console.log(`[${level}] ${message}`);
      return;
    }

    const timestamp = new Date().toISOString();
    this.outputChannel.appendLine(`[${timestamp}] [${level}] ${message}`);
  }

  /**
   * Show the output channel in VS Code.
   */
  static show(): void {
    this.outputChannel?.show();
  }

  /**
   * Dispose of the logger and close the output channel.
   */
  static dispose(): void {
    this.outputChannel?.dispose();
    this.outputChannel = undefined;
  }
}

