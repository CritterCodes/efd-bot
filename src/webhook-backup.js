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
  if (product.body_html) {
    // Strip HTML tags and truncate description
    const description = product.body_html.replace(/<[^>]*>/g, '').substring(0, 200);
    message += `${description}${description.length >= 200 ? '...' : ''}\n\n`;
  }
  message += `💰 **Price:** ${price}\n`;
  if (product.vendor) message += `🏪 **Vendor:** ${product.vendor}\n`;
  if (product.product_type) message += `📂 **Type:** ${product.product_type}\n`;
  if (product.tags) message += `🏷️ **Tags:** ${product.tags}\n`;
  
  // Add Shopify link
  const shopifyUrl = `https://${process.env.SHOPIFY_DOMAIN}/products/${product.handle}`;
  message += `\n🔗 [View on Store](${shopifyUrl})`;
  
  return { content: message, image };
}

export function setupWebhookServer(client) {
  const app = express();
  
  // Enhanced middleware
  app.use(express.raw({ type: 'application/json' }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS headers for documentation API
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, X-Shopify-Hmac-Sha256');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    next();
  });
  
  // Mount documentation routes
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