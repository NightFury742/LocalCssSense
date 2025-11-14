import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CSSFile } from '../models/cssFile';
import { CSSClass } from '../models/cssClass';
import { ComponentIndex } from '../models/componentIndex';
import { Logger } from '../utils/logger';
import { CSSParser } from './cssParser';

/**
 * CSSFileCache service for caching parsed CSS files.
 * Prevents re-parsing unchanged files.
 */
export class CSSFileCache {
  private cache: Map<string, CSSFile> = new Map();

  /**
   * Gets a cached CSS file.
   * 
   * @param filePath - Absolute path to CSS file
   * @returns CSSFile instance or undefined if not cached
   */
  get(filePath: string): CSSFile | undefined {
    return this.cache.get(filePath);
  }

  /**
   * Caches a CSS file.
   * 
   * @param filePath - Absolute path to CSS file
   * @param cssFile - CSSFile instance to cache
   */
  set(filePath: string, cssFile: CSSFile): void {
    this.cache.set(filePath, cssFile);
  }

  /**
   * Removes a CSS file from cache.
   * 
   * @param filePath - Absolute path to CSS file
   */
  invalidate(filePath: string): void {
    this.cache.delete(filePath);
  }

  /**
   * Checks if a cached CSS file is stale.
   * 
   * @param filePath - Absolute path to CSS file
   * @returns True if cache is stale or file doesn't exist, false otherwise
   */
  isStale(filePath: string): boolean {
    const cached = this.cache.get(filePath);
    if (!cached) {
      return true;
    }

    try {
      const stats = fs.statSync(filePath);
      return stats.mtimeMs !== cached.lastModified;
    } catch (error) {
      Logger.warn(`Failed to check file stats for ${filePath}: ${error}`);
      return true;
    }
  }

  /**
   * Clears all cached CSS files.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets the number of cached files.
   */
  size(): number {
    return this.cache.size;
  }
}

/**
 * CSSIndex service for managing in-memory CSS class index.
 * Maps component files to their imported CSS classes.
 */
export class CSSIndex {
  private index: Map<string, ComponentIndex> = new Map();
  private fileCache: CSSFileCache = new CSSFileCache();
  private cssParser: CSSParser = new CSSParser();
  
  // Reverse mapping: CSS file path → Set of component paths that import it
  private cssFileToComponents: Map<string, Set<string>> = new Map();
  
  // File watchers
  private cssFileWatcher: vscode.FileSystemWatcher | undefined;
  private componentFileWatcher: vscode.FileSystemWatcher | undefined;
  
  // Debounce timers for file changes (2 second window per SC-005)
  private cssFileChangeTimers: Map<string, NodeJS.Timeout> = new Map();
  private componentChangeTimers: Map<string, NodeJS.Timeout> = new Map();
  
  // Debounce delay: 2 seconds (2000ms) per SC-005
  private static readonly DEBOUNCE_DELAY_MS = 2000;

  /**
   * Gets the CSS class index for a component.
   * 
   * @param componentPath - Absolute path to component file
   * @returns ComponentIndex instance or undefined if not indexed
   */
  getComponentIndex(componentPath: string): ComponentIndex | undefined {
    return this.index.get(componentPath);
  }

  /**
   * Gets a CSS class by name from a component's imported CSS files.
   * Returns the first occurrence (base definition) when multiple definitions exist.
   * 
   * @param componentPath - Absolute path to component file
   * @param className - CSS class name (without leading dot)
   * @returns CSSClass instance or undefined if not found
   */
  getClass(componentPath: string, className: string): CSSClass | undefined {
    const componentIndex = this.getComponentIndex(componentPath);
    if (!componentIndex) {
      return undefined;
    }
    return componentIndex.getClass(className);
  }

  /**
   * Indexes CSS files imported in a component.
   * 
   * @param componentPath - Absolute path to component file
   * @param cssFilePaths - Array of absolute paths to imported CSS files
   * @returns Promise that resolves when indexing is complete
   */
  async indexComponent(componentPath: string, cssFilePaths: string[]): Promise<void> {
    const cssFiles = new Map<string, CSSFile>();

    // Remove old reverse mappings for this component
    this.removeComponentFromReverseMapping(componentPath);

    for (const cssFilePath of cssFilePaths) {
      try {
        // Check cache first
        let cssFile = this.fileCache.get(cssFilePath);
        
        if (!cssFile || this.fileCache.isStale(cssFilePath)) {
          // Parse CSS file using CSSParser
          try {
            cssFile = await this.cssParser.parseCSSFile(cssFilePath);
            this.fileCache.set(cssFilePath, cssFile);
          } catch (parseError) {
            Logger.warn(`Failed to parse CSS file ${cssFilePath}: ${parseError}`);
            // Continue with other files - graceful degradation
            continue;
          }
        }

        cssFiles.set(cssFilePath, cssFile);
        
        // Update reverse mapping: CSS file → components that import it
        if (!this.cssFileToComponents.has(cssFilePath)) {
          this.cssFileToComponents.set(cssFilePath, new Set());
        }
        this.cssFileToComponents.get(cssFilePath)!.add(componentPath);
      } catch (error) {
        Logger.warn(`Failed to index CSS file ${cssFilePath}: ${error}`);
        // Continue with other files
      }
    }

    // Create or update component index
    const componentIndex = new ComponentIndex(componentPath, cssFiles);
    this.index.set(componentPath, componentIndex);
  }

