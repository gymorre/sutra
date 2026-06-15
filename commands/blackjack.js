// commands/blackjack.js
// Blackjack standar dengan Hit/Stand, Dealer AI, Bust, Natural Blackjack
// Flow baru: !bj → pilih mode → !g hit / !g stand

import { db } from "../utils/database.js";
import { subtractBalance, recordGameResult, addBalance, getUser } from "../utils/economy.js";
import { gameStateManager } from "../utils/gameState.js";
import { config } from "../config.js";

export const name = "bj";
export const aliases = ["blackjack"];
export const requiresRegistration = true;
export const isGasGame = false;

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardValue(card) {
  const rank = card.slice(0, -1);
  if (rank === "A") return 11;
  if (["J", "Q", "K"].includes(rank)) return 10;
  return parseInt(rank, 10);
}

function handValue(hand) {
  let total = hand.reduce((sum, card) => sum + cardValue(card), 0);
  let aces = hand.filter((c) => c.startsWith("A")).length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
}

function formatHand(hand) {
  return hand.join(" ");
}

function getGame(jid) {
  return db.prepare("SELECT * FROM blackjack_games WHERE jid = ?").get(jid);
}

function saveGame(jid, bet, playerHand, dealerHand, deck, status) {
  db.prepare(`
    INSERT INTO blackjack_games (jid, bet, player_hand, dealer_hand, deck, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(jid) DO UPDATE SET
      bet = excluded.bet,
      player_hand = excluded.player_hand,
      dealer_hand = excluded.dealer_hand,
      deck = excluded.deck,
      status = excluded.status,
      created_at = excluded.created_at
  `).run(jid, bet, JSON.stringify(playerHand), JSON.stringify(dealerHand), JSON.stringify(deck), status, Date.now());
}

function deleteGame(jid) {
  db.prepare("DELETE FROM blackjack_games WHERE jid = ?").run(jid);
}

// ============================
// ENTRY (!bj / !blackjack)
// ============================

export async function execute({ sender, args, reply }) {
  const existing = getGame(sender);

  // Jika ada game aktif, tampilkan state
  if (existing) {
    const playerHand = JSON.parse(existing.player_hand);
    const dealerHand = JSON.parse(existing.dealer_hand);
    return reply(
      `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n` +
      `Game aktif!\n\n` +
      `🎴 Tangan: ${formatHand(playerHand)} (${handValue(playerHand)})\n` +
      `🎴 Dealer: ${dealerHand[0]} ❓\n\n` +
      `!g hit  → ambil kartu\n!g stand → berhenti\n\n` +
      `Keluar: !back\n\n${config.ui.line}`
    );
  }

  const betArg = args[0];
  const bet = betArg ? parseInt(betArg, 10) : null;

  if (bet && bet > 0) {
    gameStateManager.setModeSelection(sender, "bj");
    gameStateManager.updateGameData(sender, { bet });
    return reply(
      `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n` +
      `💰 Bet: ${config.currencySymbol}${bet}\n\n` +
      `Pilih mode:\n!1 = 🤖 Lawan BOT\n\n` +
      `(Blackjack hanya bisa vs Bot)\n\nKeluar: !back\n\n${config.ui.line}`
    );
  }

  gameStateManager.setModeSelection(sender, "bj");
  return reply(
    `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n` +
    `Blackjack standar! Hit/Stand/Bust.\nNatural Blackjack bayar 3:2!\n\n` +
    `Set bet:\n!bet <jumlah>\n\nLangsung main:\n!g <jumlah>\n\nHanya mode BOT tersedia.\n!1 → mulai\n\nKeluar: !back\n\n${config.ui.line}`
  );
}

// ============================
// PLAY WITH MODE
// ============================

