import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = botConfig?.economy?.cooldowns?.train || 2 * 60 * 60 * 1000;
const MANA_MIN = botConfig?.economy?.trainManaMin || 50;
const MANA_MAX = botConfig?.economy?.trainManaMax || 200;

export default {
  data: new SlashCommandBuilder()
    .setName('train')
    .setDescription('Channel intense focus to compress raw elements into extra Mana'),

  execute: withErrorHandling(async (interaction, config, client) => {
    const deferred = await InteractionHelper.safeDefer(interaction);
    if (!deferred) return;

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    let userData = await getEconomyData(client, guildId, userId);
    if (!userData) {
      userData = { mana: 0, silver_coins: 0, maxMana: 1000, lastTrain: 0 };
    }

    const capacity = userData.maxMana || userData.mana_capacity || 1000;
    const lastTrain = userData.lastTrain || 0;
    const remainingTime = lastTrain + COOLDOWN - Date.now();

    if (remainingTime > 0) {
      const minutes = Math.floor(remainingTime / 60000);
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      let timeMessage = minutes > 0 ? `${minutes} minute(s)` : `${seconds} second(s)`;

      throw createError(
        "Train cooldown active",
        ErrorTypes.RATE_LIMIT,
        botConfig.economy.messages.cooldown.replace('{time}', timeMessage),
        { remainingTime, cooldownType: 'train' }
      );
    }

    const earnedMana = Math.floor(Math.random() * (MANA_MAX - MANA_MIN + 1)) + MANA_MIN;
    const currentMana = userData.mana || 0;

    const spaceLeft = Math.max(0, capacity - currentMana);
    let addedToMana = 0;
    let overflow = 0;

    if (earnedMana <= spaceLeft) {
      addedToMana = earnedMana;
      userData.mana = currentMana + earnedMana;
    } else {
      addedToMana = spaceLeft;
      userData.mana = capacity;
      overflow = earnedMana - spaceLeft;
    }

    let convertedSilver = 0;
    if (overflow > 0) {
      convertedSilver = Math.floor(overflow * 1.25);
      userData.silver_coins = (userData.silver_coins || 0) + convertedSilver;
    }

    userData.lastTrain = Date.now();
    await setEconomyData(client, guildId, userId, userData);

    const currencySymbol = botConfig.economy.currency.symbol;
    let descriptionText = `${botConfig.economy.messages.train} **(+${addedToMana.toLocaleString()} ${currencySymbol})** (Capacity: ${userData.mana.toLocaleString()} / ${capacity.toLocaleString()})`;

    if (overflow > 0) {
      descriptionText += `\n✨ **Capacity Overflow!** Max limit reached. Excess **${overflow.toLocaleString()} Mana** converted into **${convertedSilver.toLocaleString()} Silver Coins** (1.25x rate)!`;
    }

    const replyEmbed = successEmbed('Training Complete', descriptionText);
    await interaction.editReply({ embeds: [replyEmbed] });
  }),
};
