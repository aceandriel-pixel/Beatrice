import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('shield')
    .setDescription('Permanently activate your protective anti-theft barrier'),

  execute: withErrorHandling(async (interaction, config, client) => {
    const deferred = await InteractionHelper.safeDefer(interaction);
    if (!deferred) return;

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    let userData = await getEconomyData(client, guildId, userId);
    if (!userData) {
      userData = { shield: false };
    }

    if (userData.shield) {
      throw createError(
        "Already Protected",
        ErrorTypes.VALIDATION,
        "Your protective barrier is already permanently active!",
        { userId }
      );
    }

    userData.shield = true;
    await setEconomyData(client, guildId, userId, userData);

    const replyEmbed = successEmbed(
      'Shield Activated',
      botConfig.economy.messages.shield
    );

    await interaction.editReply({ embeds: [replyEmbed] });
  }),
};

