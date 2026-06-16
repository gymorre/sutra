// commands/fruitbomb.js
// Game Tebak Buah / Bom - pilih angka 1-9 di grid 3x3
// Bot mode & Multiplayer dengan invite system

import { db } from "../utils/database.js";
import {
  subtractBalance,
  recordGameResult,
  addBalance,
  getUser
} from "../utils/economy.js";
import { gameStateManager } from "../utils/gameState.js";
import { config } from "../config.js";
import { sleep } from "../utils/animation.js";

export const name = "fb";
export const aliases = ["fruitbomb", "buah"];
export const requiresRegistration = true;
export const isGasGame = false;

// ============================
// KONSTANTA
// ============================

const TOTAL_CELLS = 9;
const FRUITS = ["🍎", "🍊", "🍇", "🍓", "🍋", "🍉", "🍑", "🫐", "🥝"];

// Level configurations
function getLevelInfo(levelOrBombCount) {
  let count = 2; // Default normal (2 bom)
  if (typeof levelOrBombCount === "number") {
    count = levelOrBombCount;
  } else if (typeof levelOrBombCount === "string") {
    const lvl = levelOrBombCount.toLowerCase().trim();
    if (lvl === "easy" || lvl === "1") {
      count = 1;
    } else if (lvl === "hard" || lvl === "3") {
      count = 3;
    } else {
      count = 2; // Default normal
    }
  }

  if (count === 1) {
    return {
      level: "easy",
      bombs: 1,
      fruits: 8,
      multipliers: [1.0, 1.08, 1.18, 1.3, 1.5, 1.8, 2.2, 3.0, 5.0]
    };
  } else if (count === 3) {
    return {
      level: "hard",
      bombs: 3,
      fruits: 6,
      multipliers: [1.0, 1.3, 1.7, 2.2, 3.0, 5.0, 10.0]
    };
  } else {
    return {
      level: "normal",
      bombs: 2,
      fruits: 7,
      multipliers: [1.0, 1.15, 1.35, 1.6, 2.0, 2.7, 4.0, 8.0]
    };
  }
}

// ============================
// HELPERS
// ============================

function generateBoard(bombCount = 2) {
  const cells = new Array(TOTAL_CELLS).fill("fruit");
  // Tempatkan bom secara acak
  const bombPositions = [];
  while (bombPositions.length < bombCount) {
    const pos = Math.floor(Math.random() * TOTAL_CELLS);
    if (!bombPositions.includes(pos)) bombPositions.push(pos);
  }
  for (const pos of bombPositions) {
    cells[pos] = "bomb";
  }
  return { cells, bombPositions };
}

/** Render grid 3x3 dengan emoji */
function renderBoard(cells, picked = [], showAll = false) {
  const rows = [];
  for (let row = 0; row < 3; row++) {
    const cols = [];
    for (let col = 0; col < 3; col++) {
      const idx = row * 3 + col;
      const num = idx + 1;

      if (picked.includes(idx)) {
        // Sudah dipilih - tampilkan isinya
        if (cells[idx] === "bomb") {
          cols.push("💣");
        } else {
          cols.push(FRUITS[idx]);
        }
      } else if (showAll) {
        // Reveal all (akhir game)
        cols.push(cells[idx] === "bomb" ? "💣" : FRUITS[idx]);
      } else {
        // Belum dipilih - tampilkan nomor dengan box
        cols.push(`[${num}]`);
      }
    }
    rows.push(cols.join("  "));
  }
  return rows.join("\n");
}

/** Render progress bar multiplier */
function renderMultiplierBar(fruitsFound, bombCount = 2) {
  const total = TOTAL_CELLS - bombCount;
  const filled = fruitsFound;
  const bar = "🟩".repeat(filled) + "⬜".repeat(Math.max(0, total - filled));
  return `${bar} ${filled}/${total}`;
}

function getGame(jid) {
  return db.prepare("SELECT * FROM fruitbomb_games WHERE jid = ?").get(jid);
}

