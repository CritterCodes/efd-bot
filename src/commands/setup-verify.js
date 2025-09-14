import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setup-verify')
    .setDescription('Set up the verification message with button (Admin only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send the verification message to')
        .setRequired(false)),
  async execute(interaction) {
    const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
    
    const embed = new EmbedBuilder()
      .setTitle('🔰 Member Verification')
      .setDescription(`Welcome to the EngelFineDesign community!\n\nTo access all channels and features, please verify your membership by clicking the button below.\n\n**What we'll ask:**\n• Are you in the jewelry industry or a collector?\n• Your role/specialization (for industry members)\n• Services you offer (for certain roles)\n• EFD jewelry ownership (for collectors)\n\nThis verification is required once and helps us build a trusted community.`)
      .setColor('#3498db')
      .setFooter({ text: 'Click the button below to start verification' });
    
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start_verification')
        .setLabel('🔰 Start Verification')
        .setStyle(ButtonStyle.Primary)
    );
    
    try {
      const message = await targetChannel.send({
        embeds: [embed],
        components: [row]
      });
      
      // Pin the message
      await message.pin();
      
      await interaction.reply({
        content: `✅ Verification message sent and pinned in ${targetChannel}`,
        flags: 64
      });
      
    } catch (error) {
      console.error('Error setting up verification message:', error);
      await interaction.reply({
        content: '❌ Failed to set up verification message. Make sure I have permissions to send messages and pin messages in that channel.',
        flags: 64
      });
    }
  }
};