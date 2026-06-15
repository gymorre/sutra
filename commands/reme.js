// commands/reme.js
// Game Reme - angka acak 0-36, 50/50 menang/kalah
// Flow baru: !reme -> set bet -> main solo. Jika mau duo/multiplayer, lewat !multiplayer.

import { subtractBalance, recordGameResult, addBalance, getUser, getUserByNickname } from "../utils/economy.js";
import { randomInt } from "../utils/random.js";
import { animateMessage, remeRollingFrames, sleep } from "../utils/animation.js";
import { gameStateManager } from "../utils/gameState.js";
import { config } from "../config.js";
import { startChallengeCountdown } from "./multiplayer.js";

export const name = "re";
export const aliases = ["reme"];
export const requiresRegistration = true;
export const isGasGame = false;

// ============================
// ENTRY (!reme atau !re)
// ============================

export async function execute({ sender, args, reply }) {
  const betArg = args[0];
  const bet = betArg ? parseInt(betArg, 10) : null;

  // Set state langsung ke IN_GAME dengan mode bot
  gameStateManager.setPlayerInGame(sender, "re");
  gameStateManager.setMode(sender, "bot");

  if (bet && bet > 0) {
    gameStateManager.updateGameData(sender, { bet });
    return playSingleplayer({ sender, bet, reply });
  }

  return reply(
    `${config.ui.line}\n┃ 🎲 GAME REME (SOLO vs BOT)\n${config.ui.line}\n\n` +
    `Reme adalah game angka acak 0-36 (50/50).\n\n` +
    `Set bet untuk main:\n!bet <jumlah>\n\natau langsung main:\n!g <jumlah>\n\n` +
    `Keluar: !back atau !menu\n\n${config.ui.line}`
  );
}

// ============================
// PLAY WITH MODE (Dipanggil via Multiplayer/Lobby)
// ============================

