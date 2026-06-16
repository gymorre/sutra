// commands/admin.js
// Hidden admin commands - only accessible by authorized number
// !give {@player/nomor/tag} <money> - Add money to player
// !remove {@player/nomor/tag} <money> - Remove money from player

import { addBalance, subtractBalance, getUser, getUserByNickname } from "../utils/economy.js";
import { config } from "../config.js";

// Admin JID - only this number can use admin commands
const ADMIN_JID = "6285158220582@s.whatsapp.net";

export const name = "admin";
export const aliases = [];
export const requiresRegistration = false;

/**
 * Check if sender is the authorized admin
 */
export function isAdmin(sender) {
  return sender === ADMIN_JID;
}

/**
 * Resolve a player target to their JID
 * Accepts: @mention, phone number, nickname
 */
/**
 * Resolve a player target to their JID
 * Accepts: @mention, phone number, JID, nickname, quoted participant
 */
function resolvePlayer(target, mentioned, quoted) {
  // Check if there's a mentioned JID
  if (mentioned && mentioned.length > 0) {
    return mentioned[0];
  }

  // Check if there's a quoted participant
  if (quoted) {
    return quoted;
  }

  if (!target) return null;

  let cleaned = target.trim();

  // If it's already a full JID (contains @)
  if (cleaned.includes("@")) {
    return cleaned;
  }

  // Try as phone number (strip +, spaces, -, @)
  let phone = cleaned.replace(/[+\s\-@]/g, "");
  if (/^\d+$/.test(phone)) {
    return `${phone}@s.whatsapp.net`;
  }

  // Try as nickname
  const byNickname = getUserByNickname(cleaned);
  if (byNickname) return byNickname.jid;

  return null;
}

/**
 * Handle !give command
 */
export async function handleGive({ sender, args, reply, msg }) {
  if (!isAdmin(sender)) return;

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
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n` +
      `Format salah!\n\n` +
      `Gunakan:\n` +
      `• !give <id/phone/nickname/@tag> <jumlah>\n` +
      `• Balas pesan target dan ketik !give <jumlah>\n\n` +
      `Contoh:\n` +
      `!give 6285158220582 5000\n` +
      `!give @Adit 5000\n` +
      `!give AditGaming 5000\n\n` +
      `${config.ui.line}`
    );
  }

  const amount = parseInt(amountArg, 10);
  if (isNaN(amount) || amount <= 0) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n❌ Jumlah harus angka positif!\n\n${config.ui.line}`
    );
  }

  const playerJid = resolvePlayer(targetArg, mentioned, quoted);

  if (!playerJid) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n❌ Player tidak ditemukan!\n\n${config.ui.line}`
    );
  }

  const targetUser = getUser(playerJid);
  if (!targetUser) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n❌ Player belum terdaftar!\n\n${config.ui.line}`
    );
  }

  const newBalance = await addBalance(playerJid, amount, "ADMIN_GIVE");
  const playerNum = playerJid.split("@")[0];

  return reply(
    `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n` +
    `✅ Berhasil menambahkan ${config.currencySymbol}${amount}\n\n` +
    `👤 Player: ${targetUser.nickname} (@${playerNum})\n` +
    `💰 Balance baru: ${config.currencySymbol}${newBalance}\n\n${config.ui.line}`,
    [playerJid]
  );
}

/**
 * Handle !remove command
 */
export async function handleRemove({ sender, args, reply, msg }) {
  if (!isAdmin(sender)) return;

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
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n` +
      `Format salah!\n\n` +
      `Gunakan:\n` +
      `• !remove <id/phone/nickname/@tag> <jumlah>\n` +
      `• Balas pesan target dan ketik !remove <jumlah>\n\n` +
      `Contoh:\n` +
      `!remove 6285158220582 5000\n` +
      `!remove @Adit 5000\n` +
      `!remove AditGaming 5000\n\n` +
      `${config.ui.line}`
    );
  }

  const amount = parseInt(amountArg, 10);
  if (isNaN(amount) || amount <= 0) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n❌ Jumlah harus angka positif!\n\n${config.ui.line}`
    );
  }

  const playerJid = resolvePlayer(targetArg, mentioned, quoted);

  if (!playerJid) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n❌ Player tidak ditemukan!\n\n${config.ui.line}`
    );
  }

  const targetUser = getUser(playerJid);
  if (!targetUser) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n❌ Player belum terdaftar!\n\n${config.ui.line}`
    );
  }

  const result = await subtractBalance(playerJid, amount, "ADMIN_REMOVE");
  const playerNum = playerJid.split("@")[0];

  if (!result.success) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n` +
      `❌ Saldo player tidak cukup!\n` +
      `💰 Balance saat ini: ${config.currencySymbol}${result.balance}\n\n${config.ui.line}`
    );
  }

  return reply(
    `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n` +
    `✅ Berhasil mengurangi ${config.currencySymbol}${amount}\n\n` +
    `👤 Player: ${targetUser.nickname} (@${playerNum})\n` +
    `💰 Balance baru: ${config.currencySymbol}${result.balance}\n\n${config.ui.line}`,
    [playerJid]
  );
}

export default { name, aliases, requiresRegistration, isAdmin, handleGive, handleRemove };
