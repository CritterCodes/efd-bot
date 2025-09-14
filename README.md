# EFD Discord Bot

Advanced Discord bot for the EngelFineDesign community featuring comprehensive member verification, industry role management, and automated Shopify product announcements.

## ✨ Features

### �️ Dynamic Roadmap System
- **Real-time progress tracking** with visual progress bars for all development phases
- **Automated announcements** when new features are completed and go live
- **Transparent development** - community can see exactly what's being worked on
- **Phase-based organization** from Foundation through advanced Marketplace features
- **Interactive roadmap display** with detailed timelines and dependencies

### �🔰 Member Verification System
- **Multi-step verification flow** with interactive buttons and select menus
- **Industry role assignment** for Jewelers, Lapidarists, CAD Designers, and Dealers
- **Service specialization tracking** (e.g., Custom Jewelry, Repair, CAD Design)
- **EFD jewelry collector verification** for community members
- **Duplicate prevention** to ensure one verification per user
- **MongoDB integration** for persistent data storage

### 🛍️ Shopify Integration
- **Automatic product announcements** when new items are listed
- **Smart categorization** - Jewelry vs Gemstones channels
- **Secure webhook verification** with HMAC signatures
- **Real-time Discord notifications** for your community

### �️ Administrative Tools
- **Service lookup command** to view member profiles and specializations
- **Setup verification message** with interactive buttons for easy access
- **Role management** with automated Discord role creation
- **Analytics and tracking** of member data

### 🚀 Production-Ready Infrastructure
- **SSL-secured HTTPS endpoints** with Let's Encrypt auto-renewal
- **GitHub auto-deployment** - push to main branch for instant updates
- **24/7 uptime** with PM2 process management
- **nginx reverse proxy** for robust web server architecture
- **Comprehensive logging** and error handling

## 🚀 Quick Start

### Local Development

1. **Clone the repository:**
```bash
git clone https://github.com/CritterCodes/efd-bot.git
cd efd-bot
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create `.env` file:**
```env
# Discord Configuration
BOT_TOKEN=your-discord-bot-token
CLIENT_ID=your-discord-client-id
GUILD_ID=your-discord-guild-id

# MongoDB Database
MONGODB_URI=your-mongodb-connection-string
MONGO_DB_NAME=your-database-name

# Shopify Integration
WEBHOOK_PORT=3000
SHOPIFY_DOMAIN=your-shop.myshopify.com
SHOPIFY_WEBHOOK_SECRET=your-webhook-secret

# GitHub Auto-Deployment (Production only)
GITHUB_WEBHOOK_SECRET=your-github-webhook-secret
```

4. **Deploy slash commands:**
```bash
npm run deploy-commands
```

5. **Set up Discord roles:**
```bash
npm run setup-roles
```

6. **Start development server:**
```bash
npm run dev
```

### Production Deployment

This bot features **automatic deployment** - simply push to the `main` branch and your production server updates instantly!

**Live Endpoints:**
- **Shopify Webhook**: `https://bot.engelfinedesign.com/webhook`
- **GitHub Deployment**: `https://bot.engelfinedesign.com/deploy`

## 🎮 Commands

| Command | Description | Permissions |
|---------|-------------|-------------|
| `/ping` | Test bot responsiveness | Everyone |
| `/verify` | Start member verification process | Everyone |
| `/services @user` | Look up user's services and roles | Everyone |
| `/setup-verify` | Create interactive verification message | Admin only |
| **Roadmap Commands** | | |
| `/roadmap show` | Display development roadmap with progress | Everyone |
| `/roadmap phase` | Get detailed information about a specific phase | Everyone |
| `/roadmap stats` | Show roadmap statistics and recent updates | Everyone |
| `/roadmap-admin init` | Initialize roadmap data from documentation | Admin only |
| `/roadmap-admin update-phase` | Update phase status and trigger announcements | Admin only |
| `/roadmap-admin setup-auto-updates` | Configure automated roadmap updates | Admin only |

## 🏗️ Architecture

