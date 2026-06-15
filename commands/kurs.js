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
    const idrRate = rates.IDR || 1;

    // Konversi semua ke Rupiah sebagai base
    const jpy = idrRate / (rates.JPY || 1);
    const cny = idrRate / (rates.CNY || 1);
    const myr = idrRate / (rates.MYR || 1);
    const usd = 1 / (idrRate || 1);

    const text = `${config.ui.line}
┃ KURS REALTIME
${config.ui.line}

🇮🇩 1 IDR =

🇺🇸 USD : ${usd?.toFixed(6) ?? "N/A"}
🇯🇵 JPY : ${jpy?.toFixed(4) ?? "N/A"}
🇨🇳 CNY : ${cny?.toFixed(6) ?? "N/A"}
🇲🇾 MYR : ${myr?.toFixed(6) ?? "N/A"}

${config.ui.line}

📊 Atau:

🇺🇸 1 USD = ${rates.IDR?.toFixed(0) ?? "N/A"} IDR
🇯🇵 1 JPY = ${(idrRate / rates.JPY)?.toFixed(4) ?? "N/A"} IDR
🇨🇳 1 CNY = ${(idrRate / rates.CNY)?.toFixed(2) ?? "N/A"} IDR
🇲🇾 1 MYR = ${(idrRate / rates.MYR)?.toFixed(2) ?? "N/A"} IDR

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
