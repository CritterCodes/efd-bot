import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { setupExpressServer } from './server.js';
import RoadmapAutomation from './lib/roadmapAutomation.js';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const commandModule = await import(pathToFileURL(path.join(__dirname, 'commands', file)).href);
  
  // Skip files that don't export a command (like handlers or utilities)
  if (!commandModule.default) {
    console.log(`Skipping ${file} - no default export`);
    continue;
  }
  
  // Handle slash commands (have .data property)
  if (commandModule.default.data) {
    client.commands.set(commandModule.default.data.name, commandModule.default);
  } 
  // Handle button handlers (have .name property)
  else if (commandModule.default.name) {
    client.commands.set(commandModule.default.name, commandModule.default);
  }
  else {
    console.log(`Skipping ${file} - no valid command structure`);
  }
}

client.once(Events.ClientReady, async () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Initialize roadmap automation
  const roadmapAutomation = new RoadmapAutomation(client);
  await roadmapAutomation.init();
  client.roadmapAutomation = roadmapAutomation;
  
  // Start webhook server
  setupExpressServer(client);
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error executing that command!', flags: 64 });
    }
  } else if (interaction.isButton()) {
    // Handle verification button interactions
    if (interaction.customId === 'start_verification') {
      console.log('Button interaction:', {
        customId: interaction.customId,
        user: interaction.user?.username
      });
      
      // Import and use the verification button handler
      const { handleVerificationButton } = await import('./commands/verification-handler.js');
      try {
        await handleVerificationButton(interaction);
      } catch (error) {
        console.error('Error handling verification button:', error);
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({ content: 'There was an error with verification!', flags: 64 });
        }
      }
    }
    // All other buttons (including verification workflow buttons) are handled 
    // by their respective workflows using awaitMessageComponent()
  }
});

client.login(process.env.BOT_TOKEN);