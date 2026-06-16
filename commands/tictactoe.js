// commands/tictactoe.js
// Tic Tac Toe multiplayer - invite/accept system
// Flow baru: !ttt → !2 → !tag @lawan → lawan !accept → main dengan !g 1-9

import { db } from "../utils/database.js";
import {
  subtractBalance,
  recordGameResult,
  getUser,
  addBalance
} from "../utils/economy.js";
import { gameStateManager } from "../utils/gameState.js";
import { config } from "../config.js";
import { startChallengeCountdown } from "./multiplayer.js";

export const name = "tictactoe";
export const aliases = ["ttt"];
export const requiresRegistration = true;
export const isGasGame = false;

const EMPTY_BOARD = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function renderBoard(board) {
  const cell = (v) => {
    if (v === "X") return "❌";
    if (v === "O") return "⭕";
    return `[${v}]`;
  };

  return (
    `${cell(board[0])} ${cell(board[1])} ${cell(board[2])}\n` +
    `${cell(board[3])} ${cell(board[4])} ${cell(board[5])}\n` +
    `${cell(board[6])} ${cell(board[7])} ${cell(board[8])}`
  );
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
  ];

  for (const [a, b, c] of lines) {
    if (board[a] === board[b] && board[b] === board[c] && (board[a] === "X" || board[a] === "O")) {
      return board[a];
    }
  }

  if (!board.some((c) => !["X", "O"].includes(c))) {
    return "DRAW";
  }

  return null;
}

function getActiveGame(jid, playerJid) {
  return db.prepare(
    `SELECT * FROM tictactoe_games WHERE group_id = ? AND status = 'ongoing' AND (player_x = ? OR player_o = ?)`
  ).get(jid, playerJid, playerJid);
}

function getActiveGameByPlayer(playerJid) {
  return db.prepare(
    `SELECT * FROM tictactoe_games WHERE status = 'ongoing' AND (player_x = ? OR player_o = ?)`
  ).get(playerJid, playerJid);
}

// ============================
// BOT AI (Minimax sederhana)
// ============================

function getBotMove(board) {
  // Coba menang
  for (let i = 0; i < 9; i++) {
    if (!["X", "O"].includes(board[i])) {
      const test = [...board];
      test[i] = "O";
      if (checkWinner(test) === "O") return i;
    }
  }
  // Blok pemain
  for (let i = 0; i < 9; i++) {
    if (!["X", "O"].includes(board[i])) {
      const test = [...board];
      test[i] = "X";
      if (checkWinner(test) === "X") return i;
    }
  }
  // Pilih tengah
  if (!["X", "O"].includes(board[4])) return 4;
  // Pilih sudut
  for (const corner of [0, 2, 6, 8]) {
    if (!["X", "O"].includes(board[corner])) return corner;
  }
  // Pilih acak
  const available = board.map((v, i) => (!["X", "O"].includes(v) ? i : null)).filter(v => v !== null);
  return available[Math.floor(Math.random() * available.length)];
}

// ============================
// ENTRY (!ttt / !tictactoe)
// ============================

export async function execute({ sender, args, reply, jid }) {
  const existing = getActiveGameByPlayer(sender);

  if (existing) {
    // Clean up stale game - set to finished and start fresh
    db.prepare("UPDATE tictactoe_games SET status = 'finished' WHERE id = ?")
      .run(existing.id);
  }

  const betArg = args[0];
  const bet = betArg ? parseInt(betArg, 10) : null;

  // Set state langsung ke IN_GAME dengan mode bot
  gameStateManager.setPlayerInGame(sender, "tictactoe");
  gameStateManager.setMode(sender, "bot");

  if (bet && bet > 0) {
    gameStateManager.updateGameData(sender, { bet });
    return startBotGame({ sender, bet, reply, jid });
  }

  return reply(
    `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE (SOLO vs BOT)\n${config.ui.line}\n\n` +
    `Game 3x3 klasik!\n\n` +
    `Set bet untuk main:\n!bet <jumlah>\n\nLangsung main:\n!g <jumlah>\n\nKeluar: !back atau !menu\n\n${config.ui.line}`
  );
}

// ============================
// PLAY WITH MODE
// ============================

