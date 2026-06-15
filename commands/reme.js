import { subtractBalance, recordGameResult, addBalance, getUser, getUserByNickname } from "../utils/economy.js";
import { randomInt } from "../utils/random.js";
import { animateMessage } from "../utils/animation.js";
import { gameStateManager } from "../utils/gameState.js";
import { config } from "../config.js";

export const name = "re";
export const aliases = ["reme"];
export const requiresRegistration = true;
export const isGasGame = false;

// ===== INFO COMMAND =====
export async function execute({ sock, msg, sender, args, reply, jid }) {
  const betArg = args[0];
  const bet = betArg ? parseInt(betArg, 10) : null;

  if (bet && bet > 0) {
    gameStateManager.setModeSelection(sender, "re");
    gameStateManager.updateGameData(sender, { bet });
    return reply(
      `${config.ui.line}\n┃ GAME REME\n${config.ui.line}\n\nPilih mode:\n\n!1 = Lawan BOT\n!2 = Lawan PLAYER LAIN\n\nBet: ${config.currencySymbol}${bet}\n\n${config.ui.line}`
    );
  }

  return reply(
    `${config.ui.line}\n┃ GAME REME\n${config.ui.line}\n\nReme adalah game 50/50. Pasang taruhan dan pilih mode.\n\n*Cara bermain:*\n!re <bet>\n\nContoh:\n!re 300\n\nPilih mode:\n!1 = Lawan BOT\n!2 = Lawan PLAYER LAIN\n\nGunakan hanya perintah ini.\nKeluar game:\n!back atau !menu\n\n${config.ui.line}`
  );
}

