import { SlashCommandBuilder } from 'discord.js';
import { economyConfig } from './shop-config.js'; // Adjust path if necessary to your config
import { addManaWithOverflow, getUserData, saveUserData } from './modules/Currency.js';

export default {
  data: new SlashCommandBuilder()
    .setName('economy')
    .setDescription('Manage your dual-currency economy (Silver Coins & Mana)')
    .addSubcommand(subcommand =>
      subcommand.setName('work').setDescription('Perform manual labor to earn Silver Coins'))
    .addSubcommand(subcommand =>
      subcommand.setName('mine').setDescription('Venture deep into caverns to extract rare ores for Silver Coins'))
    .addSubcommand(subcommand =>
      subcommand.setName('steal')
        .setDescription('Attempt to pickpocket Silver Coins from another user')
        .addUserOption(option => option.setName('target').setDescription('The user to steal from').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('train').setDescription('Channel intense magical focus to compress raw elements into Mana'))
    .addSubcommand(subcommand =>
      subcommand.setName('rest').setDescription('Meditate deeply in silence to generate Mana'))
    .addSubcommand(subcommand =>
      subcommand.setName('eat').setDescription('Consume a rich mana-infused elixir feast to gain Mana'))
    .addSubcommand(subcommand =>
      subcommand.setName('manadrain')
        .setDescription('Perform a dark ritual to siphon glowing Mana from a target')
        .addUserOption(option => option.setName('target').setDescription('The user to drain Mana from').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand.setName('shield').setDescription('Activate your permanent anti-theft and anti-drain barrier')),

  name: 'economy',
  category: 'Economy',
  description: 'Manage your dual-currency economy (Silver Coins & Mana)',

  async execute(message, args, client) {
    const isInteraction = message.isChatInputCommand?.() || message.options?.getSubcommand;
    const subcommand = isInteraction 
      ? message.options.getSubcommand() 
      : (args[0]?.toLowerCase() || 'help');

    const eco = economyConfig;
    const silverSymbol = eco.currencies.find(c => c.id === 'silver_coins')?.symbol || '⛃⛂';
    const manaSymbol = eco.currencies.find(c => c.id === 'mana')?.symbol || '.✧.';
    const userId = message.user ? message.user.id : message.author.id;

    switch (subcommand) {
      case 'work': {
        const earned = Math.floor(Math.random() * (eco.workMax - eco.workMin + 1)) + eco.workMin;
        
        // Update user silver coins in database safely
        const userData = getUserData(userId);
        userData.silver_coins = (userData.silver_coins || 0) + earned;
        saveUserData(userId, userData);

        return message.reply(`${eco.messages.work} **(+${earned} ${silverSymbol})**`);
      }

      case 'mine': {
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

        // Credit mined ore value as Silver Coins
        const userData = getUserData(userId);
        userData.silver_coins = (userData.silver_coins || 0) + selectedOre.value;
        saveUserData(userId, userData);

        return message.reply(`${eco.messages.mine}\n⛏️ You extracted: **${selectedOre.name}** (Worth: **${selectedOre.value.toLocaleString()} ${silverSymbol}**)!`);
      }

      case 'steal': {
        const target = isInteraction 
          ? message.options.getUser('target') 
          : message.mentions?.users?.first();

        if (!target) {
          return message.reply("⚠️ You must specify a valid user to steal Silver Coins from!");
        }

        if (target.id === userId) {
          return message.reply("⚠️ You cannot steal from yourself!");
        }

        const successRoll = Math.random();
        const userData = getUserData(userId);
        const targetData = getUserData(target.id);

        if (successRoll <= eco.stealSuccessRate) {
          const targetCoins = targetData.silver_coins || 0;
          const stolenAmount = Math.floor(targetCoins * eco.stealPercentage);

          targetData.silver_coins = targetCoins - stolenAmount;
          userData.silver_coins = (userData.silver_coins || 0) + stolenAmount;

          saveUserData(userId, userData);
          saveUserData(target.id, targetData);

          return message.reply(`${eco.messages.steal} **(+${stolenAmount.toLocaleString()} ${silverSymbol})** from <@${target.id}>!`);
        } else {
          // Apply fail penalty
          const userCoins = userData.silver_coins || 0;
          const penalty = Math.floor(userCoins * eco.stealFailPenalty);
          userData.silver_coins = Math.max(0, userCoins - penalty);
          saveUserData(userId, userData);

          return message.reply(`${eco.messages.stealFail} **(-${penalty.toLocaleString()} ${silverSymbol})**`);
        }
      }

      case 'train': {
        const manaGained = Math.floor(Math.random() * (eco.trainManaMax - eco.trainManaMin + 1)) + eco.trainManaMin;
        const result = addManaWithOverflow(userId, manaGained);

        let replyText = `${eco.messages.train} **(+${result.addedToMana.toLocaleString()} ${manaSymbol})**`;
        if (result.overflow > 0) {
          replyText += `\n✨ Capacity maxed! Overflow of **${result.overflow.toLocaleString()} Mana** converted into **${result.convertedSilver.toLocaleString()} Silver Coins** (1.25x rate)!`;
        }
        return message.reply(replyText);
      }

      case 'rest': {
        const manaGained = Math.floor(Math.random() * (eco.restManaMax - eco.restManaMin + 1)) + eco.restManaMin;
        const result = addManaWithOverflow(userId, manaGained);

        let replyText = `${eco.messages.rest} **(+${result.addedToMana.toLocaleString()} ${manaSymbol})**`;
        if (result.overflow > 0) {
          replyText += `\n✨ Capacity maxed! Overflow of **${result.overflow.toLocaleString()} Mana** converted into **${result.convertedSilver.toLocaleString()} Silver Coins** (1.25x rate)!`;
        }
        return message.reply(replyText);
      }

      case 'eat': {
        const manaGained = Math.floor(Math.random() * (eco.eatManaMax - eco.eatManaMin + 1)) + eco.eatManaMin;
        const result = addManaWithOverflow(userId, manaGained);

        let replyText = `${eco.messages.eat} **(+${result.addedToMana.toLocaleString()} ${manaSymbol})**`;
        if (result.overflow > 0) {
          replyText += `\n✨ Capacity maxed! Overflow of **${result.overflow.toLocaleString()} Mana** converted into **${result.convertedSilver.toLocaleString()} Silver Coins** (1.25x rate)!`;
        }
        return message.reply(replyText);
      }

      case 'manadrain': {
        const target = isInteraction 
          ? message.options.getUser('target') 
          : message.mentions?.users?.first();

        if (!target) {
          return message.reply("⚠️ You must specify a target user to drain Mana from!");
        }

        if (target.id === userId) {
          return message.reply("⚠️ You cannot drain your own mana!");
        }

        const targetData = getUserData(target.id);
        const drainedAmount = Math.floor((targetData.mana || 0) * eco.manaDrainPercentage);

        targetData.mana = Math.max(0, (targetData.mana || 0) - drainedAmount);
        saveUserData(target.id, targetData);

        const result = addManaWithOverflow(userId, drainedAmount);

        return message.reply(`${eco.messages.manaDrain} Siphoned **${drainedAmount.toLocaleString()} Mana** from <@${target.id}>! ${manaSymbol}`);
      }

      case 'shield': {
        // Implement active shield flag in user database if needed
        const userData = getUserData(userId);
        userData.shieldActive = true;
        saveUserData(userId, userData);

        return message.reply(`${eco.messages.shield}`);
      }

      default:
        return message.reply("⚠️ Unknown economy subcommand! Use `/economy work`, `/economy mine`, `/economy train`, etc.");
    }
  },
};
