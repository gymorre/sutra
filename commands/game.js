// commands/game.js
// Menu daftar semua game yang tersedia

import { config } from "../config.js";

export const name = "game";
export const aliases = ["games", "daftar"];
export const requiresRegistration = false;

export async function execute({ reply }) {
  const text =
    `${config.ui.doubleLine}\n` +
    `┃ 🎮 GAME MENU\n` +
    `${config.ui.doubleLine}\n\n` +
    `${config.ui.line}\n\n` +
    `🎲 MINI GAME:\n\n` +
    `🎲 !reme / !re\n` +
    `   → Angka acak 0-36 (50/50)\n\n` +
    `🃏 !bj / !blackjack\n` +
    `   → Blackjack vs Bot\n\n` +
    `🪙 !fp / !flipcoin\n` +
    `   → Tebak HEAD/TAIL\n\n` +
    `❌⭕ !ttt / !tictactoe\n` +
    `   → Tic Tac Toe 3x3\n\n` +
    `🍎 !fb / !fruitbomb\n` +
    `   → Tebak Buah atau Bom!\n\n` +
    `${config.ui.line}\n\n` +
    `📋 CARA MAIN:\n\n` +
    `1. Ketik nama game (!reme, !bj, dll)\n` +
    `2. Pilih mode: !1 BOT / !2 PLAYER\n` +
    `3. Set bet: !bet <jumlah>\n` +
    `4. Main: !g <bet> atau !g\n\n` +
    `🚪 Keluar game:\n!back atau !menu\n\n` +
    `${config.ui.line}\n\n` +
    `💰 EKONOMI:\n\n` +
    `• !balance / !bal → Lihat saldo\n` +
    `• !cek → Info akun\n` +
    `• !leaderboard → Ranking\n\n` +
    `${config.ui.line}\n\n` +
    `🎁 REWARD HARIAN:\n\n` +
    `• !hourly → +${config.reward.hourly.amount} per jam\n` +
    `• !daily  → +${config.reward.daily.amount} per hari\n` +
    `• !weekly → +${config.reward.weekly.amount} per minggu\n` +
    `• !monthly→ +${config.reward.monthly.amount} per bulan\n\n` +
    `${config.ui.doubleLine}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
