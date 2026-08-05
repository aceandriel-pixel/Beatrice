import { SlashCommandBuilder } from 'discord.js';
import { botConfig } from '../../config/botConfig.js';

export default {
  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription('Attempt to pickpocket silver coins from another user.')
    .addUserOption(option => 
      option.setName('target').setDescription('The user to steal from').setRequired(true)),
  name: 'steal',
  category: 'Economy',
  description: 'Attempt to pickpocket silver coins from another user.',

  async execute(message, args, client) {
    const eco = botConfig.economy;
    const target = message.options?.getUser('target') || message.mentions?.users?.first();

    if (!target) {
      return message.reply("⚠️ You must specify a valid user to steal from!");
    }

    const successRoll = Math.random();
    if (successRoll <= eco.stealSuccessRate) {
      await message.reply(`${eco.messages.steal} (Target: <@${target.id}>)`);
    } else {
      await message.reply(`${eco.messages.stealFail}`);
    }
  },
};

