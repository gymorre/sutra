// commands/cek.js

import { getUser, getUserByNickname } from "../utils/economy.js";
import { config } from "../config.js";

export const name = "cek";
export const aliases = [];
export const requiresRegistration = true;

export async function execute({ msg, args, reply }) {
  let targetJid = null;
  let nicknameQuery = null;

  // Cek apakah ada mention/tag
  const mentioned =
    msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

  if (mentioned && mentioned.length > 0) {
    targetJid = mentioned[0];
  } else if (args[0]) {
    nicknameQuery = args.join(" ");
  } else {
    return reply(
      `${config.ui.line}\n┃ CEK PROFILE\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!cek @tag\natau\n!cek nickname\n\n${config.ui.line}`
    );
  }

  let user = null;

  if (targetJid) {
    user = getUser(targetJid);
  } else if (nicknameQuery) {
    user = getUserByNickname(nicknameQuery);
  }

  if (!user) {
    return reply(
      `${config.ui.line}\n┃ CEK PROFILE\n${config.ui.line}\n\nUser tidak ditemukan atau belum terdaftar.\n\n${config.ui.line}`
    );
  }

  const winrate =
    user.total_game > 0
      ? ((user.win / user.total_game) * 100).toFixed(1)
      : "0.0";

  const text = `${config.ui.line}
┃ PROFILE
${config.ui.line}

👤 Nickname  : ${user.nickname}
💰 Balance   : ${config.currencySymbol}${user.balance}
🏆 Win       : ${user.win}
💀 Lose      : ${user.lose}
🎮 Total Game: ${user.total_game}
📊 Winrate   : ${winrate}%
📅 Joined    : ${new Date(user.created_at).toLocaleDateString("id-ID")}

${config.ui.line}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
