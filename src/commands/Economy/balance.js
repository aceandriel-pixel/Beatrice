import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { getEconomyData } from '../../utils/economy.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your or another user\'s Silver Coins and Mana balances')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('The user whose balance you want to check')
                .setRequired(false)),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const targetUser = interaction.options.getUser('target') || interaction.user;
        const guildId = interaction.guildId;
        const userId = targetUser.id;

        // Fetch economy data for the user
        let userData = await getEconomyData(client, guildId, userId);

        // Fallback default values if no data exists yet
        const silverCoins = userData?.wallet || 0;
        const mana = userData?.mana || 0;
        const maxManaCapacity = userData?.maxManaCapacity || 0;

        const embed = new EmbedBuilder()
            .setTitle(`💰 Wealth of ${targetUser.username}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setColor(botConfig.embeds.colors.economy)
            .addFields(
                { 
                    name: '⛃⛂ Silver Coins', 
                    value: `**${silverCoins.toLocaleString()}** Silver Coins`, 
                    inline: false 
                },
                { 
                    name: '.✧. Mana Reserves', 
                    value: `**${mana.toLocaleString()}** / **${maxManaCapacity.toLocaleString()}** Mana`, 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ text: botConfig.embeds.footer.text, iconURL: botConfig.embeds.footer.icon });

        await interaction.editReply({ embeds: [embed] });
    }),
};
