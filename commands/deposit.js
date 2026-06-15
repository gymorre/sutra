// commands/deposit.js

import { config } from "../config.js";

export const name = "deposit";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  return reply(
`══════════════════════
📂 MENU > 📂 *DEPOSIT*
══════════════════════

🔒 *Coming Soon*

Fitur deposit sedang dalam pengembangan.
Nantikan update selanjutnya!

══════════════════════
📁 _Ketik !menu untuk kembali_`
  );
}

export default { name, aliases, requiresRegistration, execute };
