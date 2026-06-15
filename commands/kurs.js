// commands/kurs.js
// Mengambil kurs realtime USD -> JPY, CNY, MYR, IDR

import fetch from "node-fetch";
import { config } from "../config.js";

export const name = "kurs";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  try {
    const res = await fetch(config.kursApiUrl);
    const data = await res.json();

    const rates = data.rates;

    const text = `${config.ui.line}
┃ KURS REALTIME
${config.ui.line}

💵 1 USD =

🇯🇵 JPY : ${rates.JPY?.toFixed(2) ?? "N/A"}
🇨🇳 CNY : ${rates.CNY?.toFixed(2) ?? "N/A"}
🇲🇾 MYR : ${rates.MYR?.toFixed(2) ?? "N/A"}
🇮🇩 IDR : ${rates.IDR?.toFixed(2) ?? "N/A"}

${config.ui.line}

Update: ${data.date ?? "-"}

${config.ui.line}`;

    return reply(text);
  } catch (err) {
    return reply(
      `${config.ui.line}\n┃ KURS\n${config.ui.line}\n\nGagal mengambil data kurs.\nSilakan coba lagi nanti.\n\n${config.ui.line}`
    );
  }
}

export default { name, aliases, requiresRegistration, execute };
