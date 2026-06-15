// commands/balance.js

import { getUser } from "../utils/economy.js";
import { config } from "../config.js";

export const name = "balance";
export const aliases = ["bal"];
export const requiresRegistration = true;

export async function execute({ sender, reply }) {
  const user = getUser(sender);

  const text = `${config.ui.line}
┃ WALLET
${config.ui.line}

👤 Nickname : ${user.nickname}
💰 Balance  : ${config.currencySymbol}${user.balance}
🏆 Win      : ${user.win}
💀 Lose     : ${user.lose}
🎮 Total    : ${user.total_game}

${config.ui.line}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
