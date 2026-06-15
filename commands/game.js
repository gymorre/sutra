// commands/game.js
// Sub-folder "Game" — ketika user ketik !game, folder ini "terbuka"
// Menampilkan detail semua game, ekonomi, dan reward

import { config } from "../config.js";

export const name = "game";
export const aliases = ["games", "daftar"];
export const requiresRegistration = false;

export async function execute({ reply }) {
  const text =
`⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
📂 MENU > 📂 *GAME*
⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘

🎲 *DAFTAR GAME*
│
├── 🎲 *!reme* / *!re*
│     └─ Angka acak 0-36 (50/50)
│
├── 🃏 *!blackjack* / *!bj*
│     └─ Blackjack klasik vs Bot
│
├── 🪙 *!flipcoin* / *!fp*
│     └─ Tebak HEAD atau TAIL
│
├── 🍎 *!fruitbomb* / *!fb*
│     └─ Tebak Buah atau Bom! 3x3
│
├── ❌⭕ *!tictactoe* / *!ttt*
│     └─ Tic Tac Toe 3x3
│
└── ⚔️ *!multiplayer* / *!mp*
      └─ Tantang teman bermain!
      └─ (Reme & TicTacToe)

⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘

📋 *CARA MAIN*
│
├── 1️⃣ Ketik nama game (contoh: !reme)
├── 2️⃣ Set bet: !bet <jumlah>
├── 3️⃣ Main: !g <aksi>
└── 🚪 Keluar: !back atau !menu

⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘

💰 *EKONOMI*
│
├── 💵 *!balance* / *!bal*
│     └─ Lihat saldo kamu
│
├── 🏆 *!leaderboard* / *!lb*
│     └─ Ranking pemain
│
├── 📋 *!cek*
│     └─ Info akun lengkap
│
└── 💸 *!transfer* / *!tf*
      └─ Kirim saldo ke pemain lain

⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘

🎁 *REWARD*
│
├── ⏰ *!hourly*  → +${config.currencySymbol}${config.reward.hourly.amount}
├── 📅 *!daily*   → +${config.currencySymbol}${config.reward.daily.amount}
├── 📆 *!weekly*  → +${config.currencySymbol}${config.reward.weekly.amount}
└── 🗓️ *!monthly* → +${config.currencySymbol}${config.reward.monthly.amount}

⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
📁 _Ketik !menu untuk kembali_`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