```
📁 Project Structure
├── 📄 src/
│   ├── 📁 commands/              # Slash commands
│   │   ├── ping.js              # Simple ping command
│   │   ├── verify.js            # Complex verification flow
│   │   ├── services.js          # User lookup functionality
│   │   ├── setup-verify.js      # Admin setup command
│   │   ├── roadmap.js           # Community roadmap display
│   │   └── roadmap-admin.js     # Roadmap management (admin)
│   ├── 📁 lib/                   # Shared utilities
│   │   ├── constants.js         # Database and role constants
│   │   ├── database.js          # MongoDB connection wrapper
│   │   ├── roadmapTracker.js    # Roadmap database operations
│   │   └── roadmapAutomation.js # Automated progress updates
│   ├── webhook.js               # Shopify webhook handler
│   └── index.js                 # Main bot entry point
├── 📄 docs/                      # Documentation
│   ├── ROADMAP.md              # Development roadmap overview
│   ├── ROADMAP_SETUP.md        # Roadmap system setup guide
│   └── phases/                 # Detailed phase trackers
├── 📄 deploy-commands.js         # Command registration script
├── 📄 setup-roles.js            # Discord role creation
├── 📄 deploy-webhook.cjs         # GitHub deployment webhook
└── 📄 deploy.sh                 # Production deployment script
```

## 🔧 Technology Stack

- **Node.js v20+** - Runtime environment
- **Discord.js v14** - Discord API wrapper with ES modules
- **MongoDB** - Database for user data and verification records
- **Express.js** - Web server for webhook handling
- **nginx** - Reverse proxy and SSL termination
- **PM2** - Process management for 24/7 uptime
- **Let's Encrypt** - SSL certificates with auto-renewal

## 🌐 Deployment Options

### Current Production Setup
This bot is deployed on a **dedicated server** with:
- ✅ **Auto-deployment via GitHub webhooks**
- ✅ **SSL-secured HTTPS endpoints**
- ✅ **PM2 process management**
- ✅ **nginx reverse proxy**
- ✅ **MongoDB database**

### Alternative Deployment Platforms

#### Railway (Recommended for new deployments)
```bash
# Connect GitHub repo to Railway
# Set environment variables in dashboard
# Deploy automatically on push to main
```

#### Render (Free tier available)
```bash
# Create new Web Service from GitHub
# Build Command: npm install
# Start Command: npm start
```

#### DigitalOcean/VPS Setup
```bash
# Clone repo on server
# Install Node.js, MongoDB, nginx
# Set up PM2 and SSL certificates
# Configure GitHub webhooks
```

## 🔐 Security Features

- **Discord bot token protection** via environment variables
- **MongoDB connection security** with authentication
- **Shopify webhook verification** using HMAC signatures
- **GitHub webhook authentication** for deployment security
- **SSL/TLS encryption** for all web endpoints
- **Input validation** on all user interactions

## 📊 Database Schema

### Users Collection
```javascript
{
  discordId: String,        // Discord user ID
  username: String,         // Discord username
  verificationStatus: String, // verified/pending/rejected
  verifiedAt: Date,         // Verification timestamp
  industry: String,         // jeweler/lapidarist/cad_designer/dealer
  services: [String],       // Array of service specializations
  isEfdCollector: Boolean,  // EFD jewelry collector status
  createdAt: Date,          // Record creation date
  updatedAt: Date          // Last update timestamp
}
```

## 🚨 Troubleshooting

### Common Issues

**Bot not responding to commands:**
- Check if commands are deployed: `npm run deploy-commands`
- Verify bot permissions in Discord server
- Check PM2 logs: `pm2 logs efd-bot`

**Shopify webhooks not working:**
- Verify webhook URL: `https://bot.engelfinedesign.com/webhook`
- Check webhook secret matches environment variable
- Test webhook endpoint with curl

**Auto-deployment failing:**
- Verify GitHub webhook secret matches server environment
- Check deployment logs: `pm2 logs deploy-webhook`
- Ensure production server has git access to repository

## 📈 Monitoring

### Production Monitoring Commands
```bash
# Check bot status
pm2 status

# View bot logs
pm2 logs efd-bot

# View deployment logs
pm2 logs deploy-webhook

# Check nginx status
systemctl status nginx

# View SSL certificate info
certbot certificates
```

## 🤝 Contributing

1. **Create a feature branch:** `git checkout -b feature/new-feature`
2. **Make your changes** and test locally
3. **Commit your changes:** `git commit -m "Add new feature"`
4. **Push to your branch:** `git push origin feature/new-feature`
5. **Create a Pull Request** to the `main` branch

**Note:** Only pushes to `main` branch trigger production deployment.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🏆 Acknowledgments

- **Discord.js** - Powerful Discord API wrapper
- **MongoDB** - Robust document database
- **Let's Encrypt** - Free SSL certificates
- **PM2** - Production process manager
- **EngelFineDesign Community** - The amazing community this bot serves

