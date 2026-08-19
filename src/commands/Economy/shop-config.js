export const economyConfig = {
    // =====================================
    // ECONOMY SETTINGS (Dual Currency Setup)
    // =====================================
    currencies: [
        {
            id: "silver_coins",
            name: "Silver Coin",
            namePlural: "Silver Coins",
            symbol: "⛃⛂",
            startingBalance: 0
        },
        {
            id: "mana",
            name: "Mana",
            namePlural: "Mana",
            symbol: ".✧.",
            startingBalance: 0
        }
    ],
    currency: {
        name: "Mana",
        namePlural: "Mana",
        symbol: ".✧.",
    },
    startingBalance: 0,
    workMin: 10,
    workMax: 150,
    stealMin: 100,
    stealMax: 10000,
    stealPercentage: 0.70,
    stealFailPenalty: 0.50,
    manaDrainPercentage: 0.10,
    cooldowns: {
        work: 1 * 60 * 60 * 1000,
        steal: 1 * 60 * 60 * 1000,
        mine: 4 * 60 * 60 * 1000,
        shield: 0,
        train: 2 * 60 * 60 * 1000,
        rest: 3 * 60 * 60 * 1000,
        eat: 1 * 60 * 60 * 1000,
        manaDrain: 6 * 60 * 60 * 1000,
    },
    messages: {
        work: "You swung your pickaxe and hammered out a hard day's labor, earning some honest Silver Coins!",
        steal: "In the dead of shadows, you successfully swiped 70% of your target's silver coins pouch!",
        stealFail: "You were caught red-handed trying to pickpocket! Guard intervention penalized you by losing 50% of your silver coins.",
        mine: "You ventured deep into the cavernous depths and extracted rare magical veins from the stone!",
        shield: "You permanently activated your protective anti-theft barrier! Both your silver stash and your mana reserve are now forever secure from theft and drains.",
        train: "You channeled intense magical focus through your veins, compressing raw elements into extra Mana!",
        rest: "You meditated deeply in a sanctuary of silence, restoring your spiritual energy and generating Mana.",
        eat: "You consumed a rich, mana-infused elixir feast, fueling your spiritual core with fresh Mana!",
        manaDrain: "You performed a dark ritual, successfully siphoning away a fraction of your target's glowing Mana!",
        cooldown: "⏳ You are exhausted or your cooldown hasn't refreshed yet! Please wait **{time}** before using this command again."
    },
    stealSuccessRate: 0.2,
    stealFailJailTime: 86400000,
    trainManaMin: 50,
    trainManaMax: 200,
    restManaMin: 30,
    restManaMax: 150,
    eatManaMin: 20,
    eatManaMax: 100,
    miningOres: [
        { id: "stone", name: "Stone (Failed Dig)", chance: 50, value: 50 },
        { id: "adamantite", name: "Adamantite", chance: 25, value: 1200 },
        { id: "orichalcum", name: "Orichalcum", chance: 15, value: 5000 },
        { id: "scarlet_metal", name: "Scarlet Metal", chance: 8, value: 18000 },
        { id: "prismatic_ore", name: "Prismatic Ore", chance: 2, value: 75000 }
    ],

    // =====================================
    // SHOP SETTINGS
    // =====================================
    shop: {
        shop1: {
            title: "Arcane Vault - Mana Storage Shop",
            currency: "Silver Coins",
            currencyId: "silver_coins",
            items: [
                { id: "mana_flask_small", name: "Minor Mana Flask", price: 1000, capacityBoost: 1000, unique: true, description: "A small glass vial that expands your mana reservoir." },
                { id: "mana_crystal_shard", name: "Raw Mana Crystal Shard", price: 5000, capacityBoost: 5000, unique: true, description: "Radiates faint magical energy to enlarge your mental capacity." },
                { id: "spell_tome_novice", name: "Grimoire of the Adept", price: 12000, capacityBoost: 12000, unique: true, description: "Teaches mind-stretching techniques to hold more mana." },
                { id: "enchanted_amulet", name: "Sapphire Mana Amulet", price: 25000, capacityBoost: 25000, unique: true, description: "An ancient amulet worn by sorcerers to stabilize vast mana flows." },
                { id: "rune_etched_ring", name: "Ring of Leyline Echoes", price: 50000, capacityBoost: 50000, unique: true, description: "Taps directly into underground mana leys to expand storage." },
                { id: "mystic_pouch", name: "Bottomless Ether Pouch", price: 100000, capacityBoost: 100000, unique: true, description: "A magical pouch that bends space to store extra arcane essence." },
                { id: "celestial_chalice", name: "Starlight Chalice", price: 250000, capacityBoost: 200000, unique: true, description: "Filled with liquid starlight to radically enhance capacity." },
                { id: "dragon_scale_core", name: "Draconic Mana Core", price: 600000, capacityBoost: 500000, unique: true, description: "Imbued with dragon magic to withstand massive magical surges." },
                { id: "archmage_mantle", name: "Mantle of the Archmage", price: 1500000, capacityBoost: 1500000, unique: true, description: "Heavy woven robes that permanently elevate your magical limits." },
                { id: "nexus_obelisk_fragment", name: "Fragment of the World Nexus", price: 5000000, capacityBoost: 5000000, unique: true, description: "A piece of the universal nexus granting near-godly mana capacity." }
            ]
        },
        shop2: {
            title: "Godly Shop",
            description: "The Godly Shop offers an exclusive selection of legendary items and powerful gear purchasable with Mana.",
            currency: "Mana",
            currencyId: "mana",
            pingOwnerOnBuy: true,
            items: [
                { id: "custom_item_1", name: "Eternal II", price: 20000, description: "Legendary weapon artifact." },
                { id: "custom_item_2", name: "Ice Shard", price: 20000, description: "Frozen crystal dagger." },
                { id: "custom_item_3", name: "Eternal III", price: 40000, description: "Upgraded tier artifact." },
                { id: "custom_item_4", name: "Eternal IV", price: 40000, description: "Advanced tier artifact." },
                { id: "custom_item_5", name: "BioBlade", price: 40000, description: "Organic infused blade." },
                { id: "custom_item_6", name: "Heat", price: 60000, description: "Blazing hot sword element." },
                { id: "custom_item_7", name: "Green Luger", price: 750000, description: "Rare firearm gear." },
                { id: "custom_item_8", name: "Batwing", price: 1500000, description: "Shadow-forged wings." },
                { id: "custom_item_9", name: "Heartblade", price: 2500000, description: "Vampiric edge." },
                { id: "custom_item_10", name: "IcePiercer", price: 7000000, description: "Pierces through absolute zero." }
            ]
        }
    }
};

// Debug checks safely executed
const allShops = Object.values(economyConfig.shop);
allShops.forEach(shop => {
    console.log(`Loaded Shop: ${shop.title}`);
});

export default economyConfig;
