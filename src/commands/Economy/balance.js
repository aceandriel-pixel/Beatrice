import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { getUserData } from './Currency.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription('Check your current financial and mana standing')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to check balance for')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const userData = getUserData(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle(`Wealth of ${targetUser.username}`)
            .setColor(botConfig.embeds?.colors?.economy || '#00FFFF')
            .addFields(
                { name: '⛃⛂ Silver Coins', value: `**${(userData.silver_coins || 0).toLocaleString()}** Silver Coins`, inline: false },
                { name: '.✧. Mana Reserves', value: `**${(userData.mana || 0).toLocaleString()} / ${(userData.mana_capacity || 1000).toLocaleString()}** Mana`, inline: false }
            )
            .setThumbnail(targetUser.displayAvatarURL());

        await interaction.reply({ embeds: [embed] });
    }
};
