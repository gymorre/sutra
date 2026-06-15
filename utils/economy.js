// utils/economy.js
// Sistem ekonomi virtual: balance, transaksi, locking, logging

import { db } from "./database.js";
import { config } from "../config.js";
import fs from "fs";
import path from "path";

// ============================
// TRANSACTION LOCK
// Mencegah race condition pada user yang sama
// ============================
const locks = new Map();

async function acquireLock(jid) {
  while (locks.get(jid)) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  locks.set(jid, true);
}

function releaseLock(jid) {
  locks.delete(jid);
}

// ============================
// LOGGING
// ============================
function logTransaction(message) {
  const logPath = path.resolve(config.transactionLogPath);
  const logDir = path.dirname(logPath);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logPath, `[${timestamp}] ${message}\n`);
}

// ============================
// USER FUNCTIONS
// ============================

export function isRegistered(jid) {
  const row = db.prepare("SELECT 1 FROM users WHERE jid = ?").get(jid);
  return !!row;
}

export function getUser(jid) {
  return db.prepare("SELECT * FROM users WHERE jid = ?").get(jid);
}

export function getUserByNickname(nickname) {
  return db
    .prepare("SELECT * FROM users WHERE nickname = ? COLLATE NOCASE")
    .get(nickname);
}

export function registerUser(jid, nickname) {
  const existing = getUserByNickname(nickname);
  if (existing) {
    return { success: false, reason: "NICKNAME_TAKEN" };
  }

  if (isRegistered(jid)) {
    return { success: false, reason: "ALREADY_REGISTERED" };
  }

  const stmt = db.prepare(`
    INSERT INTO users (jid, nickname, balance, win, lose, total_game, created_at)
    VALUES (?, ?, ?, 0, 0, 0, ?)
  `);

  stmt.run(jid, nickname, config.startingBalance, Date.now());

  logTransaction(
    `REGISTER | ${jid} | nickname=${nickname} | balance=${config.startingBalance}`
  );

  return { success: true };
}

// ============================
// BALANCE OPERATIONS (with locking)
// ============================

export async function getBalance(jid) {
  const user = getUser(jid);
  return user ? user.balance : 0;
}

/**
 * Menambahkan balance ke user (locking aman)
 */
export async function addBalance(jid, amount, reason = "ADJUST") {
  await acquireLock(jid);
  try {
    const user = getUser(jid);
    if (!user) throw new Error("USER_NOT_FOUND");

    const newBalance = user.balance + amount;
    db.prepare("UPDATE users SET balance = ? WHERE jid = ?").run(
      newBalance,
      jid
    );

    logTransaction(
      `ADD | ${jid} | amount=${amount} | newBalance=${newBalance} | reason=${reason}`
    );

    return newBalance;
  } finally {
    releaseLock(jid);
  }
}

/**
 * Mengurangi balance user. Mengembalikan false jika balance tidak cukup.
 */
export async function subtractBalance(jid, amount, reason = "ADJUST") {
  await acquireLock(jid);
  try {
    const user = getUser(jid);
    if (!user) throw new Error("USER_NOT_FOUND");

    if (user.balance < amount) {
      return { success: false, balance: user.balance };
    }

    const newBalance = user.balance - amount;
    db.prepare("UPDATE users SET balance = ? WHERE jid = ?").run(
      newBalance,
      jid
    );

    logTransaction(
      `SUBTRACT | ${jid} | amount=${amount} | newBalance=${newBalance} | reason=${reason}`
    );

    return { success: true, balance: newBalance };
  } finally {
    releaseLock(jid);
  }
}

/**
 * Mencatat hasil game (win/lose + total_game) dan menyesuaikan balance
 * resultAmount: nilai positif jika menang (akan ditambahkan ke balance),
 *               nilai negatif jika kalah (akan dikurangi dari balance, sudah dipotong saat bet)
 */
export async function recordGameResult(jid, won, payout = 0, reason = "GAME") {
  await acquireLock(jid);
  try {
    const user = getUser(jid);
    if (!user) throw new Error("USER_NOT_FOUND");

    let newBalance = user.balance;
    if (payout !== 0) {
      newBalance = user.balance + payout;
      db.prepare("UPDATE users SET balance = ? WHERE jid = ?").run(
        newBalance,
        jid
      );
    }

    if (won) {
      db.prepare(
        "UPDATE users SET win = win + 1, total_game = total_game + 1 WHERE jid = ?"
      ).run(jid);
    } else {
      db.prepare(
        "UPDATE users SET lose = lose + 1, total_game = total_game + 1 WHERE jid = ?"
      ).run(jid);
    }

    logTransaction(
      `GAME_RESULT | ${jid} | won=${won} | payout=${payout} | newBalance=${newBalance} | reason=${reason}`
    );

    return newBalance;
  } finally {
    releaseLock(jid);
  }
}

export { logTransaction };
