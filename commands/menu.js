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
Bot ini masih dalam tahap pengembangan (OPEN BETA). Fitur dan perintah dapat berubah sewaktu-waktu. Harap bersabar dan laporkan bug ke support. Terima kasih atas dukunganmu!

${config.ui.doubleLine}
${config.ui.doubleLine}

🕐 Jam: ${jam}
📡 Ping: ${ping}ms

${config.ui.doubleLine}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