export async function playWithMode({ sender, args, reply, mode }) {
  const playerState = gameStateManager.getPlayerState(sender);
  let bet = args[0] ? parseInt(args[0], 10) : playerState?.data?.bet;

  if (!bet || isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\n\nContoh: !bet 300\n\n${config.ui.line}`
    );
  }

  if (mode === "bot") {
    gameStateManager.setMode(sender, "bot");
    gameStateManager.updateGameData(sender, { bet });
    return playSingleplayer({ sender, bet, reply });
  }

  // Multiplayer - minta tag lawan
  gameStateManager.setMultiplayerMode(sender, "re", null);
  gameStateManager.updateGameData(sender, { bet });

  return reply(
    `${config.ui.line}\n┃ 🎲 GAME REME - MULTIPLAYER\n${config.ui.line}\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet}\n\n` +
    `Tag lawanmu:\n!tag @lawan\n\natau nickname:\n!tag nama_lawan\n\n` +
    `${config.ui.line}`
  );
}

// ============================
// HANDLE GAME COMMANDS (!g, !bet, !gas)
// ============================

export async function handleGameCommand({ sender, args, reply, command }) {
  const playerState = gameStateManager.getPlayerState(sender);

  if (command === "bet") {
    const bet = args[0] ? parseInt(args[0], 10) : null;
    if (!bet || bet <= 0) {
      return reply(
        `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\nFormat salah!\n\nGunakan: !bet <jumlah>\n\n${config.ui.line}`
      );
    }

    gameStateManager.updateGameData(sender, { bet });
    return reply(
      `${config.ui.line}\n✅ Bet tersimpan!\n\n💰 ${config.currencySymbol}${bet}\n\nMain sekarang: !g\n\n${config.ui.line}`
    );
  }

  if (command === "g" || command === "gas") {
    const bet = args[0] ? parseInt(args[0], 10) : playerState?.data?.bet;

    if (!bet || bet <= 0) {
      return reply(
        `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\natau: !g <jumlah>\n\n${config.ui.line}`
      );
    }

    if (args[0]) gameStateManager.updateGameData(sender, { bet });

    const mode = gameStateManager.getMode(sender);

    if (mode === "multiplayer") {
      const opponent = gameStateManager.getOpponent(sender);
      if (!opponent) {
        return reply(
          `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\nTag lawan dulu:\n!tag @lawan\n\n${config.ui.line}`
        );
      }
      return playMultiplayer({ sender, bet, reply, opponent });
    }

    return playSingleplayer({ sender, bet, reply });
  }
}

// ============================
// START MULTIPLAYER (setelah !tag)
// ============================

export async function startMultiplayer({ sock, msg, sender, reply, jid, opponent, sendTo }) {
  const playerState = gameStateManager.getPlayerState(sender);
  const bet = playerState?.data?.bet;

  if (!bet) {
    return reply(
      `${config.ui.line}\n❌ Bet tidak ditemukan!\n\nCoba: !bet <jumlah>\n\n${config.ui.line}`
    );
  }

  let opponentJid = opponent;
  let opponentUser = getUser(opponentJid);
  if (!opponentUser) {
    opponentUser = getUserByNickname(opponent);
    if (opponentUser) opponentJid = opponentUser.jid;
  }

  if (!opponentUser) {
    return reply(
      `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\nLawan tidak ditemukan atau belum register.\n\n${config.ui.line}`
    );
  }

  if (opponentJid === sender) {
    return reply(
      `${config.ui.line}\n🎲 GAME REME\n${config.ui.line}\n\nKamu tidak bisa melawan diri sendiri!\n\n${config.ui.line}`
    );
  }

  if (gameStateManager.isPlayerInGame(opponentJid)) {
    return reply(
      `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\n@${opponentJid.split("@")[0]} sedang dalam game lain!\n\n${config.ui.line}`,
      [opponentJid]
    );
  }

  return startChallengeCountdown({ sock, jid, sender, opponentJid, gameCode: "re", bet, sendTo });
}

// ============================
// ACCEPT INVITE
// ============================

export async function handleInviteAccepted({ sock, msg, sender, reply, jid, sendTo, invite }) {
  const { from, bet } = invite;

  const deduct1 = await subtractBalance(from, bet, "BET_REME_MP");
  if (!deduct1.success) {
    gameStateManager.clearPlayerState(from);
    return reply(
      `${config.ui.line}\n❌ Saldo @${from.split("@")[0]} tidak cukup!\n\nGame dibatalkan.\n\n${config.ui.line}`,
      [from]
    );
  }

  const deduct2 = await subtractBalance(sender, bet, "BET_REME_MP");
  if (!deduct2.success) {
    await addBalance(from, bet, "REFUND_REME_MP");
    gameStateManager.clearPlayerState(from);
    return reply(
      `${config.ui.line}\n❌ Saldo kamu tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduct2.balance}\n\nGame dibatalkan.\n\n${config.ui.line}`
    );
  }

  const fromNum = from.split("@")[0];
  const toNum = sender.split("@")[0];

  // Set state both players to IN_GAME
  gameStateManager.setPlayerInGame(from, "re");
  gameStateManager.setMode(from, "multiplayer");
  gameStateManager.setOpponent(from, sender);

  gameStateManager.setPlayerInGame(sender, "re");
  gameStateManager.setMode(sender, "multiplayer");
  gameStateManager.setOpponent(sender, from);

  // === ANIMASI MULTIPLAYER START ===
  const header = `${config.ui.line}\n┃ 🎲 REME MULTIPLAYER\n${config.ui.line}`;
  const startInfo = `👤 @${fromNum} vs 👤 @${toNum}\n💰 Bet: ${config.currencySymbol}${bet} masing-masing`;
  
  const startFrames = [
    `${header}\n\n${startInfo}\n\n⚔️ Mempersiapkan arena...\n\n3️⃣`,
    `${header}\n\n${startInfo}\n\n⚔️ Bersiap...\n\n2️⃣`,
    `${header}\n\n${startInfo}\n\n⚔️ MULAI!\n\n1️⃣ 🎲`,
  ];

  await animateMessage(sock, jid, startFrames, 800, msg);
  await sleep(600);

  // === ANIMASI ROLLING ===
  const rollingFrames = remeRollingFrames(header, "");
  await animateMessage(sock, jid, rollingFrames.slice(0, 5), 600);
  await sleep(400);

  const p1Number = randomInt(0, 36);
  const p2Number = randomInt(0, 36);
  const senderWon = Math.random() < 0.5;

  let resultText;
  if (senderWon) {
    await addBalance(sender, bet * 2, "WIN_REME_MP");
    await recordGameResult(sender, true, 0, "GAME_REME_MP");
    await recordGameResult(from, false, 0, "GAME_REME_MP");
    resultText =
      `🎲 @${fromNum}: ${p1Number}\n` +
      `🎲 @${toNum}: ${p2Number}\n\n` +
      `🎊🎉🎊\n` +
      `🏆 @${toNum} MENANG!\n` +
      `💰 +${config.currencySymbol}${bet * 2}\n\n` +
      `💸 @${fromNum} kalah -${config.currencySymbol}${bet}`;
  } else {
    await addBalance(from, bet * 2, "WIN_REME_MP");
    await recordGameResult(from, true, 0, "GAME_REME_MP");
    await recordGameResult(sender, false, 0, "GAME_REME_MP");
    resultText =
      `🎲 @${fromNum}: ${p1Number}\n` +
      `🎲 @${toNum}: ${p2Number}\n\n` +
      `🎊🎉🎊\n` +
      `🏆 @${fromNum} MENANG!\n` +
      `💰 +${config.currencySymbol}${bet * 2}\n\n` +
      `💸 @${toNum} kalah -${config.currencySymbol}${bet}`;
  }

  // Lock state to FINISHED instead of clearing
  gameStateManager.setFinished(from);
  gameStateManager.setFinished(sender);

  await sendTo(
    jid,
    `@${fromNum} @${toNum}\n${config.ui.line}\n┃ 🎲 HASIL REME\n${config.ui.line}\n\n${resultText}\n\n` +
    `Gunakan !back atau !menu untuk keluar dari meja.\n\n` +
    `${config.ui.line}`,
    [from, sender]
  );
}

// ============================
// SINGLEPLAYER
// ============================

async function playSingleplayer({ sender, bet, reply }) {
  const deduction = await subtractBalance(sender, bet, "BET_REME");
  if (!deduction.success) {
    gameStateManager.setFinished(sender);
    return reply(
      `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\n❌ Saldo tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduction.balance}\n\n${config.ui.line}`
    );
  }

  const finalNumber = randomInt(0, 36);
  const botNumber = randomInt(0, 36);
  const won = Math.random() < 0.5;
  const payout = won ? bet * 2 : 0;

  await reply(
    `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\n` +
    `🎰 Rolling...\n\n⏳ ███░░░░░░░ 30%`
  );

  await sleep(800);

  const resultEmoji = won ? "✅" : "❌";
  const resultLabel = won ? "MENANG!" : "KALAH!";
  const resultIcon = won ? "🎊🎉🎊" : "😢💔";
  const moneyLine = won
    ? `💰 +${config.currencySymbol}${payout}`
    : `💸 -${config.currencySymbol}${bet}`;

  const newBalance = await recordGameResult(sender, won, payout, "GAME_REME");
  
  // Lock state to FINISHED
  gameStateManager.setFinished(sender);

  return reply(
    `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\n` +
    `${resultIcon}\n\n` +
    `${resultEmoji} *${resultLabel}*\n\n` +
    `🎲 Kamu: ${finalNumber}\n` +
    `🤖 Bot: ${botNumber}\n\n` +
    `${moneyLine}\n\n` +
    `💵 Balance: ${config.currencySymbol}${newBalance}\n\n` +
    `Gunakan !back atau !menu untuk keluar dari meja.\n\n` +
    `${config.ui.line}`
  );
}

// ============================
// MULTIPLAYER (langsung main)
// ============================

async function playMultiplayer({ sender, bet, reply, opponent }) {
  const opponentUser = getUser(opponent);
  if (!opponentUser) {
    gameStateManager.setFinished(sender);
    return reply(
      `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\nOpponent tidak ditemukan.\n\n${config.ui.line}`
    );
  }

  const deduction1 = await subtractBalance(sender, bet, "BET_REME_MP");
  if (!deduction1.success) {
    gameStateManager.setFinished(sender);
    return reply(
      `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\n❌ Saldo kamu tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduction1.balance}\n\n${config.ui.line}`
    );
  }

  const deduction2 = await subtractBalance(opponent, bet, "BET_REME_MP");
  if (!deduction2.success) {
    await addBalance(sender, bet, "REFUND_REME_MP");
    gameStateManager.setFinished(sender);
    return reply(
      `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\n❌ Saldo lawan tidak cukup!\n\n${config.ui.line}`
    );
  }

  await reply(
    `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\n` +
    `🎰 Rolling...\n⏳ ███░░░░░░░`
  );
  await sleep(1000);

  const p1Number = randomInt(0, 36);
  const p2Number = randomInt(0, 36);
  const senderWon = Math.random() < 0.5;

  let resultText;
  const oppNum = opponent.split("@")[0];

  if (senderWon) {
    await addBalance(sender, bet * 2, "WIN_REME_MP");
    await recordGameResult(sender, true, 0, "GAME_REME_MP");
    await recordGameResult(opponent, false, 0, "GAME_REME_MP");
    resultText = `🎊🎉🎊\n\n✅ *MENANG!*\n\n🎲 Kamu: ${p1Number}\n🎲 @${oppNum}: ${p2Number}\n\n💰 +${config.currencySymbol}${bet * 2}`;
  } else {
    await addBalance(opponent, bet * 2, "WIN_REME_MP");
    await recordGameResult(sender, false, 0, "GAME_REME_MP");
    await recordGameResult(opponent, true, 0, "GAME_REME_MP");
    resultText = `😢💔\n\n❌ *KALAH!*\n\n🎲 Kamu: ${p1Number}\n🎲 @${oppNum}: ${p2Number}\n\n💸 -${config.currencySymbol}${bet}`;
  }

  gameStateManager.setFinished(sender);
  gameStateManager.setFinished(opponent);

  const senderUser = getUser(sender);
  const newBalance = senderUser?.balance || 0;

  return reply(
    `${config.ui.line}\n┃ 🎲 GAME REME\n${config.ui.line}\n\n${resultText}\n\n` +
    `💵 Balance: ${config.currencySymbol}${newBalance}\n\n` +
    `Gunakan !back atau !menu untuk keluar.\n\n` +
    `${config.ui.line}`,
    [opponent]
  );
}

export default {
  name, aliases, requiresRegistration, isGasGame,
  execute, playWithMode, handleGameCommand, startMultiplayer, handleInviteAccepted
};
