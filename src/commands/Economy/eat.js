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
      userData = { mana: 0, maxMana: 5000, lastEat: 0 };
    }

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
    const maxManaLimit = userData.maxMana || 5000;
    const currentMana = userData.mana || 0;

    userData.mana = Math.min(maxManaLimit, currentMana + earnedMana);
    userData.lastEat = Date.now();

    await setEconomyData(client, guildId, userId, userData);

    const currencySymbol = botConfig.economy.currency.symbol;
    const replyEmbed = successEmbed(
      'Feast Consumed',
      `${botConfig.economy.messages.eat} **(+${earnedMana.toLocaleString()} ${currencySymbol})**`
    );

    await interaction.editReply({ embeds: [replyEmbed] });
  }),
};