## 🚀 Roadmap & Future Features

This bot is evolving into a comprehensive **community engagement ecosystem**. Here's what's coming next:

### 🔦 Spotlight System
**Goal:** Highlight community members and their work, driving engagement and recognition.

**Features:**
- **Automatic Weekly Spotlight** → Every Wednesday, bot posts in #spotlight channel
- **Smart Selection Logic** → Random verified members from MongoDB with their stored info
- **Rich Embeds** → Username, profile pic, services, industry tags, showcase images
- **GEMS Integration** → Spotlighted users receive +250 GEMS bonus
- **Category Rotation** → Weekly focus on different industries (Jewelers, Lapidarists, etc.)

### 💎 EFD Jewelry Ownership Verification
**Advanced photo-based verification system for collector authentication.**

**Flow:**
1. User runs `/verify-item` and uploads 1–5 photos of their jewelry
2. Optional order number + notes for context
3. Bot creates verification request in MongoDB
4. Embed posted in #verification-queue (mod-only) with Approve/Reject buttons
5. **Approved** → Collector role, +500 GEMS, exclusive channel access
6. **Rejected** → Modal for rejection reason, logged feedback, user guidance

**Future Integration:**
- **NFT Relics** → Blockchain wallet verification for automatic collector status
- **Collector Tiers** → Bronze/Silver/Gold based on collection size

### 🏅 Role Badges & Progression
**Multi-tier advancement system with automatic role assignment.**

**Engagement Tiers:**
- **Bronze Jeweler** → 100 messages
- **Silver Jeweler** → 500 messages  
- **Gold Jeweler** → 1000 messages

**Specialization Roles:**
- **CAD Pro** → Verified CAD Designer + activity in CAD channel
- **Repair Master** → Verified Jeweler + 100 posts in #repair-tips

**Collector Tiers:**
- **Verified Collector** → Owns 1+ verified item
- **Premium Collector** → Owns 5+ verified items
- **Legacy Collector** → Owns 10+ verified items

**Benefits:** Passive GEM multipliers, exclusive access, status recognition

### 💰 GEMS Currency System
**Growth • Engagement • Mentorship • Support**

**Earning GEMS:**
- `+10` → Posting in showcase channels
- `+20` → Participating in trivia/events
- `+250` → Being featured in weekly spotlight
- `+5` → Daily chat activity (once per day cap)
- `+50` → Reacting to synced social media posts
- `+500` → Verifying jewelry ownership

**Spending GEMS:**
- **Shopify Discounts** → Auto-generated discount codes via API
  - `500 GEMS` → 10% off code
  - `1000 GEMS` → 20% off code
- **Raffle Entries** → 50 GEMS per entry
- **Member Tipping** → `/tip @user 25`
- **Custom Perks:**
  - `200 GEMS` → Priority Spotlight
  - `1000 GEMS` → Exclusive flex badge role

**Commands:**
- `/gems balance` → Current balance + lifetime stats
- `/gems leaderboard` → Top 10 community members
- `/tip @user amount` → Transfer GEMS between members

### 📲 Social Media Sync
**Cross-platform engagement rewards system.**

**Auto-Sync Features:**
- Pull Instagram/TikTok posts → Embed in #social-feed
- Auto-tag @everyone or @Collectors for new drops
- Preview generation with engagement tracking

**Engagement Rewards:**
- React with ✅ after engaging → +50 GEMS reward
- Bulk approval system for moderators
- API integration for direct like/comment verification

**Leaderboards:**
- `/supporters leaderboard` → Most active social supporters

### 🚀 Next-Level Expansions

**Collector Marketplace:**
- Verified Collectors list items for sale/trade
- GEMS-based transactions and raffle entries
- Community-driven secondary market

**Event Systems:**
- **Double GEM Weekends** → Special boost events
- **Daily Challenges** → Rotating tasks with GEMS rewards
- **Seasonal Events** → Holiday-themed activities

**Mentorship Program:**
- GEMS rewards for helping new members
- Expert recognition system
- Knowledge sharing incentives

**Advanced Features:**
- NFT integration for digital collectibles
- Blockchain wallet verification
- Cross-server community connections

---

**This roadmap transforms the bot into a complete engagement ecosystem that rewards participation, recognizes expertise, and builds lasting community connections.** 🌟

---

**Built with ❤️ for the EngelFineDesign community**
