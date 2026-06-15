// handler/command.js
// Mendaftarkan dan menjalankan semua command

import { config } from "../config.js";
import { isRegistered } from "../utils/economy.js";
import { gameStateManager } from "../utils/gameState.js";

// Import semua command
import menu from "../commands/menu.js";
import game from "../commands/game.js";
import register from "../commands/register.js";
import reme from "../commands/reme.js";
import blackjack from "../commands/blackjack.js";
import flipcoin from "../commands/flipcoin.js";
import tictactoe from "../commands/tictactoe.js";
import balance from "../commands/balance.js";
import cek from "../commands/cek.js";
import leaderboard from "../commands/leaderboard.js";
import rewards from "../commands/reward.js";
import kurs from "../commands/kurs.js";
import deposit from "../commands/deposit.js";
import withdraw from "../commands/withdraw.js";
import idx from "../commands/idx.js";
import dv from "../commands/dv.js";
import support from "../commands/support.js";
import invitebot from "../commands/invitebot.js";

// ============================
// REGISTRY
// ============================

export const commands = new Map();
export const gasGames = new Map(); // game-game yang bisa dipanggil via !gas <game> <bet>

function registerCommand(cmd) {
  commands.set(cmd.name, cmd);

  if (cmd.aliases && cmd.aliases.length > 0) {
    for (const alias of cmd.aliases) {
      commands.set(alias, cmd);
    }
  }

  if (cmd.isGasGame) {
    gasGames.set(cmd.name, cmd);
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        gasGames.set(alias, cmd);
      }
    }
  }
}

// Daftarkan semua command tunggal
[
  menu,
  game,
  register,
  reme,
  blackjack,
  flipcoin,
  tictactoe,
  balance,
  cek,
  leaderboard,
  kurs,
  deposit,
  withdraw,
  idx,
  dv,
  support,
  invitebot
].forEach(registerCommand);

// Daftarkan reward commands (hourly, daily, weekly, monthly) - array
rewards.forEach(registerCommand);

// ============================
// HANDLE GAS COMMAND
// !gas <game> <bet...>
// ============================

async function handleGas(ctx) {
  const { args, reply } = ctx;
  const gameName = (args[0] || "").toLowerCase();
  const gasCommand = gasGames.get(gameName);

  if (!gasCommand) {
    return reply(
      `${config.ui.line}\n┃ GAS\n${config.ui.line}\n\nGame "${gameName}" tidak ditemukan.\n\nGame tersedia:\n${[...new Set([...gasGames.values()].map((g) => g.name))]
        .map((n) => `!${n}`)
        .join("\n")}\n\n${config.ui.line}`
    );
  }

  // Shift arguments: !gas <game> 100 -> args for the game = ["100", ...]
  const newArgs = args.slice(1);
  return gasCommand.execute({ ...ctx, args: newArgs });
}

// ============================
// MAIN EXECUTE
// ============================

/**
 * @param {object} ctx - context berisi sock, msg, sender, command, args, reply, jid, isGroup, groupJid
 */
