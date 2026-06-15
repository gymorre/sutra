// commands/flipcoin.js
// Game tebak HEAD/TAIL

import { subtractBalance, recordGameResult } from "../utils/economy.js";
import { randomChoice } from "../utils/random.js";
import { animateMessage } from "../utils/animation.js";
import { config } from "../config.js";

export const name = "flipcoin";
export const aliases = ["fp"];
export const requiresRegistration = true;
export const isGasGame = true;

export async function execute({ sock, msg, sender, args, reply, jid }) {
  // Format: !flipcoin <bet> <head|tail>  ATAU  !flipcoin <head|tail> <bet>
  let bet = null;
  let choice = null;

  for (const arg of args) {
    const lower = arg.toLowerCase();
    if (lower === "head" || lower === "tail" || lower === "h" || lower === "t") {
      choice = lower.startsWith("h") ? "head" : "tail";
    } else if (!isNaN(parseInt(arg, 10))) {
      bet = parseInt(arg, 10);
    }
  }

  if (!bet || bet <= 0 || !choice) {
    return reply(
      `${config.ui.line}\n┃ FLIPCOIN\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!flipcoin <bet> <head|tail>\natau\n!fp <bet> <head|tail>\n\nContoh:\n!fp 100 head\n\n${config.ui.line}`
    );
  }

  const deduction = await subtractBalance(sender, bet, "BET_FLIPCOIN");
  if (!deduction.success) {
    return reply(
      `${config.ui.line}\n┃ FLIPCOIN\n${config.ui.line}\n\n❌ Saldo tidak cukup!\n💰 Balance kamu: ${config.currencySymbol}${deduction.balance}\n\n${config.ui.line}`
    );
  }

  const result = randomChoice(["head", "tail"]);

  const frames = [
    `🪙\n\nFlipping...`,
    `🪙\n\nFlipping...\nFlipping...`,
    `🪙\n\nFlipping...\nFlipping...\n\n${result.toUpperCase()}`
  ];

  await animateMessage(sock, jid, frames, 800, msg);

  let resultText;
  let payout;
  let won;

  if (choice === result) {
    payout = bet * 2;
    won = true;
    resultText = `✅ *MENANG!*\n\nPilihan kamu: ${choice.toUpperCase()}\nHasil: ${result.toUpperCase()}\n\n💰 +${config.currencySymbol}${payout}`;
  } else {
    payout = 0;
    won = false;
    resultText = `❌ *KALAH!*\n\nPilihan kamu: ${choice.toUpperCase()}\nHasil: ${result.toUpperCase()}\n\n💸 -${config.currencySymbol}${bet}`;
  }

  const newBalance = await recordGameResult(
    sender,
    won,
    payout,
    "GAME_FLIPCOIN"
  );

  await reply(
    `${resultText}\n\n💵 Balance sekarang: ${config.currencySymbol}${newBalance}`
  );
}

export default { name, aliases, requiresRegistration, isGasGame, execute };
