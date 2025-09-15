/**
 * verify.js
 * 
 * Handler for verification button interactions and workflow.
 * This handles ONLY button interactions from the pinned verification message.
 * No slash command is registered - verification is initiated only via the button.
 * 
 * MVC Architecture:
 * - Handler (Route): This file - handles button routing and validation
 * - Controller: VerificationController - orchestrates business logic
 * - Service: VerificationService - handles database operations and Discord roles
 * - Model: DiscordUser - defines data structures and validation
 */

import VerificationController from '../controllers/VerificationController.js';

/**
 * Handle verification button interactions
 * Called from index.js when start_verification button is clicked
 */
export async function handleVerificationButton(interaction) {
  try {
    if (!interaction.isButton() || interaction.customId !== 'start_verification') {
      console.error('Invalid verification button interaction:', {
        isButton: interaction.isButton(),
        customId: interaction.customId
      });
      return;
    }

    const controller = new VerificationController();
    await controller.startVerification(interaction);
    
  } catch (error) {
    console.error('Error in verification button handler:', error);
    
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ An error occurred during verification. Please try again later.',
        flags: 64
      });
    } else {
      await interaction.followUp({
        content: '❌ An error occurred during verification. Please try again later.',
        flags: 64
      });
    }
  }
}