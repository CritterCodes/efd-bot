import { Client, GatewayIntentBits, Collection, Events } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { setupWebhookServer } from './webhook.js';
dotenv.config();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const commandModule = await import(pathToFileURL(path.join(__dirname, 'commands', file)).href);
  client.commands.set(commandModule.default.data.name, commandModule.default);
}

client.once(Events.ClientReady, () => {
  console.log(`Logged in as ${client.user.tag}`);
  
  // Start webhook server
  setupWebhookServer(client);
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
    // Handle verification button
    if (interaction.customId === 'start_verification') {
      const verifyCommand = client.commands.get('verify');
      if (verifyCommand) {
        try {
          await verifyCommand.execute(interaction);
        } catch (error) {
          console.error(error);
          await interaction.reply({ content: 'There was an error starting verification!', flags: 64 });
        }
      }
    }
  }
});

client.login(process.env.BOT_TOKEN);