export async function playWithMode({ sender, args, reply, jid, mode }) {
  const playerState = gameStateManager.getPlayerState(sender);
  let bet = args[0] ? parseInt(args[0], 10) : playerState?.data?.bet;

  if (!bet || isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\n\n${config.ui.line}`
    );
  }

  if (mode === "bot") {
    gameStateManager.setMode(sender, "bot");
    gameStateManager.updateGameData(sender, { bet });
    return startBotGame({ sender, bet, reply, jid });
  }

  // Multiplayer
  gameStateManager.setMultiplayerMode(sender, "tictactoe", null);
  gameStateManager.updateGameData(sender, { bet });

  return reply(
    `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE - MULTIPLAYER\n${config.ui.line}\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet}\n\nTag lawanmu:\n!tag @lawan\n\n${config.ui.line}`
  );
}

// ============================
// START BOT GAME
// ============================

async function startBotGame({ sender, bet, reply, jid }) {
  const deduction = await subtractBalance(sender, bet, "BET_TTT_BOT");
  if (!deduction.success) {
    gameStateManager.clearPlayerState(sender);
    return reply(
      `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\n❌ Saldo tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduction.balance}\n\n${config.ui.line}`
    );
  }

  const board = [...EMPTY_BOARD];
  const gameId = `bot_${sender}_${Date.now()}`;
  const groupId = jid || sender;

  db.prepare(
    `INSERT INTO tictactoe_games (id, group_id, player_x, player_o, board, turn, bet, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ongoing', ?)`
  ).run(gameId, groupId, sender, "BOT", JSON.stringify(board), sender, bet, Date.now());

  gameStateManager.setPlayerInGame(sender, "tictactoe");
  gameStateManager.updateGameData(sender, { bet, gameId, isBot: true, groupId });

  const senderUser = getUser(sender);

  return reply(
    `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE - vs BOT\n${config.ui.line}\n\n` +
    `❌ ${senderUser?.nickname || "Kamu"}\n⭕ 🤖 BOT\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet}\n\n` +
    `${renderBoard(board)}\n\n` +
    `Giliranmu! Pilih: 1-9\n\n${config.ui.line}`
  );
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
      `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\nLawan tidak ditemukan atau belum register.\n\n${config.ui.line}`
    );
  }

  if (opponent === sender) {
    return reply(
      `${config.ui.line}\n❌⭕ TIC TAC TOE\n${config.ui.line}\n\nKamu tidak bisa melawan diri sendiri!\n\n${config.ui.line}`
    );
  }

  if (gameStateManager.isPlayerInGame(opponent)) {
    return reply(
      `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\n@${opponent.split("@")[0]} sedang dalam game lain!\n\n${config.ui.line}`,
      [opponent]
    );
  }

  return startChallengeCountdown({ sock, jid, sender, opponentJid: opponent, gameCode: "tictactoe", bet, sendTo });
}

// ============================
// ACCEPT INVITE
// ============================

export async function handleInviteAccepted({ sock, msg, sender, reply, jid, sendTo, invite }) {
  const { from, bet } = invite;

  const deduct1 = await subtractBalance(from, bet, "BET_TTT_MP");
  if (!deduct1.success) {
    gameStateManager.clearPlayerState(from);
    return reply(
      `${config.ui.line}\n❌ Saldo @${from.split("@")[0]} tidak cukup!\n\nGame dibatalkan.\n\n${config.ui.line}`,
      [from]
    );
  }

  const deduct2 = await subtractBalance(sender, bet, "BET_TTT_MP");
  if (!deduct2.success) {
    await addBalance(from, bet, "REFUND_TTT_MP");
    gameStateManager.clearPlayerState(from);
    return reply(
      `${config.ui.line}\n❌ Saldo kamu tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduct2.balance}\n\nGame dibatalkan.\n\n${config.ui.line}`
    );
  }

  const board = [...EMPTY_BOARD];
  const gameId = `mp_${from}_${Date.now()}`;
  const groupId = jid || from;

  db.prepare(
    `INSERT INTO tictactoe_games (id, group_id, player_x, player_o, board, turn, bet, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'ongoing', ?)`
  ).run(gameId, groupId, from, sender, JSON.stringify(board), from, bet, Date.now());

  // Set state kedua player
  gameStateManager.setMode(from, "multiplayer");
  gameStateManager.setOpponent(from, sender);
  gameStateManager.updateGameData(from, { bet, gameId, groupId });
  gameStateManager.setPlayerInGame(from, "tictactoe");

  gameStateManager.setModeSelection(sender, "tictactoe");
  gameStateManager.setMode(sender, "multiplayer");
  gameStateManager.setOpponent(sender, from);
  gameStateManager.updateGameData(sender, { bet, gameId, groupId });
  gameStateManager.setPlayerInGame(sender, "tictactoe");

  const fromUser = getUser(from);
  const toUser = getUser(sender);
  const fromNum = from.split("@")[0];
  const toNum = sender.split("@")[0];

  await sendTo(
    groupId,
    `@${fromNum} @${toNum}\n${config.ui.line}\n┃ ❌⭕ TIC TAC TOE DIMULAI!\n${config.ui.line}\n\n` +
    `❌ @${fromNum} (${fromUser?.nickname || "P1"})\n` +
    `⭕ @${toNum} (${toUser?.nickname || "P2"})\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet} masing-masing\n\n` +
    `${renderBoard(board)}\n\n` +
    `🎯 Giliran: ❌ @${fromNum}\n\nPilih posisi: 1-9\n\n${config.ui.line}`,
    [from, sender]
  );
}

