import { config } from "../config.js";
import { createCanvas } from "canvas";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";
import { Jimp } from "jimp";

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
  const LINE_HEIGHT_RATIO = 1.15;

  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  // Background putih
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Hitung ukuran font yang pas
  let fontSize = 96;
  const minFontSize = 32;

  ctx.fillStyle = "#111111";
  ctx.textBaseline = "top";

  /**
   * Bagi teks menjadi baris-baris yang pas dengan MAX_WIDTH
   */
  function wrapText(txt, fSize) {
    ctx.font = `bold ${fSize}px Arial, sans-serif`;
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
    lines = wrapText(text, fontSize);
    const lineHeight = fontSize * LINE_HEIGHT_RATIO;
    const totalHeight = lines.length * lineHeight;
    if (totalHeight <= MAX_WIDTH) break; // MAX_WIDTH dipakai juga sbg max height
    fontSize -= 4;
  }

  const lineHeight = fontSize * LINE_HEIGHT_RATIO;
  const totalTextHeight = lines.length * lineHeight;
  const startY = (SIZE - totalTextHeight) / 2;

  ctx.font = `bold ${fontSize}px Arial, sans-serif`;

  // Gambar setiap baris dengan justify
  lines.forEach((line, i) => {
    const y = startY + i * lineHeight;
    const isLastLine = i === lines.length - 1;
    const words = line.split(" ");

    if (words.length === 1 || isLastLine) {
      // Baris terakhir atau satu kata: rata kiri
      ctx.fillStyle = "#111111";
      ctx.fillText(line, PADDING, y);
    } else {
      // Justify: hitung spasi antar kata
      const totalWordWidth = words.reduce(
        (sum, w) => sum + ctx.measureText(w).width,
        0
      );
      const totalSpace = MAX_WIDTH - totalWordWidth;
      const spacePerGap = totalSpace / (words.length - 1);

      let x = PADDING;
      words.forEach((word, wi) => {
        ctx.fillStyle = "#111111";
        ctx.fillText(word, x, y);
        x += ctx.measureText(word).width + spacePerGap;
      });
    }
  });

  // Export ke buffer PNG
  return canvas.toBuffer("image/png");
}

/**
 * Convert PNG buffer ke buffer stiker menggunakan Jimp
 */
async function pngToWebpSticker(pngBuffer) {
  const image = await Jimp.read(pngBuffer);
  image.resize({ w: 512, h: 512 });
  return await image.getBuffer("image/png");
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
        `Pastikan package *canvas* dan *jimp* sudah terinstall:\n` +
        `npm install canvas jimp\n\n` +
        `${config.ui.line}`
    );
  }
}

export default { name, aliases, requiresRegistration, execute };