import type { Config } from './config.js';
import type { IMessageData } from './message-processor.js';
import { MessageCache } from './message-cache.js';
import Database from 'better-sqlite3';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

interface MessageRow {
  ROWID: number;
  guid: string;
  text: string | null;
  handle_id: number;
  date: number;
  is_from_me: number;
  cache_roomnames: string | null;
}

interface HandleRow {
  ROWID: number;
  id: string;
  service: string;
}

interface AttachmentRow {
  ROWID: number;
  filename: string;
  mime_type: string;
  transfer_name: string;
}

export class IMessageMonitor {
  private cache: MessageCache;
  private dbPath: string;
  private db: Database.Database | null = null;
  private targetHandleId: number | null = null;

  constructor(private config: Config) {
    this.cache = new MessageCache();
    this.dbPath = join(homedir(), 'Library', 'Messages', 'chat.db');

    console.log(`Monitoring iMessage database at: ${this.dbPath}`);
    console.log(`Looking for messages from: ${this.config.imessage.contact}`);
    console.log(`\nNOTE: This tool requires direct database access.`);
    console.log(`Please ensure you have granted Full Disk Access to your terminal.`);
    console.log(`System Settings > Privacy & Security > Full Disk Access\n`);
  }

  /**
   * Initialize database connection and find the target contact
   */
  async initialize(): Promise<boolean> {
    try {
      // Check if database exists
      if (!existsSync(this.dbPath)) {
        console.error(`ERROR: Messages database not found at ${this.dbPath}`);
        console.error(`Please ensure iMessage is set up on this Mac.`);
        return false;
      }

      // Open database in readonly mode
      this.db = new Database(this.dbPath, { readonly: true });

      // Find the handle ID for our target contact
      const handle = this.db.prepare(`
        SELECT ROWID, id, service
        FROM handle
        WHERE id = ?
      `).get(this.config.imessage.contact) as HandleRow | undefined;

      if (!handle) {
        console.error(`ERROR: Contact ${this.config.imessage.contact} not found in Messages database.`);
        console.error(`Please ensure you have a conversation with this contact.`);

        // Show available contacts for debugging
        console.error(`\n📋 Available contacts (showing first 20):`);
        const allHandles = this.db.prepare(`
          SELECT id, service FROM handle ORDER BY id LIMIT 20
        `).all() as Array<{id: string; service: string}>;

        for (const h of allHandles) {
          console.error(`   ${h.id} (${h.service})`);
        }
        console.error(`\n💡 Copy the EXACT format from above and use it in your .env file\n`);

        return false;
      }

      this.targetHandleId = handle.ROWID;
      console.log(`Found contact: ${handle.id} (${handle.service}) - Handle ID: ${this.targetHandleId}\n`);

      return true;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      if (error instanceof Error && error.message.includes('SQLITE_AUTH')) {
        console.error('\nPermission denied! Please grant Full Disk Access:');
        console.error('1. Open System Settings > Privacy & Security > Full Disk Access');
        console.error('2. Add your terminal app (Terminal.app, iTerm, etc.)');
        console.error('3. Restart your terminal and try again\n');
      }
      return false;
    }
  }

  /**
   * Check for new messages from the configured contact
   * @returns Array of new messages to process
   */
  async getNewMessages(): Promise<IMessageData[]> {
    if (!this.db || this.targetHandleId === null) {
      console.error('Database not initialized. Call initialize() first.');
      return [];
    }

    try {
      // Query for messages TO the target contact that we haven't processed yet
      // is_from_me = 1 means the message is FROM us (sent by us)
      const messages = this.db.prepare(`
        SELECT
          m.ROWID,
          m.guid,
          m.text,
          m.handle_id,
          m.date,
          m.is_from_me
        FROM message m
        WHERE m.handle_id = ?
          AND m.is_from_me = 1
        ORDER BY m.date DESC
        LIMIT 10
      `).all(this.targetHandleId) as MessageRow[];

      // Filter out already processed messages
      const newMessages: IMessageData[] = [];

      for (const msg of messages) {
        const msgId = msg.ROWID.toString();

        if (!this.cache.isProcessed(msgId)) {
          // Get attachments for this message
          const attachments = this.getMessageAttachments(msg.ROWID);

          newMessages.push({
            id: msgId,
            text: msg.text || '',
            handle_id: msg.handle_id.toString(),
            date: msg.date,
            is_from_me: msg.is_from_me === 1,
            attachments,
          });
        }
      }

      if (newMessages.length > 0) {
        console.log(`Found ${newMessages.length} new message(s)`);
      }

      return newMessages;

    } catch (error) {
      console.error('Error checking messages:', error);
      return [];
    }
  }

  /**
   * Get attachments for a specific message
   */
  private getMessageAttachments(messageRowId: number): Array<{filename: string; mime_type: string; transfer_name?: string}> {
    if (!this.db) return [];

    try {
      const attachments = this.db.prepare(`
        SELECT
          a.filename,
          a.mime_type,
          a.transfer_name
        FROM attachment a
        JOIN message_attachment_join maj ON a.ROWID = maj.attachment_id
        WHERE maj.message_id = ?
      `).all(messageRowId) as AttachmentRow[];

      return attachments.map(a => ({
        filename: a.filename,
        mime_type: a.mime_type,
        transfer_name: a.transfer_name,
      }));
    } catch (error) {
      console.error('Error fetching attachments:', error);
      return [];
    }
  }

  /**
   * Mark a message as successfully processed
   */
  markAsProcessed(messageId: string): void {
    this.cache.markProcessed(messageId);
  }

  /**
   * Mark a message as failed (won't retry on restart)
   */
  markAsFailed(messageId: string): void {
    this.cache.markFailed(messageId);
  }

  /**
   * Check if a message has already been processed
   */
  isProcessed(messageId: string): boolean {
    return this.cache.isProcessed(messageId);
  }

  /**
   * Get the count of processed messages
   */
  getProcessedCount(): number {
    return this.cache.getProcessedCount();
  }

  /**
   * Get the count of failed messages
   */
  getFailedCount(): number {
    return this.cache.getFailedCount();
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}
