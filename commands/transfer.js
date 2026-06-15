// commands/transfer.js
// Transfer virtual balance to another player

import { subtractBalance, addBalance, getUser, getUserByNickname, isRegistered } from "../utils/economy.js";
import { config } from "../config.js";

export const name = "transfer";
export const aliases = ["tf"];
export const requiresRegistration = true;

export async function execute({ sock, msg, sender, args, reply }) {
  // Parsing target JID dari tag, mention, atau nickname
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  
  let targetJid = null;
  let amountArg = null;

  if (mentioned && mentioned.length > 0) {
    targetJid = mentioned[0];
    amountArg = args[1]; // e.g. !tf @player 1000 -> args[0] is mention, args[1] is amount
  } else if (quoted) {
    targetJid = quoted;
    amountArg = args[0]; // e.g. !tf 1000 (replying to target)
  } else if (args.length >= 2) {
    // Cari nickname
    const nickname = args[0];
    const opponentUser = getUserByNickname(nickname);
    if (opponentUser) {
      targetJid = opponentUser.jid;
    }
    amountArg = args[1];
  }

  if (!targetJid) {
    return reply(
      `${config.ui.line}\n┃ 💱 TRANSFER SALDO\n${config.ui.line}\n\n` +
      `Format transfer salah!\n\n` +
      `Gunakan:\n` +
      `• !tf @mention <jumlah>\n` +
      `• !tf <nickname> <jumlah>\n` +
      `• Balas pesan target dan ketik !tf <jumlah>\n\n` +
      `Contoh:\n` +
      `!tf @Adit 5000\n` +
      `!tf AditGaming 5000\n\n` +
      `${config.ui.line}`
    );
  }

  const amount = parseInt(amountArg, 10);
  if (isNaN(amount) || amount <= 0) {
    return reply(
      `${config.ui.line}\n❌ Jumlah transfer harus berupa angka positif!\n\nContoh: !tf @Adit 5000\n${config.ui.line}`
    );
  }

  if (targetJid === sender) {
    return reply(
      `${config.ui.line}\n❌ Kamu tidak bisa men-transfer ke diri sendiri!\n${config.ui.line}`
    );
  }

  if (!isRegistered(targetJid)) {
    return reply(
      `${config.ui.line}\n❌ Penerima transfer belum terdaftar atau tidak ditemukan!\n${config.ui.line}`
    );
  }

  const senderUser = getUser(sender);
  const targetUser = getUser(targetJid);

  if (senderUser.balance < amount) {
    return reply(
      `${config.ui.line}\n❌ Saldo kamu tidak cukup!\n💰 Balance: ${config.currencySymbol}${senderUser.balance}\n${config.ui.line}`
    );
  }

  // Lakukan transfer
  const deduct = await subtractBalance(sender, amount, `TRANSFER_TO_${targetJid.split("@")[0]}`);
  if (!deduct.success) {
    return reply(
      `${config.ui.line}\n❌ Gagal memotong saldo pengirim.\n${config.ui.line}`
    );
  }

  const add = await addBalance(targetJid, amount, `TRANSFER_FROM_${sender.split("@")[0]}`);

  const senderNum = sender.split("@")[0];
  const targetNum = targetJid.split("@")[0];

  return reply(
    `${config.ui.line}\n┃ 💸 TRANSFER BERHASIL!\n${config.ui.line}\n\n` +
    `👤 Pengirim: @${senderNum} (${senderUser.nickname})\n` +
    `👤 Penerima: @${targetNum} (${targetUser.nickname})\n` +
    `💰 Nominal: ${config.currencySymbol}${amount}\n\n` +
    `💵 Sisa Saldo Kamu: ${config.currencySymbol}${deduct.balance}\n\n` +
    `Terima kasih telah bertransaksi secara jujur! 😉\n` +
    `${config.ui.line}`,
    [targetJid]
  );
}

export default { name, aliases, requiresRegistration, execute };
