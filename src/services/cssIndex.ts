import * as fs from 'fs';
import * as path from 'path';
import { CSSFile } from '../models/cssFile';
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
   * Indexes CSS files imported in a component.
   * 
   * @param componentPath - Absolute path to component file
   * @param cssFilePaths - Array of absolute paths to imported CSS files
   * @returns Promise that resolves when indexing is complete
   */
  async indexComponent(componentPath: string, cssFilePaths: string[]): Promise<void> {
    const cssFiles = new Map<string, CSSFile>();

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
   * Updates a CSS file in the index (for file change events).
   * This method will be fully implemented in Phase 4.
   * 
   * @param filePath - Absolute path to CSS file
   */
  updateCSSFile(filePath: string): void {
    // Invalidate cache
    this.fileCache.invalidate(filePath);
    
    // Update all component indices that reference this file
    // Will be fully implemented in Phase 4
    Logger.debug(`CSS file updated: ${filePath}`);
  }

  /**
   * Removes a CSS file from the index (for file deletion events).
   * This method will be fully implemented in Phase 4.
   * 
   * @param filePath - Absolute path to CSS file
   */
  removeCSSFile(filePath: string): void {
    // Remove from cache
    this.fileCache.invalidate(filePath);
    
    // Update all component indices that reference this file
    // Will be fully implemented in Phase 4
    Logger.debug(`CSS file removed: ${filePath}`);
  }

  /**
   * Handles component file changes (for import statement changes).
   * This method will be fully implemented in Phase 4.
   * 
   * @param componentPath - Absolute path to component file
   */
  handleComponentChange(componentPath: string): void {
    // Remove existing index - will be re-indexed on next access
    this.index.delete(componentPath);
    Logger.debug(`Component index invalidated: ${componentPath}`);
  }

  /**
   * Clears all indices and caches.
   */
  clear(): void {
    this.index.clear();
    this.fileCache.clear();
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
}

