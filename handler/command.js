// handler/command.js
// Mendaftarkan dan menjalankan semua command
// Flow baru: Game dipilih via !reme/!bj/!fp/!ttt/!fb → locked → !g/!bet/!gas untuk main

import { config } from "../config.js";
import { isRegistered } from "../utils/economy.js";
import { gameStateManager } from "../utils/gameState.js";
import { db } from "../utils/database.js";

// Import semua command
import menu from "../commands/menu.js";
import game from "../commands/game.js";
import register from "../commands/register.js";
import reme from "../commands/reme.js";
import blackjack from "../commands/blackjack.js";
import flipcoin from "../commands/flipcoin.js";
import tictactoe from "../commands/tictactoe.js";
import fruitbomb from "../commands/fruitbomb.js";
import balance from "../commands/balance.js";
import cek from "../commands/cek.js";
import leaderboard from "../commands/leaderboard.js";
import rewards from "../commands/reward.js";
import kurs from "../commands/kurs.js";
import deposit from "../commands/deposit.js";
import withdraw from "../commands/withdraw.js";
import idx from "../commands/idx.js";
import dv from "../commands/dv.js";
import dw from "../commands/dw.js";
import support from "../commands/support.js";
import invitebot from "../commands/invitebot.js";
import transfer from "../commands/transfer.js";
import multiplayer from "../commands/multiplayer.js";
import me from "../commands/me.js";
import give from "../commands/give.js";
import remove from "../commands/remove.js";

const ADMIN_NUMBER = "6285158220582";

export function isAdmin(sender) {
  const senderNum = sender.split("@")[0].split(":")[0];
  return senderNum === ADMIN_NUMBER;
}

// ============================
// REGISTRY
// ============================

export const commands = new Map();

/** Map game name → command module */
const gameCommands = new Map();

function registerCommand(cmd) {
  commands.set(cmd.name, cmd);
  if (cmd.aliases && cmd.aliases.length > 0) {
    for (const alias of cmd.aliases) {
      commands.set(alias, cmd);
    }
  }
}

function registerGame(cmd) {
  registerCommand(cmd);
  gameCommands.set(cmd.name, cmd);
  if (cmd.aliases) {
    for (const alias of cmd.aliases) {
      gameCommands.set(alias, cmd);
    }
  }
}

// Daftarkan semua non-game command
[
  menu, game, register,
  balance, cek, leaderboard,
  kurs, deposit, withdraw, idx, dv, dw,
  support, invitebot, transfer, multiplayer, me,
  give, remove
].forEach(registerCommand);

// Daftarkan game commands
[reme, blackjack, flipcoin, tictactoe, fruitbomb].forEach(registerGame);

// Daftarkan reward commands (array)
rewards.forEach(registerCommand);

// ============================
// COMMAND SETS SAAT DALAM GAME
// ============================

/** Command yang selalu diizinkan (keluar game) - HANYA untuk state selain IN_GAME */
const ALWAYS_ALLOWED = new Set(["back", "home", "menu"]);

/** Command yang diizinkan saat IN_GAME — NO back/menu/home (player locked) */
const IN_GAME_ALLOWED = new Set(["gas", "bet", "g", "cash"]);

/** Command yang diizinkan saat MODE_SELECT */
const MODE_SELECT_ALLOWED = new Set(["back", "home", "menu", "1", "2", "bet"]);

/** Command yang diizinkan saat OPPONENT_SELECT */
const OPPONENT_SELECT_ALLOWED = new Set(["back", "home", "menu", "tag"]);

/** Command yang diizinkan saat WAITING_INVITE */
const WAITING_INVITE_ALLOWED = new Set(["back", "home", "menu"]);

/** Command yang diizinkan saat FINISHED */
const FINISHED_ALLOWED = new Set(["back", "home", "menu"]);

// ============================
// HELPER: PESAN LOCKED
// ============================

