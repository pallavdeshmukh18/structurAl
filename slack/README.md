# StructurAI Slack Bot Service

This service monitors MongoDB for incoming GitHub pings, webhooks, traces, and incidents created by the StructurAI platform, and posts real-time alerts directly into your organization's Slack channel.

## Directory Structure
Location: `slack/`

Files:
- `index.js`: Main Slack bot service connecting to MongoDB & Slack Web API.
- `.env`: Environment variables configuration.
- `package.json`: Dependencies (`@slack/web-api`, `mongoose`, `dotenv`).

## Setup & Configuration

1. Create a Slack App in your workspace:
   - Go to [Slack API App Dashboard](https://api.slack.com/apps).
   - Create a **New App** -> **From scratch**.
   - Under **OAuth & Permissions**, add `chat:write` scope under **Bot Token Scopes**.
   - Install App to Workspace and copy the **Bot User OAuth Token** (starts with `xoxb-`).
   - Copy your target public channel ID (e.g. `#incidents` -> right-click channel -> Copy link / ID `C0123456789`).
   - Invite your bot to the public channel: `/invite @StructurAI` in Slack.

2. Edit `.env` inside `slack/`:
```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_CHANNEL_ID=C0123456789
MONGODB_URI=your_mongodb_connection_string
POLL_INTERVAL_MS=5000
```

3. Install & Run:
```bash
cd slack
npm install
npm run start
```

