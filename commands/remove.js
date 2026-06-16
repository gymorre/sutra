// commands/remove.js
import { subtractBalance, getUser, getUserByNickname } from "../utils/economy.js";
import { config } from "../config.js";

export const name = "remove";
export const aliases = [];
export const requiresRegistration = false;

const ADMIN_NUMBER = "6285158220582";

function isAdmin(sender) {
  const senderNum = sender.split("@")[0].split(":")[0];
  return senderNum === ADMIN_NUMBER;
}

function resolvePlayer(target, mentioned, quoted) {
  if (mentioned && mentioned.length > 0) return mentioned[0];
  if (quoted) return quoted;
  if (!target) return null;

  let cleaned = target.trim();
  if (cleaned.includes("@")) return cleaned;

  let phone = cleaned.replace(/[+\s\-@]/g, "");
  if (/^\d+$/.test(phone)) return `${phone}@s.whatsapp.net`;

  const byNickname = getUserByNickname(cleaned);
  if (byNickname) return byNickname.jid;

  return null;
}

export async function execute({ sender, args, reply, msg }) {
  if (!isAdmin(sender)) return; // diam jika bukan admin

  const quoted = msg?.message?.extendedTextMessage?.contextInfo?.participant;
  const mentioned = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid;

  let targetArg = null;
  let amountArg = null;

  if (quoted && args.length === 1) {
    amountArg = args[0];
  } else if (args.length >= 2) {
    amountArg = args[args.length - 1];
    targetArg = args.slice(0, -1).join(" ");
  }

  if (!amountArg) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN REMOVE\n${config.ui.line}\n\n` +
      `Format: *!remove <id/phone/nickname/@tag> <jumlah>*\n` +
      `Atau balas pesan target: *!remove <jumlah>*\n\n` +
      `Contoh:\n` +
      `!remove 6285158220582 5000\n` +
      `!remove @Adit 5000\n\n` +
      `${config.ui.line}`
    );
  }

  const amount = parseInt(amountArg, 10);
  if (isNaN(amount) || amount <= 0) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN REMOVE\n${config.ui.line}\n\n` +
      `❌ Jumlah harus angka positif!\n\n${config.ui.line}`
    );
  }

  const playerJid = resolvePlayer(targetArg, mentioned, quoted);
  if (!playerJid) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN REMOVE\n${config.ui.line}\n\n` +
      `❌ Player tidak ditemukan!\n\n${config.ui.line}`
    );
  }

  const targetUser = getUser(playerJid);
  if (!targetUser) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN REMOVE\n${config.ui.line}\n\n` +
      `❌ Player belum terdaftar!\n\n${config.ui.line}`
    );
  }

  const result = await subtractBalance(playerJid, amount, "ADMIN_REMOVE");
  const playerNum = playerJid.split("@")[0];

  if (!result.success) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN REMOVE\n${config.ui.line}\n\n` +
      `❌ Saldo player tidak cukup!\n` +
      `💰 Balance saat ini: ${config.currencySymbol}${result.balance.toLocaleString()}\n\n${config.ui.line}`
    );
  }

  return reply(
    `${config.ui.line}\n┃ 🔧 ADMIN REMOVE\n${config.ui.line}\n\n` +
    `✅ Berhasil mengurangi ${config.currencySymbol}${amount.toLocaleString()}\n\n` +
    `👤 Player: ${targetUser.nickname} (@${playerNum})\n` +
    `💰 Balance baru: ${config.currencySymbol}${result.balance.toLocaleString()}\n\n${config.ui.line}`
  );
}

export default { name, aliases, requiresRegistration, execute };