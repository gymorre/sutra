// commands/blackjack.js
// Blackjack standar dengan Hit/Stand, Dealer AI, Bust, Natural Blackjack
// Dimainkan via: !gas bj <bet>  lalu  !gas bj hit / !gas bj stand

import { db } from "../utils/database.js";
import { subtractBalance, recordGameResult } from "../utils/economy.js";
import { config } from "../config.js";

export const name = "bj";
export const aliases = ["blackjack"];
export const requiresRegistration = false;
export const isGasGame = true;

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = [
  "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"
];

function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  // Shuffle (Fisher-Yates)
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

  while (total > 21 && aces > 0) {
    total -= 10;
    aces--;
  }
  return total;
}

function formatHand(hand) {
  return hand.join(" ");
}

function getGame(jid) {
  return db.prepare("SELECT * FROM blackjack_games WHERE jid = ?").get(jid);
}

function saveGame(jid, bet, playerHand, dealerHand, deck, status) {
  db.prepare(
    `
    INSERT INTO blackjack_games (jid, bet, player_hand, dealer_hand, deck, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(jid) DO UPDATE SET
      bet = excluded.bet,
      player_hand = excluded.player_hand,
      dealer_hand = excluded.dealer_hand,
      deck = excluded.deck,
      status = excluded.status,
      created_at = excluded.created_at
  `
  ).run(
    jid,
    bet,
    JSON.stringify(playerHand),
    JSON.stringify(dealerHand),
    JSON.stringify(deck),
    status,
    Date.now()
  );
}

function deleteGame(jid) {
  db.prepare("DELETE FROM blackjack_games WHERE jid = ?").run(jid);
}

// ===== INFO =====
export async function execute({ reply }) {
  return reply(
    `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\nRule blackjack standar. Hit / Stand / Bust / Natural Blackjack (3:2).\n\nCara bermain:\n!gas bj <bet>\n\nLalu lanjutkan dengan:\n!gas bj hit\n!gas bj stand\n\nContoh:\n!gas bj 500\n\n${config.ui.line}`
  );
}

// ===== PLAY =====
export async function play({ sender, args, reply }) {
  const existingGame = getGame(sender);
  const sub = (args[0] || "").toLowerCase();

  // ===== HIT / STAND =====
  if (existingGame && (sub === "hit" || sub === "stand" || sub === "h" || sub === "s")) {
    return handleAction(sender, sub.startsWith("h") ? "hit" : "stand", reply);
  }

  if (existingGame) {
    return reply(
      `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\nKamu sedang dalam game!\n\nGunakan:\n!gas bj hit\n!gas bj stand\n\n${config.ui.line}\n\n🎴 Tangan kamu: ${formatHand(JSON.parse(existingGame.player_hand))} (${handValue(JSON.parse(existingGame.player_hand))})\n🎴 Dealer: ${JSON.parse(existingGame.dealer_hand)[0]} ❓\n\n${config.ui.line}`
    );
  }

  // ===== START NEW GAME =====
  const bet = parseInt(args[0], 10);
  if (!args[0] || isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\nFormat salah!\n\nGunakan:\n!gas bj <bet>\n\nContoh:\n!gas bj 500\n\nSetelah game dimulai gunakan:\n!gas bj hit\n!gas bj stand\n\n${config.ui.line}`
    );
  }

  const deduction = await subtractBalance(sender, bet, "BET_BLACKJACK");
  if (!deduction.success) {
    return reply(
      `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\n❌ Saldo tidak cukup!\n💰 Balance kamu: ${config.currencySymbol}${deduction.balance}\n\n${config.ui.line}`
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
    let resultText;
    let payout;
    let won;

    if (playerBJ && dealerBJ) {
      payout = bet; // push, kembalikan bet
      won = false;
      resultText = `🤝 *PUSH (SERI)*\n\nKamu Blackjack, Dealer juga Blackjack.\nBet dikembalikan.`;
    } else if (playerBJ) {
      payout = Math.floor(bet * 2.5); // blackjack pays 3:2 (bet + 1.5x bet)
      won = true;
      resultText = `🎉 *NATURAL BLACKJACK!*\n\n💰 Payout 3:2 -> +${config.currencySymbol}${payout}`;
    } else {
      payout = 0;
      won = false;
      resultText = `❌ *KALAH!*\n\nDealer mendapat Blackjack.\n💸 -${config.currencySymbol}${bet}`;
    }

    const newBalance = await recordGameResult(sender, won, payout, "GAME_BLACKJACK");

    return reply(
      `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\n🎴 Tangan kamu: ${formatHand(playerHand)} (${playerValue})\n🎴 Dealer: ${formatHand(dealerHand)} (${dealerValue})\n\n${resultText}\n\n💵 Balance sekarang: ${config.currencySymbol}${newBalance}\n\n${config.ui.line}`
    );
  }

  saveGame(sender, bet, playerHand, dealerHand, deck, "ongoing");

  return reply(
    `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\n💰 Bet: ${config.currencySymbol}${bet}\n\n🎴 Tangan kamu: ${formatHand(playerHand)} (${playerValue})\n🎴 Dealer: ${dealerHand[0]} ❓\n\nGunakan:\n!gas bj hit  -> ambil kartu\n!gas bj stand -> berhenti\n\n${config.ui.line}`
  );
}

async function handleAction(sender, action, reply) {
  const game = getGame(sender);
  if (!game) {
    return reply(
      `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\nKamu tidak memiliki game yang berjalan.\n\nGunakan:\n!gas bj <bet> untuk mulai\n\n${config.ui.line}`
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
      // Bust
      deleteGame(sender);
      const newBalance = await recordGameResult(sender, false, 0, "GAME_BLACKJACK");
      return reply(
        `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\n🎴 Tangan kamu: ${formatHand(playerHand)} (${playerValue})\n\n💥 *BUST!* Kamu melebihi 21.\n💸 -${config.currencySymbol}${bet}\n\n💵 Balance sekarang: ${config.currencySymbol}${newBalance}\n\n${config.ui.line}`
      );
    }

    saveGame(sender, bet, playerHand, dealerHand, deck, "ongoing");

    return reply(
      `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\n🎴 Tangan kamu: ${formatHand(playerHand)} (${playerValue})\n🎴 Dealer: ${dealerHand[0]} ❓\n\nGunakan:\n!gas bj hit  -> ambil kartu\n!gas bj stand -> berhenti\n\n${config.ui.line}`
    );
  }

  // ===== STAND =====
  let playerValue = handValue(playerHand);
  let dealerValue = handValue(dealerHand);

  // Dealer AI: hit until 17 or more
  while (dealerValue < 17) {
    dealerHand.push(deck.pop());
    dealerValue = handValue(dealerHand);
  }

  deleteGame(sender);

  let resultText;
  let payout;
  let won;

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
    `${config.ui.line}\n┃ BLACKJACK\n${config.ui.line}\n\n🎴 Tangan kamu: ${formatHand(playerHand)} (${playerValue})\n🎴 Dealer: ${formatHand(dealerHand)} (${dealerValue})\n\n${resultText}\n\n💵 Balance sekarang: ${config.currencySymbol}${newBalance}\n\n${config.ui.line}`
  );
}

export default { name, aliases, requiresRegistration, isGasGame, execute, play };