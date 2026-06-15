# 🎮 SUTRA BOT - Game Flow Documentation

## 📋 Ringkasan Fitur Baru

Bot sekarang mendukung game state management dengan fitur multiplayer dan mode selection untuk game **REME** dan **TIC TAC TOE**.

---

## 🎲 REME - Game Flow

### Mode Singleplayer (vs BOT)

```
1. !re 300
   ↓
2. Pilih mode:
   !1 = Lawan BOT
   !2 = Lawan PLAYER LAIN
   ↓
3. !1 (mulai vs BOT)
   ↓
4. !g 
   (Lakukan rolling)
   ↓
5. Hasil game ditampilkan
   ↓
6. Pilihan:
   - !re 300 (ulangi)
   - !back atau !menu (keluar)
```

### Mode Multiplayer (vs PLAYER)

```
1. !re 300
   ↓
2. Pilih mode:
   !1 = Lawan BOT
   !2 = Lawan PLAYER LAIN
   ↓
3. !2 (multiplayer mode)
   Bot minta tag opponent
   ↓
4. !tag @opponent
   atau
   !tag nama_lawan
   ↓
5. !g
   (Kedua player melakukan rolling)
   ↓
6. Hasil dibandingkan dan pemenang ditentukan
   ↓
7. Pilihan:
   - !re 300 (ulangi)
   - !back atau !menu (keluar)
```

### Quick Game (dengan !bet & !g)

```
1. !re
   (show info)
   ↓
2. !bet 300
   (set bet)
   ↓
3. !g
   (main game)
```

---

## ⭕ TIC TAC TOE - Game Flow

### Direct Multiplayer Start

```
1. !gas ttt 100 @opponent
   (Tag langsung dalam grup)
   ↓
2. Game dimulai
   ↓
3. !gas ttt <1-9>
   (Pilih posisi)
   ↓
4. Game berlanjut sampai ada pemenang
   ↓
5. Hasil ditampilkan
   ↓
6. Pilihan:
   - !gas ttt 100 @opponent (ulangi)
   - !back atau !menu (keluar)
```

### Mode Selection Flow

```
1. !gas ttt 300
   ↓
2. Pilih mode:
   !1 = Lawan BOT (belum tersedia untuk TTT)
   !2 = Lawan PLAYER LAIN
   ↓
3. !2 (multiplayer)
   Bot minta tag opponent
   ↓
4. !tag @opponent
   ↓
5. Game dimulai
   ↓
6. !gas ttt <1-9>
   (Pilih posisi)
```

---

## 🎮 Command Reference

### Game Exit Commands
- `!back` → Keluar dari game state, kembali ke normal
- `!menu` → Keluar dari game dan tampilkan menu

### Mode Selection (setelah !gas <game>)
- `!1` → Bermain vs BOT
- `!2` → Bermain vs PLAYER LAIN

### Multiplayer Commands
- `!tag @opponent` → Tag opponent dari mentions
- `!tag nama_lawan` → Set opponent dengan nickname

### Game Play
- `!gas <game> <1-9>` → Untuk tictactoe moves
- `!g` → Quick play / confirm action
- `!bet <amount>` → Set bet untuk quick play

---

## 📊 Game State Management

### State Types

1. **NONE** - Pemain tidak dalam game
2. **MODE_SELECT** - Memilih bot atau multiplayer
3. **OPPONENT_SELECT** - Menunggu tag opponent
4. **IN_GAME** - Sedang bermain

### State Tracking

Bot akan track:
- Game apa yang sedang dimainkan
- Mode (bot atau multiplayer)
- Opponent (jika multiplayer)
- Bet amount
- Game data (untuk setiap game)

Player tidak bisa switch game tanpa `!back` atau `!menu`.

---

## 💰 Bet System

### REME Multiplayer
- Setiap player put in bet
- Pemenang ditentukan secara acak 50/50
- Pemenang mengambil pot
- Draw tidak terjadi dalam mode ini

### TIC TAC TOE
- Setiap player put in bet
- Pemenang mengambil semua pot
- Draw = uang dikembalikan

---

## ⚠️ Important Notes

1. **Game State Persistence**: Selama player tidak pakai `!back` atau `!menu`, mereka akan tetap di game state
2. **Multiplayer Tag**: Player 1 harus tag/mention Player 2 dengan benar
3. **Bet Validation**: Sistem akan check balance sebelum game dimulai
4. **Quick Commands**: `!g` dan `!bet` hanya bisa digunakan saat dalam game

---

## 🔄 State Flow Diagram

```
Start
  ↓
Check if in game? 
  ├─ Yes → Handle game command (!g, !bet, !back, !menu)
  └─ No → Handle normal command
  
If selecting game:
  ├─ Provide bet → MODE_SELECT state
  └─ !1 atau !2 → Set mode
  
If multiplayer:
  ├─ OPPONENT_SELECT state
  └─ !tag → Start game
  
In game:
  ├─ !g or !bet → Play
  ├─ !back or !menu → Clear state
  └─ Game over → Offer repeat or exit
```

---

## 📝 Summary for Players

### Cara Bermain REME:
```
!re <bet>
!1 (vs bot) atau !2 (vs player)
Jika multiplayer: !tag @opponent
!g untuk bermain
!back atau !menu untuk keluar
```

### Cara Bermain TICTACTOE:
```
!gas ttt <bet> @opponent (direct start)
atau
!gas ttt <bet>
!2 (multiplayer)
!tag @opponent
!gas ttt <1-9> untuk main
!back atau !menu untuk keluar
```

---

Generated: 2024
Version: 1.0 - Multiplayer Support
