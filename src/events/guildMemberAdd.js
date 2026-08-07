import { Events, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { getColor, botConfig } from '../config/bot.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { getWelcomeConfig, getEconomyData, setEconomyData } from '../utils/database.js';
import { formatWelcomeMessage } from '../utils/welcome.js';
import { logEvent, EVENT_TYPES } from '../services/loggingService.js';
import { getServerCounters, updateCounter } from '../services/serverstatsService.js';
import { setBirthday as dbSetBirthday } from '../utils/database.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.GuildMemberAdd,
  once: false,
  
  async execute(member) {
    try {
        const { guild, user } = member;
        
        // ==========================================
        // 1. AUTOMATED INVITE REWARD SYSTEM (Inviter Only)
        // ==========================================
        if (!user.bot) {
            try {
                const newInvites = await guild.invites.fetch();
                const oldInvites = member.client.inviteCache?.get(guild.id) || new Map();
                const usedInvite = newInvites.find(inv => inv.uses > (oldInvites.get(inv.code) || 0));

                if (!member.client.inviteCache) member.client.inviteCache = new Map();
                member.client.inviteCache.set(guild.id, new Map(newInvites.map(invite => [invite.code, invite.uses])));

                if (usedInvite && usedInvite.inviter && usedInvite.inviter.id !== user.id) {
                    const inviter = usedInvite.inviter;

                    let userData = await getEconomyData(member.client, guild.id, user.id);
                    if (!userData) userData = { wallet: 0, mana: 0 };

                    if (!userData.invitedBy && !userData.hasClaimedInvite) {
                        let inviterData = await getEconomyData(member.client, guild.id, inviter.id);
                        if (!inviterData) inviterData = { wallet: 0, mana: 0 };

                        const REWARD_SILVER = 5000;
                        const REWARD_MANA = 1000;

                        // Only flag the new user as invited (No economy rewards for the new user)
                        userData.invitedBy = inviter.id;
                        userData.hasClaimedInvite = true;

                        // Give rewards exclusively to the inviter
                        inviterData.wallet = (inviterData.wallet || 0) + REWARD_SILVER;
                        inviterData.mana = (inviterData.mana || 0) + REWARD_MANA;

                        await setEconomyData(member.client, guild.id, user.id, userData);
                        await setEconomyData(member.client, guild.id, inviter.id, inviterData);

                        // Broadcast public notification mentioning both users, highlighting the inviter reward
         const TARGET_CHANNEL_ID = "1535263439788703907";
        const inviteChannel = guild.channels.cache.get(TARGET_CHANNEL_ID);
        if (inviteChannel) {
            await inviteChannel.send({
                content: `🎉 ${user} was invited by ${inviter}! ${inviter} has been automatically rewarded with **5,000 ⛃⛂ Silver Coins** and **1,000 .✧. Mana**!`
            });
        }

                        logger.info(`[INVITE SYSTEM] ${inviter.tag} invited ${user.tag}. Inviter rewarded automatically.`);
                    }
                }
            } catch (inviteErr) {
                logger.debug('Error processing automated invite reward on join:', inviteErr);
            }
        }

        // ==========================================
        // 2. EXISTING WELCOME, ROLES & LOGGING LOGIC
        // ==========================================
        const config = await getGuildConfig(member.client, guild.id);
        const welcomeConfig = await getWelcomeConfig(member.client, guild.id);
        const welcomeChannelId = welcomeConfig?.channelId;

        if (welcomeConfig?.enabled && welcomeChannelId) {
            const channel = guild.channels.cache.get(welcomeChannelId);
            const me = guild.members.me;
            const permissions = channel?.isTextBased?.() && me ? channel.permissionsFor(me) : null;
            
            if (permissions?.has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) {
                const formatData = { user, guild, member };
                const welcomeMessage = formatWelcomeMessage(
                    welcomeConfig.welcomeMessage || welcomeConfig.welcomeEmbed?.description || botConfig.welcome?.defaultWelcomeMessage || 'Welcome {user} to {server}!',
                    formatData
                );

                const messageContent = welcomeConfig.welcomePing ? user.toString() : null;
                const embedTitle = formatWelcomeMessage(welcomeConfig.welcomeEmbed?.title || '🎉 Welcome!', formatData);
                const embedFooter = welcomeConfig.welcomeEmbed?.footer ? formatWelcomeMessage(welcomeConfig.welcomeEmbed.footer, formatData) : `Welcome to ${guild.name}!`;

                const canEmbed = permissions.has(PermissionFlagsBits.EmbedLinks);

                if (!canEmbed) {
                    await channel.send({ content: messageContent || welcomeMessage });
                } else {
                    const embed = new EmbedBuilder()
                        .setColor(welcomeConfig.welcomeEmbed?.color || getColor('success'))
                        .setTitle(embedTitle)
                        .setDescription(welcomeMessage)
                        .setThumbnail(user.displayAvatarURL())
                        .addFields(
                            { name: 'User', value: `${user.tag} (${user.id})`, inline: true },
                            { name: 'Member Count', value: guild.memberCount.toString(), inline: true }
                        )
                        .setTimestamp()
                        .setFooter({ text: embedFooter });
                    
                    if (welcomeConfig.welcomeImage) {
                        embed.setImage(welcomeConfig.welcomeImage);
                    } else if (welcomeConfig.welcomeEmbed?.image?.url) {
                        embed.setImage(welcomeConfig.welcomeEmbed.image.url);
                    }
                    
                    await channel.send({ content: messageContent, embeds: [embed] });
                }
            }
        }
        
        if (welcomeConfig?.roleIds && welcomeConfig.roleIds.length > 0) {
            const delay = welcomeConfig.autoRoleDelay || 0;
            const singleRoleId = welcomeConfig.roleIds[0];
            
            if (delay > 0) {
                const timeout = setTimeout(async () => {
                    const role = guild.roles.cache.get(singleRoleId);
                    if (role) await assignRoleSafely(member, role);
                }, delay * 1000);
                if (typeof timeout.unref === 'function') timeout.unref();
            } else {
                const role = guild.roles.cache.get(singleRoleId);
                if (role) await assignRoleSafely(member, role);
            }
        }
        
        if (config?.verification?.enabled || config?.verification?.autoVerify?.enabled) {
            await handleVerification(member, guild, config.verification, member.client);
        }

        try {
            await logEvent({
                client: member.client,
                guildId: guild.id,
                eventType: EVENT_TYPES.MEMBER_JOIN,
                data: {
                    title: 'User joined',
                    lines: [
                        `**User:** ${user.toString()} (${user.displayName !== user.username ? `@${user.displayName}` : user.tag})`,
                        `**ID:** \`${user.id}\``,
                        `**Created:** <t:${Math.floor(user.createdTimestamp / 1000)}:R>`,
                        `**Members:** ${guild.memberCount}`,
                    ],
                    quoted: false,
                    thumbnail: user.displayAvatarURL({ dynamic: true }),
                    userId: user.id,
                }
            });
        } catch (error) {
            logger.debug('Error logging member join:', error);
        }

        try {
            const counters = await getServerCounters(member.client, guild.id);
            for (const counter of counters) {
                if (counter && counter.type && counter.channelId && counter.enabled !== false) {
                    await updateCounter(member.client, guild, counter);
                }
            }
        } catch (error) {
            logger.debug('Error updating counters on member join:', error);
        }

        try {
            const backupKey = `guild:${guild.id}:birthdays:left`;
            const backup = (await member.client.db.get(backupKey)) || {};
            if (backup[user.id]) {
                const { month, day } = backup[user.id];
                await dbSetBirthday(member.client, guild.id, user.id, month, day);
                delete backup[user.id];
                await member.client.db.set(backupKey, backup);
                logger.debug(`Birthday restored for user ${user.id} in guild ${guild.id}`);
            }
        } catch (error) {
            logger.debug('Error restoring birthday on member join:', error);
        }
        
    } catch (error) {
        logger.error('Error in guildMemberAdd event:', error);
    }
  }
};

async function handleVerification(member, guild, verificationConfig, client) {
    const { autoVerifyOnJoin } = await import('../services/verificationService.js');
    try {
        await autoVerifyOnJoin(client, guild, member, verificationConfig);
    } catch (error) {
        logger.error('Error in auto-verification for member', { error: error.message });
    }
}

async function assignRoleSafely(member, role) {
    try {
        await member.roles.add(role);
    } catch (error) {
        logger.warn(`Failed to assign role ${role.id} to member ${member.id}:`, error);
    }
}
