// commands/withdraw.js

import { config } from "../config.js";

export const name = "withdraw";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ reply }) {
  return reply(
    `${config.ui.line}\n┃ WITHDRAW\n${config.ui.line}\n\nComing Soon\n\n${config.ui.line}`
  );
}

export default { name, aliases, requiresRegistration, execute };
