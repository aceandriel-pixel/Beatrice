import { SlashCommandBuilder } from 'discord.js';
import { botConfig } from '../config/botConfig.js';

export default {
  // Define the base slash command with all subcommands
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
    // Determine if it's a Slash Command or Text Command execution
    const isInteraction = message.isChatInputCommand?.() || message.options?.getSubcommand;
    const subcommand = isInteraction 
      ? message.options.getSubcommand() 
      : (args[0]?.toLowerCase() || 'help');

    const eco = botConfig.economy;
    const silverSymbol = eco.currencies.find(c => c.id === 'silver_coins')?.symbol || '⛃⛂';
    const manaSymbol = eco.currencies.find(c => c.id === 'mana')?.symbol || '.✧.';

    switch (subcommand) {
      case 'work': {
        const earned = Math.floor(Math.random() * (eco.workMax - eco.workMin + 1)) + eco.workMin;
        // TODO: Add database logic to add `earned` Silver Coins
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
        // TODO: Add database logic to credit `selectedOre.value` Silver Coins
        return message.reply(`${eco.messages.mine}\n⛏️ You extracted: **${selectedOre.name}** (Worth: **${selectedOre.value} ${silverSymbol}**)!`);
      }

      case 'steal': {
        const target = isInteraction 
          ? message.options.getUser('target') 
          : message.mentions?.users?.first();

        if (!target) {
          return message.reply("⚠️ You must specify a valid user to steal Silver Coins from!");
        }

        const successRoll = Math.random();
        if (successRoll <= eco.stealSuccessRate) {
          // TODO: Transfer silver coins logic
          return message.reply(`${eco.messages.steal} (Target: <@${target.id}>) ${silverSymbol}`);
        } else {
          // TODO: Penalty logic
          return message.reply(`${eco.messages.stealFail}`);
        }
      }

      case 'train': {
        const manaGained = Math.floor(Math.random() * (eco.trainManaMax - eco.trainManaMin + 1)) + eco.trainManaMin;
        // TODO: Add database logic to add Mana
        return message.reply(`${eco.messages.train} **(+${manaGained} ${manaSymbol})**`);
      }

      case 'rest': {
        const manaGained = Math.floor(Math.random() * (eco.restManaMax - eco.restManaMin + 1)) + eco.restManaMin;
        // TODO: Add database logic to add Mana
        return message.reply(`${eco.messages.rest} **(+${manaGained} ${manaSymbol})**`);
      }

      case 'eat': {
        const manaGained = Math.floor(Math.random() * (eco.eatManaMax - eco.eatManaMin + 1)) + eco.eatManaMin;
        // TODO: Add database logic to add Mana
        return message.reply(`${eco.messages.eat} **(+${manaGained} ${manaSymbol})**`);
      }

      case 'manadrain': {
        const target = isInteraction 
          ? message.options.getUser('target') 
          : message.mentions?.users?.first();

        if (!target) {
          return message.reply("⚠️ You must specify a valid target user to drain Mana from!");
        }

        const drainPercent = `${eco.manaDrainPercentage * 100}%`;
        // TODO: Implement mana draining logic
        return message.reply(`${eco.messages.manaDrain} Siphoned ${drainPercent} of <@${target.id}>'s Mana reservoir! ${manaSymbol}`);
      }

      case 'shield': {
        // TODO: Activate shield logic in database
        return message.reply(`${eco.messages.shield}`);
      }

      default:
        return message.reply("⚠️ Unknown economy subcommand! Use `/economy work`, `/economy mine`, `/economy train`, etc.");
    }
  },
};

