import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const SUCCESS_COOLDOWN = 4 * 60 * 60 * 1000;   // 4 hours on success
const FAIL_COOLDOWN = 24 * 60 * 60 * 1000;      // 24 hours on failure
const SUCCESS_CHANCE = 0.30;                    // 30% chance
const STEAL_PERCENTAGE = 0.70;                  // 70% of target's current silver coins
const FAIL_PENALTY_PERCENTAGE = 0.50;           // 50% reduction of user's silver coins on failure

export default {
  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription('Attempt to steal 70% of a target\'s silver coins (30% Success Rate)')
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
      userData = { wallet: 0, lastSteal: 0 };
    }

    const lastSteal = userData.lastSteal || 0;
    const currentCooldown = userData.lastStealWasFailure ? FAIL_COOLDOWN : SUCCESS_COOLDOWN;
    const remainingTime = lastSteal + currentCooldown - Date.now();

    if (remainingTime > 0) {
      const hours = Math.floor(remainingTime / (1000 * 60 * 60));
      const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / 60000);
      let timeMessage = hours > 0 ? `${hours} hour(s) ${minutes} minute(s)` : `${minutes} minute(s)`;

      throw createError(
        "Steal cooldown active",
        ErrorTypes.RATE_LIMIT,
        botConfig.economy.messages.cooldown.replace('{time}', timeMessage),
        { remainingTime, cooldownType: 'steal' }
      );
    }

    let targetData = await getEconomyData(client, guildId, targetUser.id);
    if (!targetData) {
      targetData = { wallet: 0, shield: false };
    }

    if (targetData.shield) {
      throw createError(
        "Target Protected",
        ErrorTypes.VALIDATION,
        "This user has an active **Shield** barrier protecting their silver coins from being stolen!",
        { targetId: targetUser.id }
      );
    }

    const roll = Math.random(); // Random number between 0 and 1
    const currencySymbol = botConfig.economy.currencies.find(c => c.id === 'silver_coins')?.symbol || '🪙';

    if (roll <= SUCCESS_CHANCE) {
      // SUCCESS: 30% chance
      const targetWallet = targetData.wallet || 0;
      const stolenAmount = Math.floor(targetWallet * STEAL_PERCENTAGE);

      if (stolenAmount <= 0) {
        throw createError(
          "No Coins to Steal",
          ErrorTypes.VALIDATION,
          "Your target does not have enough silver coins in their wallet!",
          { targetId: targetUser.id }
        );
      }

      targetData.wallet = targetWallet - stolenAmount;
      userData.wallet = (userData.wallet || 0) + stolenAmount;
      userData.lastSteal = Date.now();
      userData.lastStealWasFailure = false; // Success cooldown = 4 hours

      await setEconomyData(client, guildId, targetUser.id, targetData);
      await setEconomyData(client, guildId, userId, userData);

      const replyEmbed = successEmbed(
        'Steal Successful!',
        `In the shadows, you successfully swiped **${stolenAmount.toLocaleString()} ${currencySymbol}** (70%) from ${targetUser}!`
      );

      await interaction.editReply({ embeds: [replyEmbed] });
    } else {
      // FAILURE: 70% chance
      const userWallet = userData.wallet || 0;
      const penaltyAmount = Math.floor(userWallet * FAIL_PENALTY_PERCENTAGE);

      userData.wallet = Math.max(0, userWallet - penaltyAmount);
      userData.lastSteal = Date.now();
      userData.lastStealWasFailure = true; // Failure cooldown = 24 hours

      await setEconomyData(client, guildId, userId, userData);

      const replyEmbed = errorEmbed(
        'Steal Failed!',
        `You were caught red-handed trying to pickpocket! Guard intervention penalized you by losing **${penaltyAmount.toLocaleString()} ${currencySymbol}** (50% of your silver coins). Your next steal cooldown is now **24 hours**.`
      );

      await interaction.editReply({ embeds: [replyEmbed] });
    }
  }),
};
