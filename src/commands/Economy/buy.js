import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
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
            userData = { wallet: 0, mana: 0, maxMana: 1000 };
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

        // Deduct price and apply effects
        if (isShop1) {
            if (userData.silver_coins !== undefined) {
                userData.silver_coins -= item.price;
            } else {
                userData.wallet = (userData.wallet || 0) - item.price;
            }
        } else {
            userData.mana -= item.price;
        }

        if (item.capacityBoost) {
            userData.maxMana = (userData.maxMana || userData.mana_capacity || 1000) + item.capacityBoost;
            userData.mana_capacity = userData.maxMana;
        }

        await setEconomyData(client, guildId, userId, userData);

        const embed = new EmbedBuilder()
            .setTitle('🛒 Purchase Successful!')
            .setDescription(`You successfully purchased **${item.name}** for **${item.price.toLocaleString()}** ${currencyName}!`)
            .setColor(botConfig.embeds?.colors?.success || '#57F287');

        await InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }, { command: 'buy' })
};
