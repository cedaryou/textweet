import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Persistent cache for tracking processed messages
 * Stores message IDs that have been posted or failed to prevent duplicates
 */
export class MessageCache {
  private cacheFile: string;
  private processedIds: Set<number>;
  private failedIds: Set<number>;

  constructor(cacheFileName: string = '.processed-messages.json') {
    // Store cache file in project root
    this.cacheFile = join(__dirname, '..', cacheFileName);
    this.processedIds = new Set();
    this.failedIds = new Set();

    this.load();
  }

  /**
   * Load processed message IDs from disk
   */
  private load(): void {
    try {
      if (existsSync(this.cacheFile)) {
        const data = JSON.parse(readFileSync(this.cacheFile, 'utf-8'));
        this.processedIds = new Set(data.processed || []);
        this.failedIds = new Set(data.failed || []);
        console.log(`Loaded cache: ${this.processedIds.size} processed, ${this.failedIds.size} failed`);
      } else {
        console.log('No cache file found, starting fresh');
      }
    } catch (error) {
      console.warn('Failed to load message cache, starting fresh:', error);
      this.processedIds = new Set();
      this.failedIds = new Set();
    }
  }

  /**
   * Save processed message IDs to disk
   */
  private save(): void {
    try {
      const data = {
        processed: Array.from(this.processedIds),
        failed: Array.from(this.failedIds),
        lastUpdated: new Date().toISOString(),
      };
      writeFileSync(this.cacheFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save message cache:', error);
    }
  }

  /**
   * Mark a message as successfully processed
   */
  markProcessed(messageId: string): void {
    const id = parseInt(messageId, 10);
    this.processedIds.add(id);
    // Remove from failed if it was there
    this.failedIds.delete(id);
    this.save();
  }

  /**
   * Mark a message as failed (won't retry)
   */
  markFailed(messageId: string): void {
    const id = parseInt(messageId, 10);
    this.failedIds.add(id);
    // Also add to processed to skip it
    this.processedIds.add(id);
    this.save();
  }

  /**
   * Check if a message has been processed or failed
   */
  isProcessed(messageId: string): boolean {
    const id = parseInt(messageId, 10);
    return this.processedIds.has(id) || this.failedIds.has(id);
  }

  /**
   * Check if a message specifically failed
   */
  isFailed(messageId: string): boolean {
    const id = parseInt(messageId, 10);
    return this.failedIds.has(id);
  }

  /**
   * Get total count of processed messages
   */
  getProcessedCount(): number {
    return this.processedIds.size;
  }

  /**
   * Get total count of failed messages
   */
  getFailedCount(): number {
    return this.failedIds.size;
  }

  /**
   * Clear all cached data (useful for debugging)
   */
  clear(): void {
    this.processedIds.clear();
    this.failedIds.clear();
    this.save();
  }
}
