// commands/dv.js
import { config } from "../config.js";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

export const name = "dv";
export const aliases = ["downloadvideo", "download"];
export const requiresRegistration = false;

// Path yt-dlp yang sudah terkonfirmasi
const YTDLP_PATH = "C:\\Users\\evilc\\AppData\\Roaming\\Python\\Python311\\Scripts\\yt-dlp.exe";

function detectPlatform(url) {
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/instagram\.com|instagr\.am/i.test(url)) return "instagram";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/facebook\.com|fb\.watch|fb\.com/i.test(url)) return "facebook";
  return null;
}

async function downloadWithYtDlp(url) {
  const tmpFile = path.join(tmpdir(), `sutra_dv_${Date.now()}.mp4`);

  const args = [
    url,
    "-f", "best[ext=mp4][filesize<50M]/best[filesize<50M]/best",
    "-o", tmpFile,
    "--no-playlist",
    "--max-filesize", "50m",
    "--merge-output-format", "mp4",
    "--no-warnings",
    "--socket-timeout", "30",
  ];

  try {
    await execFileAsync(YTDLP_PATH, args, { timeout: 120000 });
  } catch {
    // Fallback tanpa filter format
    const fallbackArgs = [
      url,
      "-o", tmpFile,
      "--no-playlist",
      "--merge-output-format", "mp4",
      "--no-warnings",
      "--socket-timeout", "30",
    ];
    await execFileAsync(YTDLP_PATH, fallbackArgs, { timeout: 120000 });
  }

  // yt-dlp kadang tambah ekstensi sendiri, cari file dengan prefix yang sama
  if (!fs.existsSync(tmpFile)) {
    const prefix = path.basename(tmpFile, ".mp4");
    const files = fs.readdirSync(tmpdir()).filter(f => f.startsWith(prefix));
    if (files.length > 0) return path.join(tmpdir(), files[0]);
    throw new Error("File hasil download tidak ditemukan");
  }

  return tmpFile;
}

export async function execute({ args, reply, sock, msg }) {
  const url = args[0];

  if (!url) {
    return reply(
      `${config.ui.line}\n┃ 🎥 DOWNLOAD VIDEO\n${config.ui.line}\n\n` +
        `❌ Masukkan link video!\n\n` +
        `Gunakan: *!dv <link>*\n\n` +
        `Platform yang didukung:\n` +
        `• 🎵 TikTok\n` +
        `• 📸 Instagram (Reels/Post)\n` +
        `• ▶️ YouTube (max 50MB)\n` +
        `• 📘 Facebook\n\n` +
        `${config.ui.line}`
    );
  }

  if (!/^https?:\/\//i.test(url)) {
    return reply(
      `${config.ui.line}\n┃ 🎥 DOWNLOAD VIDEO\n${config.ui.line}\n\n` +
        `❌ URL tidak valid! Pastikan link dimulai dengan https://\n\n` +
        `${config.ui.line}`
    );
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return reply(
      `${config.ui.line}\n┃ 🎥 DOWNLOAD VIDEO\n${config.ui.line}\n\n` +
        `❌ Platform tidak didukung!\n\n` +
        `• 🎵 TikTok\n• 📸 Instagram\n• ▶️ YouTube\n• 📘 Facebook\n\n` +
        `${config.ui.line}`
    );
  }

  const platformLabel = {
    tiktok: "🎵 TikTok",
    instagram: "📸 Instagram",
    youtube: "▶️ YouTube",
    facebook: "📘 Facebook",
  }[platform];

  await reply(
    `${config.ui.line}\n┃ 🎥 DOWNLOAD VIDEO\n${config.ui.line}\n\n` +
      `⏳ Sedang mengunduh...\n` +
      `📌 Platform: ${platformLabel}\n\n` +
      `Mohon tunggu sebentar 🙏\n\n` +
      `${config.ui.line}`
  );

  let tmpFile = null;

  try {
    tmpFile = await downloadWithYtDlp(url);

    const stats = fs.statSync(tmpFile);
    const sizeMB = stats.size / (1024 * 1024);

    if (sizeMB > 100) {
      throw new Error(`File terlalu besar (${sizeMB.toFixed(1)}MB, maks 100MB)`);
    }

    const videoBuffer = fs.readFileSync(tmpFile);
    const jid = msg.key.remoteJid;

    await sock.sendMessage(jid, {
      video: videoBuffer,
      caption:
        `${config.ui.line}\n┃ 🎥 DOWNLOAD VIDEO\n${config.ui.line}\n\n` +
        `✅ Berhasil diunduh!\n` +
        `📌 Platform: ${platformLabel}\n` +
        `📦 Ukuran: ${sizeMB.toFixed(1)} MB\n\n` +
        `_©2026 Sutra Bot_\n` +
        `${config.ui.line}`,
      mimetype: "video/mp4",
    });
  } catch (err) {
    console.error("[DV] Error:", err.message);
    await reply(
      `${config.ui.line}\n┃ 🎥 DOWNLOAD VIDEO\n${config.ui.line}\n\n` +
        `❌ Gagal mengunduh video!\n\n` +
        `Kemungkinan penyebab:\n` +
        `• Link sudah kedaluwarsa atau dihapus\n` +
        `• Akun/konten bersifat privat\n` +
        `• Video terlalu besar (maks 50MB)\n` +
        `• Platform memblokir download\n\n` +
        `Error: ${err.message}\n\n` +
        `${config.ui.line}`
    );
  } finally {
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}

export default { name, aliases, requiresRegistration, execute };