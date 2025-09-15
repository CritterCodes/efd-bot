/**
 * verify-reset.js
 * 
 * Admin slash command for resetting user verification status.
 * This is separate from the main verify button system.
 */

import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import VerificationController from '../controllers/VerificationController.js';

export default {
  data: new SlashCommandBuilder()
    .setName('verify-reset')
    .setDescription('Reset verification status (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to reset (leave empty to reset yourself)')
        .setRequired(false)),

  async execute(interaction) {
    try {
      // Input validation
      if (!interaction.guild) {
        return await interaction.reply({
          content: '❌ This command can only be used in a server.',
          flags: 64
        });
      }

      const controller = new VerificationController();
      await controller.resetVerification(interaction);

    } catch (error) {
      console.error('Error in verify-reset command:', error);
      
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ An error occurred while resetting verification. Please try again later.',
          flags: 64
        });
      } else {
        await interaction.followUp({
          content: '❌ An error occurred while resetting verification. Please try again later.',
          flags: 64
        });
      }
    }
  }
};