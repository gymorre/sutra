// utils/leaderboard.js
// Sistem leaderboard global & lokal dengan caching auto-refresh

import { db } from "./database.js";
import { config } from "../config.js";

let globalCache = null;
let globalCacheTime = 0;

/**
 * Mengambil leaderboard global (top N user berdasarkan balance)
 * Cache di-refresh otomatis setiap config.leaderboardRefreshInterval
 */
export function getGlobalLeaderboard(limit = 10) {
  const now = Date.now();

  if (
    !globalCache ||
    now - globalCacheTime >= config.leaderboardRefreshInterval
  ) {
    globalCache = db
      .prepare(
        "SELECT jid, nickname, balance, win, lose, total_game FROM users ORDER BY balance DESC LIMIT ?"
      )
      .all(limit);
    globalCacheTime = now;
  }

  return globalCache;
}

/**
 * Mengambil leaderboard lokal (hanya member yang ada di array jids, dari grup)
 */
export function getLocalLeaderboard(jids, limit = 10) {
  if (!jids || jids.length === 0) return [];

  const placeholders = jids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT jid, nickname, balance, win, lose, total_game FROM users WHERE jid IN (${placeholders}) ORDER BY balance DESC LIMIT ?`
    )
    .all(...jids, limit);

  return rows;
}

/**
 * Memaksa refresh cache global leaderboard
 */
export function invalidateGlobalCache() {
  globalCache = null;
  globalCacheTime = 0;
}

export default {
  getGlobalLeaderboard,
  getLocalLeaderboard,
  invalidateGlobalCache
};
