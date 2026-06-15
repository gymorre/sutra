// commands/support.js

import { config } from "../config.js";

export const name = "support";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  const text = `${config.ui.line}
┃ SUPPORT
${config.ui.line}

Butuh bantuan?

Hubungi owner:
👤 ${config.ownerName}
📞 wa.me/${config.ownerNumber}

${config.ui.line}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