function getLockedMessage(state, game) {
  const gameName = game ? game.toUpperCase() : "GAME";

  const stateHints = {
    MODE_SELECT: `Pilih mode:\n!1 = 🤖 BOT\n!2 = 👤 PLAYER\n\nKeluar: !back`,
    OPPONENT_SELECT: `Tag lawanmu:\n!tag @lawan\n\nKeluar: !back`,
    WAITING_INVITE: `Menunggu lawan menjawab...\n\nBatalkan: !back`,
    IN_GAME:
      `Sedang bermain ${gameName}!\n\n⚠️ Kamu tidak bisa keluar saat permainan berlangsung!\n\nCommand tersedia:\n` +
      `!g <aksi/angka> → main\n!bet <jumlah> → set bet\n!cash → cairkan (fruitbomb)`,
    FINISHED: `Pertandingan telah selesai!\n\nGunakan !back atau !menu untuk keluar dari meja sebelum bermain game lain atau menggunakan fitur lain.\n\nKeluar: !back`
  };

  return (
    `${config.ui.line}\n┃ 🔒 SEDANG DALAM GAME\n${config.ui.line}\n\n` +
    `${stateHints[state] || "Kamu sedang dalam game."}\n\n` +
    `${config.ui.line}`
  );
}

/**
 * Helper: Clean up any stale TTT database records for a player
 */
function cleanupStaleTTTGames(playerJid) {
  try {
    db.prepare(
      `UPDATE tictactoe_games SET status = 'finished' WHERE status = 'ongoing' AND (player_x = ? OR player_o = ?)`
    ).run(playerJid, playerJid);
  } catch (e) {
    // Silently ignore DB errors during cleanup
  }
}

// ============================
// MAIN EXECUTE
// ============================

/**
 * @param {object} ctx - context berisi sock, msg, sender, command, args, reply, sendTo, jid, isGroup, groupJid
 */
