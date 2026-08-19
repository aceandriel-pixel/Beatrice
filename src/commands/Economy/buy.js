import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { getUserData, saveUserData } from './Currency.js';

export default {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase items from the shop')
        .addStringOption(option =>
            option.setName('item_id')
                .setDescription('The ID of the item you want to buy')
                .setRequired(true)
        ),

    async execute(interaction) {
        const itemId = interaction.options.getString('item_id');
        const userId = interaction.user.id;
        
        // Locate item in Shop 1 or Shop 2 from botConfig
        const shop1Items = botConfig.shop?.shop1?.items || [];
        const shop2Items = botConfig.shop?.shop2?.items || [];
        const item = [...shop1Items, ...shop2Items].find(i => i.id === itemId);

        if (!item) {
            return interaction.reply({ content: '❌ Invalid item ID provided.', ephemeral: true });
        }

        const userData = getUserData(userId);
        const isShop1 = shop1Items.some(i => i.id === itemId);
        const currencyKey = isShop1 ? 'silver_coins' : 'mana';

        if ((userData[currencyKey] || 0) < item.price) {
            return interaction.reply({ content: `❌ You do not have enough ${isShop1 ? 'Silver Coins' : 'Mana'} to buy this item!`, ephemeral: true });
        }

        // Deduct price and apply effects
        userData[currencyKey] -= item.price;
        if (item.capacityBoost) {
            userData.mana_capacity = (userData.mana_capacity || 1000) + item.capacityBoost;
        }

        saveUserData(userId, userData);

        const embed = new EmbedBuilder()
            .setTitle('🛒 Purchase Successful!')
            .setDescription(`You successfully purchased **${item.name}** for **${item.price.toLocaleString()}** ${isShop1 ? 'Silver Coins' : 'Mana'}!`)
            .setColor(botConfig.embeds?.colors?.success || '#57F287');

        await interaction.reply({ embeds: [embed] });
    }
};
