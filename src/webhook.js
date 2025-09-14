import express from 'express';
import crypto from 'crypto';

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
  
  // Middleware to capture raw body for webhook verification
  app.use('/webhook/shopify', express.raw({ type: 'application/json' }));
  app.use(express.json());
  
  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
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
  
  const port = process.env.WEBHOOK_PORT || 3000;
  app.listen(port, () => {
    console.log(`🌐 Webhook server listening on port ${port}`);
  });
  
  return app;
}