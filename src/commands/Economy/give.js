import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
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
    ),

  execute: withErrorHandling(async (interaction, config, client) => {
    const deferred = await InteractionHelper.safeDefer(interaction);
    if (!deferred) return;

    // ==========================================
    // PUT YOUR DISCORD USER ID BETWEEN THE QUOTES
    // ==========================================
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
      targetData = { wallet: 0, mana: 0 };
    }

    const currencySymbol = currencyType === 'silver_coins' ? '⛃⛂' : '.✧.';
    const currencyName = currencyType === 'silver_coins' ? 'Silver Coins' : 'Mana';

    if (currencyType === 'silver_coins') {
      targetData.wallet = (targetData.wallet || 0) + amount;
    } else if (currencyType === 'mana') {
      targetData.mana = (targetData.mana || 0) + amount;
    }

    await setEconomyData(client, guildId, targetUser.id, targetData);

    const replyEmbed = successEmbed(
      'Currency Granted',
      `Successfully gave **${amount.toLocaleString()} ${currencySymbol} ${currencyName}** to ${targetUser}!`
    );

    await interaction.editReply({ embeds: [replyEmbed] });
  }),
};
