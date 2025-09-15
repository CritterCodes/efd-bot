# EFD Discord Bot Documentation System

## 🎯 Overview

The EFD Discord Bot now includes a comprehensive documentation system that automatically generates beautiful, interactive documentation for all Discord commands. The system integrates seamlessly with your existing Express server and provides multiple ways to access and update documentation.

## 🏗️ Architecture

### Integrated Express Server (`src/server.js`)
- **Shopify Webhooks**: Handles product notifications from your store
- **Documentation API**: RESTful endpoints for command documentation
- **Health Monitoring**: Service status and health checks
- **Auto-Generation**: Built-in documentation update triggers

### Documentation Generator (`scripts/generate-docs.js`)
- Scans all command files automatically
- Extracts parameters, descriptions, and examples
- Generates JSON, Markdown, and HTML formats
- Creates interactive search and filtering

### API Routes (`routes/docs.js`)
- RESTful endpoints for accessing documentation
- Search functionality across commands
- Category-based filtering
- CORS-enabled for external access

## 🚀 Usage

### Automatic Documentation Updates

Documentation is automatically regenerated when you deploy commands:

```bash
npm run deploy-commands
```

This will:
1. Deploy commands to Discord
2. Automatically regenerate documentation
3. Update all formats (JSON, HTML, Markdown)

### Manual Documentation Generation

```bash
# Generate documentation manually
npm run docs:generate

# Update and confirm
npm run docs:update
```

### Starting the Server

Your documentation is served from the same Express server that handles webhooks:

```bash
npm start
```

Server provides:
- **Documentation UI**: `http://localhost:3000/api/docs/`
- **API Endpoints**: `http://localhost:3000/api/docs/commands`
- **Health Check**: `http://localhost:3000/health`

## 📡 API Endpoints

### Documentation Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/docs/` | GET | Interactive HTML documentation |
| `/api/docs/commands` | GET | All commands (JSON) |
| `/api/docs/commands/:name` | GET | Specific command details |
| `/api/docs/commands/category/:category` | GET | Commands by category |
| `/api/docs/categories` | GET | List all categories |
| `/api/docs/search?q=term` | GET | Search commands |
| `/api/docs/stats` | GET | Documentation statistics |
| `/api/docs/markdown` | GET | Markdown format |
| `/api/docs/health` | GET | Documentation health check |
| `/api/docs/update` | POST | Trigger doc regeneration |

### Service Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Service information |
| `/health` | GET | Server health check |
| `/webhook/shopify/products/create` | POST | Shopify webhook |

## 🔧 Integration with bot.engelfinedesign.com

Since you asked about running this on your existing Express server, here's how to integrate:

### Option 1: Use the Integrated Server (Recommended)
Your current setup now includes everything in one server. Just deploy and use:
- Port: `process.env.PORT` or `process.env.WEBHOOK_PORT` or `3000`
- All endpoints available on the same server

### Option 2: Add to Existing Express App
If you have a separate Express app, copy these files to your server:
```
routes/docs.js          → Your server's routes directory
docs/api/               → Your server's documentation directory
scripts/generate-docs.js → Your server's scripts directory
```

Then add to your Express app:
```javascript
import docsRouter from './routes/docs.js';
app.use('/api/docs', docsRouter);
```

## 📝 File Structure

```
├── src/
│   ├── server.js              # Main Express server (renamed from webhook.js)
│   └── commands/              # Discord commands (auto-scanned)
├── routes/
│   └── docs.js               # Documentation API routes
├── docs/
│   └── api/                  # Generated documentation files
│       ├── commands.json     # API data
│       ├── commands.md       # Markdown format
│       └── commands.html     # Interactive HTML
├── scripts/
│   └── generate-docs.js      # Documentation generator
└── deploy-commands.js        # Auto-updates docs on deploy
```

## 🔄 Automatic Updates

Documentation automatically updates when:
1. **Commands are deployed** (`npm run deploy-commands`)
2. **Manual trigger** (`POST /api/docs/update`)
3. **Manual generation** (`npm run docs:generate`)

## 🎨 Features

### Interactive Documentation
- **Search**: Real-time command searching
- **Categories**: Organized by command type (Economy, Admin, etc.)
- **Parameters**: Detailed parameter information with types
- **Examples**: Real command usage examples
- **Responsive**: Works on desktop and mobile

### API Features
- **RESTful**: Standard REST API design
- **CORS Enabled**: Can be used from external websites
- **Error Handling**: Comprehensive error responses
- **Health Checks**: Monitor system status

### Developer Features
- **Auto-Detection**: Scans command files automatically
- **Multiple Formats**: JSON, HTML, Markdown output
- **Type Safety**: Parameter type detection
- **Version Tracking**: Documentation timestamps

## 🔍 Search Examples

```bash
# Search for gems-related commands
curl "http://localhost:3000/api/docs/search?q=gems"

# Get economy category commands
curl "http://localhost:3000/api/docs/commands/category/Economy"

# Get specific command details
curl "http://localhost:3000/api/docs/commands/gems"
```

## 📊 Statistics

The system tracks and provides statistics about your commands:
- Total commands
- Commands by category
- Admin vs. public commands
- Parameters and examples count

Access via: `GET /api/docs/stats`

## 🛠️ Maintenance

### Updating Documentation
Documentation stays in sync automatically, but you can manually trigger updates:

```bash
# Via API
curl -X POST http://localhost:3000/api/docs/update

# Via npm script
npm run docs:update

# Direct script
node scripts/generate-docs.js
```

### Backup
Documentation files are generated, so they can be recreated anytime. The source of truth is your command files in `src/commands/`.

## 🚀 Production Deployment

For production on bot.engelfinedesign.com:

1. **Environment Variables**:
   ```bash
   PORT=3000                    # or your preferred port
   # Your existing Discord bot variables...
   ```

2. **Process Manager** (PM2 recommended):
   ```bash
   pm2 start src/index.js --name "efd-bot"
   ```

3. **Nginx Reverse Proxy** (if needed):
   ```nginx
   location /api/docs/ {
       proxy_pass http://localhost:3000/api/docs/;
   }
   ```

## 🎉 Benefits

1. **Always Up-to-Date**: Documentation automatically syncs with code
2. **Multiple Formats**: JSON API, Interactive HTML, Markdown
3. **Search & Filter**: Users can easily find commands
4. **Developer Friendly**: RESTful API for integrations
5. **No Maintenance**: Zero-effort documentation maintenance
6. **Professional**: Beautiful, responsive documentation interface

Your Discord bot documentation is now as professional as your commands! 🤖📖