import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { economyConfig } from './shop-config.js';
import { getUserData, saveUserData } from './modules/Currency.js';

export default {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase an item from the shop')
        .addStringOption(option =>
            option.setName('item_id')
                .setDescription('The ID of the item you wish to buy')
                .setRequired(true)
        ),

    async execute(interaction) {
        const itemId = interaction.options.getString('item_id');
        const userId = interaction.user.id;
        const userData = getUserData(userId);

        let targetShop = null;
        let foundItem = null;
        let isShop1 = false;

        // Locate item across shops
        for (const [shopKey, shopObj] of Object.entries(economyConfig.shop)) {
            const item = shopObj.items.find(i => i.id === itemId);
            if (item) {
                targetShop = shopObj;
                foundItem = item;
                isShop1 = (shopKey === 'shop1');
                break;
            }
        }

        if (!foundItem) {
            return interaction.reply({ content: '❌ Item not found! Please check the item ID.', ephemeral: true });
        }

        // Check if unique item from shop1 is already bought
        if (isShop1 && foundItem.unique && userData.inventory.includes(foundItem.id)) {
            return interaction.reply({ content: `❌ You have already purchased **${foundItem.name}**! Shop 1 capacity items can only be bought once.`, ephemeral: true });
        }

        // Check user balances
        const currencyKey = targetShop.currencyId; // 'silver_coins' or 'mana'
        const userBal = userData[currencyKey] || 0;

        if (userBal < foundItem.price) {
            return interaction.reply({ 
                content: `❌ You do not have enough **${targetShop.currency}**. You need **${(foundItem.price - userBal).toLocaleString()}** more!`, 
                ephemeral: true 
            });
        }

        // Deduct cost
        userData[currencyKey] = userBal - foundItem.price;

        // Apply specific shop effects
        if (isShop1) {
            // Give capacity boost immediately
            userData.mana_capacity = (userData.mana_capacity || 1000) + foundItem.capacityBoost;
            userData.inventory.push(foundItem.id);
        } else {
            // Shop 2 infinite buy behavior
            userData.inventory.push(foundItem.id);
        }

        saveUserData(userId, userData);

        const embed = new EmbedBuilder()
            .setTitle('🛒 Purchase Successful!')
            .setDescription(`You successfully purchased **${foundItem.name}** for **${foundItem.price.toLocaleString()} ${targetShop.currency}**!`)
            .setColor(botConfig.embeds?.colors?.success || '#00FF00');

        if (isShop1) {
            embed.addFields({ name: '⚡ Capacity Updated', value: `Your new max Mana capacity is **${userData.mana_capacity.toLocaleString()}**!` });
        }

        await interaction.reply({ embeds: [embed] });

        // Notify owner if flagged
        if (targetShop.pingOwnerOnBuy && botConfig.ownerId) {
            try {
                const owner = await interaction.client.users.fetch(botConfig.ownerId);
                if (owner) {
                    await owner.send(`🔔 **Store Alert:** User **${interaction.user.tag}** bought **${foundItem.name}** from *${targetShop.title}*!`);
                }
            } catch (err) {
                console.error('Failed to message bot owner:', err);
            }
        }
    }
};
