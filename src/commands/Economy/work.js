import { SlashCommandBuilder } from 'discord.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { botConfig } from '../../config/bot.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = botConfig?.economy?.cooldowns?.eat || 1 * 60 * 60 * 1000;
const MIN_MANA = botConfig?.economy?.eatManaMin || 200;
const MAX_MANA = botConfig?.economy?.eatManaMax || 1000;

export default {
    data: new SlashCommandBuilder()
        .setName('eat')
        .setDescription('Consume a rich, mana-infused elixir feast to gain Mana'),

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

        const lastEat = userData.lastEat || 0;
        const remainingTime = lastEat + COOLDOWN - Date.now();

        if (remainingTime > 0) {
            const minutes = Math.floor(remainingTime / 60000);
            const seconds = Math.floor((remainingTime % 60000) / 1000);
            let timeMessage = minutes > 0 ? `${minutes} minute(s)` : `${seconds} second(s)`;

            throw createError(
                "Eat cooldown active",
                ErrorTypes.RATE_LIMIT,
                botConfig.economy.messages.cooldown.replace('{time}', timeMessage),
                { remainingTime, cooldownType: 'eat' }
            );
        }

        const manaGained = Math.floor(Math.random() * (MAX_MANA - MIN_MANA + 1)) + MIN_MANA;
        userData.mana = (userData.mana || 0) + manaGained;
        userData.lastEat = Date.now();

        await setEconomyData(client, guildId, userId, userData);

        const manaSymbol = botConfig.economy.currencies.find(c => c.id === 'mana')?.symbol || '.✧.';
        const replyEmbed = successEmbed(
            'Feast Consumed',
            `${botConfig.economy.messages.eat} **(+${manaGained.toLocaleString()} ${manaSymbol})**`
        );

        await interaction.editReply({ embeds: [replyEmbed] });
    }),
};
