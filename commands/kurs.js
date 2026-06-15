// commands/kurs.js
// Mengambil kurs realtime USD base dan menampilkan 10 negara besar dibandingkan Rupiah

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

    // Hitung nilai 1 unit mata uang asing dalam Rupiah
    const getIrdVal = (code) => {
      const rate = rates[code];
      if (!rate) return null;
      return idrRate / rate;
    };

    const currs = [
      { code: "USD", name: "United States Dollar (AS)  ", flag: "🇺🇸" },
      { code: "EUR", name: "Euro (Uni Eropa)            ", flag: "🇪🇺" },
      { code: "GBP", name: "Pound Sterling (Inggris)    ", flag: "🇬🇧" },
      { code: "JPY", name: "Yen (Jepang)                ", flag: "🇯🇵" },
      { code: "AUD", name: "Australian Dollar (Australia)", flag: "🇦🇺" },
      { code: "SGD", name: "Singapore Dollar (Singapura)", flag: "🇸🇬" },
      { code: "CNY", name: "Yuan (Cina)                 ", flag: "🇨🇳" },
      { code: "MYR", name: "Ringgit (Malaysia)          ", flag: "🇲🇾" },
      { code: "SAR", name: "Riyal (Arab Saudi)          ", flag: "🇸🇦" },
      { code: "CAD", name: "Canadian Dollar (Kanada)    ", flag: "🇨🇦" }
    ];

    let text = `══════════════════════
📂 MENU > 📂 *KURS*
══════════════════════

💱 *KURS REALTIME (1 MATA UANG -> RUPIAH)*

`;

    for (const cur of currs) {
      const val = getIrdVal(cur.code);
      if (val !== null) {
        // format Rupiah
        const valStr = val.toLocaleString("id-ID", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        text += `${cur.flag} 1 ${cur.code} = Rp ${valStr}\n`;
      }
    }

    text += `
Update terakhir: ${data.date || "-"}
Sumber: ExchangeRate-API

══════════════════════
📁 _Ketik !menu untuk kembali_`;

    return reply(text);
  } catch (err) {
    console.error("Error fetching exchange rates:", err);
    return reply(
`══════════════════════
📂 MENU > 📂 *KURS*
══════════════════════

❌ *Gagal mengambil data kurs secara realtime.*
Silakan coba lagi nanti.

══════════════════════
📁 _Ketik !menu untuk kembali_`
    );
  }
}

export default { name, aliases, requiresRegistration, execute };
