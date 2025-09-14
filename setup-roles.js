import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const rolesToCreate = [
  // Main verification role
  { name: 'Collector', color: '#e74c3c', hoist: false, mentionable: false },
  
  // Industry specific roles
  { name: 'Jeweler', color: '#f39c12', hoist: false, mentionable: false },
  { name: 'Lapidarist', color: '#9b59b6', hoist: false, mentionable: false },
  { name: 'Cad designer', color: '#2ecc71', hoist: false, mentionable: false },
  { name: 'Dealer', color: '#e67e22', hoist: false, mentionable: false },
  { name: 'Other', color: '#95a5a6', hoist: false, mentionable: false },
  
  // Special collector role
  { name: 'EFD Collector', color: '#c0392b', hoist: false, mentionable: false }
];

client.once('ready', async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  try {
    const guild = await client.guilds.fetch(process.env.GUILD_ID);
    console.log(`Working on guild: ${guild.name}`);
    
    const existingRoles = guild.roles.cache;
    let created = 0;
    let skipped = 0;
    
    for (const roleData of rolesToCreate) {
      const existingRole = existingRoles.find(role => role.name === roleData.name);
      
      if (existingRole) {
        console.log(`⏭️  Role "${roleData.name}" already exists, skipping...`);
        skipped++;
      } else {
        try {
          await guild.roles.create({
            name: roleData.name,
            color: roleData.color,
            hoist: roleData.hoist,
            mentionable: roleData.mentionable,
            reason: 'Created by efdBot role setup script'
          });
          console.log(`✅ Created role: "${roleData.name}"`);
          created++;
        } catch (error) {
          console.error(`❌ Failed to create role "${roleData.name}":`, error.message);
        }
      }
    }
    
    console.log(`\n🎉 Role setup complete!`);
    console.log(`   Created: ${created} roles`);
    console.log(`   Skipped: ${skipped} roles (already existed)`);
    console.log(`   Total: ${rolesToCreate.length} roles processed`);
    
  } catch (error) {
    console.error('❌ Error setting up roles:', error);
  }
  
  client.destroy();
});

client.login(process.env.BOT_TOKEN);