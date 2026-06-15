// handler/message.js
// Parsing pesan masuk dan dispatch ke command handler

import { config } from "../config.js";
import { executeCommand } from "./command.js";
import { gameStateManager } from "../utils/gameState.js";

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

    let text = getMessageText(msg).trim();
    const senderLower = text.toLowerCase();

    // Check if player has a pending invite or active states
    const hasInvite = gameStateManager.getInviteForPlayer(sender);
    const playerState = gameStateManager.getPlayerState(sender);

    const inGameNoPrefix = playerState &&
      playerState.state === "IN_GAME" &&
      ["tictactoe", "fb", "flipcoin", "fruitbomb"].includes(playerState.game);

    const inOpponentSelect = playerState && playerState.state === "OPPONENT_SELECT";

    if (!text.startsWith(config.prefix)) {
      if (hasInvite && (senderLower === "gas" || senderLower === "g")) {
        text = `${config.prefix}accept`;
      } else if (hasInvite && (senderLower === "decline" || senderLower === "no" || senderLower === "tolak")) {
        text = `${config.prefix}decline`;
      } else if (inOpponentSelect) {
        text = `${config.prefix}tag ${text}`;
      } else if (inGameNoPrefix) {
        if (senderLower === "back" || senderLower === "menu") {
          text = `${config.prefix}${senderLower}`;
        } else if (playerState.game === "flipcoin" && (senderLower === "head" || senderLower === "tail" || senderLower === "h" || senderLower === "t")) {
          text = `${config.prefix}g ${senderLower}`;
        } else if ((playerState.game === "tictactoe" || playerState.game === "fb") && /^[1-9]$/.test(senderLower)) {
          text = `${config.prefix}${senderLower}`;
        } else if (playerState.game === "fb" && senderLower === "cash") {
          text = `${config.prefix}cash`;
        } else {
          return; // Ignore other text
        }
      } else {
        return; // Ignore other non-prefixed text
      }
    } else {
      // Starts with prefix - still intercept invite accepts
      const cleanText = text.slice(config.prefix.length).trim().toLowerCase();
      if (hasInvite && (cleanText === "gas" || cleanText === "g")) {
        text = `${config.prefix}accept`;
      } else if (hasInvite && (cleanText === "decline" || cleanText === "no" || cleanText === "tolak")) {
        text = `${config.prefix}decline`;
      }
    }

    const body = text.slice(config.prefix.length).trim();
    if (!body) return;

    const parts = body.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    // Helper: nomor WA tanpa @s.whatsapp.net
    const senderNum = sender.split("@")[0];

    /**
     * Reply dengan auto-tag @sender dan quote pesan original
     * @param {string|object} content
     * @param {string[]} extraMentions - JID tambahan yang perlu di-mention
     */
    const reply = async (content, extraMentions = []) => {
      const mentions = [sender, ...extraMentions].filter(
        (v, i, a) => v && a.indexOf(v) === i
      );

      if (typeof content === "string") {
        const text = `@${senderNum}\n${content}`;
        return sock.sendMessage(jid, { text, mentions }, { quoted: msg });
      }

      // Object content (misalnya dengan image, dll)
      if (content.text) {
        content.text = `@${senderNum}\n${content.text}`;
      }
      return sock.sendMessage(
        jid,
        { ...content, mentions },
        { quoted: msg }
      );
    };

    /**
     * Kirim pesan ke JID lain (untuk notify opponent)
     * @param {string} targetJid - JID tujuan (bisa group atau private)
     * @param {string} text
     * @param {string[]} mentionJids - JID yang perlu di-mention dalam teks
     */
    const sendTo = async (targetJid, text, mentionJids = []) => {
      return sock.sendMessage(
        targetJid,
        { text, mentions: mentionJids },
        { quoted: msg }
      );
    };

    const ctx = {
      sock,
      msg,
      jid,
      sender,
      senderNum,
      isGroup,
      groupJid,
      command,
      args,
      text,
      reply,
      sendTo
    };

    await executeCommand(ctx);
  } catch (err) {
    console.error("Error in handleMessage:", err);
  }
}

export default { handleMessage };
