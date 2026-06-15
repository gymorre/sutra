// commands/dv.js

import { config } from "../config.js";

export const name = "dv";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  return reply(
`══════════════════════
📂 MENU > 📂 *DV*
══════════════════════

🔒 *Coming Soon*

Fitur DV sedang dalam pengembangan.
Nantikan update selanjutnya!

══════════════════════
📁 _Ketik !menu untuk kembali_`
  );
}

export default { name, aliases, requiresRegistration, execute };
