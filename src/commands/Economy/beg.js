import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { botConfig } from '../../config/bot.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('beg')
        .setDescription('Beg for some spare Silver Coins on the streets'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;
        const now = Date.now();

        // 1. Fetch user data
        let userData = await getEconomyData(client, guildId, userId);
        userData.wallet = userData.wallet || 0;
        userData.cooldowns = userData.cooldowns || {};

        // 2. Cooldown check (using a 5-minute cooldown for begging)
        const cooldownTime = 5 * 60 * 1000; // 5 minutes
        const lastBeg = userData.cooldowns.beg || 0;

        if (now - lastBeg < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - lastBeg)) / 1000);
            const minutes = Math.floor(remainingTime / 60);
            const seconds = remainingTime % 60;
            const timeString = minutes > min => `${minutes}m ${seconds}s` : `${seconds}s`;

            const cooldownEmbed = new EmbedBuilder()
                .setTitle('⏳ Too Tired to Beg')
                .setDescription(`You are too exhausted to beg right now. Please wait **${timeString}** before begging again.`)
                .setColor(botConfig.embeds.colors.warning);

            return interaction.editReply({ embeds: [cooldownEmbed] });
        }

        // 3. Success rate check (60% chance to get coins, 40% chance to get rejected)
        const success = Math.random() < 0.60;
        let earnedCoins = 0;
        let flavorMessage = '';

        const successMessages = [
            "A kind traveler took pity on you and tossed a small pouch of silver coins.",
            "You played a broken lute on the corner, and a generous noble dropped some silver coins into your hat!",
            "You found a lost coin purse tucked beneath a tavern bench.",
            "A friendly merchant handed you some spare silver for helping carry their crates."
        ];

        const failMessages = [
            "People ignored your pleas and walked right past you. You earned nothing.",
            "A guard chased you away from the marketplace before anyone could give you anything.",
            "You spent hours begging, but nobody had any spare change to spare.",
            "Someone threw a stale crust of bread at you instead of silver coins."
        ];

        if (success) {
            // Random payout between 100 and 1,000 Silver Coins
            earnedCoins = Math.floor(Math.random() * (1000 - 100 + 1)) + 100;
            userData.wallet += earnedCoins;
            flavorMessage = successMessages[Math.floor(Math.random() * successMessages.length)];
        } else {
            flavorMessage = failMessages[Math.floor(Math.random() * failMessages.length)];
        }

        // Update cooldown
        userData.cooldowns.beg = now;

        // Save data to database
        await setEconomyData(client, guildId, userId, userData);

        // 4. Send response embed
        const embed = new EmbedBuilder()
            .setTitle(success ? '⛃⛂ Successful Begging!' : '⛃⛂ Begging Failed')
            .setDescription(`${flavorMessage}\n\n${success ? `**Earned:** +${earnedCoins.toLocaleString()} Silver Coins` : ''}`)
            .setColor(success ? botConfig.embeds.colors.success : botConfig.embeds.colors.error)
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }),
};
