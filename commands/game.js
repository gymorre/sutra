// commands/game.js

import { config } from "../config.js";

export const name = "game";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  const text = `${config.ui.doubleLine}
┃ GAME MENU
${config.ui.doubleLine}

⚡ CARA BERMAIN GAME:

Gunakan salah satu:
!gas <game> <bet>  → Bermain dengan nama game
!re <bet>          → Bermain game Reme langsung
!bet <amount>      → Bermain game default
!g                 → Quick start game

Contoh:
!re 100
!bet 100
!g

${config.ui.line}

🎮 MINI GAME TERSEDIA:

• !re
• !bj (BlackJack)
• !flipcoin / !fp
• !tictactoe / !ttt

${config.ui.line}

💰 EKONOMI:

• !balance / !bal → Lihat saldo
• !cek → Cek informasi akun
• !leaderboard → Ranking pemain

${config.ui.line}

🎁 REWARD & BONUS:

• !hourly → Reward tiap jam
• !daily → Reward harian
• !weekly → Reward mingguan
• !monthly → Reward bulanan

${config.ui.doubleLine}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
