/**
 * EFD Discord Bot Express Server
 * 
 * Comprehensive Express server for the EFD Discord Bot providing:
 * - Shopify webhook endpoints for product notifications
 * - Documentation API for Discord commands
 * - Health checks and service monitoring
 * - API endpoints for bot management
 * 
 * @author GitHub Copilot
 * @version 1.0.0
 */

import express from 'express';
import crypto from 'crypto';
import docsRouter from '../routes/docs.js';

const JEWELRY_CHANNEL_ID = '1416792269851463742';
const GEMSTONES_CHANNEL_ID = '1416792343838724167';

// Webhook verification function
function verifyShopifyWebhook(data, hmacHeader) {
  const webhook_secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!webhook_secret) return true; // Skip verification if no secret set
  
  const calculated_hmac = crypto
    .createHmac('sha256', webhook_secret)
    .update(data, 'utf8')
    .digest('base64');
  
  return calculated_hmac === hmacHeader;
}

// Determine product category
function categorizeProduct(product) {
  const title = product.title.toLowerCase();
  const tags = product.tags ? product.tags.toLowerCase() : '';
  const productType = product.product_type ? product.product_type.toLowerCase() : '';
  
  // Keywords for gemstones
  const gemstoneKeywords = ['gemstone', 'diamond', 'ruby', 'sapphire', 'emerald', 'stone', 'crystal', 'mineral'];
  // Keywords for jewelry
  const jewelryKeywords = ['ring', 'necklace', 'bracelet', 'earring', 'pendant', 'jewelry', 'jewellery'];
  
  const text = `${title} ${tags} ${productType}`;
  
  if (gemstoneKeywords.some(keyword => text.includes(keyword))) {
    return 'gemstones';
  } else if (jewelryKeywords.some(keyword => text.includes(keyword))) {
    return 'jewelry';
  }
  
  // Default to jewelry if unsure
  return 'jewelry';
}

// Format product message for Discord
function formatProductMessage(product) {
  const variants = product.variants || [];
  const mainVariant = variants[0] || {};
  const price = mainVariant.price ? `$${mainVariant.price}` : 'Price not listed';
  const image = product.images && product.images[0] ? product.images[0].src : null;
  
  let message = `🆕 **New Product Listed!**\n\n`;
  message += `**${product.title}**\n`;
  message += `💰 ${price}\n`;
  
  if (product.body_html) {
    // Strip HTML tags and limit description
    const description = product.body_html.replace(/<[^>]*>/g, '').trim();
    if (description.length > 200) {
      message += `\n${description.substring(0, 200)}...\n`;
    } else if (description) {
      message += `\n${description}\n`;
    }
  }
  
  if (product.handle) {
    message += `\n🔗 [View Product](https://engelfinedesign.com/products/${product.handle})`;
  }
  
  return { content: message, image };
}

export function setupExpressServer(client) {
  const app = express();
  
  // Enhanced middleware
  app.use(express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS headers for API access
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Shopify-Hmac-Sha256');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
  });
  
  // Mount documentation API routes
  app.use('/api/docs', docsRouter);
  console.log('📖 Documentation API mounted at /api/docs');
  
  // Root endpoint with service information
  app.get('/', (req, res) => {
    res.json({
      service: 'EFD Discord Bot Server',
      version: '1.0.0',
      endpoints: {
        webhooks: {
          shopify_products: 'POST /webhook/shopify/products/create'
        },
        documentation: {
          interactive: '/api/docs/',
          api: '/api/docs/commands',
          categories: '/api/docs/categories',
          search: '/api/docs/search?q=term',
          stats: '/api/docs/stats',
          health: '/api/docs/health'
        }
      },
      status: 'online',
      timestamp: new Date().toISOString()
    });
  });
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'EFD Discord Bot Server',
      discord: client.isReady() ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });
  
  // Shopify webhook endpoint
  app.post('/webhook/shopify/products/create', async (req, res) => {
    try {
      const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
      const body = req.body;
      
      // Verify webhook authenticity
      if (!verifyShopifyWebhook(body, hmacHeader)) {
        console.log('Webhook verification failed');
        return res.status(401).send('Unauthorized');
      }
      
      const product = JSON.parse(body.toString());
      console.log('Received product webhook:', product.title);
      
      // Determine category and target channel
      const category = categorizeProduct(product);
      const channelId = category === 'gemstones' ? GEMSTONES_CHANNEL_ID : JEWELRY_CHANNEL_ID;
      
      // Get Discord channel
      const channel = await client.channels.fetch(channelId);
      if (!channel) {
        console.error(`Channel ${channelId} not found`);
        return res.status(500).send('Channel not found');
      }
      
      // Format and send message
      const { content, image } = formatProductMessage(product);
      const messageOptions = { content };
      
      if (image) {
        messageOptions.embeds = [{
          image: { url: image },
          color: category === 'gemstones' ? 0x9b59b6 : 0xe74c3c
        }];
      }
      
      await channel.send(messageOptions);
      console.log(`Posted ${category} product to Discord: ${product.title}`);
      
      res.status(200).send('OK');
      
    } catch (error) {
      console.error('Webhook processing error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Documentation update endpoint (for triggering doc regeneration)
  app.post('/api/docs/update', async (req, res) => {
    try {
      console.log('🔄 Updating Discord bot documentation...');
      
      // Import and run the documentation generator
      const { CommandDocsGenerator } = await import('../scripts/generate-docs.js');
      const generator = new CommandDocsGenerator();
      await generator.generateDocs();
      
      console.log('✅ Documentation updated successfully!');
      res.json({
        success: true,
        message: 'Documentation updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Failed to update documentation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update documentation',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
      timestamp: new Date().toISOString()
    });
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `Endpoint ${req.method} ${req.path} not found`,
      availableEndpoints: {
        webhooks: ['POST /webhook/shopify/products/create'],
        documentation: [
          'GET /api/docs/',
          'GET /api/docs/commands',
          'GET /api/docs/categories',
          'GET /api/docs/search',
          'POST /api/docs/update'
        ],
        service: ['GET /', 'GET /health']
      },
      timestamp: new Date().toISOString()
    });
  });
  
  const port = process.env.PORT || process.env.WEBHOOK_PORT || 3000;
  app.listen(port, () => {
    console.log(`🌐 EFD Bot Server listening on port ${port}`);
    console.log(`📖 Documentation available at: http://localhost:${port}/api/docs/`);
    console.log(`🔗 Shopify webhooks ready at: http://localhost:${port}/webhook/shopify/products/create`);
    console.log(`💡 Update docs via: POST http://localhost:${port}/api/docs/update`);
    console.log(`❤️  Health check at: http://localhost:${port}/health`);
  });
  
  return app;
}