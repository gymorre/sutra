// commands/tictactoe.js
// Tic Tac Toe multiplayer dalam grup
// Dimainkan via: !gas ttt <bet> @tag  lalu  !gas ttt <1-9>

import { db } from "../utils/database.js";
import {
  subtractBalance,
  recordGameResult,
  getUser,
  addBalance
} from "../utils/economy.js";
import { gameStateManager } from "../utils/gameState.js";
import { config } from "../config.js";

export const name = "tictactoe";
export const aliases = ["ttt"];
export const requiresRegistration = false;
export const isGasGame = true;

const EMPTY_BOARD = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function renderBoard(board) {
  const cell = (v) => {
    if (v === "X") return "❌";
    if (v === "O") return "⭕";
    return v;
  };

  return (
    `${cell(board[0])} | ${cell(board[1])} | ${cell(board[2])}\n` +
    `${cell(board[3])} | ${cell(board[4])} | ${cell(board[5])}\n` +
    `${cell(board[6])} | ${cell(board[7])} | ${cell(board[8])}`
  );
}

function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (const [a, b, c] of lines) {
    if (
      board[a] === board[b] &&
      board[b] === board[c] &&
      (board[a] === "X" || board[a] === "O")
    ) {
      return board[a];
    }
  }

  if (!board.some((c) => !["X", "O"].includes(c) && /^[1-9]$/.test(c))) {
    return "DRAW";
  }

  return null;
}

function getActiveGame(groupId, jid) {
  return db
    .prepare(
      `SELECT * FROM tictactoe_games
       WHERE group_id = ? AND status = 'ongoing'
       AND (player_x = ? OR player_o = ?)`
    )
    .get(groupId, jid, jid);
}

// ===== INFO =====
export async function execute({ reply }) {
  return reply(
    `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nGame multiplayer 1v1.\n\nCara bermain:\n!gas ttt <bet> @tag\n\nAtau:\n!gas ttt <bet>\n\nKemudian pilih:\n!1 = Lawan BOT\n!2 = Lawan PLAYER LAIN\n\nSaat main:\n!gas ttt <1-9>\n\nKeluar:\n!back atau !menu\n\nContoh:\n!gas ttt 100 @lawan\n!gas ttt 100\n!1 (lawan bot)\n\n${config.ui.line}`
  );
}

// ===== PLAY WITH MODE =====
export async function playWithMode({ sock, msg, sender, args, reply, jid, mode, opponent }) {
  const betArg = args[0];
  const bet = betArg ? parseInt(betArg, 10) : 0;

  if (!bet || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!gas ttt <bet>\n\nContoh:\n!gas ttt 100\n\n${config.ui.line}`
    );
  }

  if (mode === "bot") {
    // Bot mode - belum support untuk tictactoe (too complex)
    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nBot mode untuk TTT belum tersedia.\n\nGunakan mode multiplayer:\n!2 untuk melawan player lain\n\n${config.ui.line}`
    );
  } else if (mode === "multiplayer") {
    gameStateManager.setMultiplayerMode(sender, "ttt", null);
    gameStateManager.updateGameData(sender, { bet });
    
    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE - MULTIPLAYER\n${config.ui.line}\n\nBet: ${config.currencySymbol}${bet}\n\nTag opponent:\n!tag @opponent\n\natau nickname:\n!tag nama_lawan\n\n${config.ui.line}`
    );
  }
}

// ===== START MULTIPLAYER =====
export async function startMultiplayer({ sock, msg, sender, reply, jid, opponent }) {
  const playerState = gameStateManager.getPlayerState(sender);
  const bet = playerState?.data?.bet;

  if (!bet) {
    return reply(
      `${config.ui.line}\n❌ Bet tidak ditemukan!\n\nCoba lagi dengan: !gas ttt <bet>\n\n${config.ui.line}`
    );
  }

  // Extract opponent jid if it's a mention
  let opponentJid = opponent;
  if (opponent.startsWith("@")) {
    // Ini nickname, convert ke format jid (simplified)
    opponentJid = opponent.replace("@", "");
  }

  const opponentUser = getUser(opponentJid);
  if (!opponentUser) {
    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nLawan tidak terdaftar atau tidak ditemukan.\n\nCoba gunakan:\n!tag @opponent (dengan mention)\n\n${config.ui.line}`
    );
  }

  gameStateManager.setOpponent(sender, opponentJid);
  
  // Update with opponent info
  gameStateManager.updateGameData(sender, { opponent: opponentJid, opponentName: opponentUser.nickname });

  return reply(
    `${config.ui.line}\n┃ TIC TAC TOE - MULTIPLAYER\n${config.ui.line}\n\n👤 Player 1: Kamu\n👤 Player 2: ${opponentUser.nickname}\n\n💰 Bet: ${config.currencySymbol}${bet}\n\nSiap main!\n!g atau !gas ttt <1-9>\n\nKeluar:\n!back atau !menu\n\n${config.ui.line}`
  );
}

