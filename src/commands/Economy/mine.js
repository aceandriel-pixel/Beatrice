import { SlashCommandBuilder } from 'discord.js';
import { economyConfig } from './shop-config.js';
import { successEmbed } from '../../utils/embeds.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('Venture deep into the cavernous depths to extract rare veins from the stone!'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const userId = interaction.user.id;
        const guildId = interaction.guildId;

        let userData = await getEconomyData(client, guildId, userId);
        if (!userData) {
            userData = { wallet: 0, mana: 0, lastMine: 0 };
        }

        const now = Date.now();
        const lastMine = userData.lastMine || 0;
        const cooldownTime = economyConfig.cooldowns?.mine || 14400000;

        if (now - lastMine < cooldownTime) {
            const remainingTime = Math.ceil((cooldownTime - (now - lastMine)) / 1000);
            const hours = Math.floor(remainingTime / 3600);
            const minutes = Math.floor((remainingTime % 3600) / 60);
            const seconds = remainingTime % 60;
            
            const timeString = `${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`;
            const cooldownMsg = economyConfig.messages.cooldown.replace('{time}', timeString);

            throw createError("Cooldown active", ErrorTypes.VALIDATION, cooldownMsg);
        }

        const ores = economyConfig.miningOres;
        const randomNum = Math.random() * 100;
        let cumulativeChance = 0;
        let selectedOre = ores[0];

        for (const ore of ores) {
            cumulativeChance += ore.chance;
            if (randomNum <= cumulativeChance) {
                selectedOre = ore;
                break;
            }
        }

        userData.wallet = (userData.wallet || 0) + selectedOre.value;
        userData.lastMine = now;

        await setEconomyData(client, guildId, userId, userData);

        const replyEmbed = successEmbed(
            'Mining Expedition Successful!',
            `${economyConfig.messages.mine}\n\nYou extracted **${selectedOre.name}** and gained **${selectedOre.value.toLocaleString()} ⛃⛂ Silver Coins**!`
        );

        await interaction.editReply({ embeds: [replyEmbed] });
    }),
};