function saveGame(jid, bet, cells, bombs, fruitsFound, picked, multiplier, mode, opponent, whoseTurn) {
  db.prepare(`
    INSERT INTO fruitbomb_games
      (jid, bet, board, bombs, fruits_found, picked, current_multiplier, mode, opponent, whose_turn, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ongoing', ?)
    ON CONFLICT(jid) DO UPDATE SET
      bet = excluded.bet,
      board = excluded.board,
      bombs = excluded.bombs,
      fruits_found = excluded.fruits_found,
      picked = excluded.picked,
      current_multiplier = excluded.current_multiplier,
      mode = excluded.mode,
      opponent = excluded.opponent,
      whose_turn = excluded.whose_turn,
      status = excluded.status,
      created_at = excluded.created_at
  `).run(
    jid, bet,
    JSON.stringify(cells),
    JSON.stringify(bombs),
    fruitsFound,
    JSON.stringify(picked),
    multiplier,
    mode,
    opponent || null,
    whoseTurn || null,
    Date.now()
  );
}

function deleteGame(jid) {
  db.prepare("DELETE FROM fruitbomb_games WHERE jid = ?").run(jid);
}

// ============================
// ENTRY POINT (!fb / !fruitbomb)
// ============================

export async function execute({ sender, args, reply }) {
  // Cek jika ada game aktif
  const existing = getGame(sender);
  if (existing) {
    const cells = JSON.parse(existing.board);
    const picked = JSON.parse(existing.picked);
    const bombCount = JSON.parse(existing.bombs).length;
    const levelInfo = getLevelInfo(bombCount);
    const mult = existing.current_multiplier.toFixed(2);
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
      `Kamu masih punya game aktif!\n\n` +
      renderBoard(cells, picked) + "\n\n" +
      `${renderMultiplierBar(existing.fruits_found, bombCount)}\n` +
      `💰 Bet: ${config.currencySymbol}${existing.bet}\n` +
      `🍎 Buah ditemukan: ${existing.fruits_found}\n` +
      `📈 Multiplier: ${mult}x\n\n` +
      `Pilih kotak: !g <1-9>\nCairkan: !cash\nKeluar: !back\n\n` +
      `${config.ui.line}`
    );
  }

  let level = "normal";
  let bet = null;

  if (args && args.length > 0) {
    for (const arg of args) {
      const cleaned = arg.toLowerCase().trim();
      if (["easy", "normal", "hard"].includes(cleaned)) {
        level = cleaned;
      } else if (!isNaN(parseInt(cleaned, 10))) {
        bet = parseInt(cleaned, 10);
      }
    }
  }

  // Set state langsung ke IN_GAME dengan mode bot
  gameStateManager.setPlayerInGame(sender, "fb");
  gameStateManager.setMode(sender, "bot");

  if (bet && bet > 0) {
    gameStateManager.updateGameData(sender, { bet, level });
    return startBotGame({ sender, bet, level, reply });
  }

  return reply(
    `${config.ui.line}\n┃ 🍎 FRUIT BOMB (SOLO vs BOT)\n${config.ui.line}\n\n` +
    `Grid 3x3 berisi buah 🍎 dan bom 💣 sesuai level pilihan:\n\n` +
    `🟢 *EASY* (1 Bom) → Multiplier maks 5.0x\n` +
    `🟡 *NORMAL* (2 Bom) → Multiplier maks 8.0x\n` +
    `🔴 *HARD* (3 Bom) → Multiplier maks 10.0x\n\n` +
    `• Pilih kotak 1-9\n• Kena 🍎 = multiplier naik!\n• Kena 💣 = KALAH!\n• Cairkan kapan saja dengan !cash\n\n` +
    `Cara bermain:\n` +
    `!fb <level> <bet>  (atau sebaliknya)\n` +
    `Contoh: !fb easy 500\n\n` +
    `Atau langsung main (default normal):\n` +
    `!g <bet>\n\n` +
    `Keluar: !back atau !menu\n\n${config.ui.line}`
  );
}

// ============================
// PLAY WITH MODE (bot atau multiplayer) dipanggil setelah !1 / !2
// ============================