// ===== PLAY =====
export async function play({
  sock,
  msg,
  sender,
  args,
  reply,
  isGroup,
  groupJid
}) {
  if (!isGroup) {
    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nGame ini hanya bisa dimainkan di dalam grup.\n\n${config.ui.line}`
    );
  }

  // ===== MOVE: !gas ttt <1-9> =====
  if (args[0] && /^[1-9]$/.test(args[0])) {
    return handleMove(sender, groupJid, parseInt(args[0], 10), reply);
  }

  // ===== START GAME: !gas ttt <bet> @tag (NEW FLOW) =====
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  const betArg = args.find((a) => !isNaN(parseInt(a, 10)));
  const bet = betArg ? parseInt(betArg, 10) : null;

  if (bet && mentioned && mentioned.length > 0) {
    // New flow: direct start with opponent tag
    const opponent = mentioned[0];

    if (opponent === sender) {
      return reply(
        `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nKamu tidak bisa bermain dengan dirimu sendiri.\n\n${config.ui.line}`
      );
    }

    const opponentUser = getUser(opponent);
    if (!opponentUser) {
      return reply(
        `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nLawan belum terdaftar di ${config.botName}.\n\n${config.ui.line}`
      );
    }

    if (bet > 0) {
      const deduction1 = await subtractBalance(sender, bet, "BET_TTT");
      if (!deduction1.success) {
        return reply(
          `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\n❌ Saldo kamu tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduction1.balance}\n\n${config.ui.line}`
        );
      }

      const deduction2 = await subtractBalance(opponent, bet, "BET_TTT");
      if (!deduction2.success) {
        await addBalance(sender, bet, "REFUND_TTT");
        return reply(
          `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\n❌ Saldo lawan tidak cukup!\n\n${config.ui.line}`
        );
      }
    }

    const existingSender = getActiveGame(groupJid, sender);
    const existingOpponent = getActiveGame(groupJid, opponent);

    if (existingSender || existingOpponent) {
      if (bet > 0) {
        await addBalance(sender, bet, "REFUND_TTT");
        await addBalance(opponent, bet, "REFUND_TTT");
      }
      return reply(
        `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nSalah satu pemain masih memiliki game yang berjalan.\n\n${config.ui.line}`
      );
    }

    // Set game state
    gameStateManager.setPlayerInGame(sender, "ttt");
    gameStateManager.updateGameData(sender, { opponent, bet, groupJid });

    const gameId = `${groupJid}_${Date.now()}`;
    const board = [...EMPTY_BOARD];

    db.prepare(
      `INSERT INTO tictactoe_games (id, group_id, player_x, player_o, board, turn, bet, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'ongoing', ?)`
    ).run(gameId, groupJid, sender, opponent, JSON.stringify(board), sender, bet, Date.now());

    const senderUser = getUser(sender);

    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\n❌ ${senderUser.nickname}\n⭕ ${opponentUser.nickname}\n\n💰 Bet: ${config.currencySymbol}${bet} (masing-masing)\n\n${renderBoard(board)}\n\nTurn: ❌ ${senderUser.nickname}\n\nGunakan:\n!gas ttt <1-9>\n\n${config.ui.line}`
    );
  }

  // Old flow: tag without bet
  if (mentioned && mentioned.length > 0 && !bet) {
    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!gas ttt <bet> @tag\n\n${config.ui.line}`
    );
  }

  return reply(
    `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!gas ttt <bet> @tag\n\n${config.ui.line}`
  );
}

async function handleMove(sender, groupJid, position, reply) {
  const game = getActiveGame(groupJid, sender);

  if (!game) {
    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nKamu tidak memiliki game yang berjalan di grup ini.\n\n${config.ui.line}`
    );
  }

  if (game.turn !== sender) {
    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nBukan giliran kamu!\n\n${config.ui.line}`
    );
  }

  const board = JSON.parse(game.board);
  const idx = position - 1;

  if (board[idx] === "X" || board[idx] === "O") {
    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\nPosisi ${position} sudah terisi!\n\n${renderBoard(board)}\n\n${config.ui.line}`
    );
  }

  const symbol = sender === game.player_x ? "X" : "O";
  board[idx] = symbol;

  const winner = checkWinner(board);
  const playerXUser = getUser(game.player_x);
  const playerOUser = getUser(game.player_o);

  if (winner) {
    db.prepare("UPDATE tictactoe_games SET board = ?, status = 'finished' WHERE id = ?").run(
      JSON.stringify(board),
      game.id
    );

    if (winner === "DRAW") {
      if (game.bet > 0) {
        const { addBalance } = await import("../utils/economy.js");
        await addBalance(game.player_x, game.bet, "REFUND_TTT_DRAW");
        await addBalance(game.player_o, game.bet, "REFUND_TTT_DRAW");
      }
      await recordGameResult(game.player_x, false, 0, "GAME_TTT_DRAW");
      await recordGameResult(game.player_o, false, 0, "GAME_TTT_DRAW");

      return reply(
        `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\n${renderBoard(board)}\n\n🤝 *SERI!*\nBet dikembalikan.\n\n${config.ui.line}`
      );
    }

    const winnerJid = winner === "X" ? game.player_x : game.player_o;
    const loserJid = winner === "X" ? game.player_o : game.player_x;
    const winnerUser = winner === "X" ? playerXUser : playerOUser;

    const totalPot = game.bet * 2;

    if (game.bet > 0) {
      const { addBalance } = await import("../utils/economy.js");
      await addBalance(winnerJid, totalPot, "WIN_TTT");
    }

    await recordGameResult(winnerJid, true, 0, "GAME_TTT_WIN");
    await recordGameResult(loserJid, false, 0, "GAME_TTT_LOSE");

    return reply(
      `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\n${renderBoard(board)}\n\n🎉 *${winnerUser.nickname} MENANG!*\n💰 +${config.currencySymbol}${totalPot}\n\n${config.ui.line}`
    );
  }

  const nextTurn = sender === game.player_x ? game.player_o : game.player_x;
  db.prepare("UPDATE tictactoe_games SET board = ?, turn = ? WHERE id = ?").run(
    JSON.stringify(board),
    nextTurn,
    game.id
  );

  const nextUser = getUser(nextTurn);
  const nextSymbol = nextTurn === game.player_x ? "❌" : "⭕";

  return reply(
    `${config.ui.line}\n┃ TIC TAC TOE\n${config.ui.line}\n\n${renderBoard(board)}\n\nTurn: ${nextSymbol} ${nextUser.nickname}\n\n${config.ui.line}`
  );
}

export default { name, aliases, requiresRegistration, isGasGame, execute, play, playWithMode, startMultiplayer };