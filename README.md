# TexTweet - iMessage to X Automation

Automatically post iMessages from a specific contact to X (formerly Twitter) with full image support.

## Features

- Monitor iMessages from a designated contact
- Automatically post messages to X/Twitter
- Support for up to 4 images per tweet
- **HEIC support** - Automatically converts iPhone photos (HEIC) to JPEG
- Handles long messages (auto-truncates to 280 characters)
- Runs as a background daemon
- Persistent message cache (no duplicates on restart)
- Full error handling and retry logic
- Direct database access (no external dependencies)

## Prerequisites

1. **macOS** - This tool uses the macOS Messages database
2. **Node.js** - Version 18 or higher
3. **X (Twitter) API Credentials** - Free tier works!
4. **Full Disk Access** - Required to read Messages database

## Installation

### 1. Clone or Download

```bash
cd /path/to/textweet
npm install
```

### 2. Get X API Credentials

1. Go to [X Developer Portal](https://developer.x.com/en/portal/dashboard)
2. Sign in with your X account
3. Create a new Project and App
4. Generate API Keys and Tokens with **Read and Write** permissions:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret
5. Save these credentials - you'll need them next

**Note:** The free tier allows posting tweets, which is all this tool needs!

### 3. Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your credentials
nano .env
```

Update `.env` with your credentials:

```env
# X (Twitter) API Credentials
TWITTER_API_KEY=your_api_key_here
TWITTER_API_SECRET=your_api_secret_here
TWITTER_ACCESS_TOKEN=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_secret_here

# iMessage Configuration
# Use the phone number or email of the contact to monitor
IMESSAGE_CONTACT=+1234567890

# Optional: Polling interval in milliseconds (default: 3000)
POLL_INTERVAL=3000
```

**Important:** Replace `+1234567890` with the actual phone number or email you use to message yourself or a designated contact.

### 4. Grant Full Disk Access

The tool needs to read the Messages database. Grant your terminal Full Disk Access:

1. Open **System Settings** > **Privacy & Security** > **Full Disk Access**
2. Click the **+** button
3. Add your terminal app:
   - **Terminal.app** (if using default Terminal)
   - **iTerm.app** (if using iTerm2)
   - Or your preferred terminal
4. Toggle it ON
5. **Restart your terminal** for changes to take effect

### 5. Build the Project

```bash
npm run build
```

## Usage

### Development Mode (with auto-reload)

```bash
npm run dev
```

### Production Mode

```bash
# Build first
npm run build

# Then start
npm start
```

### Testing the Setup

1. Start the daemon: `npm run dev`
2. Send a message from your configured contact
3. Watch the console - you should see:
   - Message detected
   - Processing status
   - Tweet posted confirmation
   - Link to the tweet

## Running as a Background Service

### Option 1: Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the daemon
pm2 start dist/index.js --name textweet

# View logs
pm2 logs textweet

# Stop the daemon
pm2 stop textweet

# Auto-start on system boot
pm2 startup
pm2 save
```

### Option 2: Using launchd (macOS native)

Create `~/Library/LaunchAgents/com.textweet.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.textweet</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/node</string>
        <string>/path/to/textweet/dist/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/textweet.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/textweet.error.log</string>
</dict>
</plist>
```

Load the service:

```bash
launchctl load ~/Library/LaunchAgents/com.textweet.plist
```

## How It Works

1. **Database Monitoring**: Reads the Messages database at `~/Library/Messages/chat.db`
2. **Message Detection**: Polls for new messages from your configured contact
3. **Processing**: Extracts text and image attachments
4. **Media Upload**: Uploads images to X using the v1.1 media endpoint
5. **Tweet Creation**: Posts tweet with text and attached media using v2 API
6. **Deduplication**: Tracks processed messages to avoid duplicate posts

## Message Format

- **Text only**: Posts as a regular tweet
- **Text + Images**: Posts tweet with up to 4 images
- **Images only**: Posts images with a space character
- **Long text**: Auto-truncates to 280 characters with ellipsis (…)

## Troubleshooting

### Permission Denied / SQLITE_AUTH Error

**Problem:** Can't read Messages database

**Solution:**
1. Ensure Full Disk Access is granted (see step 4 above)
2. Restart your terminal completely
3. Try running `ls ~/Library/Messages/chat.db` to verify access

### Contact Not Found

**Problem:** `Contact not found in Messages database`

**Solution:**
1. Ensure you have an existing conversation with the contact
2. Verify the phone number/email format matches exactly
3. Phone numbers should include country code: `+1234567890`
4. Emails should be complete: `user@example.com`

### Authentication Failed

**Problem:** `Failed to authenticate with X API`

**Solution:**
1. Double-check all four credentials in `.env`
2. Ensure tokens have Read + Write permissions
3. Regenerate tokens if needed from Developer Portal
4. Check for extra spaces in `.env` file

### No Messages Detected

**Problem:** Messages sent but not detected

**Solution:**
1. Ensure messages are FROM the configured contact (not to them)
2. Check polling interval isn't too long
3. Verify the daemon is running: `ps aux | grep textweet`
4. Check logs for errors

## Configuration Options

All options are set in `.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TWITTER_API_KEY` | Yes | - | X API Key |
| `TWITTER_API_SECRET` | Yes | - | X API Secret |
| `TWITTER_ACCESS_TOKEN` | Yes | - | X Access Token |
| `TWITTER_ACCESS_SECRET` | Yes | - | X Access Token Secret |
| `IMESSAGE_CONTACT` | Yes | - | Phone number or email to monitor |
| `POLL_INTERVAL` | No | 3000 | Check interval in milliseconds (min: 1000) |
| `MAX_TWEET_LENGTH` | No | 280 | Maximum tweet character limit |

## Security Notes

- **Never commit your `.env` file** - it contains secrets!
- `.env` is already in `.gitignore`
- The tool only reads the database (readonly mode)
- No modifications are made to your Messages
- API credentials are only used for posting tweets

## Limitations

- macOS only (uses Messages database)
- Requires Full Disk Access permission
- X API rate limits apply (Free tier: limited posts per month)
- Maximum 4 images per tweet (X API limit)
- Supported image formats: JPG, PNG, GIF, WEBP, **HEIC** (auto-converted)
- Maximum image size: 5MB (15MB for GIFs)

## Future Enhancements

Potential features for future versions:

- Thread support for long messages (tweetstorms)
- Two-way sync (X replies → iMessage)
- Delete message → Delete tweet
- Multiple contact support
- Web UI for configuration
- Video support
- Scheduled/delayed posting

## License

ISC

## Credits

Built with:
- [twitter-api-v2](https://github.com/PLhery/node-twitter-api-v2) - Twitter/X API client
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) - SQLite database access
- TypeScript + Node.js

## Support

For issues or questions:
1. Check the Troubleshooting section above
2. Verify all prerequisites are met
3. Check the console logs for detailed error messages
4. Ensure your X API credentials are valid

---

**Disclaimer:** This tool is for personal use. Be mindful of X's Terms of Service and automation rules. Use responsibly!