export async function executeCommand(ctx) {
  const { command, sender, args, reply, jid, sendTo } = ctx;
  const playerState = gameStateManager.getPlayerState(sender);

  // ============================
  // 0. HIDDEN ADMIN COMMANDS (!give / !remove)
  //    Bypass semua game lock, tidak ditampilkan di menu
  // ============================
  if ((command === "give" || command === "remove") && isAdmin(sender)) {
    if (command === "give") {
      return give.execute({ ...ctx });
    }
    return remove.execute({ ...ctx });
  }

  // ============================
  // 1. KELUAR GAME (!back / !home / !menu)
  //    BLOCKED during IN_GAME state — player must finish the game!
  // ============================
  if (ALWAYS_ALLOWED.has(command)) {
    if (gameStateManager.isPlayerInGame(sender)) {
      const currentState = playerState?.state;

      // BLOCK exit during IN_GAME — player cannot leave mid-game!
      if (currentState === "IN_GAME") {
        return reply(getLockedMessage("IN_GAME", playerState?.game));
      }

      // Allow exit for other states (MODE_SELECT, OPPONENT_SELECT, WAITING_INVITE, FINISHED)
      // Clean up stale TTT games in database
      cleanupStaleTTTGames(sender);
      gameStateManager.clearPlayerState(sender);

      // Jika !menu, tampilkan menu setelah keluar
      if (command === "menu") {
        const menuCmd = commands.get("menu");
        if (menuCmd) {
          // Tampilkan pesan keluar dulu
          await reply(
            `${config.ui.line}\n✅ Keluar dari game!\n\n${config.ui.line}`
          );
          return menuCmd.execute(ctx);
        }
      }

      return reply(
        `${config.ui.line}\n✅ Keluar dari game!\n\nGunakan !game untuk melihat daftar game.\n\n${config.ui.line}`
      );
    }

    if (command === "menu") {
      const menuCmd = commands.get("menu");
      return menuCmd?.execute(ctx);
    }

    if (command === "back" || command === "home") {
      return; // Tidak dalam game, abaikan
    }
  }

  // ============================
  // 2. RESPOND INVITE (!accept / !decline)
  // ============================
  if (command === "accept" || command === "decline") {
    const invite = gameStateManager.getInviteForPlayer(sender);

    if (!invite) {
      return reply(
        `${config.ui.line}\n┃ UNDANGAN\n${config.ui.line}\n\nTidak ada undangan game untukmu.\n\n${config.ui.line}`
      );
    }

    if (command === "decline") {
      const consumed = gameStateManager.consumeInvite(invite.id);
      if (consumed) {
        // Bebaskan pengirim
        gameStateManager.clearPlayerState(consumed.from);

        const fromNum = consumed.from.split("@")[0];
        await sendTo(
          consumed.jid || jid,
          `@${fromNum}\n${config.ui.line}\n❌ @${sender.split("@")[0]} menolak undangan game.\n\n${config.ui.line}`,
          [consumed.from, sender]
        );
      }
      return reply(
        `${config.ui.line}\n❌ Undangan ditolak.\n\n${config.ui.line}`
      );
    }

    // ACCEPT
    if (gameStateManager.isPlayerInGame(sender)) {
      return reply(
        `${config.ui.line}\n❌ Kamu sedang dalam game lain!\n\nKeluar dulu: !back\n\n${config.ui.line}`
      );
    }

    const consumed = gameStateManager.consumeInvite(invite.id);
    if (!consumed) {
      return reply(
        `${config.ui.line}\n❌ Undangan sudah kedaluwarsa.\n\n${config.ui.line}`
      );
    }

    const gameCmd = gameCommands.get(consumed.game);
    if (gameCmd && gameCmd.handleInviteAccepted) {
      return gameCmd.handleInviteAccepted({ ...ctx, invite: consumed });
    }

    return reply(
      `${config.ui.line}\n❌ Game tidak ditemukan.\n\n${config.ui.line}`
    );
  }

  // ============================
  // 3. PLAYER SEDANG DALAM STATE GAME - LOCK
  // ============================
  if (playerState) {
    const { state, game: activeGame } = playerState;
    let allowed;

    if (state === "MODE_SELECT") {
      allowed = MODE_SELECT_ALLOWED;
    } else if (state === "OPPONENT_SELECT") {
      allowed = OPPONENT_SELECT_ALLOWED;
    } else if (state === "WAITING_INVITE") {
      allowed = WAITING_INVITE_ALLOWED;
    } else if (state === "FINISHED") {
      allowed = new Set([...FINISHED_ALLOWED]);
      // Izinkan command game untuk main lagi
      allowed.add("g");
      allowed.add("gas");
      allowed.add("bet");
      allowed.add("cash");
      if (activeGame) {
        allowed.add(activeGame);
        const gameCmd = gameCommands.get(activeGame);
        if (gameCmd && gameCmd.aliases) {
          gameCmd.aliases.forEach(alias => allowed.add(alias));
        }
        // Izinkan angka 1-9 untuk TicTacToe dan FruitBomb
        if (activeGame === "tictactoe" || activeGame === "fb") {
          ["1", "2", "3", "4", "5", "6", "7", "8", "9"].forEach(n => allowed.add(n));
        }
      }
    } else if (state === "IN_GAME") {
      allowed = new Set([...IN_GAME_ALLOWED]);
      // Izinkan angka 1-9 untuk TicTacToe dan FruitBomb
      if (activeGame === "tictactoe" || activeGame === "fb") {
        ["1", "2", "3", "4", "5", "6", "7", "8", "9"].forEach(n => allowed.add(n));
      }
    }

    if (allowed && !allowed.has(command)) {
      return reply(getLockedMessage(state, activeGame));
    }
  }

  // ============================
  // 4. MODE SELECTION (!1 atau !2)
  // ============================
  if ((command === "1" || command === "2") && playerState?.state === "MODE_SELECT") {
    const mode = command === "1" ? "bot" : "multiplayer";
    gameStateManager.setMode(sender, mode);

    const gameCmd = commands.get(playerState.game);
    if (gameCmd && gameCmd.playWithMode) {
      return gameCmd.playWithMode({ ...ctx, mode, args: [] });
    }
  }

  // ============================
  // 5. TAG OPPONENT untuk multiplayer
  // ============================
  if (command === "tag" && playerState?.state === "OPPONENT_SELECT") {
    const mentioned = ctx.msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    const quoted = ctx.msg.message?.extendedTextMessage?.contextInfo?.participant;
    let opponent = null;

    if (mentioned && mentioned.length > 0) {
      opponent = mentioned[0];
    } else if (quoted) {
      opponent = quoted;
    } else if (args.length > 0) {
      opponent = args.join(" ");
    }

    if (!opponent) {
      return reply(
        `${config.ui.line}\n❌ Invalid!\n\nGunakan:\n!tag @lawan\natau\n!tag nickname\n\n${config.ui.line}`
      );
    }

    const gameCmd = commands.get(playerState.game);
    if (gameCmd && gameCmd.startMultiplayer) {
      return gameCmd.startMultiplayer({ ...ctx, opponent });
    }
  }

  // ============================
  // 6. IN-GAME QUICK COMMANDS (!g, !bet, !gas, !cash)
  //    Juga digit 1-9 saat TTT atau FruitBomb
  // ============================
  if (playerState?.state === "IN_GAME" || playerState?.state === "FINISHED") {
    const activeGame = playerState.game;
    const gameCmd = commands.get(activeGame);

    // Jika state player masih FINISHED, kita set ke IN_GAME kembali karena game dimulai lagi
    if (playerState.state === "FINISHED" && activeGame) {
      gameStateManager.setPlayerInGame(sender, activeGame);
    }

    // Angka 1-9 langsung → !g <angka> untuk TTT / FruitBomb
    if (/^[1-9]$/.test(command) && (activeGame === "tictactoe" || activeGame === "fb")) {
      if (gameCmd && gameCmd.handleGameCommand) {
        return gameCmd.handleGameCommand({
          ...ctx,
          command: "g",
          args: [command, ...args]
        });
      }
    }

    if (["g", "gas", "bet", "cash"].includes(command)) {
      if (gameCmd && gameCmd.handleGameCommand) {
        return gameCmd.handleGameCommand({ ...ctx, command });
      }
    }
  }

  // Juga handle saat MODE_SELECT dan ketik !bet
  if (command === "bet" && playerState && playerState.state !== undefined) {
    const gameCmd = commands.get(playerState.game);
    if (gameCmd && gameCmd.handleGameCommand) {
      return gameCmd.handleGameCommand({ ...ctx, command });
    }
  }

  // ============================
  // 7. GAME ENTRY COMMANDS (!reme, !bj, !fp, !ttt, !fb)
  // ============================
  const gameCmd = gameCommands.get(command);
  if (gameCmd) {
    // Jika player sudah dalam game lain, tolak
    if (playerState && playerState.game && playerState.game !== gameCmd.name &&
        !gameCmd.aliases?.includes(playerState.game)) {
      return reply(
        `${config.ui.line}\n🔒 SEDANG DALAM GAME\n${config.ui.line}\n\n` +
        `Kamu masih dalam game ${playerState.game.toUpperCase()}.\n\n` +
        `Keluar dulu: !back\n\n${config.ui.line}`
      );
    }

    // Cek registrasi
    if (gameCmd.requiresRegistration !== false && !isRegistered(sender)) {
      return reply(
        `${config.ui.line}\n┃ ${config.botName} BOT\n${config.ui.line}\n\n` +
        `Kamu belum terdaftar!\n\nGunakan:\n!register nickname\n\nContoh:\n!register AditGaming\n\n${config.ui.line}`
      );
    }

    return gameCmd.execute(ctx);
  }

  // ============================
  // 8. COMMAND BIASA (non-game)
  // ============================
  const cmd = commands.get(command);
  if (!cmd) return; // Bukan command yang dikenali

  // Cek registrasi
  if (cmd.requiresRegistration !== false && !isRegistered(sender)) {
    return reply(
      `${config.ui.line}\n┃ ${config.botName} BOT\n${config.ui.line}\n\n` +
      `Kamu belum terdaftar!\n\nGunakan:\n!register nickname\n\nContoh:\n!register AditGaming\n\n${config.ui.line}`
    );
  }

  try {
    return await cmd.execute(ctx);
  } catch (err) {
    console.error(`Error executing command "${command}":`, err);
    return reply(
      `${config.ui.line}\n┃ ERROR\n${config.ui.line}\n\n` +
      `Terjadi kesalahan.\nSilakan coba lagi.\n\n${config.ui.line}`
    );
  }
}

export default { commands, gameCommands, executeCommand };
