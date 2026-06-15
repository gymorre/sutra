// utils/animation.js
// Helper untuk animasi pesan (edit message berulang dengan delay)
// Membuat game lebih hidup dan seru!

/**
 * Mengirim pesan lalu mengedit pesan tersebut secara berurutan
 * untuk menciptakan efek animasi.
 *
 * @param {object} sock - instance Baileys socket
 * @param {string} jid - chat id tujuan
 * @param {string[]} frames - daftar teks animasi (frame pertama = pesan awal)
 * @param {number} delay - delay antar frame (ms)
 * @param {object} quoted - pesan yang akan di-reply (opsional)
 */
export async function animateMessage(sock, jid, frames, delay = 800, quoted = null) {
  if (!frames || frames.length === 0) return null;

  const mentions = [];
  const sent = await sock.sendMessage(
    jid,
    { text: frames[0], mentions },
    quoted ? { quoted } : {}
  );

  for (let i = 1; i < frames.length; i++) {
    await sleep(delay);
    await sock.sendMessage(jid, {
      text: frames[i],
      edit: sent.key
    });
  }

  return sent;
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================
// ANIMASI PRESET - siap pakai untuk setiap game
// ============================

/**
 * Animasi rolling dadu/angka untuk game REME
 * Menampilkan angka-angka random sebelum hasil akhir
 */
export function remeRollingFrames(header, finalText) {
  const spinEmojis = ["🎰", "🎲", "🎯", "💫", "⚡"];
  return [
    `${header}\n\n${spinEmojis[0]} Rolling...\n\n⏳ ░░░░░░░░░░ 0%`,
    `${header}\n\n${spinEmojis[1]} Rolling...\n\n⏳ ███░░░░░░░ 30%`,
    `${header}\n\n${spinEmojis[2]} Rolling...\n\n⏳ ██████░░░░ 60%`,
    `${header}\n\n${spinEmojis[3]} Rolling...\n\n⏳ █████████░ 90%`,
    `${header}\n\n${spinEmojis[4]} STOP!\n\n⏳ ██████████ 100%`,
    finalText
  ];
}

/**
 * Animasi flip koin untuk FLIPCOIN
 * Koin berputar sebelum mendarat
 */
export function flipCoinFrames(header, finalText) {
  return [
    `${header}\n\n🪙 Melempar koin ke udara...\n\n      🪙\n      ↑↑↑`,
    `${header}\n\n🌀 Koin berputar...\n\n         🪙\n      ~ ~ ~ ~`,
    `${header}\n\n💫 Koin berputar...\n\n      ✨🪙✨\n      ~ ~ ~ ~`,
    `${header}\n\n⬇️ Koin turun...\n\n      🪙\n      ↓↓↓`,
    `${header}\n\n🖐️ TANGKAP!\n\n      ❓\n      ???`,
    finalText
  ];
}

/**
 * Animasi dealing kartu untuk BLACKJACK
 * Kartu dibagikan satu per satu
 */
export function blackjackDealFrames(header, finalText) {
  return [
    `${header}\n\n🃏 Mengocok kartu...\n\n🎴🎴🎴🎴🎴\n    shfff...`,
    `${header}\n\n🃏 Kartu dikocok...\n\n  🎴🎴🎴\n  🎴🎴🎴\n    shuffle!`,
    `${header}\n\n✨ Membagikan kartu...\n\n🎴 → 👤 Kamu\n🎴 → 🤖 Dealer`,
    `${header}\n\n✨ Membagikan kartu...\n\n🎴🎴 → 👤 Kamu\n🎴❓ → 🤖 Dealer`,
    finalText
  ];
}

/**
 * Animasi HIT untuk BLACKJACK
 * Kartu ditarik dari deck
 */
export function blackjackHitFrames(header, finalText) {
  return [
    `${header}\n\n🎴 Mengambil kartu...\n\n📦 Deck\n  ↓\n  🎴 → ???`,
    `${header}\n\n✨ Kartu terbuka!\n\n📦 Deck\n  ↓\n  🎴 → `,
    finalText
  ];
}

/**
 * Animasi STAND → Dealer reveal untuk BLACKJACK
 */
export function blackjackStandFrames(header, dealerCards, finalText) {
  return [
    `${header}\n\n🤖 Dealer membuka kartu...\n\n❓ → ???`,
    `${header}\n\n🤖 Dealer: ${dealerCards}\n\n🎴 Dealer berpikir...`,
    finalText
  ];
}

/**
 * Animasi buka kotak untuk FRUITBOMB
 * Kotak terbuka dengan suspense
 */
export function fruitBombOpenFrames(header, position, finalText) {
  return [
    `${header}\n\n🎯 Membuka kotak ${position}...\n\n📦 → ❓\n⏳ ...`,
    `${header}\n\n✨ Kotak ${position} terbuka!\n\n📦 → 💫\n⏳ ...`,
    finalText
  ];
}

/**
 * Animasi bom meledak untuk FRUITBOMB
 */
export function fruitBombExplosionFrames(header, finalText) {
  return [
    `${header}\n\n💣 Kotak bergetar...\n\n   📦💥\n   tick... tick...`,
    `${header}\n\n💥💥💥 BOOM! 💥💥💥\n\n   💣🔥\n   MELEDAK!!!`,
    finalText
  ];
}

/**
 * Animasi giliran TIC TAC TOE
 * Menandai posisi dengan efek
 */
export function tttMoveFrames(header, finalText) {
  return [
    `${header}\n\n🎯 Menempatkan...\n\n⏳ ...`,
    finalText
  ];
}

/**
 * Animasi menang dengan confetti
 */
export function winCelebrationFrames(header, finalText) {
  return [
    `${header}\n\n🎊 🎉 🎊\n  SELAMAT!!\n🎊 🎉 🎊`,
    finalText
  ];
}

/**
 * Animasi multiplayer game dimulai
 */
export function multiplayerStartFrames(header, finalText) {
  return [
    `${header}\n\n⚔️ Mempersiapkan arena...\n\n3️⃣`,
    `${header}\n\n⚔️ Bersiap...\n\n2️⃣`,
    `${header}\n\n⚔️ MULAI!\n\n1️⃣ GO!`,
    finalText
  ];
}

export default {
  animateMessage,
  sleep,
  remeRollingFrames,
  flipCoinFrames,
  blackjackDealFrames,
  blackjackHitFrames,
  blackjackStandFrames,
  fruitBombOpenFrames,
  fruitBombExplosionFrames,
  tttMoveFrames,
  winCelebrationFrames,
  multiplayerStartFrames
};
