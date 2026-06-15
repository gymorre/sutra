// commands/idx.js

import { config } from "../config.js";

export const name = "idx";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  return reply(
`══════════════════════
📂 MENU > 📂 *IDX*
══════════════════════

🔒 *Coming Soon*

Fitur IDX sedang dalam pengembangan.
Nantikan update selanjutnya!

══════════════════════
📁 _Ketik !menu untuk kembali_`
  );
}

export default { name, aliases, requiresRegistration, execute };