// ===== PLAY WITH MODE (bot atau multiplayer) =====
export async function playWithMode({ sock, msg, sender, args, reply, jid, mode }) {
  const playerState = gameStateManager.getPlayerState(sender);
  const betArg = args[0];
  let bet = parseInt(betArg, 10);

  if ((!bet || isNaN(bet) || bet <= 0) && playerState?.data?.bet) {
    bet = playerState.data.bet;
  }

  if (!bet || isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ GAME REME\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!re <bet>\n\nContoh:\n!re 100\n\n${config.ui.line}`
    );
  }

  if (mode === "bot") {
    gameStateManager.setMode(sender, "bot");
    return playSingleplayer({ sock, msg, sender, args: [bet], reply, jid });
  }

  gameStateManager.setMultiplayerMode(sender, "re", null);
  gameStateManager.updateGameData(sender, { bet });

  return reply(
    `${config.ui.line}\n┃ GAME REME - MULTIPLAYER\n${config.ui.line}\n\nBet: ${config.currencySymbol}${bet}\n\nTag opponent mu:\n!tag @opponent\n\natau gunakan nickname:\n!tag nama_lawan\n\n${config.ui.line}`
  );
}

// ===== HANDLE GAME COMMANDS (!g, !bet) =====
export async function handleGameCommand({ sock, msg, sender, args, reply, jid, command }) {
  const playerState = gameStateManager.getPlayerState(sender);

  if (command === "bet") {
    const bet = args[0] ? parseInt(args[0], 10) : null;
    if (!bet || bet <= 0) {
      return reply(
        `${config.ui.line}\n┃ GAME REME\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!bet <amount>\n\nContoh:\n!bet 300\n\n${config.ui.line}`
      );
    }

    gameStateManager.setPlayerInGame(sender, "re");
    gameStateManager.updateGameData(sender, { bet });

    return reply(
      `${config.ui.line}\n✅ Bet set!\n\n💰 Amount: ${config.currencySymbol}${bet}\n\nMain sekarang:\n!g ${bet}\n\n${config.ui.line}`
    );
  }

  if (command === "g") {
    const bet = args[0] ? parseInt(args[0], 10) : playerState?.data?.bet;
    if (!bet || bet <= 0) {
      return reply(
        `${config.ui.line}\n┃ GAME REME\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan:\n!bet <amount>\n\nContoh:\n!bet 300\n\n${config.ui.line}`
      );
    }

    const mode = gameStateManager.getMode(sender);
    if (mode === "multiplayer") {
      const opponent = gameStateManager.getOpponent(sender);
      if (!opponent) {
        return reply(
          `${config.ui.line}\n┃ GAME REME\n${config.ui.line}\n\nTunggu tag opponent dulu:\n!tag @opponent\natau\n!tag nickname\n\n${config.ui.line}`
        );
      }
      return playMultiplayer({ sock, msg, sender, args: [bet], reply, jid, opponent });
    }

    return playSingleplayer({ sock, msg, sender, args: [bet], reply, jid });
  }
}

// ===== START MULTIPLAYER =====
export async function startMultiplayer({ sock, msg, sender, reply, jid, opponent }) {
  const playerState = gameStateManager.getPlayerState(sender);
  const bet = playerState?.data?.bet;

  if (!bet) {
    return reply(
      `${config.ui.line}\n❌ Bet tidak ditemukan!\n\nCoba lagi dengan: !re <bet>\n\n${config.ui.line}`
    );
  }

  let opponentJid = opponent;
  let opponentUser = getUser(opponentJid);
  if (!opponentUser) {
    opponentUser = getUserByNickname(opponent);
    if (opponentUser) {
      opponentJid = opponentUser.jid;
    }
  }

  if (!opponentUser) {
    return reply(
      `${config.ui.line}\n┃ GAME REME - MULTIPLAYER\n${config.ui.line}\n\nLawan tidak terdaftar atau tidak ditemukan.\n\nGunakan:\n!tag @opponent\natau\n!tag nama_lawan\n\n${config.ui.line}`
    );
  }

  gameStateManager.setOpponent(sender, opponentJid);
  gameStateManager.updateGameData(sender, { opponent: opponentJid });
  return playMultiplayer({ sock, msg, sender, args: [bet], reply, jid, opponent: opponentJid });
}

// ===== SINGLEPLAYER GAME =====
async function playSingleplayer({ sock, msg, sender, args, reply, jid }) {
  const betArg = args[0];
  const bet = parseInt(betArg, 10);

  if (!bet || isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ GAME REME\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!re <bet>\n\nContoh:\n!re 300\n\n${config.ui.line}`
    );
  }

  const deduction = await subtractBalance(sender, bet, "BET_REME");
  if (!deduction.success) {
    return reply(
      `${config.ui.line}\n┃ GAME REME\n${config.ui.line}\n\n❌ Saldo tidak cukup!\n💰 Balance kamu: ${config.currencySymbol}${deduction.balance}\n\n${config.ui.line}`
    );
  }

  // Animasi rolling
  const rolls = [randomInt(0, 36), randomInt(0, 36), randomInt(0, 36), randomInt(0, 36)];
  const finalNumber = randomInt(0, 36);

  const frames = [
    `🎲\n\nRolling...`,
    `🎲\n\nRolling...\n\n${rolls[0]}`,
    `🎲\n\nRolling...\n\n${rolls[0]}\n${rolls[1]}`,
    `🎲\n\nRolling...\n\n${rolls[0]}\n${rolls[1]}\n${rolls[2]}`,
    `🎲\n\nRolling...\n\n${rolls[0]}\n${rolls[1]}\n${rolls[2]}\n${rolls[3]}`,
    `🎲\n\nRolling...\n\n${rolls[0]}\n${rolls[1]}\n${rolls[2]}\n${rolls[3]}\n${finalNumber}`
  ];

  await animateMessage(sock, jid, frames, 700, msg);

  const playerNumber = finalNumber;
  const botNumber = randomInt(0, 36);
  const won = Math.random() < 0.5;
  const payout = won ? bet * 2 : 0;

  const resultText = won
    ? `✅ *MENANG!*\n\nKamu: ${playerNumber}\nBot: ${botNumber}\n\n💰 +${config.currencySymbol}${payout}`
    : `❌ *KALAH!*\n\nKamu: ${playerNumber}\nBot: ${botNumber}\n\n💸 -${config.currencySymbol}${bet}`;

  const newBalance = await recordGameResult(sender, won, payout, "GAME_REME");

  gameStateManager.clearPlayerState(sender);

  await reply(
    `${resultText}\n\n💵 Balance sekarang: ${config.currencySymbol}${newBalance}\n\nUlangi game:\n!re <bet>\n\nKeluar:\n!back atau !menu\n\n${config.ui.line}`
  );
}

