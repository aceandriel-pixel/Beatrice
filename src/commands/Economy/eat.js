import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('eat')
    .setDescription('Consume a rich, mana-infused elixir feast to gain Mana.'),
  
  // If your bot uses prefix/text commands as well:
  name: 'eat',
  category: 'Economy',
  description: 'Consume a rich, mana-infused elixir feast to gain Mana.',

  async execute(message, args, client) {
    // Add your economy handling, cooldown checks, and database updates here.
    // Your config already defines the message: 
    // "You consumed a rich, mana-infused elixir feast, fueling your spiritual core with fresh Mana!"
    
    await message.reply("You consumed a rich, mana-infused elixir feast, fueling your spiritual core with fresh Mana!");
  },
};

