// commands/menu.js

import { config } from "../config.js";

export const name = "menu";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ sock, reply, msg }) {
  // Hitung ping
  const now = Date.now();
  const messageTimestamp = msg?.messageTimestamp?.low || now;
  const ping = Math.max(0, now - (messageTimestamp * 1000));
  
  // Format jam realtime
  const jam = new Date().toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  });
  
  const text = `${config.ui.doubleLine}
┃ ${config.botName} BOT
${config.ui.doubleLine}

📋 MAIN MENU

${config.ui.line}

🎮 GAME TERSEDIA:

🎲 !reme / !re        → Angka acak (50/50)
🃏 !bj / !blackjack   → Blackjack vs Bot
🪙 !fp / !flipcoin    → Tebak HEAD/TAIL
❌⭕ !ttt / !tictactoe → Tic Tac Toe 3x3
🍎 !fb / !fruitbomb   → Tebak Buah atau Bom!

${config.ui.line}

📋 CARA MAIN:
1. Pilih game: !reme / !bj / dll
2. Pilih mode: !1 BOT  !2 PLAYER
3. Set bet: !bet <jumlah>
4. Main: !g <aksi>

🚪 Keluar game: !back atau !menu

${config.ui.line}

💰 EKONOMI:

💵 !balance / !bal → Lihat saldo
📋 !cek            → Info akun
🏆 !leaderboard    → Ranking
💱 !kurs           → Kurs mata uang

${config.ui.line}

🎁 REWARD HARIAN:

⏰ !hourly  → Per jam
📅 !daily   → Per hari
📆 !weekly  → Per minggu
🗓️ !monthly → Per bulan

${config.ui.line}

📞 !support   → Hubungi support
👥 !invitebot → Invite bot ke grup

${config.ui.line}

ℹ️ OPEN BETA - Fitur terus diperbarui!

${config.ui.doubleLine}

🕐 Jam: ${jam}
📡 Ping: ${ping}ms

${config.ui.doubleLine}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
