import { config } from "../config.js";
import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import sharp from "sharp";

export const name = "s";
export const aliases = ["stiker", "sticker", "stext"];
export const requiresRegistration = false;

/**
 * Buat gambar teks style viral:
 * - Background putih
 * - Teks hitam tebal
 * - Font besar bold sans-serif
 * - Justify rata kanan-kiri
 * - Padding proporsional
 */
async function generateTextSticker(text) {
  const SIZE = 512;            // ukuran stiker WA (512x512)
  const PADDING = 32;          // padding kiri/kanan
  const MAX_WIDTH = SIZE - PADDING * 2;
  const LINE_HEIGHT_RATIO = 1.05; // Gaya Brat memiliki jarak baris yang sangat rapat

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  // Background hijau Brat (#8ace00)
  ctx.fillStyle = "#8ace00";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Konversi teks ke lowercase dan bersihkan whitespace
  const cleanText = text.toLowerCase().trim();

  // Hitung ukuran font yang pas
  let fontSize = 96;
  const minFontSize = 32;

  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  /**
   * Bagi teks menjadi baris-baris yang pas dengan MAX_WIDTH
   */
  function wrapText(txt, fSize) {
    ctx.font = `${fSize}px Arial`;
    const words = txt.split(" ");
    const lines = [];
    let current = "";

    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > MAX_WIDTH && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);
    return lines;
  }

  // Cari ukuran font yang muat di canvas
  let lines = [];
  while (fontSize >= minFontSize) {
    lines = wrapText(cleanText, fontSize);
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;
    const totalHeight = lines.length * lineHeight;
    if (totalHeight <= MAX_WIDTH) break;
    fontSize -= 4;
  }

  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (SIZE - totalTextHeight) / 2;

  ctx.font = `${fontSize}px Arial`;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  // Gambar setiap baris secara terpusat (Centered)
  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    ctx.fillText(line, SIZE / 2, y);
  });

  // Export ke buffer PNG
  return canvas.toBuffer("image/png");
}

/**
 * Convert PNG buffer ke buffer stiker menggunakan Sharp (WebP format)
 */
async function pngToWebpSticker(pngBuffer) {
  return await sharp(pngBuffer)
    .resize(512, 512)
    .webp()
    .toBuffer();
}

export async function execute({ args, reply, sock, msg }) {
  const text = args.join(" ").trim();

  if (!text) {
    return reply(
      `${config.ui.line}\n┃ 🖼️ STIKER TEKS\n${config.ui.line}\n\n` +
        `❌ Masukkan teks untuk stiker!\n\n` +
        `Gunakan:\n` +
        `• *!s <teks>*\n\n` +
        `Contoh:\n` +
        `!s kamu lucu banget deh boleh cium ga?\n` +
        `!s seplenger mungkin\n\n` +
        `${config.ui.line}`
    );
  }

  if (text.length > 200) {
    return reply(
      `${config.ui.line}\n┃ 🖼️ STIKER TEKS\n${config.ui.line}\n\n` +
        `❌ Teks terlalu panjang! Maksimal 200 karakter.\n\n` +
        `${config.ui.line}`
    );
  }

  try {
    // Generate gambar stiker
    const pngBuffer = await generateTextSticker(text);
    const stickerBuffer = await pngToWebpSticker(pngBuffer);

    const jid = msg.key.remoteJid;

    // Kirim sebagai stiker
    await sock.sendMessage(jid, {
      sticker: stickerBuffer,
    });
  } catch (err) {
    console.error("[DW] Error:", err.message);
    return reply(
      `${config.ui.line}\n┃ 🖼️ STIKER TEKS\n${config.ui.line}\n\n` +
        `❌ Gagal membuat stiker!\n` +
        `Error: ${err.message}\n\n` +
        `Pastikan package *canvas* dan *sharp* sudah terinstall:\n` +
        `npm install canvas sharp\n\n` +
        `${config.ui.line}`
    );
  }
}

export default { name, aliases, requiresRegistration, execute };