// deploy-commands.js
import { REST, Routes } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commands = [];
const commandFiles = fs.readdirSync(path.join(__dirname, 'src', 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const commandModule = await import(pathToFileURL(path.join(__dirname, 'src', 'commands', file)).href);
  // Only add commands that have slash command data
  if (commandModule.default.data) {
    commands.push(commandModule.default.data.toJSON());
  } else {
    console.log(`Skipping ${file} - not a slash command`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('Successfully reloaded application (/) commands.');
    
    // Auto-regenerate documentation after successful deployment
    try {
      console.log('\n🔄 Auto-updating command documentation...');
      const { CommandDocsGenerator } = await import('./scripts/generate-docs.js');
      const generator = new CommandDocsGenerator();
      await generator.generateDocs();
      console.log('✅ Documentation updated automatically after command deployment!');
      console.log('📖 View updated docs at: http://localhost:3000/api/docs/');
    } catch (docError) {
      console.warn('⚠️  Warning: Failed to update documentation automatically:', docError.message);
      console.log('💡 You can manually update docs by running: node scripts/generate-docs.js');
    }
  } catch (error) {
    console.error(error);
  }
})();
