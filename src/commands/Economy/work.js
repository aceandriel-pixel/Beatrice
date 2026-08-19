import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = botConfig?.economy?.cooldowns?.work || 1 * 60 * 60 * 1000;
const MIN_WIN = botConfig?.economy?.workMin || 10;
const MAX_WIN = botConfig?.economy?.workMax || 150;

export default {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Perform manual labor to earn Silver Coins'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;
            
        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        let userData = await getEconomyData(client, guildId, userId);
        
        if (!userData) {
            throw createError(
                "Failed to load economy data",
                ErrorTypes.DATABASE,
                "Failed to load your economy data. Please try again later.",
                { userId, guildId }
            );
        }

        const lastWork = userData.lastWork || 0;
        const remainingTime = lastWork + COOLDOWN - Date.now();

        if (remainingTime > 0) {
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            let timeMessage = minutes > 0 ? `${minutes} minute(s)` : `${seconds} second(s)`;

            throw createError(
                "Work cooldown active",
                ErrorTypes.RATE_LIMIT,
                botConfig.economy.messages.cooldown.replace('{time}', timeMessage),
                { remainingTime, cooldownType: 'work' }
            );
        }

        const earned = Math.floor(Math.random() * (MAX_WIN - MIN_WIN + 1)) + MIN_WIN;
        userData.silver_coins = (userData.silver_coins || 0) + earned;
        userData.lastWork = Date.now();



        await setEconomyData(client, guildId, userId, userData);

        const currencySymbol = botConfig.economy.currencies.find(c => c.id === 'silver_coins')?.symbol || '⛃⛂';
        const replyEmbed = successEmbed(
            'Labor Completed',
            `${botConfig.economy.messages.work} **(+${earned.toLocaleString()} ${currencySymbol})**`
        );

        await interaction.editReply({ embeds: [replyEmbed] });
    }),
};