  /**
   * Removes a component from reverse mapping when it's re-indexed or removed.
   * 
   * @param componentPath - Absolute path to component file
   */
  private removeComponentFromReverseMapping(componentPath: string): void {
    // Find all CSS files that were previously imported by this component
    const oldIndex = this.index.get(componentPath);
    if (oldIndex) {
      for (const cssFilePath of oldIndex.cssFiles.keys()) {
        const components = this.cssFileToComponents.get(cssFilePath);
        if (components) {
          components.delete(componentPath);
          // Clean up empty sets
          if (components.size === 0) {
            this.cssFileToComponents.delete(cssFilePath);
          }
        }
      }
    }
  }

  /**
   * Updates a CSS file in the index (for file change events).
   * Invalidates cache and re-indexes all components that import this CSS file.
   * 
   * @param filePath - Absolute path to CSS file
   * @returns Promise that resolves when update is complete
   */
  async updateCSSFile(filePath: string): Promise<void> {
    try {
      // Invalidate cache
      this.fileCache.invalidate(filePath);
      
      Logger.debug(`CSS file updated: ${filePath}`);
      
      // Get all components that import this CSS file
      const components = this.cssFileToComponents.get(filePath);
      if (!components || components.size === 0) {
        // No components reference this file, just invalidate cache
        return;
      }

      // Re-index all components that import this CSS file
      // Process asynchronously to avoid blocking UI thread
      const reindexPromises: Promise<void>[] = [];
      
      for (const componentPath of components) {
        const componentIndex = this.index.get(componentPath);
        if (!componentIndex) {
          continue;
        }

        // Get all CSS files for this component
        const cssFilePaths = Array.from(componentIndex.cssFiles.keys());
        
        // Re-index the component (will pick up updated CSS file)
        reindexPromises.push(
          this.indexComponent(componentPath, cssFilePaths).catch(error => {
            Logger.warn(`Failed to re-index component ${componentPath} after CSS file update: ${error}`);
          })
        );
      }

      // Wait for all re-indexing to complete (but don't block)
      await Promise.allSettled(reindexPromises);
      
      Logger.debug(`Re-indexed ${components.size} component(s) after CSS file update: ${filePath}`);
    } catch (error) {
      Logger.error(`Error updating CSS file ${filePath}: ${error}`);
    }
  }

  /**
   * Removes a CSS file from the index (for file deletion events).
   * Removes from cache and invalidates all component indices that reference this file.
   * 
   * @param filePath - Absolute path to CSS file
   */
  removeCSSFile(filePath: string): void {
    try {
      // Remove from cache
      this.fileCache.invalidate(filePath);
      
      Logger.debug(`CSS file removed: ${filePath}`);
      
      // Get all components that import this CSS file
      const components = this.cssFileToComponents.get(filePath);
      if (!components || components.size === 0) {
        // No components reference this file
        this.cssFileToComponents.delete(filePath);
        return;
      }

      // Invalidate all component indices that reference this CSS file
      // They will be re-indexed on next access (without the deleted CSS file)
      for (const componentPath of components) {
        this.index.delete(componentPath);
        Logger.debug(`Invalidated component index: ${componentPath} (CSS file deleted)`);
      }

      // Remove reverse mapping
      this.cssFileToComponents.delete(filePath);
    } catch (error) {
      Logger.error(`Error removing CSS file ${filePath}: ${error}`);
    }
  }

  /**
   * Handles component file changes (for import statement changes).
   * Invalidates the component index so it will be re-indexed on next access.
   * 
   * @param componentPath - Absolute path to component file
   */
  handleComponentChange(componentPath: string): void {
    try {
      // Remove existing index - will be re-indexed on next access
      // Also clean up reverse mappings
      this.removeComponentFromReverseMapping(componentPath);
      this.index.delete(componentPath);
      
      Logger.debug(`Component index invalidated: ${componentPath}`);
    } catch (error) {
      Logger.error(`Error handling component change ${componentPath}: ${error}`);
    }
  }

