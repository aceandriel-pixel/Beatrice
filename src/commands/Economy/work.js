import { SlashCommandBuilder } from 'discord.js';
import { botConfig } from '../../config/botConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('mine')
    .setDescription('Venture deep into caverns to extract rare magical ores.'),
  name: 'mine',
  category: 'Economy',
  description: 'Venture deep into caverns to extract rare magical ores.',

  async execute(message, args, client) {
    const eco = botConfig.economy;
    
    // Roll based on probabilities (Total = 100%)
    const roll = Math.random() * 100;
    let cumulative = 0;
    let selectedOre = eco.miningOres[0];

    for (const ore of eco.miningOres) {
      cumulative += ore.chance;
      if (roll <= cumulative) {
        selectedOre = ore;
        break;
      }
    }

    await message.reply(`${eco.messages.mine}\n⛏️ You extracted: **${selectedOre.name}** (Value: **${selectedOre.value} Silver Coins**)!`);
  },
};
