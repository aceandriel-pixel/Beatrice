import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { economyConfig } from './shop-config.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shop')
        .setDescription('Browse the arcane vaults and shops')
        .addStringOption(option =>
            option.setName('category')
                .setDescription('Select which shop to browse')
                .setRequired(true)
                .addChoices(
                    { name: 'Arcane Vault (Mana Storage)', value: 'shop1' },
                    { name: 'Godly Shop', value: 'shop2' }
                )
        ),

    async execute(interaction) {
        const selectedShopKey = interaction.options.getString('category');
        
        // Read from economyConfig
        const shopData = economyConfig.shop[selectedShopKey];

        if (!shopData) {
            return interaction.reply({ content: 'Shop not found!', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(shopData.title)
            .setDescription(`Currency used: **${shopData.currency}**`)
            .setColor(botConfig.embeds?.colors?.economy || '#00FFFF');

        shopData.items.forEach((item, index) => {
            embed.addFields({
                name: `${index + 1}. ${item.name} - ${item.price.toLocaleString()} ${shopData.currency}`,
                value: `${item.description}${item.capacityBoost ? `\n*Capacity Boost: +${item.capacityBoost.toLocaleString()}*` : ''}`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    }
};
