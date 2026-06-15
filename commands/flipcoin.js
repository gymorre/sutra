// commands/flipcoin.js
// Game tebak HEAD/TAIL
// Flow baru: !fp → !bet → !g head/tail

import { subtractBalance, recordGameResult, addBalance, getUser } from "../utils/economy.js";
import { randomChoice } from "../utils/random.js";
import { gameStateManager } from "../utils/gameState.js";
import { config } from "../config.js";
import { animateMessage, sleep } from "../utils/animation.js";

export const name = "flipcoin";
export const aliases = ["fp", "flip"];
export const requiresRegistration = true;
export const isGasGame = false;

// ============================
// ENTRY (!flipcoin / !fp)
// ============================

export async function execute({ sender, args, reply }) {
  const betArg = args[0];
  const bet = betArg && !isNaN(parseInt(betArg)) ? parseInt(betArg, 10) : null;

  // Set state langsung ke IN_GAME dengan mode bot
  gameStateManager.setPlayerInGame(sender, "flipcoin");
  gameStateManager.setMode(sender, "bot");

  if (bet && bet > 0) {
    gameStateManager.updateGameData(sender, { bet });
    return reply(
      `${config.ui.line}\n┃ 🪙 FLIPCOIN (SOLO vs BOT)\n${config.ui.line}\n\n` +
      `💰 Bet: ${config.currencySymbol}${bet}\n\nPilih sisi koin:\nhead\ntail\n\nKeluar: !back\n\n${config.ui.line}`
    );
  }

  return reply(
    `${config.ui.line}\n┃ 🪙 FLIPCOIN (SOLO vs BOT)\n${config.ui.line}\n\n` +
    `Tebak hasil lemparan koin!\n\n🪙 Sisi: HEAD atau TAIL?\n\n` +
    `Set bet untuk main:\n!bet <jumlah>\n\nLangsung main:\n!g <jumlah> head\natau\n!g <jumlah> tail\n\nKeluar: !back atau !menu\n\n${config.ui.line}`
  );
}

// ============================
// PLAY WITH MODE
// ============================