export async function playWithMode({ sender, args, reply, mode }) {
  const playerState = gameStateManager.getPlayerState(sender);
  
  let level = playerState?.data?.level || "normal";
  let bet = playerState?.data?.bet;

  if (args && args.length > 0) {
    for (const arg of args) {
      const cleaned = arg.toLowerCase().trim();
      if (["easy", "normal", "hard"].includes(cleaned)) {
        level = cleaned;
      } else if (!isNaN(parseInt(cleaned, 10))) {
        bet = parseInt(cleaned, 10);
      }
    }
  }

  if (!bet || isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\n\n${config.ui.line}`
    );
  }

  if (mode === "multiplayer") {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nFruitbomb hanya bisa dimainkan vs Bot.\n\n${config.ui.line}`
    );
  }

  gameStateManager.setMode(sender, "bot");
  gameStateManager.updateGameData(sender, { bet, level });
  return startBotGame({ sender, bet, level, reply });
}

// ============================
// START MULTIPLAYER (setelah !tag @opponent)
// ============================

export async function startMultiplayer({ sock, msg, sender, reply, jid, opponent, sendTo }) {
  const playerState = gameStateManager.getPlayerState(sender);
  const bet = playerState?.data?.bet;

  if (!bet) {
    return reply(
      `${config.ui.line}\n❌ Bet tidak ditemukan!\n\nCoba lagi: !fb <bet>\n\n${config.ui.line}`
    );
  }

  const senderUser = getUser(sender);
  const opponentUser = getUser(opponent);

  if (!opponentUser) {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nLawan tidak ditemukan atau belum register.\n\n${config.ui.line}`
    );
  }

  if (opponent === sender) {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nKamu tidak bisa melawan diri sendiri!\n\n${config.ui.line}`
    );
  }

  if (gameStateManager.isPlayerInGame(opponent)) {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\n@${opponent.split("@")[0]} sedang dalam game lain!\n\n${config.ui.line}`,
      [opponent]
    );
  }

  // Buat invite
  const inviteId = gameStateManager.createInvite(sender, opponent, "fb", bet, jid);

  const opponentNum = opponent.split("@")[0];
  const senderNum = sender.split("@")[0];

  // Kirim invite ke opponent
  await sendTo(
    jid,
    `@${opponentNum}\n${config.ui.line}\n┃ 🍎 UNDANGAN FRUIT BOMB\n${config.ui.line}\n\n` +
    `@${senderNum} mengajakmu bermain Fruit Bomb!\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet} masing-masing\n\n` +
    `Ketik untuk menjawab:\n✅ !accept\n❌ !decline\n\n` +
    `⏰ Berlaku 2 menit\n\n${config.ui.line}`,
    [opponent, sender]
  );

  return reply(
    `${config.ui.line}\n┃ 🍎 FRUIT BOMB - MULTIPLAYER\n${config.ui.line}\n\n` +
    `📨 Undangan dikirim ke @${opponentNum}!\n\nMenunggu jawaban...\n\n${config.ui.line}`,
    [opponent]
  );
}

// ============================
// ACCEPT INVITE (dipanggil dari command handler)
// ============================

export async function handleInviteAccepted({ sock, msg, sender, reply, jid, sendTo, invite }) {
  const { from, bet } = invite;
  const fromUser = getUser(from);
  const toUser = getUser(sender);
  const fromNum = from.split("@")[0];
  const toNum = sender.split("@")[0];

  // Cek saldo keduanya
  const deduct1 = await subtractBalance(from, bet, "BET_FB_MP");
  if (!deduct1.success) {
    gameStateManager.clearPlayerState(from);
    return reply(
      `${config.ui.line}\n❌ Saldo @${fromNum} tidak cukup!\n\nGame dibatalkan.\n\n${config.ui.line}`,
      [from]
    );
  }

  const deduct2 = await subtractBalance(sender, bet, "BET_FB_MP");
  if (!deduct2.success) {
    await addBalance(from, bet, "REFUND_FB_MP");
    gameStateManager.clearPlayerState(from);
    return reply(
      `${config.ui.line}\n❌ Saldo kamu tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduct2.balance}\n\n${config.ui.line}`
    );
  }

  // Generate board SAMA untuk keduanya (shared board, turn-based)
  const { cells, bombPositions } = generateBoard();
  const picked = [];

  // Simpan game untuk player 1 (from) sebagai "pemilik" board
  saveGame(from, bet, cells, bombPositions, 0, picked, 1.0, "multiplayer", sender, from);

  // Set state kedua player ke IN_GAME
  gameStateManager.setMode(from, "multiplayer");
  gameStateManager.setOpponent(from, sender);
  gameStateManager.updateGameData(from, { bet, gameOwner: from, fruitBombSharedJid: from });

  gameStateManager.setModeSelection(sender, "fb");
  gameStateManager.setMode(sender, "multiplayer");
  gameStateManager.setOpponent(sender, from);
  gameStateManager.updateGameData(sender, { bet, gameOwner: from, fruitBombSharedJid: from });

  const board = renderBoard(cells, []);

  // === ANIMASI START ===
  await sendTo(
    jid,
    `@${fromNum} @${toNum}\n${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\n` +
    `⚔️ Mempersiapkan arena...\n\n3️⃣ 2️⃣ 1️⃣ GO!`,
    [from, sender]
  );
  await sleep(1000);

  await sendTo(
    jid,
    `@${fromNum} @${toNum}\n${config.ui.line}\n┃ 🍎 FRUIT BOMB - MULTIPLAYER DIMULAI!\n${config.ui.line}\n\n` +
    `👤 Player 1: @${fromNum}\n👤 Player 2: @${toNum}\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet} masing-masing\n\n` +
    board + "\n\n" +
    `${renderMultiplierBar(0)}\n\n` +
    `🎯 Giliran: @${fromNum}\n\nPilih kotak: !g <1-9>\n\n` +
    `${config.ui.line}`,
    [from, sender]
  );
}

// ============================
// HANDLE GAME COMMAND (!g, !bet, !cash) dari command handler
// ============================

export async function handleGameCommand({ sock, msg, sender, args, reply, jid, command, sendTo }) {
  const playerState = gameStateManager.getPlayerState(sender);

  if (command === "bet") {
    let level = playerState?.data?.level || "normal";
    let bet = null;

    if (args && args.length > 0) {
      for (const arg of args) {
        const cleaned = arg.toLowerCase().trim();
        if (["easy", "normal", "hard"].includes(cleaned)) {
          level = cleaned;
        } else if (!isNaN(parseInt(cleaned, 10))) {
          bet = parseInt(cleaned, 10);
        }
      }
    }

    if (!bet || bet <= 0) {
      bet = playerState?.data?.bet;
    }

    if (!bet || bet <= 0) {
      return reply(
        `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nFormat salah!\n\nGunakan: !bet <jumlah> [level]\natau: !bet [level] <jumlah>\n\n${config.ui.line}`
      );
    }

    gameStateManager.updateGameData(sender, { bet, level });
    return reply(
      `${config.ui.line}\n✅ Bet & Level tersimpan!\n\n💰 Bet: ${config.currencySymbol}${bet}\n📊 Level: ${level.toUpperCase()}\n\nMain sekarang: !g\n\n${config.ui.line}`
    );
  }

  if (command === "cash") {
    return handleCashOut({ sender, reply });
  }

  if (command === "g" || command === "gas") {
    const boardOwnerJid = playerState?.data?.fruitBombSharedJid || sender;
    const existing = getGame(boardOwnerJid);

    // Jika belum ada game, mulai game baru
    if (!existing) {
      let level = playerState?.data?.level || "normal";
      let bet = playerState?.data?.bet;

      if (args && args.length > 0) {
        for (const arg of args) {
          const cleaned = arg.toLowerCase().trim();
          if (["easy", "normal", "hard"].includes(cleaned)) {
            level = cleaned;
          } else if (!isNaN(parseInt(cleaned, 10))) {
            bet = parseInt(cleaned, 10);
          }
        }
      }

      if (!bet || isNaN(bet) || bet <= 0) {
        return reply(
          `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\natau: !g <bet> [level]\n\nContoh: !g 500 normal\n\n${config.ui.line}`
        );
      }

      const mode = gameStateManager.getMode(sender) || "bot";
      if (mode === "multiplayer") {
        const opponent = gameStateManager.getOpponent(sender);
        if (!opponent) {
          return reply(
            `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nTag lawan dulu:\n!tag @lawan\n\n${config.ui.line}`
          );
        }
      }

      gameStateManager.updateGameData(sender, { bet, level });
      return startBotGame({ sender, bet, level, reply });
    }

    // Sudah ada game, proses move
    const moveArg = args[0];
    const pos = moveArg ? parseInt(moveArg, 10) : null;

    const cells = JSON.parse(existing.board);
    const picked = JSON.parse(existing.picked);
    const bombsArray = JSON.parse(existing.bombs);
    const bombCount = bombsArray.length;
    const levelInfo = getLevelInfo(bombCount);

    if (!pos || pos < 1 || pos > 9) {
      return reply(
        `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
        renderBoard(cells, picked) + "\n\n" +
        `${renderMultiplierBar(existing.fruits_found, bombCount)}\n` +
        `🍎 Buah: ${existing.fruits_found} | 📈 ${existing.current_multiplier.toFixed(2)}x\n\n` +
        `Pilih: !g <1-9>\nCairkan: !cash\n\n${config.ui.line}`
      );
    }

    return handleMove({ sender, pos, reply, jid, sendTo, sock, msg });
  }
}

