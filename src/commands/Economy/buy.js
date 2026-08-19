import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { economyConfig } from './shop-config.js';
// Import your user balance database/model handler here (e.g., getUserBalance, updateBalance)

export default {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase an item from one of the shops')
        .addStringOption(option =>
            option.setName('item_id')
                .setDescription('The exact ID of the item you want to buy')
                .setRequired(true)
        ),

    async execute(interaction) {
        const itemId = interaction.options.getString('item_id');
        const userId = interaction.user.id;

        // Find which shop contains this item ID
        let targetShop = null;
        let foundItem = null;

        for (const shopKey of Object.keys(economyConfig.shop)) {
            const shop = economyConfig.shop[shopKey];
            const item = shop.items.find(i => i.id === itemId);
            if (item) {
                targetShop = shop;
                foundItem = item;
                break;
            }
        }

        if (!foundItem) {
            return interaction.reply({ 
                content: '❌ Item not found! Make sure you enter a valid item ID from the shop list.', 
                ephemeral: true 
            });
        }

        // TODO: Fetch user balance from your database for targetShop.currencyId (e.g., 'silver_coins' or 'mana')
        // const userBalance = await db.getBalance(userId, targetShop.currencyId);
        const userBalance = 10000000; // Placeholder: replace with actual DB lookup

        if (userBalance < foundItem.price) {
            return interaction.reply({ 
                content: `❌ You do not have enough **${targetShop.currency}**. You need **${(foundItem.price - userBalance).toLocaleString()}** more!`, 
                ephemeral: true 
            });
        }

        // TODO: Deduct balance & add item to user inventory in your database
        // await db.deductBalance(userId, targetShop.currencyId, foundItem.price);
        // await db.addItemToInventory(userId, foundItem.id);

        const successEmbed = new EmbedBuilder()
            .setTitle('🛒 Purchase Successful!')
            .setDescription(`You have successfully purchased **${foundItem.name}** for **${foundItem.price.toLocaleString()} ${targetShop.currency}**!`)
            .setColor(botConfig.embeds?.colors?.success || '#00FF00');

        await interaction.reply({ embeds: [successEmbed], ephemeral: true });

        // Handle shop owner notification if enabled
        if (targetShop.pingOwnerOnBuy && botConfig.ownerId) {
            try {
                const owner = await interaction.client.users.fetch(botConfig.ownerId);
                if (owner) {
                    await owner.send(`🔔 **Store Alert:** User **${interaction.user.tag}** (${userId}) just purchased **${foundItem.name}** from the *${targetShop.title}*!`);
                }
            } catch (err) {
                console.error('Failed to notify bot owner on purchase:', err);
            }
        }
    }
};
