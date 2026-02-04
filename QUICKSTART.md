# TexTweet - Quick Start Guide

Get up and running in 5 minutes!

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Get X API Credentials

1. Go to https://developer.x.com/en/portal/dashboard
2. Create a project and app
3. Generate keys with **Read and Write** permissions
4. Copy the 4 credentials (API Key, API Secret, Access Token, Access Secret)

## Step 3: Configure

```bash
# Copy the template
cp .env.example .env

# Edit with your credentials
nano .env
```

Fill in:
- Your 4 X API credentials
- The phone number to monitor (format: `+1234567890`)

## Step 4: Grant Permissions

1. Open **System Settings** > **Privacy & Security** > **Full Disk Access**
2. Add your Terminal app
3. Toggle it ON
4. **Restart your terminal**

## Step 5: Build & Run

```bash
# Build the project
npm run build

# Start the daemon
npm run dev
```

## Step 6: Test It!

1. Send a message from your configured contact
2. Watch the console
3. Check X - your message should be posted!

## That's It!

For detailed documentation, see [README.md](README.md)

## Common Issues

**"Permission denied"** → Grant Full Disk Access (Step 4)

**"Contact not found"** → Ensure the phone number/email is exact

**"Auth failed"** → Double-check your X API credentials

**"No messages detected"** → Messages must be FROM the contact (not to them)
