// index.js
// Entry point SUTRA BOT

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import qrcode from "qrcode-terminal";
import fs from "fs";

import { config } from "./config.js";
import { handleMessage } from "./handler/message.js";
import "./utils/database.js"; // inisialisasi database & schema

const logger = pino({ level: "silent" });

// ============================
// MESSAGE STORE (untuk retry decrypt di HP)
// Tanpa ini, pesan akan "Waiting for this message" di mobile
// ============================
const messageStore = new Map();
const MAX_STORE_SIZE = 5000;
const MESSAGE_TTL = 10 * 60 * 1000; // 10 menit

function storeMessage(msgId, message) {
  // Bersihkan store jika terlalu besar
  if (messageStore.size > MAX_STORE_SIZE) {
    const now = Date.now();
    for (const [key, val] of messageStore) {
      if (now - val.timestamp > MESSAGE_TTL) {
        messageStore.delete(key);
      }
    }
    // Jika masih besar, hapus 1000 terlama
    if (messageStore.size > MAX_STORE_SIZE) {
      const keys = [...messageStore.keys()].slice(0, 1000);
      for (const k of keys) messageStore.delete(k);
    }
  }
  messageStore.set(msgId, { message, timestamp: Date.now() });
}

function getMessage(key) {
  const stored = messageStore.get(key.id);
  return stored?.message || undefined;
}

async function startBot() {
  const authDir = "./auth_info";
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: ["SUTRA BOT", "Chrome", "1.0.0"],

    // === FIX "Waiting for this message" ===
    // getMessage dibutuhkan agar Baileys bisa merespons
    // permintaan retry decrypt dari perangkat lain (HP)
    getMessage,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
    // Retry decrypt jika diminta oleh perangkat
    retryRequestDelayMs: 250,
  });

  // ============================
  // INTERCEPT pesan keluar untuk disimpan di store
  // ============================
  const originalSendMessage = sock.sendMessage.bind(sock);
  sock.sendMessage = async (...args) => {
    const result = await originalSendMessage(...args);
    if (result?.key?.id && result?.message) {
      storeMessage(result.key.id, result.message);
    }
    return result;
  };

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n=== SCAN QR CODE INI DENGAN WHATSAPP ===\n");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error instanceof Boom
        ? lastDisconnect.error.output?.statusCode
        : undefined;

      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      console.log(
        "Koneksi tertutup karena:",
        lastDisconnect?.error?.message || lastDisconnect?.error,
        "| statusCode:",
        statusCode,
        "| Reconnect:",
        shouldReconnect
      );

      if (shouldReconnect) {
        // Beri delay sebelum reconnect agar tidak terjadi loop cepat
        // (terutama untuk error 515 "Stream Errored - restart required")
        setTimeout(() => {
          startBot();
        }, 2000);
      } else {
        console.log("Logged out. Hapus folder auth_info dan scan ulang QR.");
      }
    } else if (connection === "open") {
      console.log(`\n✅ ${config.botName} BOT berhasil terhubung!\n`);
      console.log(`Mode: ${config.mode}`);
      console.log(`Prefix: ${config.prefix}\n`);
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // Simpan pesan yang diterima ke store (untuk retry)
  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages?.[0];
    if (!msg) return;

    // Simpan pesan ke store untuk retry handling
    if (msg.key?.id && msg.message) {
      storeMessage(msg.key.id, msg.message);
    }

    await handleMessage(sock, msg);
  });

  return sock;
}

startBot().catch((err) => {
  console.error("Gagal memulai bot:", err);
  process.exit(1);
});