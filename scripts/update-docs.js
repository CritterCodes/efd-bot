#!/usr/bin/env node

/**
 * Simple Documentation Updater
 * 
 * Manually maintain command documentation with real examples that actually help users.
 * No more auto-generation confusion - just simple, helpful docs.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Template for helpful documentation
const documentationTemplate = {
  metadata: {
    title: "EFD Discord Bot Commands",
    description: "Complete guide to using the EFD Discord bot",
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    commandCount: 0
  },
  commands: [
    {
      name: "gems",
      description: "GEMS currency system - check balance and view leaderboards",
      category: "Economy",
      adminOnly: false,
      permissions: ["Verified Users"],
      usage: [
        "/gems balance - Check your GEMS balance and daily limits",
        "/gems leaderboard [page] - View top GEMS holders on the server"
      ],
      examples: [
        {
          command: "/gems balance",
          description: "See how many GEMS you have and your daily earning progress"
        },
        {
          command: "/gems leaderboard",
          description: "View the top 10 GEMS holders on the server"
        },
        {
          command: "/gems leaderboard 2", 
          description: "View page 2 of the leaderboard (ranks 11-20)"
        }
      ],
      notes: [
        "You must be verified to use GEMS commands",
        "Verify using the pinned verification message (click the button)",
        "Industry collectors: 150 GEMS, EFD collectors: 100 GEMS, Regular collectors: 75 GEMS",
        "Use /tip to transfer GEMS to other users"
      ]
    },
    {
      name: "tip",
      description: "Transfer GEMS to other users - the primary way to share GEMS with appreciation or rewards",
      category: "Economy",
      adminOnly: false,
      permissions: ["Verified Users"],
      usage: [
        "/tip @user amount [reason] - Transfer GEMS to another user with optional message"
      ],
      examples: [
        {
          command: "/tip @helper 10",
          description: "Tip 10 GEMS to someone who helped you"
        },
        {
          command: "/tip @friend 25 \"Happy birthday!\"",
          description: "Tip 25 GEMS with a birthday message"
        },
        {
          command: "/tip @collector 15 \"Nice collection!\"",
          description: "Tip someone for sharing their awesome collection"
        },
        {
          command: "/tip @CritterCodes 50 \"Thanks for the bot help!\"",
          description: "Tip with a thank you message for assistance"
        }
      ],
      notes: [
        "This is the primary way to transfer GEMS between users",
        "Reason is optional but recommended for clarity",
        "Both sender and receiver must be verified (use pinned verification message)",
        "Minimum tip amount is 1 GEMS"
      ]
    },
    {
      name: "ping",
      description: "Test if the bot is online and responding properly",
      category: "General",
      adminOnly: false,
      permissions: ["Everyone"],
      usage: [
        "/ping - Check bot response time and status"
      ],
      examples: [
        {
          command: "/ping",
          description: "Quick way to test if the bot is working and see response time"
        }
      ],
      notes: [
        "Shows bot latency and API response time",
        "Useful for troubleshooting connection issues"
      ]
    }
  ]
};

async function updateDocumentation() {
  try {
    const outputPath = path.join(__dirname, '..', 'docs', 'api', 'commands.json');
    
    // Update command count
    documentationTemplate.metadata.commandCount = documentationTemplate.commands.length;
    
    // Write the documentation
    await fs.writeFile(outputPath, JSON.stringify(documentationTemplate, null, 2));
    
    console.log('✅ Documentation updated successfully!');
    console.log(`📄 Updated ${documentationTemplate.commands.length} commands`);
    console.log(`📍 Saved to: ${outputPath}`);
    console.log('🌐 View at: http://localhost:3000/api/docs/');
    
  } catch (error) {
    console.error('❌ Error updating documentation:', error);
    process.exit(1);
  }
}

// Run the update
updateDocumentation();