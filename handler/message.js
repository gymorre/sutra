// handler/message.js
// Parsing pesan masuk dan dispatch ke command handler

import { config } from "../config.js";
import { executeCommand } from "./command.js";

/**
 * Mengambil teks dari berbagai tipe pesan Baileys
 */
function getMessageText(msg) {
  const m = msg.message;
  if (!m) return "";

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ""
  );
}

export async function handleMessage(sock, msg) {
  try {
    if (!msg.message) return;
    if (msg.key.fromMe) return;

    const jid = msg.key.remoteJid;
    if (!jid) return;

    const isGroup = jid.endsWith("@g.us");
    const sender = isGroup ? msg.key.participant : jid;
    const groupJid = isGroup ? jid : null;

    if (!sender) return;

    const text = getMessageText(msg).trim();
    if (!text.startsWith(config.prefix)) return;

    const body = text.slice(config.prefix.length).trim();
    if (!body) return;

    const parts = body.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    const reply = async (content) => {
      if (typeof content === "string") {
        return sock.sendMessage(jid, { text: content }, { quoted: msg });
      }
      return sock.sendMessage(jid, content, { quoted: msg });
    };

    const ctx = {
      sock,
      msg,
      jid,
      sender,
      isGroup,
      groupJid,
      command,
      args,
      text,
      reply
    };

    await executeCommand(ctx);
  } catch (err) {
    console.error("Error in handleMessage:", err);
  }
}

export default { handleMessage };
