// utils/cooldown.js
// Sistem cooldown untuk reward (hourly, daily, weekly, monthly)

import { db } from "./database.js";

/**
 * Mengecek apakah user masih dalam cooldown untuk tipe tertentu.
 * Mengembalikan { onCooldown: boolean, remaining: number (ms) }
 */
export function checkCooldown(jid, type, cooldownMs) {
  const row = db
    .prepare("SELECT last_used FROM cooldowns WHERE jid = ? AND type = ?")
    .get(jid, type);

  if (!row) {
    return { onCooldown: false, remaining: 0 };
  }

  const elapsed = Date.now() - row.last_used;
  if (elapsed >= cooldownMs) {
    return { onCooldown: false, remaining: 0 };
  }

  return { onCooldown: true, remaining: cooldownMs - elapsed };
}

/**
 * Menandai bahwa user baru saja menggunakan reward tipe tertentu
 */
export function setCooldown(jid, type) {
  const now = Date.now();
  db.prepare(
    `
    INSERT INTO cooldowns (jid, type, last_used)
    VALUES (?, ?, ?)
    ON CONFLICT(jid, type) DO UPDATE SET last_used = ?
  `
  ).run(jid, type, now, now);
}

/**
 * Format milidetik menjadi string yang mudah dibaca (jam menit detik)
 */
export function formatDuration(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const parts = [];
  if (hours > 0) parts.push(`${hours}j`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}d`);

  return parts.join(" ");
}

export default { checkCooldown, setCooldown, formatDuration };
