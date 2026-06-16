// commands/dv.js
// Download video dari TikTok, Instagram, YouTube, Facebook
// Usage: !dv <link>

import { config } from "../config.js";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { createWriteStream } from "fs";
import { tmpdir } from "os";

export const name = "dv";
export const aliases = ["downloadvideo", "download"];
export const requiresRegistration = false;

/**
 * Deteksi platform dari URL
 */
function detectPlatform(url) {
  if (/tiktok\.com/i.test(url)) return "tiktok";
  if (/instagram\.com|instagr\.am/i.test(url)) return "instagram";
  if (/youtube\.com|youtu\.be/i.test(url)) return "youtube";
  if (/facebook\.com|fb\.watch|fb\.com/i.test(url)) return "facebook";
  return null;
}

/**
 * Download video menggunakan API cobalt.tools (gratis, tanpa watermark)
 * Docs: https://cobalt.tools
 */
async function fetchVideoUrl(url, platform) {
  try {
    // Cobalt API - support TikTok, Instagram, YouTube, Facebook
    const apiUrl = "https://cobalt.tools/api/json";

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        url: url,
        vQuality: "720",        // kualitas video
        filenamePattern: "basic",
        twitterGif: false,
        tiktokH265: false,
      }),
    });

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();

    // status: "stream" / "redirect" / "picker" / "error"
    if (data.status === "error") {
      throw new Error(data.text || "Gagal mengambil video");
    }

    if (data.status === "picker") {
      // Ambil item pertama (biasanya video utama)
      if (data.picker && data.picker.length > 0) {
        return data.picker[0].url;
      }
      throw new Error("Tidak ada video yang bisa diunduh");
    }

    if (data.status === "stream" || data.status === "redirect") {
      return data.url;
    }

    throw new Error("Respon API tidak dikenali");
  } catch (err) {
    throw new Error(err.message || "Gagal menghubungi server download");
  }
}

/**
 * Download file dari URL ke file sementara
 */
async function downloadToTemp(url) {
  const tmpFile = path.join(tmpdir(), `sutra_dv_${Date.now()}.mp4`);
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!res.ok) throw new Error(`Gagal download file: ${res.status}`);

  await pipeline(res.body, createWriteStream(tmpFile));
  return tmpFile;
}

export async function execute({ args, reply, sock, msg }) {
  const url = args[0];

  // Validasi input
  if (!url) {
    return reply(
      `${config.ui.line}\n┃ 🎥 DOWNLOAD VIDEO\n${config.ui.line}\n\n` +
        `❌ Masukkan link video!\n\n` +
        `Gunakan:\n` +
        `• *!dv <link>*\n\n` +
        `Platform yang didukung:\n` +
        `• 🎵 TikTok\n` +
        `• 📸 Instagram (Reels/Post)\n` +
        `• ▶️ YouTube (max 10 menit)\n` +
        `• 📘 Facebook\n\n` +
        `Contoh:\n` +
        `!dv https://www.tiktok.com/@user/video/xxx\n\n` +
        `${config.ui.line}`
    );
  }

  // Validasi URL
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
        `Platform yang didukung:\n` +
        `• 🎵 TikTok\n` +
        `• 📸 Instagram\n` +
        `• ▶️ YouTube\n` +
        `• 📘 Facebook\n\n` +
        `${config.ui.line}`
    );
  }

  const platformLabel = {
    tiktok: "🎵 TikTok",
    instagram: "📸 Instagram",
    youtube: "▶️ YouTube",
    facebook: "📘 Facebook",
  }[platform];

  // Kirim pesan loading
  await reply(
    `${config.ui.line}\n┃ 🎥 DOWNLOAD VIDEO\n${config.ui.line}\n\n` +
      `⏳ Sedang memproses...\n` +
      `📌 Platform: ${platformLabel}\n\n` +
      `Mohon tunggu sebentar 🙏\n\n` +
      `${config.ui.line}`
  );

  let tmpFile = null;

  try {
    // Ambil URL video dari API
    const videoUrl = await fetchVideoUrl(url, platform);

    // Download video ke file sementara
    tmpFile = await downloadToTemp(videoUrl);

    // Baca file sebagai buffer
    const videoBuffer = fs.readFileSync(tmpFile);

    // Kirim video ke chat
    const jid = msg.key.remoteJid;
    await sock.sendMessage(jid, {
      video: videoBuffer,
      caption:
        `${config.ui.line}\n┃ 🎥 DOWNLOAD VIDEO\n${config.ui.line}\n\n` +
        `✅ Berhasil diunduh!\n` +
        `📌 Platform: ${platformLabel}\n\n` +
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
        `• Video terlalu panjang (YouTube max ~10 menit)\n` +
        `• Server sedang sibuk, coba lagi\n\n` +
        `Error: ${err.message}\n\n` +
        `${config.ui.line}`
    );
  } finally {
    // Hapus file sementara
    if (tmpFile && fs.existsSync(tmpFile)) {
      fs.unlinkSync(tmpFile);
    }
  }
}

export default { name, aliases, requiresRegistration, execute };