// ============================
// START BOT GAME
// ============================

async function startBotGame({ sender, bet, level = "normal", reply }) {
  const deduction = await subtractBalance(sender, bet, "BET_FB");
  if (!deduction.success) {
    gameStateManager.clearPlayerState(sender);
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\n❌ Saldo tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduction.balance}\n\n${config.ui.line}`
    );
  }

  const levelInfo = getLevelInfo(level);
  const { cells, bombPositions } = generateBoard(levelInfo.bombs);
  saveGame(sender, bet, cells, bombPositions, 0, [], 1.0, "bot", null, sender);
  gameStateManager.setPlayerInGame(sender, "fb");

  // === ANIMASI SETUP ===
  await reply(
    `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
    `🎰 Menyusun arena...\n\n` +
    `📦 📦 📦\n📦 📦 📦\n📦 📦 📦\n\n` +
    `💣 ${levelInfo.bombs} bom tersembunyi...`
  );
  await sleep(800);

  return reply(
    `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet}\n\n` +
    renderBoard(cells, []) + "\n\n" +
    `${renderMultiplierBar(0, levelInfo.bombs)}\n` +
    `📈 Multiplier: 1.0x\n\n` +
    `🎯 Pilih kotak 1-9!\n\nCairkan: !cash\nKeluar: !back\n\n${config.ui.line}`
  );
}

