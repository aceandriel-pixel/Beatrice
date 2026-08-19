import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { economyConfig } from './shop-config.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('buy')
        .setDescription('Purchase items from the shop')
        .addStringOption(option =>
            option.setName('item_id')
                .setDescription('The ID of the item you want to buy')
                .setRequired(true)
        )
        .setDMPermission(false),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const itemId = interaction.options.getString('item_id');
        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        
        // Locate item in Shop 1 or Shop 2 from economyConfig
        const shop1Items = economyConfig.shop?.shop1?.items || [];
        const shop2Items = economyConfig.shop?.shop2?.items || [];
        const item = [...shop1Items, ...shop2Items].find(i => i.id === itemId);

        if (!item) {
            throw createError(
                "Invalid item",
                ErrorTypes.VALIDATION,
                "❌ Invalid item ID provided. Please check the shop list."
            );
        }

        let userData = await getEconomyData(client, guildId, userId);
        if (!userData) {
            userData = { silver_coins: 0, mana: 0, maxMana: 1000, inventory: [] };
        }

        // Ensure inventory exists as an array and count current items
        if (!userData.inventory) {
            userData.inventory = [];
        }
        const totalItemsOwned = userData.inventory.length;

        // Prevent duplicate purchases of the exact same item
        if (userData.inventory.includes(itemId)) {
            throw createError(
                "Already owned",
                ErrorTypes.VALIDATION,
                "❌ You already own this item and cannot buy it again!"
            );
        }

        const isShop1 = shop1Items.some(i => i.id === itemId);
        const currencyKey = isShop1 ? 'silver_coins' : 'mana';
        const userBalance = userData[currencyKey] || (isShop1 ? (userData.wallet || 0) : 0);
        const currencyName = isShop1 ? 'Silver Coins' : 'Mana';

        if (userBalance < item.price) {
            throw createError(
                "Insufficient funds",
                ErrorTypes.VALIDATION,
                `❌ You do not have enough ${currencyName} to buy this item!`
            );
        }

        // Deduct price and unify currency keys
        if (isShop1) {
            const currentCoins = userData.silver_coins !== undefined ? userData.silver_coins : (userData.wallet || 0);
            userData.silver_coins = currentCoins - item.price;
            delete userData.wallet; 
        } else {
            userData.mana -= item.price;
        }

        // Apply item effects (like mana capacity boost)
        if (item.capacityBoost) {
            userData.maxMana = (userData.maxMana || userData.mana_capacity || 1000) + item.capacityBoost;
            userData.mana_capacity = userData.maxMana;
        }

        // Add item to inventory and save data
        userData.inventory.push(itemId);
        await setEconomyData(client, guildId, userId, userData);

        const newTotalCount = userData.inventory.length;
        const refundAmount = Math.floor(item.price * 0.25);

        // Create an interactive Sell button for this specific purchase
        const sellButtonId = `sell_item_${userId}_${itemId}_${Date.now()}`;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(sellButtonId)
                .setLabel(`Sell for ${refundAmount.toLocaleString()} Silver Coins (25%)`)
                .setStyle(ButtonStyle.Danger)
        );

        const embed = new EmbedBuilder()
            .setTitle('🛒 Purchase Successful!')
            .setDescription(
                `You successfully purchased **${item.name}** for **${item.price.toLocaleString()}** ${currencyName}!\n\n` +
                `🎒 **Inventory Tracker:** You now own **${newTotalCount}** total item(s).`
            )
            .setColor(botConfig.embeds?.colors?.success || '#57F287');

        const message = await InteractionHelper.safeEditReply(interaction, { embeds: [embed], components: [row] });

        // Component Collector to handle the Sell button click
        const collector = message.createMessageComponentCollector({ 
            filter: i => i.user.id === userId && i.customId === sellButtonId, 
            time: 60000 // Active for 1 minute
        });

        collector.on('collect', async i => {
            await i.deferUpdate();

            let freshData = await getEconomyData(client, guildId, userId);
            if (!freshData || !freshData.inventory || !freshData.inventory.includes(itemId)) {
                await i.followUp({ content: "❌ You no longer own this item!", ephemeral: true });
                return;
            }

            // Remove item from inventory and grant 25% refund in silver coins
            freshData.inventory = freshData.inventory.filter(id => id !== itemId);
            freshData.silver_coins = (freshData.silver_coins || 0) + refundAmount;
            await setEconomyData(client, guildId, userId, freshData);

            const soldEmbed = new EmbedBuilder()
                .setTitle('♻️ Item Sold!')
                .setDescription(`You sold **${item.name}** back for **${refundAmount.toLocaleString()}** Silver Coins (25% refund).`)
                .setColor(botConfig.embeds?.colors?.warning || '#FEE75C');

            await message.edit({ embeds: [soldEmbed], components: [] });
            collector.stop();
        });

        collector.on('end', async () => {
            // Disable the button after time runs out
            try {
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(sellButtonId)
                        .setLabel('Sell Window Expired')
                        .setStyle(ButtonStyle.Secondary)
                        .setDisabled(true)
                );
                await message.edit({ components: [disabledRow] }).catch(() => {});
            } catch (e) {}
        });

    }, { command: 'buy' })
};
