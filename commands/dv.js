cat > /root/sutra/commands/dv.js << 'ENDOFFILE'
// commands/dv.js
import { config } from "../config.js";
import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { tmpdir } from "os";

const execFileAsync = promisify(execFile);

export const name = "dv";
export const aliases = ["downloadvideo", "download"];
export const requiresRegistration = false;

const YTDLP_PATH = "/usr/local/bin/yt-dlp";
const COOKIES_PATH = "/root/sutra/cookies.txt";

function detectPlatform(url) {
  const u = url.toLowerCase();
  if (u.includes("tiktok.com")) return "tiktok";
  if (u.includes("instagram.com") || u.includes("instagr.am")) return "instagram";
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("facebook.com") || u.includes("fb.watch")) return "facebook";
  return null;
}

async function downloadWithYtDlp(url) {
  const tmpFile = path.join(tmpdir(), "sutra_dv_" + Date.now() + ".mp4");
  const cookiesArgs = fs.existsSync(COOKIES_PATH) ? ["--cookies", COOKIES_PATH] : [];

  const args = [
    url, "-f", "best[ext=mp4][filesize<50M]/best", "-o", tmpFile,
    "--no-playlist", "--max-filesize", "50m", "--merge-output-format", "mp4",
    "--no-warnings", "--socket-timeout", "30",
    ...cookiesArgs,
  ];

  try {
    await execFileAsync(YTDLP_PATH, args, { timeout: 120000 });
  } catch {
    await execFileAsync(
      YTDLP_PATH,
      [url, "-o", tmpFile, "--no-playlist", "--merge-output-format", "mp4", "--no-warnings", ...cookiesArgs],
      { timeout: 120000 }
    );
  }

  if (!fs.existsSync(tmpFile)) {
    const prefix = path.basename(tmpFile, ".mp4");
    const files = fs.readdirSync(tmpdir()).filter(f => f.startsWith(prefix));
    if (files.length > 0) return path.join(tmpdir(), files[0]);
    throw new Error("File tidak ditemukan");
  }
  return tmpFile;
}

const PLATFORM_LABEL = {
  tiktok: "🎵 TikTok",
  instagram: "📸 Instagram",
  youtube: "▶️ YouTube",
  facebook: "📘 Facebook",
};

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function buildBox(title, lines) {
  return (
    `${config.ui.line}\n┃ ${title}\n${config.ui.line}\n\n` +
    lines.join("\n") +
    `\n\n${config.ui.line}`
  );
}

export async function execute({ args, reply, sock, msg }) {
  const url = args[0];

  if (!url) {
    return reply(
      buildBox("🎥 DOWNLOAD VIDEO", [
        "❌ Masukkan link video!",
        "",
        "Gunakan: *!dv <link>*",
        "",
        "Platform yang didukung:",
        "• 🎵 TikTok",
        "• 📸 Instagram",
        "• ▶️ YouTube",
        "• 📘 Facebook",
      ])
    );
  }

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return reply(
      buildBox("🎥 DOWNLOAD VIDEO", ["❌ URL tidak valid! Link harus dimulai dengan https://"])
    );
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return reply(buildBox("🎥 DOWNLOAD VIDEO", ["❌ Platform tidak didukung!"]));
  }

  const platformLabel = PLATFORM_LABEL[platform];
  const jid = msg.key.remoteJid;

  const loadingMsg = await reply(
    buildBox("🎥 DOWNLOAD VIDEO", [
      `📌 Platform: ${platformLabel}`,
      "",
      "⏳ Mengunduh ⠋",
    ])
  );

  let frameIndex = 0;
  const animationTimer = setInterval(() => {
    frameIndex = (frameIndex + 1) % SPINNER_FRAMES.length;
    const text = buildBox("🎥 DOWNLOAD VIDEO", [
      `📌 Platform: ${platformLabel}`,
      "",
      `⏳ Mengunduh ${SPINNER_FRAMES[frameIndex]}`,
    ]);
    sock.sendMessage(jid, { text, edit: loadingMsg.key }).catch(() => {});
  }, 1500);

  let tmpFile = null;

  try {
    tmpFile = await downloadWithYtDlp(url);
    clearInterval(animationTimer);

    const stats = fs.statSync(tmpFile);
    const sizeMB = stats.size / (1024 * 1024);
    const videoBuffer = fs.readFileSync(tmpFile);

    await sock.sendMessage(jid, {
      text: buildBox("🎥 DOWNLOAD VIDEO", [
        `📌 Platform: ${platformLabel}`,
        "",
        "✅ Selesai! Mengirim video...",
      ]),
      edit: loadingMsg.key,
    });

    await sock.sendMessage(jid, {
      video: videoBuffer,
      caption: buildBox("🎥 DOWNLOAD VIDEO", [
        "✅ Berhasil diunduh!",
        `📌 Platform: ${platformLabel}`,
        `📦 Ukuran: ${sizeMB.toFixed(1)} MB`,
      ]),
      mimetype: "video/mp4",
    });
  } catch (err) {
    clearInterval(animationTimer);
    console.error("[DV] Error:", err.message);
    await sock.sendMessage(jid, {
      text: buildBox("🎥 DOWNLOAD VIDEO", [
        "❌ Gagal mengunduh video!",
        "",
        `Error: ${err.message}`,
      ]),
      edit: loadingMsg.key,
    });
  } finally {
    if (tmpFile && fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

export default { name, aliases, requiresRegistration, execute };
ENDOFFILE
