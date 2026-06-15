// commands/invitebot.js

import { config } from "../config.js";

export const name = "invite";
export const aliases = ["invitebot"];
export const requiresRegistration = false;

export async function execute({ sock, reply }) {
  const botNumber = sock.user?.id ? sock.user.id.split(":")[0] : config.ownerNumber;
  const inviteLink = `https://wa.me/${botNumber}?text=!menu`;

  const text = `⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
📂 MENU > 📂 *INVITE*
⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘

👥 *INVITE SUTRA BOT*

Ajak SUTRA BOT masuk ke grup chat kamu untuk seru-seruan bareng teman-teman! 🎉

🔥 *Fitur Unggulan:*
• 🎲 Mini-games seru (Reme, Blackjack, Flipcoin, Fruitbomb, TicTacToe)
• ⚔️ Battle multiplayer taruhan saldo dengan teman
• 💵 Virtual economy dengan transfer saldo, leaderboard harian, dan hadiah bonus!

Klik link di bawah ini untuk mulai interaksi dan mengundang bot:
🔗 ${inviteLink}

_Bikin grup kamu makin rame dan seru dengan SUTRA BOT!_ 🚀

⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
📁 _Ketik !menu untuk kembali_`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
