import { SlashCommandBuilder } from 'discord.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = 1 * 60 * 60 * 1000; // 1 hour cooldown
const DRAIN_PERCENTAGE = 0.10; // 10% of target's current mana
const SUCCESS_CHANCE = 0.01; // 1% chance (0.01)
const FAIL_PENALTY_PERCENTAGE = 0.50; // 50% reduction on failure

export default {
  data: new SlashCommandBuilder()
    .setName('manadrain')
    .setDescription('Attempt a risky ritual to siphon 10% of your target\'s Mana (1% Success Rate)')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user you want to drain mana from')
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
        "You cannot drain mana from yourself!",
        { userId }
      );
    }

    if (targetUser.bot) {
      throw createError(
        "Invalid target",
        ErrorTypes.VALIDATION,
        "You cannot drain mana from bots!",
        { userId, targetId: targetUser.id }
      );
    }

    let userData = await getEconomyData(client, guildId, userId);
    if (!userData) {
      userData = { mana: 0, silver_coins: 0, maxMana: 1000, lastManaDrain: 0 };
    }

    const capacity = userData.maxMana || userData.mana_capacity || 1000;
    const lastDrain = userData.lastManaDrain || 0;
    const remainingTime = lastDrain + COOLDOWN - Date.now();

    if (remainingTime > 0) {
      const minutes = Math.floor(remainingTime / 60000);
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      let timeMessage = minutes > 0 ? `${minutes} minute(s) ${seconds} second(s)` : `${seconds} second(s)`;

      throw createError(
        "Mana Drain cooldown active",
        ErrorTypes.RATE_LIMIT,
        botConfig.economy.messages.cooldown.replace('{time}', timeMessage),
        { remainingTime, cooldownType: 'manaDrain' }
      );
    }

    let targetData = await getEconomyData(client, guildId, targetUser.id);
    if (!targetData) {
      targetData = { mana: 0, maxMana: 1000, shield: false };
    }

    if (targetData.shield) {
      throw createError(
        "Target Protected",
        ErrorTypes.VALIDATION,
        "This user has an active **Shield** barrier protecting their mana from being drained!",
        { targetId: targetUser.id }
      );
    }

    // Set cooldown immediately upon executing the attempt
    userData.lastManaDrain = Date.now();

    const roll = Math.random(); // Random number between 0 and 1
    const currencySymbol = botConfig.economy.currency.symbol;

    if (roll <= SUCCESS_CHANCE) {
      // SUCCESS: 1% chance
      const targetMana = targetData.mana || 0;
      const drainedAmount = Math.floor(targetMana * DRAIN_PERCENTAGE);

      if (drainedAmount <= 0) {
        await setEconomyData(client, guildId, userId, userData);
        throw createError(
          "No Mana to Drain",
          ErrorTypes.VALIDATION,
          "Your target does not have enough Mana to siphon!",
          { targetId: targetUser.id }
        );
      }

      targetData.mana = targetMana - drainedAmount;
      await setEconomyData(client, guildId, targetUser.id, targetData);

      // Apply capacity bounds and handle overflow conversion on siphoned mana
      const currentMana = userData.mana || 0;
      const spaceLeft = Math.max(0, capacity - currentMana);
      let addedToMana = 0;
      let overflow = 0;

      if (drainedAmount <= spaceLeft) {
        addedToMana = drainedAmount;
        userData.mana = currentMana + drainedAmount;
      } else {
        addedToMana = spaceLeft;
        userData.mana = capacity;
        overflow = drainedAmount - spaceLeft;
      }

      let convertedSilver = 0;
      if (overflow > 0) {
        convertedSilver = Math.floor(overflow * 1.25);
        userData.silver_coins = (userData.silver_coins || 0) + convertedSilver;
      }

      await setEconomyData(client, guildId, userId, userData);

      let successDescription = `Against all odds, your ritual succeeded! You siphoned **${addedToMana.toLocaleString()} ${currencySymbol}** from ${targetUser}!`;
      if (overflow > 0) {
        successDescription += `\n✨ **Capacity Overflow!** Max limit reached. Excess **${overflow.toLocaleString()} Mana** converted into **${convertedSilver.toLocaleString()} Silver Coins** (1.25x rate)!`;
      }

      const replyEmbed = successEmbed('Mana Drain Successful (1% Critical Hit!)', successDescription);
      await interaction.editReply({ embeds: [replyEmbed] });
    } else {
      // FAILURE: 99% chance
      const userCurrentMana = userData.mana || 0;
      const penaltyAmount = Math.floor(userCurrentMana * FAIL_PENALTY_PERCENTAGE);

      userData.mana = Math.max(0, userCurrentMana - penaltyAmount);
      await setEconomyData(client, guildId, userId, userData);

      const replyEmbed = errorEmbed(
        'Mana Drain Failed Backfire',
        `The ritual backfired horribly! Your spell collapsed, causing you to lose **${penaltyAmount.toLocaleString()} ${currencySymbol}** (50% of your current mana).`
      );

      await interaction.editReply({ embeds: [replyEmbed] });
    }
  }),
};