// ============================
// HANDLE GAME COMMANDS (!g, !bet, !gas)
// ============================

export async function handleGameCommand({ sender, args, reply, command, jid, sendTo }) {
  const playerState = gameStateManager.getPlayerState(sender);

  if (command === "bet") {
    const bet = args[0] ? parseInt(args[0], 10) : null;
    if (!bet || bet <= 0) {
      return reply(
        `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\nFormat salah!\n\nGunakan: !bet <jumlah>\n\n${config.ui.line}`
      );
    }
    gameStateManager.updateGameData(sender, { bet });
    return reply(
      `${config.ui.line}\n✅ Bet tersimpan!\n\n💰 ${config.currencySymbol}${bet}\n\nPilih mode:\n!1 = 🤖 BOT\n!2 = 👤 PLAYER\n\n${config.ui.line}`
    );
  }

  if (command === "g" || command === "gas") {
    // Cek apakah ada game aktif (multiplayer di group)
    const groupId = playerState?.data?.groupId || jid;
    const existing = groupId ? getActiveGame(groupId, sender) : getActiveGameByPlayer(sender);

    if (!existing) {
      // Belum ada game - mulai baru jika ada bet di args
      const bet = args[0] && !isNaN(parseInt(args[0])) ? parseInt(args[0], 10) : playerState?.data?.bet;
      if (!bet || bet <= 0) {
        return reply(
          `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\natau: !g <bet>\n\n${config.ui.line}`
        );
      }
      const mode = gameStateManager.getMode(sender) || "bot";
      gameStateManager.updateGameData(sender, { bet });
      if (mode === "bot") {
        gameStateManager.setMode(sender, "bot");
        return startBotGame({ sender, bet, reply, jid });
      } else {
        return reply(
          `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\nTag lawan dulu:\n!tag @lawan\n\n${config.ui.line}`
        );
      }
    }

    // Ada game - proses move
    const posArg = args[0];
    const pos = posArg ? parseInt(posArg, 10) : null;

    if (!pos || pos < 1 || pos > 9) {
      const board = JSON.parse(existing.board);
      const turnUser = getUser(existing.turn);
      const turnSymbol = existing.turn === existing.player_x ? "❌" : "⭕";
      return reply(
        `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\n` +
        `${renderBoard(board)}\n\n` +
        `Giliran: ${turnSymbol} ${turnUser?.nickname || existing.turn}\n\n` +
        `Pilih: 1-9\n\n${config.ui.line}`
      );
    }

    return handleMove({ sender, pos, reply, jid, sendTo, existing });
  }
}

// ============================
// HANDLE MOVE
// ============================