  /**
   * Clears all indices and caches.
   */
  clear(): void {
    this.index.clear();
    this.fileCache.clear();
    this.cssFileToComponents.clear();
    
    // Clear debounce timers
    for (const timer of this.cssFileChangeTimers.values()) {
      clearTimeout(timer);
    }
    this.cssFileChangeTimers.clear();
    
    for (const timer of this.componentChangeTimers.values()) {
      clearTimeout(timer);
    }
    this.componentChangeTimers.clear();
  }

  /**
   * Gets the number of indexed components.
   */
  size(): number {
    return this.index.size;
  }

  /**
   * Gets the CSS file cache instance.
   */
  getFileCache(): CSSFileCache {
    return this.fileCache;
  }

  /**
   * Sets up file watchers for CSS files and component files.
   * Watches for changes, deletions, and creations.
   * 
   * @param workspaceFolder - VS Code workspace folder (optional, uses first workspace if not provided)
   * @returns Array of disposables that should be disposed when extension deactivates
   */
  setupFileWatchers(workspaceFolder?: vscode.WorkspaceFolder): vscode.Disposable[] {
    const disposables: vscode.Disposable[] = [];
    
    // Get workspace folder
    const folder = workspaceFolder || vscode.workspace.workspaceFolders?.[0];
    if (!folder) {
      Logger.warn('No workspace folder available for file watchers');
      return disposables;
    }

    // Watch CSS files (*.css) in workspace
    const cssPattern = new vscode.RelativePattern(folder, '**/*.css');
    this.cssFileWatcher = vscode.workspace.createFileSystemWatcher(cssPattern);
    
    // Handle CSS file changes (create, change)
    this.cssFileWatcher.onDidCreate((uri) => {
      this.handleCSSFileChange(uri.fsPath);
    });
    
    this.cssFileWatcher.onDidChange((uri) => {
      this.handleCSSFileChange(uri.fsPath);
    });
    
    // Handle CSS file deletions
    this.cssFileWatcher.onDidDelete((uri) => {
      this.handleCSSFileDelete(uri.fsPath);
    });
    
    disposables.push(this.cssFileWatcher);

    // Watch component files (*.tsx, *.jsx, *.ts, *.js) in workspace
    const componentPatterns = [
      new vscode.RelativePattern(folder, '**/*.tsx'),
      new vscode.RelativePattern(folder, '**/*.jsx'),
      new vscode.RelativePattern(folder, '**/*.ts'),
      new vscode.RelativePattern(folder, '**/*.js')
    ];
    
    for (const pattern of componentPatterns) {
      const watcher = vscode.workspace.createFileSystemWatcher(pattern);
      
      // Handle component file changes (create, change)
      watcher.onDidCreate((uri) => {
        this.handleComponentFileChange(uri.fsPath);
      });
      
      watcher.onDidChange((uri) => {
        this.handleComponentFileChange(uri.fsPath);
      });
      
      // Note: We don't watch deletions for component files as they're handled by index cleanup
      
      disposables.push(watcher);
    }

    Logger.info('File watchers set up for CSS files and component files');
    return disposables;
  }

  /**
   * Handles CSS file change events with debouncing (2 second window).
   * 
   * @param filePath - Absolute path to CSS file
   */
  private handleCSSFileChange(filePath: string): void {
    // Clear existing timer for this file
    const existingTimer = this.cssFileChangeTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(async () => {
      this.cssFileChangeTimers.delete(filePath);
      
      // Process file change asynchronously to avoid blocking UI thread
      await this.updateCSSFile(filePath);
    }, CSSIndex.DEBOUNCE_DELAY_MS);

    this.cssFileChangeTimers.set(filePath, timer);
  }

  /**
   * Handles CSS file deletion events (no debouncing needed for deletions).
   * 
   * @param filePath - Absolute path to CSS file
   */
  private handleCSSFileDelete(filePath: string): void {
    // Clear any pending change timer
    const timer = this.cssFileChangeTimers.get(filePath);
    if (timer) {
      clearTimeout(timer);
      this.cssFileChangeTimers.delete(filePath);
    }

    // Process deletion immediately (no debounce needed)
    this.removeCSSFile(filePath);
  }

  /**
   * Handles component file change events with debouncing (2 second window).
   * 
   * @param filePath - Absolute path to component file
   */
  private handleComponentFileChange(filePath: string): void {
    // Clear existing timer for this file
    const existingTimer = this.componentChangeTimers.get(filePath);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.componentChangeTimers.delete(filePath);
      
      // Process component change (invalidates index, will be re-indexed on next access)
      this.handleComponentChange(filePath);
    }, CSSIndex.DEBOUNCE_DELAY_MS);

    this.componentChangeTimers.set(filePath, timer);
  }
}

