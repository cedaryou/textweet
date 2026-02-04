# Changelog

## Version 1.2.0 - HEIC Image Support

### New Features

**HEIC/HEIF Image Support**
- Automatic detection of HEIC/HEIF images (iPhone photos)
- Converts HEIC to JPEG automatically before upload
- High-quality conversion using Sharp library (90% JPEG quality)
- Converted images stored in `.temp-images/` folder
- Works seamlessly - just send iPhone photos!

### Technical Details

- Uses `sharp` library for fast, high-quality image conversion
- HEIC files are converted to JPEG format compatible with X API
- Temporary converted files are cached in `.temp-images/`
- Original HEIC files are preserved in Messages
- Supports both HEIC and HEIF formats

### Updated Dependencies

- Added `sharp` for image processing

---

## Version 1.1.0 - Persistent Message Cache

### New Features

**Persistent Message Tracking**
- Messages are now tracked in a `.processed-messages.json` file
- Successfully posted messages are remembered across restarts
- Failed messages are marked and won't be retried on restart
- Cache file is automatically saved after each operation

### What Changed

**Before:**
- Messages were only tracked in memory
- Restarting the app would try to post ALL messages again
- Failed messages would be retried every restart

**After:**
- Messages are tracked on disk in `.processed-messages.json`
- Restarting the app skips already-posted messages
- Failed messages are permanently marked as failed
- No duplicate posts on restart!

### How It Works

The cache file stores:
```json
{
  "processed": [12345, 12346, 12347],
  "failed": [12348],
  "lastUpdated": "2024-02-03T18:30:00.000Z"
}
```

- **processed**: Message IDs that were successfully posted
- **failed**: Message IDs that failed and won't be retried
- **lastUpdated**: Timestamp of last cache update

### Cache Location

`.processed-messages.json` in the project root directory (same level as `package.json`)

### Manual Cache Management

**View cache:**
```bash
cat .processed-messages.json
```

**Clear cache (start fresh):**
```bash
rm .processed-messages.json
```

After deleting the cache, the daemon will try to post all messages again.

### Benefits

✅ No duplicate tweets on restart
✅ Failed messages don't retry infinitely
✅ Persistent state across daemon restarts
✅ Easy to inspect what's been processed
✅ Can manually clear cache if needed

---

## Version 1.0.0 - Initial Release

- iMessage monitoring from specific contact
- Automatic posting to X/Twitter
- Image support (up to 4 per tweet)
- Background daemon mode
- Direct Messages database access