export async function playWithMode({ sender, args, reply, mode }) {
  const playerState = gameStateManager.getPlayerState(sender);
  let bet = args[0] && !isNaN(parseInt(args[0])) ? parseInt(args[0], 10) : playerState?.data?.bet;

  if (!bet || isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\n\n${config.ui.line}`
    );
  }

  if (mode === "multiplayer") {
    return reply(
      `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\nFlipcoin hanya bisa dimainkan vs Bot.\n\n${config.ui.line}`
    );
  }

  gameStateManager.setMode(sender, "bot");
  gameStateManager.updateGameData(sender, { bet });
  return reply(
    `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet}\n\nPilih sisi koin:\nhead\ntail\n\nKeluar: !back\n\n${config.ui.line}`
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
        `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\nFormat salah!\n\nGunakan: !bet <jumlah>\n\n${config.ui.line}`
      );
    }
    gameStateManager.updateGameData(sender, { bet });
    return reply(
      `${config.ui.line}\n✅ Bet tersimpan!\n\n💰 ${config.currencySymbol}${bet}\n\nPilih sisi:\n!g head\n!g tail\n\n${config.ui.line}`
    );
  }

  if (command === "g" || command === "gas") {
    // Format: !g <bet> <head|tail>  atau  !g <head|tail>
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

    // Ambil bet dari state jika tidak ada di args
    if (!bet) bet = playerState?.data?.bet;
    if (bet) gameStateManager.updateGameData(sender, { bet });

    if (!bet || bet <= 0) {
      return reply(
        `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\natau: !g <bet> <head|tail>\n\n${config.ui.line}`
      );
    }

    if (!choice) {
      return reply(
        `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\nPilih sisi koin!\n\n!g head\n!g tail\n\n${config.ui.line}`
      );
    }

    const mode = gameStateManager.getMode(sender);

    if (mode === "multiplayer") {
      const opponent = gameStateManager.getOpponent(sender);
      if (!opponent) {
        return reply(
          `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\nTag lawan dulu:\n!tag @lawan\n\n${config.ui.line}`
        );
      }
      return playMultiplayer({ sender, bet, choice, reply, opponent });
    }

    return playSingleplayer({ sender, bet, choice, reply });
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

  const opponentUser = getUser(opponent);
  if (!opponentUser) {
    return reply(
      `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\nLawan tidak ditemukan atau belum register.\n\n${config.ui.line}`
    );
  }

  if (opponent === sender) {
    return reply(
      `${config.ui.line}\n🪙 FLIPCOIN\n${config.ui.line}\n\nKamu tidak bisa melawan diri sendiri!\n\n${config.ui.line}`
    );
  }

  if (gameStateManager.isPlayerInGame(opponent)) {
    return reply(
      `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n@${opponent.split("@")[0]} sedang dalam game lain!\n\n${config.ui.line}`,
      [opponent]
    );
  }

  // Buat invite
  const inviteId = gameStateManager.createInvite(sender, opponent, "flipcoin", bet, jid);

  const senderNum = sender.split("@")[0];
  const oppNum = opponent.split("@")[0];

  await sendTo(
    jid,
    `@${oppNum}\n${config.ui.line}\n┃ 🪙 UNDANGAN FLIPCOIN\n${config.ui.line}\n\n` +
    `@${senderNum} mengajakmu bermain Flipcoin!\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet} masing-masing\n\n` +
    `Jawab:\n✅ !accept\n❌ !decline\n\n⏰ Berlaku 2 menit\n\n${config.ui.line}`,
    [opponent, sender]
  );

  return reply(
    `${config.ui.line}\n┃ 🪙 FLIPCOIN - MULTIPLAYER\n${config.ui.line}\n\n` +
    `📨 Undangan dikirim ke @${oppNum}!\n\nMenunggu jawaban...\n\n${config.ui.line}`,
    [opponent]
  );
}

// ============================
// ACCEPT INVITE
// ============================

export async function handleInviteAccepted({ sock, msg, sender, reply, jid, sendTo, invite }) {
  const { from, bet } = invite;

  const deduct1 = await subtractBalance(from, bet, "BET_FLIP_MP");
  if (!deduct1.success) {
    gameStateManager.clearPlayerState(from);
    return reply(
      `${config.ui.line}\n❌ Saldo @${from.split("@")[0]} tidak cukup!\n\nGame dibatalkan.\n\n${config.ui.line}`,
      [from]
    );
  }

  const deduct2 = await subtractBalance(sender, bet, "BET_FLIP_MP");
  if (!deduct2.success) {
    await addBalance(from, bet, "REFUND_FLIP_MP");
    gameStateManager.clearPlayerState(from);
    return reply(
      `${config.ui.line}\n❌ Saldo kamu tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduct2.balance}\n\nGame dibatalkan.\n\n${config.ui.line}`
    );
  }

  const fromNum = from.split("@")[0];
  const toNum = sender.split("@")[0];

  // Keduanya harus pilih head/tail - minta pilihan
  gameStateManager.setMode(from, "multiplayer");
  gameStateManager.setOpponent(from, sender);
  gameStateManager.updateGameData(from, { bet, waitingChoice: true });

  gameStateManager.setModeSelection(sender, "flipcoin");
  gameStateManager.setMode(sender, "multiplayer");
  gameStateManager.setOpponent(sender, from);
  gameStateManager.updateGameData(sender, { bet, waitingChoice: true });

  await sendTo(
    jid,
    `@${fromNum} @${toNum}\n${config.ui.line}\n┃ 🪙 FLIPCOIN MULTIPLAYER DIMULAI!\n${config.ui.line}\n\n` +
    `⚔️ VERSUS!\n\n` +
    `👤 Player 1: @${fromNum}\n👤 Player 2: @${toNum}\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet} masing-masing\n\n` +
    `Keduanya, pilih sisi koin:\n!g head\n!g tail\n\nKeluar: !back\n\n${config.ui.line}`,
    [from, sender]
  );
}

// ============================
// SINGLEPLAYER
// ============================

async function playSingleplayer({ sender, bet, choice, reply }) {
  const deduction = await subtractBalance(sender, bet, "BET_FLIPCOIN");
  if (!deduction.success) {
    return reply(
      `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n❌ Saldo tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduction.balance}\n\n${config.ui.line}`
    );
  }

  const choiceEmoji = choice === "head" ? "👑" : "🦅";

  // === ANIMASI COIN FLIP ===
  await reply(
    `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n` +
    `${choiceEmoji} Pilihan: *${choice.toUpperCase()}*\n\n` +
    `🪙 Melempar koin ke udara...\n\n` +
    `      🪙\n` +
    `      ↑↑↑`
  );
  await sleep(700);

  await reply(
    `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n` +
    `🌀 Koin berputar...\n\n` +
    `    ✨ 🪙 ✨\n` +
    `    ~ ~ ~ ~`
  );
  await sleep(700);

  await reply(
    `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n` +
    `⬇️ Koin turun...\n\n` +
    `      🪙\n` +
    `      ↓↓↓`
  );
  await sleep(500);

  const result = randomChoice(["head", "tail"]);
  const won = choice === result;
  const payout = won ? bet * 2 : 0;
  const resultEmoji = result === "head" ? "👑 HEAD" : "🦅 TAIL";

  const winLoseEmoji = won ? "🎊🎉🎊" : "😢💔";
  const resultLabel = won ? "MENANG!" : "KALAH!";
  const resultIcon = won ? "✅" : "❌";
  const moneyLine = won
    ? `💰 +${config.currencySymbol}${payout}`
    : `💸 -${config.currencySymbol}${bet}`;

  const newBalance = await recordGameResult(sender, won, payout, "GAME_FLIPCOIN");
  gameStateManager.setFinished(sender);

  return reply(
    `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n` +
    `🖐️ TANGKAP!\n\n` +
    `🪙 Hasil: *${resultEmoji}*\n\n` +
    `${winLoseEmoji}\n\n` +
    `${resultIcon} *${resultLabel}*\n\n` +
    `${choiceEmoji} Pilihan: ${choice.toUpperCase()}\n` +
    `🪙 Hasil: ${result.toUpperCase()}\n\n` +
    `${moneyLine}\n` +
    `💵 Balance: ${config.currencySymbol}${newBalance}\n\n` +
    `Gunakan !back atau !menu untuk keluar.\n\n${config.ui.line}`
  );
}

// ============================
// MULTIPLAYER
// ============================

async function playMultiplayer({ sender, bet, choice, reply, opponent }) {
  const playerState = gameStateManager.getPlayerState(sender);

  // Simpan pilihan sender
  gameStateManager.updateGameData(sender, { choice });

  // Cek pilihan opponent
  const opponentState = gameStateManager.getPlayerState(opponent);
  const opponentChoice = opponentState?.data?.choice;

  if (!opponentChoice) {
    const choiceEmoji = choice === "head" ? "👑" : "🦅";
    return reply(
      `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n` +
      `${choiceEmoji} Pilihanmu: *${choice.toUpperCase()}* ✅\n\n` +
      `⏳ Menunggu lawan memilih...\n\n${config.ui.line}`,
      [opponent]
    );
  }

  // === ANIMASI FLIP MULTIPLAYER ===
  await reply(
    `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n` +
    `🪙 Melempar koin...\n\n` +
    `    ✨ 🪙 ✨\n` +
    `    ~ ~ ~ ~`
  );
  await sleep(1000);

  const result = randomChoice(["head", "tail"]);
  const senderWon = choice === result;
  const oppWon = opponentChoice === result;
  const oppNum = opponent.split("@")[0];
  const senderNum = sender.split("@")[0];
  const resultEmoji = result === "head" ? "👑 HEAD" : "🦅 TAIL";

  let resultText;
  if (senderWon && !oppWon) {
    await addBalance(sender, bet * 2, "WIN_FLIP_MP");
    await recordGameResult(sender, true, 0, "GAME_FLIP_MP");
    await recordGameResult(opponent, false, 0, "GAME_FLIP_MP");
    resultText =
      `🪙 Hasil: *${resultEmoji}*\n\n` +
      `@${senderNum}: ${choice.toUpperCase()} ✅\n` +
      `@${oppNum}: ${opponentChoice.toUpperCase()} ❌\n\n` +
      `🎊🎉🎊\n` +
      `🏆 @${senderNum} MENANG!\n💰 +${config.currencySymbol}${bet * 2}`;
  } else if (!senderWon && oppWon) {
    await addBalance(opponent, bet * 2, "WIN_FLIP_MP");
    await recordGameResult(opponent, true, 0, "GAME_FLIP_MP");
    await recordGameResult(sender, false, 0, "GAME_FLIP_MP");
    resultText =
      `🪙 Hasil: *${resultEmoji}*\n\n` +
      `@${senderNum}: ${choice.toUpperCase()} ❌\n` +
      `@${oppNum}: ${opponentChoice.toUpperCase()} ✅\n\n` +
      `🎊🎉🎊\n` +
      `🏆 @${oppNum} MENANG!\n💰 +${config.currencySymbol}${bet * 2}`;
  } else {
    // SERI (keduanya sama)
    await addBalance(sender, bet, "REFUND_FLIP_MP_DRAW");
    await addBalance(opponent, bet, "REFUND_FLIP_MP_DRAW");
    await recordGameResult(sender, false, 0, "GAME_FLIP_MP_DRAW");
    await recordGameResult(opponent, false, 0, "GAME_FLIP_MP_DRAW");
    resultText =
      `🪙 Hasil: *${resultEmoji}*\n\n` +
      `@${senderNum}: ${choice.toUpperCase()}\n` +
      `@${oppNum}: ${opponentChoice.toUpperCase()}\n\n` +
      `🤝 SERI! Bet dikembalikan.`;
  }

  gameStateManager.setFinished(sender);
  gameStateManager.setFinished(opponent);

  return reply(
    `${config.ui.line}\n┃ 🪙 FLIPCOIN\n${config.ui.line}\n\n${resultText}\n\n` +
    `Gunakan !back atau !menu untuk keluar.\n\n${config.ui.line}`,
    [opponent]
  );
}

export default {
  name, aliases, requiresRegistration, isGasGame,
  execute, playWithMode, handleGameCommand, startMultiplayer, handleInviteAccepted
};
