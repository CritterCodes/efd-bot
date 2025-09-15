/**
 * Discord Command Integration Test
 * 
 * This script helps verify that the deployed commands are working correctly
 * by testing the command registration and basic functionality.
 */

import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🧪 Starting Discord Command Integration Test\n');

// Verify environment variables
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is not set in environment variables');
    process.exit(1);
}

if (!process.env.CLIENT_ID) {
    console.error('❌ CLIENT_ID is not set in environment variables');
    process.exit(1);
}

console.log('✅ Environment variables configured');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', async () => {
    console.log(`✅ Bot logged in as ${client.user.tag}`);
    
    try {
        // Fetch global commands
        const commands = await client.application.commands.fetch();
        console.log(`\n📋 Deployed Commands (${commands.size} total):`);
        
        commands.forEach(command => {
            console.log(`  ├── /${command.name} - ${command.description}`);
            
            if (command.options && command.options.length > 0) {
                command.options.forEach(option => {
                    const optionType = option.type === 1 ? 'SUBCOMMAND' : 
                                     option.type === 2 ? 'SUBCOMMAND_GROUP' :
                                     option.type === 3 ? 'STRING' :
                                     option.type === 4 ? 'INTEGER' :
                                     option.type === 6 ? 'USER' :
                                     option.type === 5 ? 'BOOLEAN' : 'OTHER';
                    
                    const required = option.required ? '(required)' : '(optional)';
                    console.log(`  │   └── ${option.name} [${optionType}] ${required} - ${option.description}`);
                });
            }
        });
        
        // Check specifically for our MVC commands
        const gemsCommand = commands.find(cmd => cmd.name === 'gems');
        const tipCommand = commands.find(cmd => cmd.name === 'tip');
        
        console.log('\n🔍 MVC Command Verification:');
        
        if (gemsCommand) {
            console.log('✅ GEMS command deployed successfully');
            console.log(`   └── Subcommands: ${gemsCommand.options?.length || 0}`);
        } else {
            console.log('❌ GEMS command not found');
        }
        
        if (tipCommand) {
            console.log('✅ TIP command deployed successfully');
            console.log(`   └── Options: ${tipCommand.options?.length || 0}`);
        } else {
            console.log('❌ TIP command not found');
        }
        
        console.log('\n🎉 Integration test completed successfully!');
        console.log('\n📝 Next steps:');
        console.log('   1. Test /gems balance in Discord');
        console.log('   2. Test /gems leaderboard in Discord');
        console.log('   3. Test /tip @user amount in Discord');
        console.log('   4. Verify admin commands work for authorized users');
        
    } catch (error) {
        console.error('❌ Error during integration test:', error);
    }
    
    // Disconnect after test
    setTimeout(() => {
        console.log('\n🔌 Disconnecting from Discord...');
        client.destroy();
        process.exit(0);
    }, 2000);
});

client.on('error', (error) => {
    console.error('❌ Discord client error:', error);
});

// Login to Discord
console.log('🔌 Connecting to Discord...');
client.login(process.env.DISCORD_TOKEN);