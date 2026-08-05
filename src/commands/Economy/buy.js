import { SlashCommandBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { successEmbed, errorEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase items from the Arcane Vault or Custom Shop')
        .addStringOption(option =>
            option.setName('shop')
                .setDescription('Select the shop')
                .setRequired(true)
                .addChoices(
                    { name: 'Arcane Vault (Mana Storage)', value: 'shop1' },
                    { name: 'Custom Request Shop', value: 'shop2' }
                ))
        .addStringOption(option =>
            option.setName('item_id')
                .setDescription('The exact item ID you want to purchase')
                .setRequired(true)),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const shopKey = interaction.options.getString('shop');
        const itemId = interaction.options.getString('item_id').toLowerCase();

        // 1. Locate the shop and item from configuration
        const shopData = botConfig.shop[shopKey];
        if (!shopData) {
            throw createError("Invalid shop", ErrorTypes.VALIDATION, "The selected shop does not exist.");
        }

        const item = shopData.items.find(i => i.id.toLowerCase() === itemId);
        if (!item) {
            throw createError(
                "Item not found", 
                ErrorTypes.VALIDATION, 
                `The item ID \`${itemId}\` could not be found in **${shopData.title}**. Check the spelling or browse the shop list.`
            );
        }

        // 2. Fetch user economy details
        let userData = await getEconomyData(client, guildId, userId);
        if (!userData) {
            throw createError("Database error", ErrorTypes.DATABASE, "Failed to load your economy data.");
        }

        // Initialize inventory tracking if missing
        userData.inventory = userData.inventory || [];
        userData.wallet = userData.wallet || 0; // Silver Coins
        userData.mana = userData.mana || 0;     // Mana
        userData.maxManaCapacity = userData.maxManaCapacity || 0; // Base/Expanded Capacity

        // 3. Check if unique/one-time purchase is already owned
        if (item.unique && userData.inventory.includes(item.id)) {
            throw createError(
                "Already owned", 
                ErrorTypes.VALIDATION, 
                `You already own **${item.name}**! This item can only be purchased once.`
            );
        }

        // 4. Validate Currency and Balance
        const currencyId = shopData.currencyId; // 'silver_coins' or 'mana'
        const currencySymbol = currencyId === 'silver_coins' ? '⛃⛂' : '.✧.';
        let userBalance = currencyId === 'silver_coins' ? userData.wallet : userData.mana;

        if (userBalance < item.price) {
            throw createError(
                "Insufficient funds", 
                ErrorTypes.VALIDATION, 
                `You don't have enough ${shopData.currency}! You need **${(item.price - userBalance).toLocaleString()} more** ${currencySymbol}.`
            );
        }

        // 5. Deduct cost & apply rewards/upgrades
        if (currencyId === 'silver_coins') {
            userData.wallet -= item.price;
        } else {
            userData.mana -= item.price;
        }

        // Add item to inventory
        userData.inventory.push(item.id);

        // Apply specific item mechanical effects (e.g., Mana storage boost)
        let extraMessage = "";
        if (item.capacityBoost) {
            userData.maxManaCapacity += item.capacityBoost;
            extraMessage = `\n✨ Your **Max Mana Capacity** increased by **+${item.capacityBoost.toLocaleString()}**!`;
        }

        // Save updated data to database
        await setEconomyData(client, guildId, userId, userData);

        // 6. Handle Owner Notifications for Custom Shop (shop2)
        if (shopData.pingOwnerOnBuy && botConfig.commands?.owners?.length > 0) {
            const ownerId = botConfig.commands.owners[0];
            try {
                const owner = await client.users.fetch(ownerId);
                if (owner) {
                    await owner.send(`🛒 **New Shop Purchase!**\nUser: <@${userId}> (${interaction.user.tag})\nItem: **${item.name}** (${item.id})\nCost: ${item.price.toLocaleString()} Mana`);
                }
            } catch (err) {
                // Ignore DM delivery failure if owner blocks DMs
            }
        }

        // 7. Send Success Response
        const replyEmbed = successEmbed(
            'Purchase Successful!',
            `Successfully bought **${item.name}** for **${item.price.toLocaleString()} ${currencySymbol}**!${extraMessage}`
        );

        await interaction.editReply({ embeds: [replyEmbed] });
    }),
};

// From buy.js
if (item.capacityBoost) {
    userData.maxManaCapacity += item.capacityBoost;
    extraMessage = `\n✨ Your **Max Mana Capacity** increased by **+${item.capacityBoost.toLocaleString()}**!`;
}

// Saves the upgraded maximum capacity to the database
await setEconomyData(client, guildId, userId, userData);
