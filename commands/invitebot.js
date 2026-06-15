// commands/invitebot.js

import { config } from "../config.js";

export const name = "invitebot";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  const text = `${config.ui.line}
┃ INVITE BOT
${config.ui.line}

Ajak teman kamu bermain ${config.botName}!

🔗 ${config.inviteLink}

${config.ui.line}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