async function handleMove({ sender, pos, reply, jid, sendTo, existing: game }) {
  if (!game) {
    return reply(
      `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\nTidak ada game aktif.\n\n${config.ui.line}`
    );
  }

  if (game.turn !== sender) {
    const turnUser = getUser(game.turn);
    const turnNum = game.turn?.split("@")[0];
    return reply(
      `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\nBukan giliranmu!\n\nGiliran: @${turnNum}\n\n${config.ui.line}`,
      [game.turn]
    );
  }

  const board = JSON.parse(game.board);
  const idx = pos - 1;

  if (board[idx] === "X" || board[idx] === "O") {
    return reply(
      `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\nPosisi ${pos} sudah terisi!\n\n${renderBoard(board)}\n\n${config.ui.line}`
    );
  }

  const symbol = sender === game.player_x ? "X" : "O";
  board[idx] = symbol;

  const winner = checkWinner(board);
  const playerXUser = getUser(game.player_x);
  const playerOUser = getUser(game.player_o);
  const isBot = game.player_o === "BOT";
  const groupId = game.group_id;
  const mentionsList = isBot ? [sender] : [game.player_x, game.player_o];

  if (winner) {
    db.prepare("UPDATE tictactoe_games SET board = ?, status = 'finished' WHERE id = ?")
      .run(JSON.stringify(board), game.id);

    if (winner === "DRAW") {
      if (game.bet > 0) {
        await addBalance(game.player_x, game.bet, "REFUND_TTT_DRAW");
        if (!isBot) await addBalance(game.player_o, game.bet, "REFUND_TTT_DRAW");
      }
      await recordGameResult(game.player_x, false, 0, "GAME_TTT_DRAW");
      if (!isBot) await recordGameResult(game.player_o, false, 0, "GAME_TTT_DRAW");

      gameStateManager.setFinished(sender);
      if (!isBot) gameStateManager.setFinished(game.player_o);

      return reply(
        `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\n${renderBoard(board)}\n\n🤝 *SERI!*\nBet dikembalikan.\n\nGunakan !back atau !menu untuk keluar dari meja.\n\n${config.ui.line}`,
        mentionsList
      );
    }

    const winnerJid = winner === "X" ? game.player_x : game.player_o;
    const loserJid = winner === "X" ? game.player_o : game.player_x;
    const winnerUser = winner === "X" ? playerXUser : playerOUser;
    const totalPot = game.bet * (isBot ? 2 : 2);

    if (game.bet > 0) {
      await addBalance(winnerJid, totalPot, "WIN_TTT");
    }
    await recordGameResult(winnerJid, true, 0, "GAME_TTT_WIN");
    if (!isBot) await recordGameResult(loserJid, false, 0, "GAME_TTT_LOSE");

    gameStateManager.setFinished(sender);
    if (!isBot && loserJid !== "BOT") gameStateManager.setFinished(loserJid);

    const winnerNum = winnerJid?.split("@")[0];

    return reply(
      `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\n${renderBoard(board)}\n\n` +
      `🎉 *${winnerUser?.nickname || "Pemenang"} MENANG!*\n` +
      `💰 +${config.currencySymbol}${totalPot}\n\nGunakan !back atau !menu untuk keluar dari meja.\n\n${config.ui.line}`,
      mentionsList
    );
  }

  // Jika lawan BOT, bot bergerak otomatis
  let nextTurn = sender === game.player_x ? game.player_o : game.player_x;

  if (isBot && nextTurn === "BOT") {
    const botIdx = getBotMove(board);
    if (botIdx !== undefined && botIdx !== null) {
      board[botIdx] = "O";
      const botWinner = checkWinner(board);

      if (botWinner) {
        db.prepare("UPDATE tictactoe_games SET board = ?, status = 'finished' WHERE id = ?")
          .run(JSON.stringify(board), game.id);

        if (botWinner === "DRAW") {
          if (game.bet > 0) await addBalance(sender, game.bet, "REFUND_TTT_BOT_DRAW");
          await recordGameResult(sender, false, 0, "GAME_TTT_BOT_DRAW");
          gameStateManager.clearPlayerState(sender);
          return reply(
            `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\n${renderBoard(board)}\n\n🤝 SERI!\nBet dikembalikan.\n\n${config.ui.line}`
          );
        }

        if (botWinner === "O") {
          // BOT menang
          await recordGameResult(sender, false, 0, "GAME_TTT_BOT_LOSE");
          gameStateManager.clearPlayerState(sender);
          return reply(
            `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\n${renderBoard(board)}\n\n🤖 BOT MENANG!\n💸 -${config.currencySymbol}${game.bet}\n\nMain lagi: !ttt <bet>\n\n${config.ui.line}`
          );
        }
      }

      // Game lanjut setelah bot gerak
      db.prepare("UPDATE tictactoe_games SET board = ?, turn = ? WHERE id = ?")
        .run(JSON.stringify(board), sender, game.id);

      return reply(
        `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\n` +
        `${renderBoard(board)}\n\n🤖 Bot memilih: ${botIdx + 1}\n\nGiliranmu! Pilih: 1-9\n\n${config.ui.line}`
      );
    }
  }

  // Multiplayer - ganti giliran
  db.prepare("UPDATE tictactoe_games SET board = ?, turn = ? WHERE id = ?")
    .run(JSON.stringify(board), nextTurn, game.id);

  const nextUser = getUser(nextTurn);
  const nextSymbol = nextTurn === game.player_x ? "❌" : "⭕";
  const nextNum = nextTurn?.split("@")[0];

  return reply(
    `${config.ui.line}\n┃ ❌⭕ TIC TAC TOE\n${config.ui.line}\n\n${renderBoard(board)}\n\n` +
    `🎯 Giliran: ${nextSymbol} @${nextNum}\n\nPilih: 1-9\n\n${config.ui.line}`,
    mentionsList
  );
}

export default {
  name, aliases, requiresRegistration, isGasGame,
  execute, playWithMode, handleGameCommand, startMultiplayer, handleInviteAccepted
};