import { SlashCommandBuilder } from 'discord.js';
import { db } from '../lib/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('services')
    .setDescription('Look up services offered by a Discord user.')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('The user to look up')
        .setRequired(true)),
  async execute(interaction) {
    const targetUser = interaction.options.getUser('user');
    
    try {
      // Connect to database and find user
      await db.connect();
      const discordUsers = db.getDb().collection('discordUsers');
      const userData = await discordUsers.findOne({ discordId: targetUser.id });
      
      if (!userData) {
        return await interaction.reply({
          content: `❌ ${targetUser.username} is not verified in our system.`,
          flags: 64
        });
      }
      
      let response = `**${targetUser.username}'s Profile:**\n`;
      
      if (userData.type === 'industry') {
        response += `🔧 **Role:** ${userData.role.charAt(0).toUpperCase() + userData.role.slice(1).replace('_', ' ')}\n`;
        
        if (userData.services && userData.services.length > 0) {
          response += `🛠️ **Services Offered:**\n`;
          const serviceNames = userData.services.map(service => {
            return service.replace('_', ' ').split(' ').map(word => 
              word.charAt(0).toUpperCase() + word.slice(1)
            ).join(' ');
          });
          response += serviceNames.map(service => `• ${service}`).join('\n');
        }
        
        if (userData.dealerProducts && userData.dealerProducts.length > 0) {
          response += `\n💎 **Products Sold:**\n`;
          const productNames = userData.dealerProducts.map(product => {
            return product.charAt(0).toUpperCase() + product.slice(1);
          });
          response += productNames.map(product => `• ${product}`).join('\n');
        }
        
        if (userData.role === 'cad_designer') {
          response += `🖥️ **Specialization:** CAD Design`;
        }
        
      } else if (userData.type === 'collector') {
        response += `🏺 **Type:** Jewelry Collector\n`;
        if (userData.ownsEfd) {
          response += `💎 **EFD Jewelry Owner:** Yes ✅`;
        } else {
          response += `💎 **EFD Jewelry Owner:** No`;
        }
      }
      
      response += `\n\n⏰ **Verified:** ${userData.verifiedAt ? new Date(userData.verifiedAt).toLocaleDateString() : 'Unknown'}`;
      
      await interaction.reply({
        content: response,
        flags: 64
      });
      
    } catch (error) {
      console.error('Error looking up user services:', error);
      await interaction.reply({
        content: '❌ An error occurred while looking up user information.',
        flags: 64
      });
    }
  }
};