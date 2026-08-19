import { Collection } from 'discord.js';
import { getUserData, saveUserData, addManaWithOverflow } from './Currency.js';

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
 * Handles new member joins, detects the inviter, and awards rewards once.
 */
export async function handleGuildMemberAdd(member) {
    const { guild, user } = member;

    // Ignore bot joins
    if (user.bot) return;

    try {
        // Fetch current guild invites
        const newInvites = await guild.invites.fetch();
        const cachedInvites = inviteCache.get(guild.id) || new Collection();

        // Find which invite's use count went up
        const usedInvite = newInvites.find(inv => {
            const cachedUses = cachedInvites.get(inv.code) || 0;
            return inv.uses > cachedUses;
        });

        // Update cache with new invite uses
        const codeUses = new Collection();
        newInvites.forEach(inv => codeUses.set(inv.code, inv.uses));
        inviteCache.set(guild.id, codeUses);

        if (!usedInvite || !usedInvite.inviter) {
            return; // Could be custom URL, vanity invite, or OAuth join
        }

        const inviter = usedInvite.inviter;

        // Prevent self-hosting/self-invites
        if (inviter.id === user.id) return;

        // Database check for one-time reward tracking
        const dbData = getUserData(inviter.id);
        
        // Initialize history arrays if missing
        if (!dbData.invited_users) dbData.invited_users = [];
        if (!dbData.rewarded_invite_history) dbData.rewarded_invite_history = [];

        // Check if this specific user was ever rewarded for before
        if (dbData.rewarded_invite_history.includes(user.id)) {
            // Already rewarded in the past, do not reward again if they left and rejoined
            return;
        }

        // Mark user as tracked and rewarded
        if (!dbData.invited_users.includes(user.id)) {
            dbData.invited_users.push(user.id);
        }
        dbData.rewarded_invite_history.push(user.id);

        // Give Rewards: 1k Mana (with overflow capacity rules) & 5k Silver Coins
        const manaResult = addManaWithOverflow(inviter.id, 1000);
        
        // Refresh latest database object for inviter to add Silver Coins safely
        const updatedInviterData = getUserData(inviter.id);
        updatedInviterData.silver_coins = (updatedInviterData.silver_coins || 0) + 5000;
        saveUserData(inviter.id, updatedInviterData);

        console.log(`[InviteTracker] ${inviter.tag} invited ${user.tag}. Rewarded 1,000 Mana & 5,000 Silver Coins!`);

    } catch (err) {
        console.error('Error handling guild member join invite tracking:', err);
    }
}

/**
 * Handles member leaves (keeps database tracking intact so they won't trigger rewards again if they rejoin)
 */
export async function handleGuildMemberRemove(member) {
    const { guild, user } = member;
    if (user.bot) return;

    try {
        // Refresh invite cache on member leave as well to keep counts accurate
        const newInvites = await guild.invites.fetch();
        const codeUses = new Collection();
        newInvites.forEach(inv => codeUses.set(inv.code, inv.uses));
        inviteCache.set(guild.id, codeUses);
        
        console.log(`[InviteTracker] ${user.tag} left the server.`);
    } catch (err) {
        console.error('Error updating invite cache on member leave:', err);
    }
}

