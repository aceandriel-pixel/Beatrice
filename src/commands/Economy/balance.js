import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { getEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current financial and mana standing')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check balance for')
                .setRequired(false)
        )
        .setDMPermission(false),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guildId;
        const userId = targetUser.id;

        const userData = await getEconomyData(client, guildId, userId);

        if (!userData) {
            throw createError(
                "No economy data found",
                ErrorTypes.VALIDATION,
                `${targetUser.username} has no economy data recorded yet.`
            );
        }

        const silverSymbol = botConfig?.economy?.currencies?.find(c => c.id === 'silver_coins')?.symbol || '⛃⛂';
        const manaSymbol = botConfig?.economy?.currencies?.find(c => c.id === 'mana')?.symbol || '.✧.';
        
        const silverCoins = userData.silver_coins || userData.wallet || 0;
        const mana = userData.mana || 0;
        const maxMana = userData.maxMana || userData.mana_capacity || 1000;

        const embed = new EmbedBuilder()
            .setTitle(`Wealth of ${targetUser.username}`)
            .setColor(botConfig.embeds?.colors?.economy || '#00FFFF')
            .addFields(
                { name: `${silverSymbol} Silver Coins`, value: `**${silverCoins.toLocaleString()}**`, inline: false },
                { name: `${manaSymbol} Mana Reserves`, value: `**${mana.toLocaleString()} / ${maxMana.toLocaleString()}**`, inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL());

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'balance' })
};
