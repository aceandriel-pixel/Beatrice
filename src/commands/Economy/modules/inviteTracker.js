import { Collection } from 'discord.js';
import { getEconomyData, setEconomyData } from '../../utils/economy.js'; // Adjust path based on your file depth

// Cache to store invites per guild: guildId -> Map(inviteCode -> uses)
export const inviteCache = new Collection();

/**
 * Fetches and caches all invites for a guild. Run this on client ready.
 */
export async function cacheGuildInvites(guild) {
    try {
        const firstInvites = await guild.invites.fetch();
        const codeUses = new Collection();
        firstInvites.forEach(inv => codeUses.set(inv.code, inv.uses));
        inviteCache.set(guild.id, codeUses);
    } catch (err) {
        console.error(`Failed to cache invites for guild ${guild.name}:`, err);
    }
}

/**
 * Handles new member joins, detects the inviter, and rewards them once.
 */
export async function handleGuildMemberAdd(member, client) {
    const { guild, user } = member;

    if (user.bot) return;

    try {
        const newInvites = await guild.invites.fetch();
        const cachedInvites = inviteCache.get(guild.id) || new Collection();

        const usedInvite = newInvites.find(inv => {
            const cachedUses = cachedInvites.get(inv.code) || 0;
            return inv.uses > cachedUses;
        });

        // Update cache
        const codeUses = new Collection();
        newInvites.forEach(inv => codeUses.set(inv.code, inv.uses));
        inviteCache.set(guild.id, codeUses);

        if (!usedInvite || !usedInvite.inviter) return;

        const inviter = usedInvite.inviter;
        if (inviter.id === user.id) return; // Prevent self-invites

        // Fetch inviter economy data using your project's helper
        let inviterData = await getEconomyData(client, guild.id, inviter.id);
        if (!inviterData) {
            inviterData = { mana: 0, silver_coins: 0, maxMana: 1000 };
        }

        if (!inviterData.invited_users) inviterData.invited_users = [];
        if (!inviterData.rewarded_invite_history) inviterData.rewarded_invite_history = [];

        // Enforce rule: Reward can only be given ONCE per invited user (even if they leave and rejoin)
        if (inviterData.rewarded_invite_history.includes(user.id)) {
            return;
        }

        inviterData.rewarded_invite_history.push(user.id);
        if (!inviterData.invited_users.includes(user.id)) {
            inviterData.invited_users.push(user.id);
        }

        // Reward: 5,000 Silver Coins
        inviterData.silver_coins = (inviterData.silver_coins || 0) + 5000;

        // Reward: 1,000 Mana with Capacity Check & 1.25x Silver Overflow Conversion
        const capacity = inviterData.maxMana || inviterData.mana_capacity || 1000;
        const currentMana = inviterData.mana || 0;
        const spaceLeft = Math.max(0, capacity - currentMana);
        
        const rewardMana = 1000;
        let addedToMana = 0;
        let overflow = 0;

        if (rewardMana <= spaceLeft) {
            addedToMana = rewardMana;
            inviterData.mana = currentMana + rewardMana;
        } else {
            addedToMana = spaceLeft;
            inviterData.mana = capacity;
            overflow = rewardMana - spaceLeft;
        }

        if (overflow > 0) {
            const convertedSilver = Math.floor(overflow * 1.25);
            inviterData.silver_coins += convertedSilver;
        }

        // Save changes using your utility
        await setEconomyData(client, guild.id, inviter.id, inviterData);
        console.log(`[InviteTracker] Rewarded ${inviter.tag} for inviting ${user.tag} (5,000 Silver Coins & 1,000 Mana).`);

    } catch (err) {
        console.error('Error handling member join invite tracking:', err);
    }
}

/**
 * Handles member leaves (keeps database history intact so rewards won't trigger twice if they rejoin)
 */
export async function handleGuildMemberRemove(member) {
    const { guild } = member;
    if (member.user.bot) return;

    try {
        const newInvites = await guild.invites.fetch();
        const codeUses = new Collection();
        newInvites.forEach(inv => codeUses.set(inv.code, inv.uses));
        inviteCache.set(guild.id, codeUses);
    } catch (err) {
        console.error('Error updating invite cache on member leave:', err);
    }
}
