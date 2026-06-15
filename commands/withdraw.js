// commands/withdraw.js

import { config } from "../config.js";

export const name = "withdraw";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  return reply(
`⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
📂 MENU > 📂 *WITHDRAW*
⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘

🔒 *Coming Soon*

Fitur withdraw sedang dalam pengembangan.
Nantikan update selanjutnya!

⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
📁 _Ketik !menu untuk kembali_`
  );
}

export default { name, aliases, requiresRegistration, execute };
