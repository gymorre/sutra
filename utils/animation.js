// utils/animation.js
// Helper untuk animasi pesan (edit message berulang dengan delay)

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

  const sent = await sock.sendMessage(
    jid,
    { text: frames[0] },
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

export default { animateMessage, sleep };
