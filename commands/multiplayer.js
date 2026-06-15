// commands/multiplayer.js
// Central lobby for multiplayer challenges

import { gameStateManager } from "../utils/gameState.js";
import { getUser, isRegistered } from "../utils/economy.js";
import { config } from "../config.js";
import { sleep } from "../utils/animation.js";

export const name = "multiplayer";
export const aliases = ["mp"];
export const requiresRegistration = true;

export async function execute({ sender, args, reply }) {
  const gameInput = (args[0] || "").toLowerCase();
  const betInput = args[1];

  let game = null;
  if (gameInput === "re" || gameInput === "reme") {
    game = "re";
  } else if (gameInput === "ttt" || gameInput === "tictactoe") {
    game = "tictactoe";
  }

  if (!game) {
    if (["bj", "blackjack", "fp", "flipcoin", "fb", "fruitbomb"].includes(gameInput)) {
      return reply(
        `${config.ui.line}\n❌ Hanya game TicTacToe (!ttt) dan Reme (!reme) yang dapat dimainkan secara multiplayer.\n${config.ui.line}`
      );
    }
    return reply(
      `${config.ui.line}\n┃ ⚔️ MULTIPLAYER CHALLENGE\n${config.ui.line}\n\n` +
      `Gunakan:\n!mp <game> <bet>\n\nPilihan game:\n• reme / re\n• tictactoe / ttt\n\nContoh:\n!mp reme 5000\n!mp ttt 1000\n\n${config.ui.line}`
    );
  }

  const bet = parseInt(betInput, 10);
  if (isNaN(bet) || bet <= 0) {
    return reply(
      `${config.ui.line}\n❌ Jumlah taruhan harus berupa angka positif!\n\nContoh: !mp ${gameInput} 5000\n${config.ui.line}`
    );
  }

  const senderUser = getUser(sender);
  if (senderUser.balance < bet) {
    return reply(
      `${config.ui.line}\n❌ Saldo kamu tidak cukup!\n💰 Balance: ${config.currencySymbol}${senderUser.balance}\n${config.ui.line}`
    );
  }

  // Set Player 1 state to OPPONENT_SELECT for the game
  gameStateManager.setMultiplayerMode(sender, game, null);
  gameStateManager.updateGameData(sender, { bet });

  const gameLabel = game === "re" ? "REME" : "TIC TAC TOE";

  return reply(
    `⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘\n` +
    `⚔️ MULTIPLAYER LOBBY (${gameLabel})\n` +
    `⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘\n\n` +
    `💰 Taruhan: ${config.currencySymbol}${bet}\n\n` +
    `Silakan tag/sebut lawan yang ingin Anda tantang!\n` +
    `Ketik nama lawan, tag, atau reply pesan lawan.\n\n` +
    `Keluar: !back\n` +
    `⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘⫘`
  );
}

/**
 * Shared countdown handler for multiplayer invitations
 */
export async function startChallengeCountdown({ sock, jid, sender, opponentJid, gameCode, bet, sendTo }) {
  const inviteId = gameStateManager.createInvite(sender, opponentJid, gameCode, bet, jid);
  
  // Update invite expiration to 15 seconds
  const invite = gameStateManager.pendingInvites.get(inviteId);
  if (invite) {
    invite.expiresAt = Date.now() + 15 * 1000;
  }

  const senderNum = sender.split("@")[0];
  const oppNum = opponentJid.split("@")[0];
  const gameLabel = gameCode === "re" ? "REME" : "TIC TAC TOE";

  const getInviteMsg = (secs) => {
    let progress = "";
    if (secs >= 13) progress = "██████████";
    else if (secs >= 10) progress = "████████░░";
    else if (secs >= 7) progress = "██████░░░░";
    else if (secs >= 4) progress = "████░░░░░░";
    else if (secs >= 1) progress = "██░░░░░░░░";
    else progress = "░░░░░░░░░░";

    return `@${oppNum}\n${config.ui.line}\n┃ ⚔️ TANTANGAN ${gameLabel}\n${config.ui.line}\n\n` +
      `@${senderNum} menantangmu bermain ${gameLabel}!\n` +
      `💰 Taruhan: ${config.currencySymbol}${bet} masing-masing\n\n` +
      `Ketik *!gas* atau *!g* untuk menerima tantangan!\n\n` +
      `⌛ [${progress}] ${secs > 0 ? `${secs} detik` : "Waktu Habis!"}\n\n${config.ui.line}`;
  };

  const inviteSent = await sendTo(jid, getInviteMsg(15), [opponentJid, sender]);

  // Loop countdown every 3 seconds
  for (let i = 12; i >= 0; i -= 3) {
    await sleep(3000);
    const exists = gameStateManager.pendingInvites.has(inviteId);
    if (!exists) {
      // Invite has been accepted/declined/consumed
      return;
    }
    await sock.sendMessage(jid, {
      text: getInviteMsg(i),
      mentions: [opponentJid, sender],
      edit: inviteSent.key
    });
  }

  // Timeout - delete invite and clear state
  const consumed = gameStateManager.consumeInvite(inviteId);
  if (consumed) {
    gameStateManager.clearPlayerState(sender);
    await sendTo(
      jid,
      `${config.ui.line}\n❌ Tantangan dibatalkan karena tidak ada tanggapan dalam 15 detik.\n\n${config.ui.line}`
    );
  }
}

export default { name, aliases, requiresRegistration, execute, startChallengeCountdown };
