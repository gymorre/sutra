// commands/support.js

import { config } from "../config.js";

export const name = "support";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  const text = `⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
📂 MENU > 📂 *SUPPORT*
⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘

📞 *SUPPORT CENTER*

Butuh bantuan atau menemukan bug?
Silakan hubungi team support kami melalui WhatsApp utama:

🔗 https://wa.me/6285158220582

Kami akan segera merespons laporan Anda! Terima kasih. :D

⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
📁 _Ketik !menu untuk kembali_`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
