import { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import VerificationService from '../services/VerificationService.js';
import { GemsService } from '../services/GemsService.js';

/**
 * Controller for handling Discord verification workflows
 * Manages the user interaction flow and delegates business logic to VerificationService
 */
export default class VerificationController {
    constructor() {
        this.verificationService = new VerificationService();
    }

    /**
     * Start the verification process
     * @param {import('discord.js').Interaction} interaction 
     */
    async startVerification(interaction) {
        try {
            // Check if user is already verified
            const existingUser = await this.verificationService.findUserByDiscordId(interaction.user.id);
            
            if (existingUser) {
                return await interaction.reply({
                    content: `You are already verified as a ${existingUser.type === 'industry' ? existingUser.role : 'collector'}! You can only verify once.`,
                    flags: 64
                });
            }

            // Step 1: Ask if user is in the industry or a collector
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('industry')
                    .setLabel('Jewelry Industry')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('collector')
                    .setLabel('Jewelry Collector')
                    .setStyle(ButtonStyle.Secondary)
            );
            
            await interaction.reply({
                content: 'Welcome! Are you in the jewelry industry or a jewelry collector?',
                components: [row],
                flags: 64
            });

            // Step 2: Wait for button interaction
            const filter = i => i.user.id === interaction.user.id;
            const buttonInteraction = await interaction.channel.awaitMessageComponent({ 
                filter, 
                componentType: ComponentType.Button, 
                time: 60000 
            });

            if (buttonInteraction.customId === 'industry') {
                await this._handleIndustryVerification(interaction, buttonInteraction);
            } else if (buttonInteraction.customId === 'collector') {
                await this._handleCollectorVerification(interaction, buttonInteraction);
            }

        } catch (error) {
            console.error('Error in startVerification:', error);
            if (error.code === 'InteractionCollectorError') {
                await interaction.editReply({
                    content: 'Verification timed out. Please try again.',
                    components: []
                });
            } else {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: 'There was an error during verification. Please try again.',
                        flags: 64
                    });
                }
            }
        }
    }

    /**
     * Handle industry professional verification workflow
     * @private
     */
    async _handleIndustryVerification(interaction, buttonInteraction) {
        const filter = i => i.user.id === interaction.user.id;

        // Step 3a: Industry role select
        const industryRow = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('industry_role')
                .setPlaceholder('Select your role')
                .addOptions([
                    { label: 'Jeweler', value: 'jeweler' },
                    { label: 'Lapidarist', value: 'lapidarist' },
                    { label: 'CAD Designer', value: 'cad_designer' },
                    { label: 'Dealer', value: 'dealer' },
                    { label: 'Other', value: 'other' }
                ])
        );
        
        await buttonInteraction.update({
            content: 'What is your role in the jewelry industry?',
            components: [industryRow],
            flags: 64
        });

        const roleSelect = await buttonInteraction.channel.awaitMessageComponent({ 
            filter, 
            componentType: ComponentType.StringSelect, 
            time: 60000 
        });
        
        let services = [];
        let dealerProducts = [];
        let lastInteraction = roleSelect;
        
        if (roleSelect.values[0] === 'jeweler') {
            // Multi-select for jeweler services
            const servicesRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('jeweler_services')
                    .setPlaceholder('Select your services (multiple allowed)')
                    .setMinValues(1)
                    .setMaxValues(7)
                    .addOptions([
                        { label: 'Jewelry Design', value: 'jewelry_design' },
                        { label: 'CAD Design', value: 'cad_design' },
                        { label: 'Fabrication', value: 'fabrication' },
                        { label: 'Casting', value: 'casting' },
                        { label: 'Stone Setting', value: 'stone_setting' },
                        { label: 'Engraving', value: 'engraving' },
                        { label: 'Repair', value: 'repair' }
                    ])
            );
            
            await roleSelect.reply({
                content: 'Select the services you offer:',
                components: [servicesRow],
                flags: 64
            });
            
            const servicesSelect = await roleSelect.channel.awaitMessageComponent({ 
                filter, 
                componentType: ComponentType.StringSelect, 
                time: 60000 
            });
            services = servicesSelect.values;
            lastInteraction = servicesSelect;
        } else if (roleSelect.values[0] === 'dealer') {
            // Multi-select for dealer products
            const dealerRow = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('dealer_products')
                    .setPlaceholder('Select what you sell (multiple allowed)')
                    .setMinValues(1)
                    .setMaxValues(4)
                    .addOptions([
                        { label: 'Gemstones', value: 'gemstones' },
                        { label: 'Diamonds', value: 'diamonds' },
                        { label: 'Mountings', value: 'mountings' },
                        { label: 'Jewelry', value: 'jewelry' }
                    ])
            );
            
            await roleSelect.reply({
                content: 'Select what you sell:',
                components: [dealerRow],
                flags: 64
            });
            
            const dealerSelect = await roleSelect.channel.awaitMessageComponent({ 
                filter, 
                componentType: ComponentType.StringSelect, 
                time: 60000 
            });
            dealerProducts = dealerSelect.values;
            lastInteraction = dealerSelect;
        } else if (roleSelect.values[0] === 'cad_designer') {
            services = ['cad_design'];
        }
        
        // Save to database using service
        await this.verificationService.createIndustryUser({
            discordId: interaction.user.id,
            username: interaction.user.username,
            role: roleSelect.values[0],
            services,
            dealerProducts
        });
        
        // Try to assign roles using service (non-blocking - don't fail verification if this fails)
        try {
            await this.verificationService.assignIndustryRoles(interaction.guild, interaction.user.id, roleSelect.values[0]);
        } catch (roleError) {
            console.error('Error assigning industry roles (continuing with verification):', roleError);
        }
        
        // Define the base success message
        const finalMessage = 'Thank you! You have been verified as an industry member.';
        
        // Award GEMS for verification (industry professionals get 100 GEMS)
        try {
            await GemsService.addGems(
                interaction.user.id, 
                100, 
                'Account verification reward', 
                { 
                    source: 'verification', 
                    type: 'industry', 
                    role: roleSelect.values[0] 
                },
                true // Bypass daily limits for verification rewards
            );
            
            // Update final message to include GEMS reward
            const gemsMessage = `\n\n✨ **Bonus:** You've been awarded 100 GEMS for verifying your account!`;
            const finalMessageWithGems = finalMessage + gemsMessage;
            
            if (lastInteraction === roleSelect) {
                await roleSelect.reply({ content: finalMessageWithGems, flags: 64 });
            } else {
                await lastInteraction.reply({ content: finalMessageWithGems, flags: 64 });
            }
        } catch (gemsError) {
            console.error('Error awarding verification GEMS:', gemsError);
            // Still send the original success message even if GEMS fails
            if (lastInteraction === roleSelect) {
                await roleSelect.reply({ content: finalMessage, flags: 64 });
            } else {
                await lastInteraction.reply({ content: finalMessage, flags: 64 });
            }
        }
    }

    /**
     * Handle collector verification workflow
     * @private
     */
    async _handleCollectorVerification(interaction, buttonInteraction) {
        const filter = i => i.user.id === interaction.user.id;

        // Step 4a: Collector - EFD jewelry ownership
        const collectorRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('owns_efd')
                .setLabel('I own [efd] Jewelry')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('no_efd')
                .setLabel('I do not own [efd] Jewelry')
                .setStyle(ButtonStyle.Secondary)
        );
        
        await buttonInteraction.update({
            content: 'Do you own any [efd] Jewelry?',
            components: [collectorRow],
            flags: 64
        });

        const efdInteraction = await buttonInteraction.channel.awaitMessageComponent({ 
            filter, 
            componentType: ComponentType.Button, 
            time: 60000 
        });
        
        if (efdInteraction.customId === 'owns_efd') {
            await efdInteraction.reply({ content: 'Please provide details or proof of ownership in chat.', flags: 64 });
            
            const collected = await efdInteraction.channel.awaitMessages({ 
                filter: m => m.author.id === interaction.user.id, 
                max: 1, 
                time: 120000 
            });
            const proof = collected.first()?.content || 'Not provided';
            
            // Save to database using service
            await this.verificationService.createCollectorUser({
                discordId: interaction.user.id,
                username: interaction.user.username,
                ownsEfd: true,
                efdProof: proof
            });
            
            await efdInteraction.followUp({ content: 'Thank you! Your ownership will be verified by an admin.', flags: 64 });
            
            // Try to assign roles using service (non-blocking)
            try {
                await this.verificationService.assignCollectorRoles(interaction.guild, interaction.user.id, true);
            } catch (roleError) {
                console.error('Error assigning collector roles (continuing with verification):', roleError);
            }
            
            // Award GEMS for verification (EFD collectors get 150 GEMS)
            try {
                await GemsService.addGems(
                    interaction.user.id, 
                    150, 
                    'Account verification reward (EFD Collector)', 
                    { 
                        source: 'verification', 
                        type: 'collector', 
                        ownsEfd: true 
                    },
                    true // Bypass daily limits for verification rewards
                );
                
                await efdInteraction.followUp({ 
                    content: '✨ **Bonus:** You\'ve been awarded 150 GEMS for verifying as an EFD Collector!', 
                    flags: 64 
                });
            } catch (gemsError) {
                console.error('Error awarding verification GEMS:', gemsError);
            }
        } else {
            // No EFD jewelry
            await this.verificationService.createCollectorUser({
                discordId: interaction.user.id,
                username: interaction.user.username,
                ownsEfd: false
            });
            
            await efdInteraction.reply({ content: 'Thank you! You have been verified as a collector.', flags: 64 });
            
            // Try to assign roles using service (non-blocking)
            try {
                await this.verificationService.assignCollectorRoles(interaction.guild, interaction.user.id, false);
            } catch (roleError) {
                console.error('Error assigning collector roles (continuing with verification):', roleError);
            }
            
            // Award GEMS for verification (regular collectors get 75 GEMS)
            try {
                await GemsService.addGems(
                    interaction.user.id, 
                    75, 
                    'Account verification reward (Collector)', 
                    { 
                        source: 'verification', 
                        type: 'collector', 
                        ownsEfd: false 
                    },
                    true // Bypass daily limits for verification rewards
                );
                
                await efdInteraction.followUp({ 
                    content: '✨ **Bonus:** You\'ve been awarded 75 GEMS for verifying your account!', 
                    flags: 64 
                });
            } catch (gemsError) {
                console.error('Error awarding verification GEMS:', gemsError);
            }
        }
    }

    /**
     * Reset verification data for a user (admin command)
     */
    async resetVerification(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const success = await this.verificationService.resetVerification(targetUser.id);
            
            const message = success 
                ? `✅ Verification data for ${targetUser.username} has been reset.`
                : `⚠️ No verification data found for ${targetUser.username}.`;

            await interaction.reply({
                content: message,
                flags: targetUser.id !== interaction.user.id ? 0 : 64
            });

        } catch (error) {
            console.error('Error in resetVerification:', error);
            await interaction.reply({
                content: 'There was an error resetting the verification data.',
                flags: 64
            });
        }
    }
}