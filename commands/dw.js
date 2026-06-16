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
  const PADDING = 24;          // padding rapat gaya Brat
  const MAX_WIDTH = SIZE - PADDING * 2;
  const LINE_HEIGHT_RATIO = 0.95; // Jarak baris rapat gaya Brat

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  // Background putih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Bersihkan whitespace (tetap mempertahankan casing asli)
  const cleanText = text.trim();

  // Hitung jumlah kata untuk menentukan target jumlah baris
  const wordsArray = cleanText.split(/\s+/);
  const wordCount = wordsArray.length;
  
  let maxLinesTarget = 1;
  if (wordCount > 1 && wordCount <= 3) {
    maxLinesTarget = 2;
  } else if (wordCount > 3 && wordCount <= 7) {
    maxLinesTarget = 2; // Target 2 baris untuk 4-7 kata
  } else if (wordCount > 7 && wordCount <= 12) {
    maxLinesTarget = 3;
  } else {
    maxLinesTarget = 4;
  }

  // Hitung ukuran font yang pas
  let fontSize = 140;
  const minFontSize = 32;

  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  /**
   * Bagi teks menjadi baris-baris yang pas dengan MAX_WIDTH
   */
  function wrapText(txt, fSize) {
    ctx.font = `500 ${fSize}px Arial`;
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

  // Cari ukuran font yang muat dan sesuai dengan target baris
  let lines = [];
  while (fontSize >= minFontSize) {
    lines = wrapText(cleanText, fontSize);
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;
    const totalHeight = lines.length * lineHeight;
    
    // Berhenti jika jumlah baris target terpenuhi dan muat di canvas
    if (lines.length <= maxLinesTarget && totalHeight <= MAX_WIDTH) {
      break;
    }
    fontSize -= 2;
  }

  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (SIZE - totalTextHeight) / 2;

  ctx.font = `500 ${fontSize}px Arial`;
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";

  // Gambar setiap baris dengan layout justify (khas Brat) dan regangan vertikal
  ctx.save();
  ctx.scale(1, 1.18); // Meregangkan font secara vertikal sebesar 18%
  
  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    const words = line.split(" ");

    const scaledY = y / 1.18; // Sesuaikan koordinat Y setelah discaling

    if (words.length === 1) {
      // Hanya satu kata: rata kiri
      ctx.fillStyle = "#000000";
      ctx.fillText(line, PADDING, scaledY);
    } else {
      // Justify: ratakan kanan-kiri dengan menghitung spasi antar kata (berlaku untuk semua baris)
      const totalWordWidth = words.reduce(
        (sum, w) => sum + ctx.measureText(w).width,
        0
      );
      const totalSpace = MAX_WIDTH - totalWordWidth;
      const spacePerGap = totalSpace / (words.length - 1);

      let x = PADDING;
      words.forEach((word, wi) => {
        ctx.fillStyle = "#000000";
        ctx.fillText(word, x, scaledY);
        x += ctx.measureText(word).width + spacePerGap;
      });
    }
  });

  ctx.restore();

  // Export ke buffer PNG
  return canvas.toBuffer("image/png");
}

/**
 * Convert PNG buffer ke buffer stiker menggunakan Sharp (WebP format) dengan efek low-res
 */
async function pngToWebpSticker(pngBuffer) {
  return await sharp(pngBuffer)
    .resize(512, 512)
    .blur(0.8) // Efek blur halus agar menyerupai kualitas kompresi rendah khas generator
    .webp({ quality: 85 })
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