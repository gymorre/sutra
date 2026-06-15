// commands/menu.js

import { config } from "../config.js";
import { execSync } from "child_process";

export const name = "menu";
export const aliases = [];
export const requiresRegistration = false;

function getBotVersion() {
  try {
    const commit = execSync('git log -n 1 --format="%s"', { encoding: "utf-8" }).trim();
    const match = commit.match(/(\d+\.\d+)/);
    return match ? `v${match[1]}` : "v1.4";
  } catch (e) {
    return "v1.4";
  }
}

export async function execute({ reply }) {
  // Format jam realtime WIB (Asia/Jakarta)
  const dateObj = new Date();
  const formatDigit = (num) => String(num).padStart(2, '0');
  
  const formattedDate = `${formatDigit(dateObj.getDate())}/${formatDigit(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`;
  const formattedTime = dateObj.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'Asia/Jakarta'
  }).replace(/\./g, ':');
  
  const timeWIB = `${formattedDate} ${formattedTime} WIB`;
  const version = getBotVersion();

  const menuText = `⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
█▀ █░█ ▀█▀ █▀█ ▄▀█   █▄▄ █▀█ ▀█▀
▄█ █▄█ ░█░ █▀▄ █▀█   █▄█ █▄█ ░█░
⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
STATUS : ONLINE
TIME : ${timeWIB}

Bot created by @aditias
(versi bot terbaru: ${version})
⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
/📁MENU
├─ !Game
 │   DAFTAR GAME
 │   └─ !Reme /Re
 │   └─ !Blackjack /Bj
 │   └─ !Flipcoin !Fp
 │   └─ !Fruitbomb !Fb
 │   └─ !Tictactoe !Ttt
 │   └─ !Multiplayer !Mp
 │
 │   EKONOMI
 │   └─ !Balance !Bal
 │   └─ !Leaderboard !Lb
 │   └─ !Cek
 │   └─ !Transfer !Tf
 │
 │   REWARD
 │   └─ !Hourly
 │   └─ !Daily
 │   └─ !Weekly
 │   └─ !Monthly
├─ !Deposit
 │   └─ Coming Soon
├─ !Withdraw
 │   └─ Coming Soon
├─ !Kurs
 │   └─ Tampilkan kurs 10 negara besar dan bandingan dengan rupiah, update secara realtime
├─ !Idx
 │   └─ Coming Soon
├─ !Dv
 │   └─ Coming Soon
├─ !Support
 │   └─ Berikan nomor wa Utama saya dalam bentuk link +6285158220582
├─ !Invite
 │   └─ Berikan nomor bot dengan link dan gunakan promosi agar orang tertarik seperti bot untuk fun with friend, etc
├─ More Feature Coming Soon
⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘
NOTE : Bot masih dalam tahap pengembangan (BETA), jika menemukan bug harap segera lapor ke team support kami :D
⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘`;

  return reply(menuText);
}

export default { name, aliases, requiresRegistration, execute };
