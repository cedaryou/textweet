import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

export interface Config {
  twitter: {
    apiKey: string;
    apiSecret: string;
    accessToken: string;
    accessSecret: string;
  };
  imessage: {
    contact: string;
  };
  polling: {
    interval: number;
  };
  tweet: {
    maxLength: number;
  };
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string): string {
  return process.env[key] || defaultValue;
}

export function loadConfig(): Config {
  try {
    const config: Config = {
      twitter: {
        apiKey: getRequiredEnv('TWITTER_API_KEY'),
        apiSecret: getRequiredEnv('TWITTER_API_SECRET'),
        accessToken: getRequiredEnv('TWITTER_ACCESS_TOKEN'),
        accessSecret: getRequiredEnv('TWITTER_ACCESS_SECRET'),
      },
      imessage: {
        contact: getRequiredEnv('IMESSAGE_CONTACT'),
      },
      polling: {
        interval: parseInt(getOptionalEnv('POLL_INTERVAL', '3000'), 10),
      },
      tweet: {
        maxLength: parseInt(getOptionalEnv('MAX_TWEET_LENGTH', '280'), 10),
      },
    };

    // Validate polling interval
    if (config.polling.interval < 1000) {
      console.warn('Warning: POLL_INTERVAL is less than 1000ms. Setting to 1000ms to avoid excessive API calls.');
      config.polling.interval = 1000;
    }

    return config;
  } catch (error) {
    console.error('Configuration Error:', error instanceof Error ? error.message : error);
    console.error('\nPlease ensure:');
    console.error('1. You have created a .env file (copy from .env.example)');
    console.error('2. All required environment variables are set');
    console.error('3. You have obtained X API credentials from https://developer.x.com/en/portal/dashboard');
    process.exit(1);
  }
}

export function validateConfig(config: Config): void {
  // Validate contact format (basic validation)
  const contact = config.imessage.contact;
  if (!contact.includes('@') && !contact.startsWith('+')) {
    console.warn('Warning: IMESSAGE_CONTACT should be either an email (containing @) or a phone number (starting with +)');
  }

  console.log('Configuration loaded successfully:');
  console.log(`  - Monitoring contact: ${config.imessage.contact}`);
  console.log(`  - Polling interval: ${config.polling.interval}ms`);
  console.log(`  - Max tweet length: ${config.tweet.maxLength}`);
  console.log(`  - Twitter API configured: ✓`);
}
