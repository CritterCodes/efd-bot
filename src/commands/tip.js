/**
 * GEMS Tip Command
 * 
 * Allows users to transfer GEMS to other community members as tips or appreciation.
 * Includes balance validation, transfer limits, and confirmation messages.
 * 
 * @command /tip @user amount [reason]
 * @author GitHub Copilot
 * @version 1.0.0
 */

import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { GemsCore } from '../lib/gems.js';

const gemsCore = new GemsCore();

export default {
    data: new SlashCommandBuilder()
        .setName('tip')
        .setDescription('Tip GEMS to another user')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to tip GEMS to')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option
                .setName('amount')
                .setDescription('Amount of GEMS to tip')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(1000)
        )
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Optional reason for the tip')
                .setRequired(false)
                .setMaxLength(200)
        ),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const recipient = interaction.options.getUser('user');
            const amount = interaction.options.getInteger('amount');
            const reason = interaction.options.getString('reason') || 'GEMS tip';
            const sender = interaction.user;
            
            // Validation checks
            if (recipient.bot) {
                return await interaction.editReply({
                    content: '❌ You cannot tip GEMS to bots.',
                    ephemeral: true
                });
            }
            
            if (recipient.id === sender.id) {
                return await interaction.editReply({
                    content: '❌ You cannot tip GEMS to yourself.',
                    ephemeral: true
                });
            }
            
            // Check if sender has enough GEMS
            const senderBalance = await gemsCore.getUserBalance(sender.id);
            if (senderBalance.balance < amount) {
                const errorEmbed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Insufficient GEMS')
                    .setDescription(`You need **${amount} GEMS** but only have **${senderBalance.balance} GEMS**.`)
                    .addFields({ name: '💰 Your Balance', value: `${senderBalance.balance} GEMS`, inline: true })
                    .setTimestamp();
                    
                return await interaction.editReply({ embeds: [errorEmbed], ephemeral: true });
            }
            
            // Perform the transfer
            const transferResult = await gemsCore.transferGems(sender.id, recipient.id, amount, reason);
            
            if (transferResult.success) {
                // Create success embed
                const successEmbed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle('💸 GEMS Tip Successful!')
                    .setDescription(`**${sender.displayName}** tipped **${amount} GEMS** to **${recipient.displayName}**`)
                    .addFields(
                        { name: '💰 Your New Balance', value: `${transferResult.fromBalance} GEMS`, inline: true },
                        { name: '💰 Recipient Balance', value: `${transferResult.toBalance} GEMS`, inline: true },
                        { name: '📝 Reason', value: reason, inline: false }
                    )
                    .setThumbnail(recipient.displayAvatarURL({ dynamic: true }))
                    .setTimestamp()
                    .setFooter({ text: 'Thank you for supporting the community!' });
                    
                await interaction.editReply({ embeds: [successEmbed] });
                
                // Try to notify the recipient (optional)
                try {
                    const notificationEmbed = new EmbedBuilder()
                        .setColor('#4facfe')
                        .setTitle('💎 You received GEMS!')
                        .setDescription(`**${sender.displayName}** tipped you **${amount} GEMS**!`)
                        .addFields(
                            { name: '💰 Your New Balance', value: `${transferResult.toBalance} GEMS`, inline: true },
                            { name: '📝 Reason', value: reason, inline: false }
                        )
                        .setThumbnail(sender.displayAvatarURL({ dynamic: true }))
                        .setTimestamp();
                        
                    await recipient.send({ embeds: [notificationEmbed] });
                } catch (dmError) {
                    console.log(`Could not DM ${recipient.displayName} about GEMS tip:`, dmError.message);
                    // Silent fail - user might have DMs disabled
                }
                
            } else {
                throw new Error('Transfer failed: ' + transferResult.error);
            }
            
        } catch (error) {
            console.error('Tip command error:', error);
            
            const errorMessage = `❌ **Error:** ${error.message || 'An unexpected error occurred while processing your tip.'}`;
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage, ephemeral: true });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    }
};