// ============================
// HANDLE MOVE
// ============================

async function handleMove({ sender, pos, reply, jid, sendTo, sock, msg }) {
  const pState = gameStateManager.getPlayerState(sender);
  const boardOwnerJid = pState?.data?.fruitBombSharedJid || sender;
  const game = getGame(boardOwnerJid);

  if (!game) {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nTidak ada game aktif.\n\nMulai: !fb <bet>\n\n${config.ui.line}`
    );
  }

  // Cek giliran untuk multiplayer
  if (game.mode === "multiplayer" && game.whose_turn !== sender) {
    const otherNum = game.whose_turn?.split("@")[0];
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nBukan giliranmu!\n\nGiliran: @${otherNum}\n\n${config.ui.line}`,
      [game.whose_turn]
    );
  }

  const cells = JSON.parse(game.board);
  const picked = JSON.parse(game.picked);
  const idx = pos - 1;

  // Cek sudah dipilih
  if (picked.includes(idx)) {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nKotak ${pos} sudah dipilih!\n\n` +
      renderBoard(cells, picked) + "\n\n" +
      `Pilih kotak lain: !g <1-9>\n\n${config.ui.line}`
    );
  }

  const newPicked = [...picked, idx];
  const isBomb = cells[idx] === "bomb";

  // === ANIMASI MEMBUKA KOTAK ===
  await reply(
    `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\n` +
    `🎯 Membuka kotak ${pos}...\n\n` +
    `📦 → ❓\n⏳ ...`
  );
  await sleep(600);

  const bombPositions = JSON.parse(game.bombs);
  const bombCount = bombPositions.length;
  const levelInfo = getLevelInfo(bombCount);

  if (isBomb) {
    // === ANIMASI LEDAKAN ===
    await reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\n` +
      `💣 Kotak bergetar...\n\n` +
      `   📦💥\n   tick... tick...`
    );
    await sleep(700);

    // KALAH - reveal semua
    deleteGame(boardOwnerJid);
    gameStateManager.setFinished(boardOwnerJid);

    if (game.mode === "multiplayer") {
      const opponent = game.opponent;
      gameStateManager.setFinished(opponent);
      
      const winnerJid = sender === boardOwnerJid ? opponent : boardOwnerJid;
      const loserJid = sender;

      await recordGameResult(loserJid, false, 0, "GAME_FB_MP_LOSE");
      await recordGameResult(winnerJid, true, game.bet * 2, "GAME_FB_MP_WIN");
      await addBalance(winnerJid, game.bet * 2, "WIN_FB_MP");

      const loserNum = loserJid.split("@")[0];
      const winNum = winnerJid.split("@")[0];
      return reply(
        `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
        `💥💥💥 BOOM! 💥💥💥\n\n` +
        renderBoard(cells, newPicked, true) + "\n\n" +
        `💣 @${loserNum} kena BOM!\n\n` +
        `🎊🎉🎊\n` +
        `🏆 @${winNum} MENANG!\n💰 +${config.currencySymbol}${game.bet * 2}\n\n${config.ui.line}`,
        [loserJid, winnerJid]
      );
    }

    await recordGameResult(sender, false, 0, "GAME_FB");
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
      `💥💥💥 BOOM! 💥💥💥\n\n` +
      renderBoard(cells, newPicked, true) + "\n\n" +
      `💣 BOM! Kamu KALAH!\n` +
      `💸 -${config.currencySymbol}${game.bet}\n\n` +
      `Mau coba lagi?\n!fb <bet>\n\nKeluar: !back\n\n${config.ui.line}`
    );
  }

  // === ANIMASI BUAH DITEMUKAN ===
  const fruit = FRUITS[idx];

  // BUAH - update state
  const newFruits = game.fruits_found + 1;
  const newMult = levelInfo.multipliers[Math.min(newFruits, levelInfo.multipliers.length - 1)];
  const potentialWin = Math.floor(game.bet * newMult);

  // Semua buah ditemukan = jackpot
  if (newFruits >= TOTAL_CELLS - bombCount) {
    deleteGame(boardOwnerJid);
    gameStateManager.setFinished(boardOwnerJid);

    if (game.mode === "multiplayer") {
      const opponent = game.opponent;
      gameStateManager.setFinished(opponent);
      
      const winnerJid = sender;
      const loserJid = sender === boardOwnerJid ? opponent : boardOwnerJid;
      
      await recordGameResult(winnerJid, true, potentialWin, "GAME_FB_MP_JACKPOT");
      await addBalance(winnerJid, potentialWin, "WIN_FB_MP_JACKPOT");
      await recordGameResult(loserJid, false, 0, "GAME_FB_MP_LOSE");

      const winnerNum = winnerJid.split("@")[0];
      return reply(
        `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
        `✨ Kotak ${pos} = ${fruit}!\n\n` +
        renderBoard(cells, newPicked, true) + "\n\n" +
        `🎊🎉🎊🎉🎊\n\n` +
        `🏆 JACKPOT! @${winnerNum} menemukan SEMUA buah!\n` +
        `💰 +${config.currencySymbol}${potentialWin} (${newMult.toFixed(2)}x)\n\n${config.ui.line}`,
        [winnerJid, loserJid]
      );
    }

    await recordGameResult(sender, true, potentialWin, "GAME_FB_JACKPOT");
    await addBalance(sender, potentialWin, "WIN_FB_JACKPOT");
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
      `✨ Kotak ${pos} = ${fruit}!\n\n` +
      renderBoard(cells, newPicked, true) + "\n\n" +
      `🎊🎉🎊🎉🎊\n\n` +
      `🏆 JACKPOT! Semua buah ditemukan!\n` +
      `💰 +${config.currencySymbol}${potentialWin} (${newMult.toFixed(2)}x)\n\nKeluar: !back\n\n${config.ui.line}`
    );
  }

  // Lanjut game
  let nextTurn = sender;
  if (game.mode === "multiplayer") {
    nextTurn = sender === boardOwnerJid ? game.opponent : boardOwnerJid;
  }

  saveGame(
    boardOwnerJid,
    game.bet, cells,
    bombPositions,
    newFruits, newPicked, newMult,
    game.mode, game.opponent, nextTurn
  );

  const nextTurnNum = nextTurn?.split("@")[0];
  const mentionsList = game.mode === "multiplayer" ? [boardOwnerJid, game.opponent] : [sender];

  return reply(
    `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
    `✨ Kotak ${pos} = ${fruit}! AMAN!\n\n` +
    renderBoard(cells, newPicked) + "\n\n" +
    `${renderMultiplierBar(newFruits, bombCount)}\n` +
    `🍎 Buah ditemukan: ${newFruits}\n` +
    `📈 Multiplier: ${newMult.toFixed(2)}x\n` +
    `💰 Potensi menang: ${config.currencySymbol}${potentialWin}\n\n` +
    (game.mode === "multiplayer"
      ? `🎯 Giliran: @${nextTurnNum}\n\nPilih kotak: !g <1-9>\nKeluar: !back\n\n`
      : `Pilih lagi: !g <1-9>\nAtau cairkan: !cash\nKeluar: !back\n\n`) +
    `${config.ui.line}`,
    mentionsList
  );
}

// ============================
// CASH OUT
// ============================

async function handleCashOut({ sender, reply }) {
  const game = getGame(sender);

  if (!game) {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nTidak ada game aktif untuk dicairkan.\n\n${config.ui.line}`
    );
  }

  if (game.mode === "multiplayer") {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nCash out tidak bisa di mode multiplayer!\n\n${config.ui.line}`
    );
  }

  if (game.fruits_found === 0) {
    return reply(
      `${config.ui.line}\n┃ 🍎 FRUIT BOMB\n${config.ui.line}\n\nTemukan minimal 1 buah dulu sebelum cash out!\n\n${config.ui.line}`
    );
  }

  const bombPositions = JSON.parse(game.bombs);
  const bombCount = bombPositions.length;
  const levelInfo = getLevelInfo(bombCount);
  const mult = game.current_multiplier;
  const payout = Math.floor(game.bet * mult);

  deleteGame(sender);
  gameStateManager.setFinished(sender);

  const newBalance = await recordGameResult(sender, true, payout, "GAME_FB_CASHOUT");
  await addBalance(sender, payout, "WIN_FB_CASHOUT");

  return reply(
    `${config.ui.line}\n┃ 🍎 FRUIT BOMB (${levelInfo.level.toUpperCase()})\n${config.ui.line}\n\n` +
    `💵💵💵 CASH OUT! 💵💵💵\n\n` +
    `🍎 Buah: ${game.fruits_found}\n` +
    `📈 Multiplier: ${mult.toFixed(2)}x\n` +
    `💰 Kamu dapat: ${config.currencySymbol}${payout}\n\n` +
    `💵 Balance sekarang: ${config.currencySymbol}${newBalance}\n\n` +
    `Main lagi: !fb <bet>\nKeluar: !back\n\n${config.ui.line}`
  );
}

export default {
  name,
  aliases,
  requiresRegistration,
  isGasGame,
  execute,
  playWithMode,
  startMultiplayer,
  handleGameCommand,
  handleInviteAccepted
};
