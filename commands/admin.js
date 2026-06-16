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
function resolvePlayer(target, mentioned) {
  // Check if there's a mentioned JID
  if (mentioned && mentioned.length > 0) {
    return mentioned[0];
  }

  // Try as phone number (strip + and spaces)
  let cleaned = target.replace(/[+\s\-]/g, "");
  if (/^\d+$/.test(cleaned)) {
    const jid = `${cleaned}@s.whatsapp.net`;
    const user = getUser(jid);
    if (user) return jid;
  }

  // Try as nickname
  const byNickname = getUserByNickname(target);
  if (byNickname) return byNickname.jid;

  return null;
}

/**
 * Handle !give command
 */
export async function handleGive({ sender, args, reply, msg }) {
  if (!isAdmin(sender)) return;

  if (args.length < 2) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n` +
      `Format: !give <player> <jumlah>\n\nContoh:\n!give @player 5000\n!give 6281234567890 5000\n!give nickname 5000\n\n${config.ui.line}`
    );
  }

  const amount = parseInt(args[args.length - 1], 10);
  if (isNaN(amount) || amount <= 0) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n❌ Jumlah harus angka positif!\n\n${config.ui.line}`
    );
  }

  const targetArg = args.slice(0, -1).join(" ").replace(/@/g, "");
  const mentioned = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const playerJid = resolvePlayer(targetArg, mentioned);

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

  if (args.length < 2) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n` +
      `Format: !remove <player> <jumlah>\n\nContoh:\n!remove @player 5000\n!remove 6281234567890 5000\n!remove nickname 5000\n\n${config.ui.line}`
    );
  }

  const amount = parseInt(args[args.length - 1], 10);
  if (isNaN(amount) || amount <= 0) {
    return reply(
      `${config.ui.line}\n┃ 🔧 ADMIN\n${config.ui.line}\n\n❌ Jumlah harus angka positif!\n\n${config.ui.line}`
    );
  }

  const targetArg = args.slice(0, -1).join(" ").replace(/@/g, "");
  const mentioned = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const playerJid = resolvePlayer(targetArg, mentioned);

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
