// commands/support.js

import { config } from "../config.js";

export const name = "support";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  const text = `${config.ui.doubleLine}
┃ SUPPORT
${config.ui.doubleLine}

Butuh bantuan?

Hubungi support kami:
👤 ${config.supportName}
📞 wa.me/${config.supportNumber}

${config.ui.line}

Alternatif:
Hubungi owner:
👤 ${config.ownerName}
📞 wa.me/${config.ownerNumber}

${config.ui.doubleLine}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