export async function playWithMode({ sender, args, reply, mode }) {
  const playerState = gameStateManager.getPlayerState(sender);
  let bet = args[0] ? parseInt(args[0], 10) : playerState?.data?.bet;

  if (!bet || isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\n\nContoh: !bet 500\n\n${config.ui.line}`
    );
  }

  if (mode === "multiplayer") {
    return reply(
      `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\nBlackjack hanya bisa dimainkan vs Bot.\n\nGunakan !1 untuk mulai.\n\n${config.ui.line}`
    );
  }

  gameStateManager.setMode(sender, "bot");
  gameStateManager.updateGameData(sender, { bet });
  return startGame({ sender, bet, reply });
}

// ============================
// HANDLE GAME COMMANDS (!g, !bet, !gas)
// ============================

export async function handleGameCommand({ sender, args, reply, command }) {
  const playerState = gameStateManager.getPlayerState(sender);
  const existing = getGame(sender);

  if (command === "bet") {
    const bet = args[0] ? parseInt(args[0], 10) : null;
    if (!bet || bet <= 0) {
      return reply(
        `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\nFormat salah!\n\nGunakan: !bet <jumlah>\n\n${config.ui.line}`
      );
    }
    gameStateManager.updateGameData(sender, { bet });
    return reply(
      `${config.ui.line}\n✅ Bet tersimpan!\n\n💰 ${config.currencySymbol}${bet}\n\nMain sekarang: !g\n\n${config.ui.line}`
    );
  }

  if (command === "g" || command === "gas") {
    // Jika ada game aktif, cek hit/stand
    if (existing) {
      const sub = (args[0] || "").toLowerCase();
      if (sub === "hit" || sub === "h") return handleAction(sender, "hit", reply);
      if (sub === "stand" || sub === "s") return handleAction(sender, "stand", reply);

      // Tidak ada sub command tapi ada game aktif
      const playerHand = JSON.parse(existing.player_hand);
      const dealerHand = JSON.parse(existing.dealer_hand);
      return reply(
        `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n` +
        `🎴 Tangan: ${formatHand(playerHand)} (${handValue(playerHand)})\n` +
        `🎴 Dealer: ${dealerHand[0]} ❓\n\n` +
        `!g hit  → ambil kartu\n!g stand → berhenti\n\n${config.ui.line}`
      );
    }

    // Belum ada game, mulai baru
    let bet = args[0] && !isNaN(parseInt(args[0])) ? parseInt(args[0], 10) : playerState?.data?.bet;

    if (!bet || isNaN(bet) || bet <= 0) {
      return reply(
        `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\nSet bet dulu!\n\nGunakan: !bet <jumlah>\natau: !g <jumlah>\n\n${config.ui.line}`
      );
    }

    if (args[0] && !isNaN(parseInt(args[0]))) gameStateManager.updateGameData(sender, { bet });
    return startGame({ sender, bet, reply });
  }
}

// ============================
// START GAME
// ============================

async function startGame({ sender, bet, reply }) {
  const deduction = await subtractBalance(sender, bet, "BET_BLACKJACK");
  if (!deduction.success) {
    gameStateManager.clearPlayerState(sender);
    return reply(
      `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n❌ Saldo tidak cukup!\n💰 Balance: ${config.currencySymbol}${deduction.balance}\n\n${config.ui.line}`
    );
  }

  const deck = createDeck();
  const playerHand = [deck.pop(), deck.pop()];
  const dealerHand = [deck.pop(), deck.pop()];

  const playerValue = handValue(playerHand);
  const dealerValue = handValue(dealerHand);

  // Natural blackjack check
  const playerBJ = playerValue === 21;
  const dealerBJ = dealerValue === 21;

  if (playerBJ || dealerBJ) {
    let resultText, payout, won;

    if (playerBJ && dealerBJ) {
      payout = bet;
      won = false;
      resultText = `🤝 *PUSH (SERI)*\n\nKamu Blackjack, Dealer juga Blackjack.\nBet dikembalikan.`;
    } else if (playerBJ) {
      payout = Math.floor(bet * 2.5);
      won = true;
      resultText = `🎉 *NATURAL BLACKJACK!*\n\n💰 Payout 3:2 → +${config.currencySymbol}${payout}`;
    } else {
      payout = 0;
      won = false;
      resultText = `❌ *KALAH!*\n\nDealer Blackjack.\n💸 -${config.currencySymbol}${bet}`;
    }

    const newBalance = await recordGameResult(sender, won, payout, "GAME_BLACKJACK");
    gameStateManager.clearPlayerState(sender);

    return reply(
      `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n` +
      `🎴 Kamu: ${formatHand(playerHand)} (${playerValue})\n` +
      `🎴 Dealer: ${formatHand(dealerHand)} (${dealerValue})\n\n` +
      `${resultText}\n\n💵 Balance: ${config.currencySymbol}${newBalance}\n\n` +
      `Main lagi: !g <bet>\nKeluar: !back\n\n${config.ui.line}`
    );
  }

  saveGame(sender, bet, playerHand, dealerHand, deck, "ongoing");
  gameStateManager.setPlayerInGame(sender, "bj");

  return reply(
    `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n` +
    `💰 Bet: ${config.currencySymbol}${bet}\n\n` +
    `🎴 Tangan: ${formatHand(playerHand)} (${playerValue})\n` +
    `🎴 Dealer: ${dealerHand[0]} ❓\n\n` +
    `!g hit  → ambil kartu\n!g stand → berhenti\n\nKeluar: !back\n\n${config.ui.line}`
  );
}

// ============================
// HANDLE ACTION (hit / stand)
// ============================

async function handleAction(sender, action, reply) {
  const game = getGame(sender);
  if (!game) {
    gameStateManager.clearPlayerState(sender);
    return reply(
      `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\nTidak ada game aktif.\n\nMulai: !bj <bet>\n\n${config.ui.line}`
    );
  }

  let playerHand = JSON.parse(game.player_hand);
  let dealerHand = JSON.parse(game.dealer_hand);
  let deck = JSON.parse(game.deck);
  const bet = game.bet;

  if (action === "hit") {
    playerHand.push(deck.pop());
    const playerValue = handValue(playerHand);

    if (playerValue > 21) {
      deleteGame(sender);
      gameStateManager.clearPlayerState(sender);
      const newBalance = await recordGameResult(sender, false, 0, "GAME_BLACKJACK");
      return reply(
        `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n` +
        `🎴 Tangan: ${formatHand(playerHand)} (${playerValue})\n\n` +
        `💥 *BUST!* Melebihi 21!\n💸 -${config.currencySymbol}${bet}\n\n` +
        `💵 Balance: ${config.currencySymbol}${newBalance}\n\nMain lagi: !g <bet>\nKeluar: !back\n\n${config.ui.line}`
      );
    }

    saveGame(sender, bet, playerHand, dealerHand, deck, "ongoing");
    return reply(
      `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n` +
      `🎴 Tangan: ${formatHand(playerHand)} (${playerValue})\n` +
      `🎴 Dealer: ${dealerHand[0]} ❓\n\n` +
      `!g hit  → ambil kartu\n!g stand → berhenti\n\n${config.ui.line}`
    );
  }

  // === STAND ===
  let playerValue = handValue(playerHand);
  let dealerValue = handValue(dealerHand);

  while (dealerValue < 17) {
    dealerHand.push(deck.pop());
    dealerValue = handValue(dealerHand);
  }

  deleteGame(sender);
  gameStateManager.clearPlayerState(sender);

  let resultText, payout, won;

  if (dealerValue > 21) {
    payout = bet * 2;
    won = true;
    resultText = `🎉 *DEALER BUST!*\n\n💰 +${config.currencySymbol}${payout}`;
  } else if (playerValue > dealerValue) {
    payout = bet * 2;
    won = true;
    resultText = `✅ *MENANG!*\n\n💰 +${config.currencySymbol}${payout}`;
  } else if (playerValue === dealerValue) {
    payout = bet;
    won = false;
    resultText = `🤝 *PUSH (SERI)*\n\nBet dikembalikan.`;
  } else {
    payout = 0;
    won = false;
    resultText = `❌ *KALAH!*\n\n💸 -${config.currencySymbol}${bet}`;
  }

  const newBalance = await recordGameResult(sender, won, payout, "GAME_BLACKJACK");

  return reply(
    `${config.ui.line}\n┃ 🃏 BLACKJACK\n${config.ui.line}\n\n` +
    `🎴 Kamu: ${formatHand(playerHand)} (${playerValue})\n` +
    `🎴 Dealer: ${formatHand(dealerHand)} (${dealerValue})\n\n` +
    `${resultText}\n\n💵 Balance: ${config.currencySymbol}${newBalance}\n\n` +
    `Main lagi: !g <bet>\nKeluar: !back\n\n${config.ui.line}`
  );
}

export default {
  name, aliases, requiresRegistration, isGasGame,
  execute, playWithMode, handleGameCommand
};