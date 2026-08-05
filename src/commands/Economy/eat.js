import { SlashCommandBuilder } from 'discord.js';
import { botConfig } from '../../config/botConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('eat')
    .setDescription('Consume a rich mana-infused elixir feast to gain Mana.'),
  name: 'eat',
  category: 'Economy',
  description: 'Consume a rich mana-infused elixir feast to gain Mana.',

  async execute(message, args, client) {
    const eco = botConfig.economy;
    const manaGained = Math.floor(Math.random() * (eco.eatManaMax - eco.eatManaMin + 1)) + eco.eatManaMin;
    const manaSymbol = eco.currencies.find(c => c.id === 'mana')?.symbol || '.✧.';

    // TODO: Add database logic to add `manaGained` Mana to the user's balance
    await message.reply(`${eco.messages.eat} **(+${manaGained} ${manaSymbol})**`);
  },
};
