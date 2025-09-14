# EFD Discord Bot

Discord bot for EngelFineDesign community with member verification and Shopify integration.

## Features

- 🔰 Member verification system with role assignment
- 🛠️ Service lookup for industry members
- 💎 EFD jewelry collector verification
- 🛍️ Shopify product announcements
- 📊 MongoDB data storage

## Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/efd-bot.git
cd efd-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```env
BOT_TOKEN=your-discord-bot-token
CLIENT_ID=your-discord-client-id
GUILD_ID=your-discord-guild-id

MONGODB_URI=your-mongodb-connection-string
MONGO_DB_NAME=your-database-name

WEBHOOK_PORT=3000
SHOPIFY_DOMAIN=your-shop.myshopify.com
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret
```

4. Deploy commands:
```bash
npm run deploy-commands
```

5. Set up Discord roles:
```bash
npm run setup-roles
```

6. Start the bot:
```bash
npm run dev
```

## Commands

- `/verify` - Start member verification process
- `/services @user` - Look up user's services
- `/setup-verify` - Create verification message (Admin only)

## Project Structure

```
src/
  commands/           # Slash commands
    ping.js
    verify.js
    services.js
    setup-verify.js
  lib/               # Shared utilities
    constants.js
    database.js
  webhook.js         # Shopify webhook handler
  index.js          # Main bot file
```

## Deployment

### Railway (Recommended)
1. Connect your GitHub repo to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Render
1. Create new Web Service from GitHub repo
2. Set build command: `npm install`
3. Set start command: `npm start`

### Requirements
- Node.js v18+
- MongoDB database
- Discord bot token and permissions

## License

MIT
