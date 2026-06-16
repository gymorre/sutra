// commands/me.js
// Command untuk melihat profile player lengkap dengan Nickname, System ID, Balance, dan Statistik

import { getUser, getUserByNickname } from "../utils/economy.js";
import { config } from "../config.js";

export const name = "me";
export const aliases = [];
export const requiresRegistration = true;

/**
 * Main execute function for !me
 */
export async function execute({ msg, args, sender, reply }) {
  let targetJid = sender;
  let nicknameQuery = null;

  // Cek apakah ada mention/tag atau quoted message
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;

  if (mentioned && mentioned.length > 0) {
    targetJid = mentioned[0];
  } else if (quoted) {
    targetJid = quoted;
  } else if (args[0]) {
    const arg = args.join(" ").trim();
    if (arg.includes("@")) {
      targetJid = arg;
    } else {
      // Coba parse sebagai nomor HP / ID saja
      const phone = arg.replace(/[+\s\-@]/g, "");
      if (/^\d+$/.test(phone)) {
        targetJid = `${phone}@s.whatsapp.net`;
      } else {
        nicknameQuery = arg;
      }
    }
  }

  let user = null;
  if (nicknameQuery) {
    user = getUserByNickname(nicknameQuery);
  } else {
    user = getUser(targetJid);
  }

  if (!user) {
    return reply(
      `${config.ui.line}\n┃ 👤 PROFILE\n${config.ui.line}\n\n❌ Player tidak ditemukan atau belum terdaftar!\n\n${config.ui.line}`
    );
  }

  const winrate =
    user.total_game > 0
      ? ((user.win / user.total_game) * 100).toFixed(1)
      : "0.0";

  const isSelf = user.jid === sender;
  const title = isSelf ? "MY PROFILE" : "PLAYER PROFILE";

  const text = `${config.ui.line}
┃ 👤 ${title}
${config.ui.line}

👤 Nickname   : ${user.nickname}
🆔 System ID  : ${user.jid}
💰 Balance    : ${config.currencySymbol}${user.balance}
🏆 Win        : ${user.win}
💀 Lose       : ${user.lose}
🎮 Total Game : ${user.total_game}
📊 Winrate    : ${winrate}%
📅 Joined     : ${new Date(user.created_at).toLocaleDateString("id-ID")}

${config.ui.line}`;

  return reply(text);
}

export default { name, aliases, requiresRegistration, execute };
