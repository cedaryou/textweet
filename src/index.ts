#!/usr/bin/env node

import { loadConfig, validateConfig } from './config.js';
import { TwitterClient } from './twitter-client.js';
import { MessageProcessor } from './message-processor.js';
import { IMessageMonitor } from './imessage-monitor.js';
import { ImageConverter } from './image-converter.js';

/**
 * Sleep utility for polling loop
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Main daemon process
 */
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║              TexTweet - iMessage to X Bot                ║');
  console.log('║                                                          ║');
  console.log('║  Automatically posts iMessages from a specific contact  ║');
  console.log('║  to X (Twitter) with image support                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // Load and validate configuration
  console.log('📋 Loading configuration...');
  const config = loadConfig();
  validateConfig(config);
  console.log('');

  // Initialize components
  console.log('🔧 Initializing components...');

  const twitterClient = new TwitterClient(config);
  const messageProcessor = new MessageProcessor(config);
  const imessageMonitor = new IMessageMonitor(config);
  const imageConverter = new ImageConverter();

  // Verify Twitter credentials
  console.log('🔐 Verifying X (Twitter) credentials...');
  const isAuthenticated = await twitterClient.verifyCredentials();

  if (!isAuthenticated) {
    console.error('\n❌ Failed to authenticate with X API.');
    console.error('Please check your credentials in .env file.');
    console.error('Visit https://developer.x.com/en/portal/dashboard to get your credentials.');
    process.exit(1);
  }
  console.log('✅ X API authentication successful\n');

  // Initialize iMessage database connection
  console.log('📱 Initializing iMessage monitor...');
  const isInitialized = await imessageMonitor.initialize();

  if (!isInitialized) {
    console.error('\n❌ Failed to initialize iMessage monitor.');
    console.error('Please check the error messages above and try again.');
    process.exit(1);
  }

  console.log('✅ iMessage monitor initialized successfully\n');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🚀 Daemon started! Monitoring for new messages...');
  console.log(`   Polling interval: ${config.polling.interval}ms`);
  console.log(`   Press Ctrl+C to stop`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Set up graceful shutdown
  let isShuttingDown = false;

  const shutdown = () => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log('\n\n📊 Shutdown initiated...');
    console.log(`Total messages posted: ${imessageMonitor.getProcessedCount()}`);
    console.log(`Total messages failed: ${imessageMonitor.getFailedCount()}`);

    imessageMonitor.close();
    console.log('✅ Database connection closed');
    console.log('✅ Message cache saved');
    console.log('👋 Goodbye!\n');

    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Main polling loop
  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 5;

  while (!isShuttingDown) {
    try {
      // Check for new messages
      const newMessages = await imessageMonitor.getNewMessages();

      // Process each new message
      for (const rawMessage of newMessages) {
        try {
          console.log(`\n📨 New message received (ID: ${rawMessage.id})`);

          // Process the message
          const processedMessage = messageProcessor.processMessage(rawMessage);

          // Validate message
          if (!messageProcessor.validateMessage(processedMessage)) {
            imessageMonitor.markAsProcessed(rawMessage.id);
            continue;
          }

          // Log message summary
          console.log(`   ${messageProcessor.formatMessageSummary(processedMessage)}`);

          // Upload media if present
          const mediaIds: string[] = [];
          if (processedMessage.mediaPaths.length > 0) {
            console.log(`   Uploading ${processedMessage.mediaPaths.length} media file(s)...`);

            for (const mediaPath of processedMessage.mediaPaths) {
              try {
                // Convert HEIC to JPEG if needed
                const uploadPath = await imageConverter.processImage(mediaPath);

                // Upload the image (converted or original)
                const mediaId = await twitterClient.uploadMedia(uploadPath);
                mediaIds.push(mediaId);
              } catch (error) {
                console.error(`   Failed to upload ${mediaPath}:`, error instanceof Error ? error.message : error);
                // Continue with other media files
              }
            }

            if (mediaIds.length === 0 && !processedMessage.text) {
              console.log('   ⚠️  No media uploaded and no text - skipping tweet');
              imessageMonitor.markAsProcessed(rawMessage.id);
              continue;
            }
          }

          // Post tweet
          console.log(`   📤 Posting to X...`);
          const tweetId = await twitterClient.postTweet(
            processedMessage.text,
            mediaIds.length > 0 ? mediaIds : undefined
          );

          console.log(`   ✅ Successfully posted to X!`);

          // Mark as processed
          imessageMonitor.markAsProcessed(rawMessage.id);

          // Reset error counter on success
          consecutiveErrors = 0;

        } catch (error) {
          console.error(`   ❌ Error processing message:`, error instanceof Error ? error.message : error);
          console.error(`   This message will be skipped on restart (marked as failed)`);
          // Mark as failed - won't retry on restart
          imessageMonitor.markAsFailed(rawMessage.id);
        }
      }

      // Wait before next poll
      await sleep(config.polling.interval);

    } catch (error) {
      consecutiveErrors++;
      console.error(`\n❌ Error in main loop (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS}):`, error);

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        console.error(`\n💥 Too many consecutive errors. Shutting down...`);
        shutdown();
      }

      // Wait a bit longer after an error
      await sleep(config.polling.interval * 2);
    }
  }
}

// Start the daemon
main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
