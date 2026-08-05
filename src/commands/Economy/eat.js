import { SlashCommandBuilder } from 'discord.js';
import { botConfig } from '../../config/botConfig.js';
// Import your database model or client here, for example:
// import User from '../../models/User.js';

export default {
  data: new SlashCommandBuilder()
    .setName('eat')
    .setDescription('Consume a rich, mana-infused elixir feast to gain Mana.'),
  
  name: 'eat',
  category: 'Economy',
  description: 'Consume a rich, mana-infused elixir feast to gain Mana.',

  async execute(message, args, client) {
    const eco = botConfig.economy;
    
    // 1. Calculate random mana based on your botConfig ranges
    const manaGained = Math.floor(Math.random() * (eco.eatManaMax - eco.eatManaMin + 1)) + eco.eatManaMin;
    const manaSymbol = eco.currencies.find(c => c.id === 'mana')?.symbol || '.✧.';

    const userId = message.author?.id || message.user?.id;

    try {
      /* 
        2. ACTUAL DATABASE UPDATE LOGIC 
        (Uncomment and modify this based on whatever database your bot uses, e.g., Mongoose, Quick.db, Prisma)
      */
      // let user = await User.findOne({ userId });
      // if (!user) user = new User({ userId });
      // user.mana += manaGained;
      // await user.save();

      // 3. Send success response showing the currency given
      await message.reply(`${eco.messages.eat} **(+${manaGained} ${manaSymbol})**`);
      
    } catch (error) {
      console.error(error);
      await message.reply("⚠️ An error occurred while trying to process your feast!");
    }
  },
};
