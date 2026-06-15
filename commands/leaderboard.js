// commands/leaderboard.js

import {
  getGlobalLeaderboard,
  getLocalLeaderboard
} from "../utils/leaderboard.js";
import { config } from "../config.js";

export const name = "leaderboard";
export const aliases = ["lb"];
export const requiresRegistration = true;

const MEDALS = ["🥇", "🥈", "🥉"];

function formatLeaderboard(title, rows) {
  if (!rows || rows.length === 0) {
    return `${config.ui.line}\n┃ LEADERBOARD ${title}\n${config.ui.line}\n\nBelum ada data.\n\n${config.ui.line}`;
  }

  let body = "";
  rows.forEach((row, i) => {
    const medal = MEDALS[i] || `${i + 1}.`;
    body += `${medal} ${row.nickname} - ${config.currencySymbol}${row.balance}\n`;
  });

  return `${config.ui.line}\n┃ LEADERBOARD ${title}\n${config.ui.line}\n\n${body}\n${config.ui.line}`;
}

export async function execute({ sock, msg, args, reply, isGroup, groupJid }) {
  const mode = (args[0] || "global").toLowerCase();

  if (mode === "local") {
    if (!isGroup) {
      return reply(
        `${config.ui.line}\n┃ LEADERBOARD LOCAL\n${config.ui.line}\n\nMode LOCAL hanya bisa digunakan di dalam grup.\n\n${config.ui.line}`
      );
    }

    try {
      const groupMetadata = await sock.groupMetadata(groupJid);
      const jids = groupMetadata.participants.map((p) => p.id);
      const rows = getLocalLeaderboard(jids, 10);
      return reply(formatLeaderboard("LOCAL", rows));
    } catch (err) {
      return reply(
        `${config.ui.line}\n┃ LEADERBOARD LOCAL\n${config.ui.line}\n\nGagal mengambil data grup.\n\n${config.ui.line}`
      );
    }
  }

  // Default: global
  const rows = getGlobalLeaderboard(10);
  return reply(formatLeaderboard("GLOBAL", rows));
}

export default { name, aliases, requiresRegistration, execute };
