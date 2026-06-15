// config.js
// Konfigurasi global untuk SUTRA BOT

export const config = {
  botName: "SUTRA",
  prefix: "!",
  ownerNumber: "6281399395985",
  ownerName: "Owner Adit",
  supportNumber: "6285158220582",
  supportName: "Support",
  mode: "OPEN BETA",

  inviteLink: "https://wa.me/6281399395985?text=Hi%20SUTRA%20Bot",

  // Database
  databasePath: "./database/database.db",
  
  // Log transaksi
  transactionLogPath: "./logs/transaction.log",

  // Ekonomi
  startingBalance: 1000,
  currencySymbol: "$",

  // Reward
  reward: {
    hourly: { amount: 100, cooldown: 60 * 60 * 1000 },          // 1 jam
    daily: { amount: 500, cooldown: 24 * 60 * 60 * 1000 },      // 24 jam
    weekly: { amount: 1000, cooldown: 7 * 24 * 60 * 60 * 1000 }, // 7 hari
    monthly: { amount: 5000, cooldown: 30 * 24 * 60 * 60 * 1000 } // 30 hari
  },

  // Leaderboard auto-refresh interval (ms)
  leaderboardRefreshInterval: 5 * 60 * 1000,

  // Kurs API (gratis, tanpa API key)
  kursApiUrl: "https://api.exchangerate-api.com/v4/latest/USD",

  // Style border UI
  ui: {
    line: "━━━━━━━━━━━━━━━━━━━━━━",
    doubleLine: "══════════════════════"
  }
};

export default config;
