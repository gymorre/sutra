// commands/menu.js

import { config } from "../config.js";

export const name = "menu";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  const text = `${config.ui.doubleLine}
┃ ${config.botName} BOT
${config.ui.doubleLine}

📋 MAIN MENU

${config.ui.line}

🎮 !game
└─ Menampilkan semua command game

💰 !deposit
└─ Coming Soon

💸 !withdraw
└─ Coming Soon

💱 !kurs
└─ Menampilkan semua kurs mata uang

📊 !idx
└─ Coming Soon

🎯 !dv
└─ Coming Soon

✨ More Feature
└─ Coming Soon

📞 !support
└─ Arahkan ke nomor pribadi support

👥 !invitebot
└─ Invite bot ke grup

${config.ui.line}

ℹ️ CATATAN PENTING:
Untuk bermain game, gunakan:
!re <bet> atau !gas <game> <bet>
!bet <amount>
!g

Tidak perlu command game lengkap,
bot hanya menampilkan cara bermain.

${config.ui.doubleLine}

⚡ Virtual Economy
🚫 No Real Money

${config.ui.doubleLine}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
