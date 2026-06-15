// commands/game.js
// Sub-folder "Game" — ketika user ketik !game, folder ini "terbuka"
// Menampilkan detail semua game, ekonomi, dan reward

import { config } from "../config.js";

export const name = "game";
export const aliases = ["games", "daftar"];
export const requiresRegistration = false;

export async function execute({ reply }) {
  const text =
`══════════════════════
📂 MENU > 📂 *GAME*
══════════════════════
🎲 *DAFTAR GAME*
│
├── 🎲 *!reme* / *!re*
├── 🃏 *!blackjack* / *!bj*
├── 🪙 *!flipcoin* / *!fp*
├── 🍎 *!fruitbomb* / *!fb*
├── ❌⭕ *!tictactoe* / *!ttt*
└── ⚔️ *!multiplayer* / *!mp*
══════════════════════
📋 *CARA MAIN*
│
├── 1️⃣ Ketik nama game (contoh: !reme)
├── 2️⃣ Set bet: !bet <jumlah>
├── 3️⃣ Main: !g <aksi>
└── 🚪 Keluar: !back atau !menu
══════════════════════
💰 *EKONOMI*
│
├── 💵 *!balance* / *!bal*
├── 🏆 *!leaderboard* / *!lb*
├── 📋 *!cek*
└── 💸 *!transfer* / *!tf*
══════════════════════
🎁 *REWARD*
│
├── ⏰ *!hourly*  → +${config.currencySymbol}${config.reward.hourly.amount}
├── 📅 *!daily*   → +${config.currencySymbol}${config.reward.daily.amount}
├── 📆 *!weekly*  → +${config.currencySymbol}${config.reward.weekly.amount}
└── 🗓️ *!monthly* → +${config.currencySymbol}${config.reward.monthly.amount}
══════════════════════
📁 _Ketik !menu untuk kembali_`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
