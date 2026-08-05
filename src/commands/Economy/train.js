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
      userData = { mana: 0, maxMana: 1000, lastTrain: 0 };
    }

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
    const maxManaLimit = userData.maxMana || 1000;
    const currentMana = userData.mana || 0;

    userData.mana = Math.min(maxManaLimit, currentMana + earnedMana);
    userData.lastTrain = Date.now();

    await setEconomyData(client, guildId, userId, userData);

    const currencySymbol = botConfig.economy.currency.symbol;
    const replyEmbed = successEmbed(
      'Training Complete',
      `${botConfig.economy.messages.train} **(+${earnedMana.toLocaleString()} ${currencySymbol})**`
    );

    await interaction.editReply({ embeds: [replyEmbed] });
  }),
};

