import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = botConfig?.economy?.cooldowns?.steal || 1 * 60 * 60 * 1000;
const SUCCESS_RATE = botConfig?.economy?.stealSuccessRate ?? 0.2;
const STEAL_PERCENTAGE = botConfig?.economy?.stealPercentage ?? 0.70;
const FAIL_PENALTY = botConfig?.economy?.stealFailPenalty ?? 0.50;

export default {
  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription('Attempt to steal Silver Coins from another user')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user you want to steal from')
        .setRequired(true)
    ),

  execute: withErrorHandling(async (interaction, config, client) => {
    const deferred = await InteractionHelper.safeDefer(interaction);
    if (!deferred) return;

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;
    const targetUser = interaction.options.getUser('target');

    if (targetUser.id === userId) {
      throw createError(
        "Invalid target",
        ErrorTypes.VALIDATION,
        "You cannot steal from yourself!",
        { userId }
      );
    }

    if (targetUser.bot) {
      throw createError(
        "Invalid target",
        ErrorTypes.VALIDATION,
        "You cannot steal from bots!",
        { userId, targetId: targetUser.id }
      );
    }

    let userData = await getEconomyData(client, guildId, userId);
    if (!userData) {
      throw createError(
        "Failed to load economy data",
        ErrorTypes.DATABASE,
        "Failed to load your economy data. Please try again later.",
        { userId, guildId }
      );
    }

    const lastSteal = userData.lastSteal || 0;
    const remainingTime = lastSteal + COOLDOWN - Date.now();

    if (remainingTime > 0) {
      const minutes = Math.floor(remainingTime / 60000);
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      let timeMessage = minutes > 0 ? `${minutes} minute(s)` : `${seconds} second(s)`;

      throw createError(
        "Steal cooldown active",
        ErrorTypes.RATE_LIMIT,
        botConfig.economy.messages.cooldown.replace('{time}', timeMessage),
        { remainingTime, cooldownType: 'steal' }
      );
    }

    let targetData = await getEconomyData(client, guildId, targetUser.id);
    if (!targetData) {
      targetData = { wallet: 0 };
    }

    const targetBalance = targetData.wallet || 0;
    const currencySymbol = botConfig.economy.currencies.find(c => c.id === 'silver_coins')?.symbol || '🪙';

    userData.lastSteal = Date.now();

    const isSuccess = Math.random() < SUCCESS_RATE;

    if (isSuccess) {
      const stolenAmount = Math.floor(targetBalance * STEAL_PERCENTAGE);
      
      if (stolenAmount <= 0) {
        await setEconomyData(client, guildId, userId, userData);
        const replyEmbed = successEmbed(
          'Steal Attempt Failed',
          `Your target has no Silver Coins to steal!`
        );
        await interaction.editReply({ embeds: [replyEmbed] });
        return;
      }

      targetData.wallet = targetBalance - stolenAmount;
      userData.wallet = (userData.wallet || 0) + stolenAmount;

      await setEconomyData(client, guildId, targetUser.id, targetData);
      await setEconomyData(client, guildId, userId, userData);

      const replyEmbed = successEmbed(
        'Heist Successful',
        `${botConfig.economy.messages.steal} **(+${stolenAmount.toLocaleString()} ${currencySymbol})**`
      );

      await interaction.editReply({ embeds: [replyEmbed] });
    } else {
      const userBalance = userData.wallet || 0;
      const penaltyAmount = Math.floor(userBalance * FAIL_PENALTY);

      userData.wallet = userBalance - penaltyAmount;
      await setEconomyData(client, guildId, userId, userData);

      const replyEmbed = successEmbed(
        'Caught Red-Handed',
        `${botConfig.economy.messages.stealFail} **(-${penaltyAmount.toLocaleString()} ${currencySymbol})**`
      );

      await interaction.editReply({ embeds: [replyEmbed] });
    }
  }),
};
