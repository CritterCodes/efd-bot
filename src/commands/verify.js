import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType } from 'discord.js';
import { db } from '../lib/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Start member verification process.'),
  async execute(interaction) {
    // Check if user is already verified
    await db.connect();
    const discordUsers = db.getDb().collection('discordUsers');
    const existingUser = await discordUsers.findOne({ discordId: interaction.user.id });
    
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
    const buttonInteraction = await interaction.channel.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 60000 });

    if (buttonInteraction.customId === 'industry') {
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
      const roleSelect = await buttonInteraction.channel.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 });
      
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
        const servicesSelect = await roleSelect.channel.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 });
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
        const dealerSelect = await roleSelect.channel.awaitMessageComponent({ filter, componentType: ComponentType.StringSelect, time: 60000 });
        dealerProducts = dealerSelect.values;
        lastInteraction = dealerSelect;
      } else if (roleSelect.values[0] === 'cad_designer') {
        services = ['cad_design'];
      }
      
      // Save to discordUsers collection
      await db.connect();
      const discordUsers = db.getDb().collection('discordUsers');
      await discordUsers.insertOne({
        discordId: interaction.user.id,
        username: interaction.user.username,
        type: 'industry',
        role: roleSelect.values[0],
        services,
        dealerProducts,
        verifiedAt: new Date()
      });
      
      // Send final confirmation message
      const finalMessage = 'Thank you! You have been verified as an industry member.';
      if (lastInteraction === roleSelect) {
        await roleSelect.reply({ content: finalMessage, flags: 64 });
      } else {
        await lastInteraction.reply({ content: finalMessage, flags: 64 });
      }
      
      // Assign roles if they exist
      try {
        const guild = interaction.guild;
        const member = await guild.members.fetch(interaction.user.id);
        // Fetch all roles to get updated cache
        await guild.roles.fetch();
        const roleName = roleSelect.values[0].charAt(0).toUpperCase() + roleSelect.values[0].slice(1).replace('_', ' ');
        const role = guild.roles.cache.find(r => r.name === roleName);
        if (role) {
          await member.roles.add(role.id);
          console.log(`Assigned role "${roleName}" (ID: ${role.id}) to user ${interaction.user.username}`);
        } else {
          console.log(`Role "${roleName}" not found in server`);
        }
      } catch (error) {
        console.error('Error assigning roles:', error);
      }
      
    } else if (buttonInteraction.customId === 'collector') {
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
      const efdInteraction = await buttonInteraction.channel.awaitMessageComponent({ filter, componentType: ComponentType.Button, time: 60000 });
      
      if (efdInteraction.customId === 'owns_efd') {
        await efdInteraction.reply({ content: 'Please provide details or proof of ownership in chat.', flags: 64 });
        const collected = await efdInteraction.channel.awaitMessages({ filter: m => m.author.id === interaction.user.id, max: 1, time: 120000 });
        const proof = collected.first()?.content || 'Not provided';
        // Save to DB
        await db.connect();
        const discordUsers = db.getDb().collection('discordUsers');
        await discordUsers.insertOne({
          discordId: interaction.user.id,
          username: interaction.user.username,
          type: 'collector',
          ownsEfd: true,
          proof,
          verifiedAt: new Date()
        });
        await efdInteraction.followUp({ content: 'Thank you! Your ownership will be verified by an admin.', flags: 64 });
        
        // Assign roles
        try {
          const guild = interaction.guild;
          const member = await guild.members.fetch(interaction.user.id);
          // Fetch all roles to get updated cache
          await guild.roles.fetch();
          const roleNames = ['Collector', 'EFD Collector'];
          for (const roleName of roleNames) {
            const role = guild.roles.cache.find(r => r.name === roleName);
            if (role) {
              await member.roles.add(role.id);
              console.log(`Assigned role "${roleName}" (ID: ${role.id}) to user ${interaction.user.username}`);
            } else {
              console.log(`Role "${roleName}" not found in server`);
            }
          }
        } catch (error) {
          console.error('Error assigning roles:', error);
        }
      } else {
        // No EFD jewelry
        await db.connect();
        const discordUsers = db.getDb().collection('discordUsers');
        await discordUsers.insertOne({
          discordId: interaction.user.id,
          username: interaction.user.username,
          type: 'collector',
          ownsEfd: false,
          verifiedAt: new Date()
        });
        await efdInteraction.reply({ content: 'Thank you! You have been verified as a collector.', flags: 64 });
        
        // Assign role
        try {
          const guild = interaction.guild;
          const member = await guild.members.fetch(interaction.user.id);
          // Fetch all roles to get updated cache
          await guild.roles.fetch();
          const role = guild.roles.cache.find(r => r.name === 'Collector');
          if (role) {
            await member.roles.add(role.id);
            console.log(`Assigned role "Collector" (ID: ${role.id}) to user ${interaction.user.username}`);
          } else {
            console.log(`Role "Collector" not found in server`);
          }
        } catch (error) {
          console.error('Error assigning roles:', error);
        }
      }
    }
  }
};