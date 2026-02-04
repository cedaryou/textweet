import { TwitterApi } from 'twitter-api-v2';
import { readFileSync } from 'fs';
import type { Config } from './config.js';

export class TwitterClient {
  private client: TwitterApi;
  private rwClient;

  constructor(config: Config) {
    // Initialize Twitter API client with OAuth 1.0a
    this.client = new TwitterApi({
      appKey: config.twitter.apiKey,
      appSecret: config.twitter.apiSecret,
      accessToken: config.twitter.accessToken,
      accessSecret: config.twitter.accessSecret,
    });

    // Get read-write client
    this.rwClient = this.client.readWrite;
  }

  /**
   * Upload media file to Twitter
   * @param filePath - Absolute path to the media file
   * @returns Media ID string that can be used in tweets
   */
  async uploadMedia(filePath: string): Promise<string> {
    try {
      console.log(`  Uploading media: ${filePath}`);

      // Read the file as buffer
      const mediaData = readFileSync(filePath);

      // Upload media using v1.1 endpoint (required for media uploads)
      const mediaId = await this.client.v1.uploadMedia(mediaData, {
        mimeType: this.getMimeType(filePath),
      });

      console.log(`  Media uploaded successfully: ${mediaId}`);
      return mediaId;
    } catch (error) {
      console.error(`  Failed to upload media ${filePath}:`, error);
      throw new Error(`Media upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Post a tweet with optional media attachments
   * @param text - Tweet text (max 280 characters)
   * @param mediaIds - Array of media IDs from uploadMedia()
   * @returns Tweet ID
   */
  async postTweet(text: string, mediaIds?: string[]): Promise<string> {
    try {
      // Prepare tweet payload
      const tweetPayload: any = {
        text: text || ' ', // X API requires at least some text, use space if empty
      };

      // Add media if provided
      if (mediaIds && mediaIds.length > 0) {
        tweetPayload.media = {
          media_ids: mediaIds,
        };
      }

      console.log(`  Posting tweet...`);
      if (mediaIds && mediaIds.length > 0) {
        console.log(`  With ${mediaIds.length} media attachment(s)`);
      }

      // Post tweet using v2 endpoint
      const tweet = await this.rwClient.v2.tweet(tweetPayload);

      console.log(`  Tweet posted successfully! ID: ${tweet.data.id}`);
      console.log(`  View at: https://x.com/i/web/status/${tweet.data.id}`);

      return tweet.data.id;
    } catch (error: any) {
      // Enhanced error handling for common issues
      console.error('\n  ❌ Tweet posting failed!');

      if (error?.code === 403) {
        console.error('  Error Code: 403 - Forbidden');
        console.error('  \nCommon causes:');
        console.error('  1. App permissions not set to "Read and Write"');
        console.error('  2. Access Token generated before changing permissions');
        console.error('  3. Invalid API credentials');
        console.error('  \nTo fix:');
        console.error('  1. Go to https://developer.x.com/en/portal/dashboard');
        console.error('  2. Set app permissions to "Read and Write"');
        console.error('  3. Regenerate Access Token & Secret');
        console.error('  4. Update .env file with new tokens');
      } else if (error?.code === 429) {
        console.error('  Rate limit exceeded: Please wait before posting again');
      }

      // Log full error details for debugging
      if (error?.data) {
        console.error('  \nAPI Error Details:', JSON.stringify(error.data, null, 2));
      }
      if (error?.message) {
        console.error('  Error Message:', error.message);
      }

      throw new Error(`Tweet posting failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get MIME type based on file extension
   */
  private getMimeType(filePath: string): string {
    const ext = filePath.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
    };
    return mimeTypes[ext || ''] || 'image/jpeg';
  }

  /**
   * Verify credentials by getting the authenticated user
   */
  async verifyCredentials(): Promise<boolean> {
    try {
      const user = await this.rwClient.v2.me();
      console.log(`Authenticated as: @${user.data.username}`);
      return true;
    } catch (error) {
      console.error('Failed to verify Twitter credentials:', error);
      return false;
    }
  }
}
