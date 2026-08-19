import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = botConfig?.economy?.cooldowns?.eat || 1 * 60 * 60 * 1000;
const MANA_MIN = botConfig?.economy?.eatManaMin || 200;
const MANA_MAX = botConfig?.economy?.eatManaMax || 1000;

export default {
  data: new SlashCommandBuilder()
    .setName('eat')
    .setDescription('Consume a rich, mana-infused elixir feast to fuel your spiritual core'),

  execute: withErrorHandling(async (interaction, config, client) => {
    const deferred = await InteractionHelper.safeDefer(interaction);
    if (!deferred) return;

    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    let userData = await getEconomyData(client, guildId, userId);
    if (!userData) {
      userData = { mana: 0, silver_coins: 0, maxMana: 1000, lastEat: 0 };
    }

    // Fallback support if capacity field uses maxMana or mana_capacity
    const capacity = userData.maxMana || userData.mana_capacity || 1000;

    const lastEat = userData.lastEat || 0;
    const remainingTime = lastEat + COOLDOWN - Date.now();

    if (remainingTime > 0) {
      const minutes = Math.floor(remainingTime / 60000);
      const seconds = Math.floor((remainingTime % 60000) / 1000);
      let timeMessage = minutes > 0 ? `${minutes} minute(s)` : `${seconds} second(s)`;

      throw createError(
        "Eat cooldown active",
        ErrorTypes.RATE_LIMIT,
        botConfig.economy.messages.cooldown.replace('{time}', timeMessage),
        { remainingTime, cooldownType: 'eat' }
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

    userData.lastEat = Date.now();
    await setEconomyData(client, guildId, userId, userData);

    const currencySymbol = botConfig.economy.currency.symbol;
    let descriptionText = `${botConfig.economy.messages.eat} **(+${addedToMana.toLocaleString()} ${currencySymbol})** (Capacity: ${userData.mana.toLocaleString()} / ${capacity.toLocaleString()})`;

    if (overflow > 0) {
      descriptionText += `\n✨ **Capacity Overflow!** Max limit reached. Excess **${overflow.toLocaleString()} Mana** converted into **${convertedSilver.toLocaleString()} Silver Coins** (1.25x rate)!`;
    }

    const replyEmbed = successEmbed('Feast Consumed', descriptionText);
    await interaction.editReply({ embeds: [replyEmbed] });
  }),
};
