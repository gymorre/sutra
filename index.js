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
    browser: ["SUTRA BOT", "Chrome", "1.0.0"]
  });

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

  sock.ev.on("messages.upsert", async (m) => {
    const msg = m.messages?.[0];
    if (!msg) return;
    await handleMessage(sock, msg);
  });

  return sock;
}

startBot().catch((err) => {
  console.error("Gagal memulai bot:", err);
  process.exit(1);
});