export async function executeCommand(ctx) {
  const { command, sender, reply } = ctx;
  const playerState = gameStateManager.getPlayerState(sender);

  // ===== GAME EXIT COMMANDS =====
  if (command === "back" || command === "menu") {
    if (gameStateManager.isPlayerInGame(sender)) {
      gameStateManager.clearPlayerState(sender);
      return reply(
        `${config.ui.line}\n✅ Keluar dari game!\n\nGunakan !menu untuk main lagi.\n\n${config.ui.line}`
      );
    }
    // Jika tidak dalam game, tampilkan menu biasa
    if (command === "menu") {
      const menuCmd = commands.get("menu");
      return menuCmd.execute(ctx);
    }
    return; // !back tanpa dalam game, abaikan
  }

  if (playerState) {
    const allowedCommands = new Set(["back", "menu"]);
    if (playerState.state === "MODE_SELECT") {
      allowedCommands.add("1");
      allowedCommands.add("2");
    } else if (playerState.state === "OPPONENT_SELECT") {
      allowedCommands.add("tag");
    } else if (playerState.state === "IN_GAME") {
      allowedCommands.add("gas");
      allowedCommands.add("bet");
      allowedCommands.add("g");
    }

    if (!allowedCommands.has(command)) {
      const stateText = playerState.state === "MODE_SELECT"
        ? "Gunakan !1 atau !2 untuk memilih mode, lalu !back atau !menu."
        : playerState.state === "OPPONENT_SELECT"
          ? "Gunakan !tag @opponent atau !tag nickname, lalu !back atau !menu."
          : "Gunakan hanya !gas, !bet, !g, !back, atau !menu saat dalam game.";

      return reply(
        `${config.ui.line}\n┃ DALAM GAME\n${config.ui.line}\n\nSedang dalam game. ${stateText}\n\n${config.ui.line}`
      );
    }
  }

  // ===== MODE SELECTION: !1 (bot) atau !2 (player) =====
  if ((command === "1" || command === "2") && playerState && playerState.state === "MODE_SELECT") {
    const mode = command === "1" ? "bot" : "multiplayer";
    gameStateManager.setMode(sender, mode);

    if (mode === "bot") {
      // Langsung ke game vs bot
      const gameCmd = commands.get(playerState.game);
      if (gameCmd && gameCmd.playWithMode) {
        return gameCmd.playWithMode({ ...ctx, mode: "bot", opponent: "bot", args: [] });
      }
    } else {
      // Tunggu tag opponent
      return reply(
        `${config.ui.line}\n┃ MULTIPLAYER MODE\n${config.ui.line}\n\nTag opponent mu:\n!tag @opponent\n\natau gunakan nickname:\n!tag nama_lawan\n\n${config.ui.line}`
      );
    }
  }

  // ===== GAME QUICK COMMANDS =====
  // !g untuk game play, !bet untuk set bet
  if ((command === "g" || command === "bet") && playerState && playerState.state === "IN_GAME") {
    const gameCmd = commands.get(playerState.game);
    if (gameCmd && gameCmd.handleGameCommand) {
      return gameCmd.handleGameCommand({ ...ctx, args: ctx.args, command: command });
    }
  }

  // ===== TAG OPPONENT UNTUK MULTIPLAYER =====
  if (command === "tag" && playerState && playerState.state === "OPPONENT_SELECT") {
    const args = ctx.args;
    let opponent = null;

    // Cek jika ada mention
    const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentioned && mentioned.length > 0) {
      opponent = mentioned[0];
    } else if (args.length > 0) {
      // Gunakan nickname
      opponent = args.join(" ");
    }

    if (opponent) {
      gameStateManager.setOpponent(sender, opponent);
      const gameCmd = commands.get(playerState.game);
      if (gameCmd && gameCmd.startMultiplayer) {
        return gameCmd.startMultiplayer({ ...ctx, opponent: opponent });
      }
    } else {
      return reply(
        `${config.ui.line}\n❌ Invalid opponent!\n\nGunakan:\n!tag @opponent\natau\n!tag nama_lawan\n\n${config.ui.line}`
      );
    }
  }

  // ===== GAS COMMAND =====
  if (command === "gas") {
    // !gas tetap butuh registrasi (game)
    if (!isRegistered(sender)) {
      return reply(
        `${config.ui.line}\n┃ ${config.botName} BOT\n${config.ui.line}\n\nKamu belum terdaftar!\n\nGunakan:\n!register nickname\n\n${config.ui.line}`
      );
    }
    return handleGas(ctx);
  }

  const cmd = commands.get(command);

  if (!cmd) {
    return; // Bukan command yang dikenali, abaikan
  }

  // Cek registrasi
  if (cmd.requiresRegistration !== false && !isRegistered(sender)) {
    return reply(
      `${config.ui.line}\n┃ ${config.botName} BOT\n${config.ui.line}\n\nKamu belum terdaftar!\n\nGunakan:\n!register nickname\n\nContoh:\n!register AditGaming\n\n${config.ui.line}`
    );
  }

  try {
    return await cmd.execute(ctx);
  } catch (err) {
    console.error(`Error executing command "${command}":`, err);
    return reply(
      `${config.ui.line}\n┃ ERROR\n${config.ui.line}\n\nTerjadi kesalahan saat menjalankan command.\nSilakan coba lagi.\n\n${config.ui.line}`
    );
  }
}

export default { commands, gasGames, executeCommand };