// ===== MULTIPLAYER GAME =====
async function playMultiplayer({ sock, msg, sender, args, reply, jid, opponent }) {
  const betArg = args[0];
  const bet = parseInt(betArg, 10);

  if (!bet || isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ GAME REME\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!re <bet>\n\nContoh:\n!re 300\n\n${config.ui.line}`
    );
  }

  const opponentState = gameStateManager.getPlayerState(sender);
  const opponentJid = opponentState?.opponent;
  const opponentUser = getUser(opponentJid);

  if (!opponentJid || !opponentUser) {
    return reply(
      `${config.ui.line}\n┃ GAME REME - MULTIPLAYER\n${config.ui.line}\n\nOpponent tidak ditemukan.\n\n${config.ui.line}`
    );
  }

  const deduction1 = await subtractBalance(sender, bet, "BET_REME_MP");
  if (!deduction1.success) {
    return reply(
      `${config.ui.line}\n┃ GAME REME - MULTIPLAYER\n${config.ui.line}\n\n❌ Saldo kamu tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduction1.balance}\n\n${config.ui.line}`
    );
  }

  const deduction2 = await subtractBalance(opponentJid, bet, "BET_REME_MP");
  if (!deduction2.success) {
    await addBalance(sender, bet, "REFUND_REME_MP");
    return reply(
      `${config.ui.line}\n┃ GAME REME - MULTIPLAYER\n${config.ui.line}\n\n❌ Saldo opponent tidak cukup!\n\n${config.ui.line}`
    );
  }

  const playerNumber = randomInt(0, 36);
  const opponentNumber = randomInt(0, 36);

  const frames = [
    `🎲 Player 1 vs Player 2 🎲\n\nRolling...`,
    `🎲 Rolling...\n\nPlayer 1: ${playerNumber}`,
    `🎲 Rolling...\n\nPlayer 1: ${playerNumber}\nPlayer 2: ${opponentNumber}`,
    `🎲 HASIL!\n\nPlayer 1: ${playerNumber}\nPlayer 2: ${opponentNumber}`
  ];

  await animateMessage(sock, jid, frames, 700, msg);

  const senderWon = Math.random() < 0.5;
  let resultText;

  if (senderWon) {
    await addBalance(sender, bet * 2, "WIN_REME_MP");
    await recordGameResult(sender, true, 0, "GAME_REME_MP");
    await recordGameResult(opponentJid, false, 0, "GAME_REME_MP");
    resultText = `✅ *MENANG!*\n\nKamu: ${playerNumber}\nLawan: ${opponentNumber}\n\n💰 +${config.currencySymbol}${bet * 2}`;
  } else {
    await addBalance(opponentJid, bet * 2, "WIN_REME_MP");
    await recordGameResult(sender, false, 0, "GAME_REME_MP");
    await recordGameResult(opponentJid, true, 0, "GAME_REME_MP");
    resultText = `❌ *KALAH!*\n\nKamu: ${playerNumber}\nLawan: ${opponentNumber}\n\n💸 -${config.currencySymbol}${bet}`;
  }

  const newBalance = await recordGameResult(sender, senderWon, 0, "GAME_REME_MP");

  gameStateManager.clearPlayerState(sender);

  await reply(
    `${resultText}\n\n💵 Balance sekarang: ${config.currencySymbol}${newBalance}\n\nUlangi:\n!re <bet>\n\nKeluar:\n!back atau !menu\n\n${config.ui.line}`
  );
}

export default { name, aliases, requiresRegistration, isGasGame, execute, playWithMode, handleGameCommand, startMultiplayer };
