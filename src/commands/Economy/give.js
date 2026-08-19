import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Give Silver Coins or Mana to a user (Bot Owner only)')
    .addUserOption(option =>
      option
        .setName('target')
        .setDescription('The user to give currency to')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('currency')
        .setDescription('The type of currency to give')
        .setRequired(true)
        .addChoices(
          { name: 'Silver Coins', value: 'silver_coins' },
          { name: 'Mana', value: 'mana' }
        )
    )
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('The amount of currency to give')
        .setRequired(true)
        .setMinValue(1)
    )
    .setDMPermission(false),

  execute: withErrorHandling(async (interaction, config, client) => {
    const deferred = await InteractionHelper.safeDefer(interaction);
    if (!deferred) return;

    const BOT_OWNER_ID = "1095871824866324530"; 

    if (interaction.user.id !== BOT_OWNER_ID) {
      throw createError(
        "Permission Denied",
        ErrorTypes.FORBIDDEN,
        "You do not have permission to use this command. Only the bot owner can use this.",
        { userId: interaction.user.id }
      );
    }

    const guildId = interaction.guild.id;
    const targetUser = interaction.options.getUser('target');
    const currencyType = interaction.options.getString('currency');
    const amount = interaction.options.getInteger('amount');

    if (targetUser.bot) {
      throw createError(
        "Invalid target",
        ErrorTypes.VALIDATION,
        "You cannot give currency to bots!"
      );
    }

    let targetData = await getEconomyData(client, guildId, targetUser.id);
    if (!targetData) {
      targetData = { silver_coins: 0, mana: 0 };
    }

    const currencySymbol = currencyType === 'silver_coins' ? '⛃⛂' : '.✧.';
    const currencyName = currencyType === 'silver_coins' ? 'Silver Coins' : 'Mana';

    if (currencyType === 'silver_coins') {
      targetData.silver_coins = (targetData.silver_coins || targetData.wallet || 0) + amount;
      // Clear legacy wallet key to prevent future splits
      delete targetData.wallet; 
    } else if (currencyType === 'mana') {
      targetData.mana = (targetData.mana || 0) + amount;
    }

    await setEconomyData(client, guildId, targetUser.id, targetData);

    const replyEmbed = successEmbed(
      'Currency Granted',
      `Successfully gave **${amount.toLocaleString()} ${currencySymbol} ${currencyName}** to ${targetUser}!`
    );

    await InteractionHelper.safeEditReply(interaction, { embeds: [replyEmbed] });
  }, { command: 'give' })
};
