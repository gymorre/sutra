// commands/register.js

import { registerUser, isRegistered } from "../utils/economy.js";
import { config } from "../config.js";

export const name = "register";
export const aliases = [];
export const requiresRegistration = false;

export async function execute({ sock, msg, sender, args, reply }) {
  if (isRegistered(sender)) {
    return reply(
      `${config.ui.line}\n┃ ${config.botName} BOT\n${config.ui.line}\n\nKamu sudah terdaftar!\nGunakan !balance untuk melihat saldo kamu.\n\n${config.ui.line}`
    );
  }

  const nickname = args[0];

  if (!nickname) {
    return reply(
      `${config.ui.line}\n┃ REGISTER\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!register nickname\n\nContoh:\n!register AditGaming\n\n${config.ui.line}`
    );
  }

  // Validasi nickname: 3-20 karakter, huruf angka underscore
  const validPattern = /^[a-zA-Z0-9_]{3,20}$/;
  if (!validPattern.test(nickname)) {
    return reply(
      `${config.ui.line}\n┃ REGISTER\n${config.ui.line}\n\nNickname tidak valid!\n\nSyarat:\n- 3-20 karakter\n- Huruf, angka, underscore\n- Tidak boleh sama dengan user lain\n\n${config.ui.line}`
    );
  }

  const result = registerUser(sender, nickname);

  if (!result.success) {
    if (result.reason === "NICKNAME_TAKEN") {
      return reply(
        `${config.ui.line}\n┃ REGISTER\n${config.ui.line}\n\nNickname "${nickname}" sudah digunakan!\nSilakan pilih nickname lain.\n\n${config.ui.line}`
      );
    }
    if (result.reason === "ALREADY_REGISTERED") {
      return reply(
        `${config.ui.line}\n┃ REGISTER\n${config.ui.line}\n\nKamu sudah terdaftar!\n\n${config.ui.line}`
      );
    }
    return reply("Terjadi kesalahan saat registrasi. Silakan coba lagi.");
  }

  return reply(
    `${config.ui.line}\n┃ ${config.botName} BOT\n${config.ui.line}\n\n✅ Registrasi berhasil!\n\n👤 Nickname : ${nickname}\n💰 Balance  : ${config.currencySymbol}${config.startingBalance}\n\nSelamat bermain di ${config.botName}!\nGunakan !menu untuk melihat semua fitur.\n\n${config.ui.line}`
  );
}

export default { name, aliases, requiresRegistration, execute };
