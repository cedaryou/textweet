import type { Config } from './config.js';
import { homedir } from 'os';

export interface ProcessedMessage {
  text: string;
  mediaPaths: string[];
  originalText: string;
  wasTruncated: boolean;
}

export interface IMessageData {
  id: string;
  text: string;
  handle_id: string;
  date: number;
  is_from_me: boolean;
  attachments?: Array<{
    filename: string;
    mime_type: string;
    transfer_name?: string;
  }>;
}

export class MessageProcessor {
  constructor(private config: Config) {}

  /**
   * Process an iMessage for posting to Twitter
   * @param message - Raw message data from iMessage MCP
   * @returns Processed message ready for tweeting
   */
  processMessage(message: IMessageData): ProcessedMessage {
    // Extract text content
    let text = message.text?.trim() || '';
    const originalText = text;
    let wasTruncated = false;

    // Handle tweet length limit
    if (text.length > this.config.tweet.maxLength) {
      text = text.substring(0, this.config.tweet.maxLength - 1) + '…';
      wasTruncated = true;
      console.log(`  Message truncated from ${originalText.length} to ${text.length} characters`);
    }

    // Extract media attachments
    const mediaPaths = this.extractMediaPaths(message);

    // Validate media count (X allows max 4 images per tweet)
    if (mediaPaths.length > 4) {
      console.warn(`  Warning: Found ${mediaPaths.length} images, but X only allows 4 per tweet. Using first 4.`);
      mediaPaths.splice(4);
    }

    return {
      text,
      mediaPaths,
      originalText,
      wasTruncated,
    };
  }

  /**
   * Extract media file paths from message attachments
   * @param message - Raw message data
   * @returns Array of absolute file paths to images
   */
  private extractMediaPaths(message: IMessageData): string[] {
    if (!message.attachments || message.attachments.length === 0) {
      return [];
    }

    const supportedImageTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
    ];

    const mediaPaths: string[] = [];

    for (const attachment of message.attachments) {
      // Check if it's a supported image type
      if (attachment.mime_type && supportedImageTypes.includes(attachment.mime_type.toLowerCase())) {
        // Use filename or transfer_name
        let path = attachment.filename || attachment.transfer_name;
        if (path) {
          // Expand ~ to home directory (Messages stores paths with ~)
          if (path.startsWith('~')) {
            path = path.replace('~', homedir());
          }
          mediaPaths.push(path);
          console.log(`  Found image attachment: ${path}`);
          console.log(`    MIME type: ${attachment.mime_type}`);
        }
      } else if (attachment.mime_type) {
        console.log(`  Skipping unsupported attachment type: ${attachment.mime_type}`);
      }
    }

    return mediaPaths;
  }

  /**
   * Validate that a message should be posted
   * @param message - Processed message
   * @returns true if message is valid for posting
   */
  validateMessage(message: ProcessedMessage): boolean {
    // Check if message has content (text or media)
    if (!message.text && message.mediaPaths.length === 0) {
      console.log('  Skipping empty message (no text or media)');
      return false;
    }

    // If only media, we'll post with empty/space text (handled in twitter-client)
    if (!message.text && message.mediaPaths.length > 0) {
      console.log('  Message contains only media (no text)');
    }

    return true;
  }

  /**
   * Format a summary of the message for logging
   */
  formatMessageSummary(message: ProcessedMessage): string {
    const parts: string[] = [];

    if (message.text) {
      const preview = message.text.length > 50
        ? message.text.substring(0, 50) + '...'
        : message.text;
      parts.push(`Text: "${preview}"`);
    }

    if (message.mediaPaths.length > 0) {
      parts.push(`${message.mediaPaths.length} image(s)`);
    }

    if (message.wasTruncated) {
      parts.push('(truncated)');
    }

    return parts.join(', ');
  }
}
