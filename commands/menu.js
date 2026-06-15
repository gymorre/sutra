// commands/menu.js
// Menu utama SUTRA BOT - Tampilan folder explorer style
// Ketik command folder untuk "membuka" isinya

import { config } from "../config.js";
import { execSync } from "child_process";

export const name = "menu";
export const aliases = [];
export const requiresRegistration = false;

/**
 * Dapatkan versi bot dari jumlah commit git.
 * Format: v1.5.{jumlah_commit}
 * Otomatis naik setiap kali ada commit baru.
 */
function getBotVersion() {
  try {
    const commitCount = execSync("git rev-list --count HEAD", {
      encoding: "utf-8",
      timeout: 3000
    }).trim();
    return `v1.5.${commitCount}`;
  } catch (e) {
    return "v1.5.0";
  }
}

export async function execute({ reply }) {
  const dateObj = new Date();
  const pad = (n) => String(n).padStart(2, "0");

  const tanggal = `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`;
  const jam = dateObj.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta"
  }).replace(/\./g, ":");

  const timeWIB = `${tanggal} ${jam} WIB`;
  const version = getBotVersion();

  const menuText =
`══════════════════════
█▀ █░█ ▀█▀ █▀█ ▄▀█
▄█ █▄█ ░█░ █▀▄ █▀█
══════════════════════
🟢 STATUS : *ONLINE*
🕐 TIME   : ${timeWIB}

Bot created by @aditias
Version : ${version}
══════════════════════

📂 */MENU*
│
├── 🎮 *!Game*
├── 💰 *!Deposit*
├── 💵 *!Withdraw*
├── 💱 *!Kurs*
├── 🏛️ *!Idx*
├── 🎥 *!Dv*
├── 📞 *!Support*
├── 🔗 *!Invite*
└── ⏳ *More Feature Coming Soon*

══════════════════════
📌 *NOTE:*
Bot masih dalam tahap pengembangan *(BETA)* Jika menemukan bug harap segera lapor ke team support kami :D
══════════════════════
_©2026 All Rights Reserved. Sutra Bot_
`;

  return reply(menuText);
}

export default { name, aliases, requiresRegistration, execute };
