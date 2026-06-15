# SUTRA BOT

WhatsApp Bot — Mini Game + Virtual Economy + Multiplayer Group Game.
Node.js (ESM) + Baileys + SQLite.

## Setup

```bash
npm install
npm start
```

Scan QR code yang muncul di terminal dengan WhatsApp.

## Konfigurasi

Edit `config.js`:
- `ownerNumber` — nomor owner untuk `!support`
- `inviteLink` — link invite bot untuk `!invitebot`
- `startingBalance`, `reward`, dll.

## Catatan

- `better-sqlite3` membutuhkan kompilasi native module saat `npm install`.
  Jika gagal, pastikan koneksi internet tersedia untuk mengunduh Node headers,
  atau install build tools (`python3`, `make`, `g++`).
- Database otomatis dibuat di `database/database.db` saat bot pertama kali dijalankan.
- Folder `auth_info/` (sesi WhatsApp) dibuat otomatis — jangan dibagikan ke siapapun.

## Command Utama

| Command | Keterangan |
|---|---|
| `!register <nickname>` | Daftar akun (wajib, balance awal $1000) |
| `!menu` | Menu utama |
| `!game` | Menu game |
| `!gas <game> <bet>` | Main game via gas, contoh: `!gas bj 100` |
| `!re <bet>` | Game 50/50 Reme langsung |
| `!fp <bet> <head/tail>` | Flip coin, menang x2 |
| `!bj <bet>` / `!bj hit` / `!bj stand` | Blackjack |
| `!ttt @tag <bet>` / `!ttt <1-9>` | Tic Tac Toe multiplayer |
| `!balance` / `!cek` / `!leaderboard` | Info ekonomi |
| `!hourly` `!daily` `!weekly` `!monthly` | Klaim reward berkala |
| `!kurs` | Kurs realtime USD ke JPY/CNY/MYR/IDR |
| `!deposit` `!withdraw` `!idx` `!dv` | Coming Soon |
| `!support` `!invitebot` | Info owner & invite link |

Mode: **OPEN BETA** — semua fitur gratis, virtual currency, tidak ada uang asli.
