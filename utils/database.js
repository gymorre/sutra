// utils/database.js
// Inisialisasi dan schema database SQLite

import Database from "better-sqlite3";
import { config } from "../config.js";
import fs from "fs";
import path from "path";

// Pastikan folder database ada
const dbDir = path.dirname(config.databasePath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(config.databasePath);

// Aktifkan WAL mode untuk performa & mengurangi locking issue
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// ============================
// SCHEMA
// ============================

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  jid TEXT PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  balance INTEGER NOT NULL DEFAULT 0,
  win INTEGER NOT NULL DEFAULT 0,
  lose INTEGER NOT NULL DEFAULT 0,
  total_game INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS cooldowns (
  jid TEXT NOT NULL,
  type TEXT NOT NULL,
  last_used INTEGER NOT NULL,
  PRIMARY KEY (jid, type)
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS tictactoe_games (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL,
  player_x TEXT NOT NULL,
  player_o TEXT NOT NULL,
  board TEXT NOT NULL,
  turn TEXT NOT NULL,
  bet INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ongoing',
  created_at INTEGER NOT NULL
);
`);

db.exec(`
CREATE TABLE IF NOT EXISTS blackjack_games (
  jid TEXT PRIMARY KEY,
  bet INTEGER NOT NULL,
  player_hand TEXT NOT NULL,
  dealer_hand TEXT NOT NULL,
  deck TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ongoing',
  created_at INTEGER NOT NULL
);
`);

export default db;
