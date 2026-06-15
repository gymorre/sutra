// commands/reward.js
// Menangani !hourly !daily !weekly !monthly

import { addBalance } from "../utils/economy.js";
import { checkCooldown, setCooldown, formatDuration } from "../utils/cooldown.js";
import { config } from "../config.js";

export const requiresRegistration = true;

// Setiap reward diexport sebagai command terpisah agar mudah didaftarkan di command handler
async function rewardExecute(type, { sender, reply }) {
  const rewardConfig = config.reward[type];

  const cooldownStatus = checkCooldown(sender, type, rewardConfig.cooldown);

  if (cooldownStatus.onCooldown) {
    return reply(
      `${config.ui.line}\n┃ ${type.toUpperCase()} REWARD\n${config.ui.line}\n\n⏳ Kamu sudah klaim reward ini.\nCoba lagi dalam: ${formatDuration(
        cooldownStatus.remaining
      )}\n\n${config.ui.line}`
    );
  }

  const newBalance = await addBalance(sender, rewardConfig.amount, `REWARD_${type.toUpperCase()}`);
  setCooldown(sender, type);

  return reply(
    `${config.ui.line}\n┃ ${type.toUpperCase()} REWARD\n${config.ui.line}\n\n✅ Berhasil klaim!\n💰 +${config.currencySymbol}${rewardConfig.amount}\n\n💵 Balance sekarang: ${config.currencySymbol}${newBalance}\n\n${config.ui.line}`
  );
}

export const hourly = {
  name: "hourly",
  aliases: [],
  requiresRegistration: true,
  execute: (ctx) => rewardExecute("hourly", ctx)
};

export const daily = {
  name: "daily",
  aliases: [],
  requiresRegistration: true,
  execute: (ctx) => rewardExecute("daily", ctx)
};

export const weekly = {
  name: "weekly",
  aliases: [],
  requiresRegistration: true,
  execute: (ctx) => rewardExecute("weekly", ctx)
};

export const monthly = {
  name: "monthly",
  aliases: [],
  requiresRegistration: true,
  execute: (ctx) => rewardExecute("monthly", ctx)
};

// Default export: array berisi semua reward command
export default [hourly, daily, weekly, monthly];
