// utils/gameState.js
// Game State Manager - Mengelola state pemain dalam game

/**
 * Game States:
 * - MODE_SELECT    : Memilih vs BOT (!1) atau vs PLAYER (!2)
 * - OPPONENT_SELECT: Menunggu tag atau nickname opponent (multiplayer)
 * - WAITING_INVITE : Menunggu opponent menerima / menolak undangan
 * - IN_GAME        : Sedang bermain aktif
 */

class GameStateManager {
  constructor() {
    // playerStates[jid] = { state, game, mode, opponent, data, createdAt }
    this.playerStates = new Map();

    // pendingInvites[inviteId] = { from, to, game, bet, jid, expiresAt }
    this.pendingInvites = new Map();

    // Auto-cleanup invites yang expired setiap 2 menit
    setInterval(() => this.cleanupInvites(), 2 * 60 * 1000);
  }

  // ============================
  // PLAYER STATE METHODS
  // ============================

  /** Set state ke MODE_SELECT saat player memilih game */
  setModeSelection(jid, game) {
    this.playerStates.set(jid, {
      state: "MODE_SELECT",
      game,
      mode: null,
      opponent: null,
      data: {},
      createdAt: Date.now()
    });
  }

  /** Set state ke IN_GAME langsung (bot mode atau setelah invite diterima) */
  setPlayerInGame(jid, game) {
    const existing = this.playerStates.get(jid);
    this.playerStates.set(jid, {
      state: "IN_GAME",
      game,
      mode: existing?.mode || null,
      opponent: existing?.opponent || null,
      data: existing?.data || {},
      createdAt: existing?.createdAt || Date.now()
    });
  }

  /** Set state ke OPPONENT_SELECT (menunggu tag lawan) */
  setMultiplayerMode(jid, game, opponent) {
    const existing = this.playerStates.get(jid);
    this.playerStates.set(jid, {
      state: "OPPONENT_SELECT",
      game,
      mode: "multiplayer",
      opponent: opponent || null,
      data: existing?.data || {},
      createdAt: existing?.createdAt || Date.now()
    });
  }

  /** Set state ke WAITING_INVITE (menunggu lawan accept) */
  setWaitingInvite(jid, inviteId) {
    const state = this.playerStates.get(jid);
    if (state) {
      state.state = "WAITING_INVITE";
      state.data = { ...state.data, inviteId };
    }
  }

  /** Update data tambahan dalam state player */
  updateGameData(jid, data) {
    const state = this.playerStates.get(jid);
    if (state) {
      state.data = { ...state.data, ...data };
    }
  }

  /** Ambil state player */
  getPlayerState(jid) {
    return this.playerStates.get(jid) || null;
  }

  /** Cek apakah player sedang dalam game (any active state) */
  isPlayerInGame(jid) {
    const state = this.playerStates.get(jid);
    return !!(state && ["IN_GAME", "MODE_SELECT", "OPPONENT_SELECT", "WAITING_INVITE"].includes(state.state));
  }

  isWaitingModeSelection(jid) {
    const state = this.playerStates.get(jid);
    return !!(state && state.state === "MODE_SELECT");
  }

  isWaitingOpponent(jid) {
    const state = this.playerStates.get(jid);
    return !!(state && state.state === "OPPONENT_SELECT");
  }

  isWaitingInvite(jid) {
    const state = this.playerStates.get(jid);
    return !!(state && state.state === "WAITING_INVITE");
  }

  /** Hapus state player (keluar game) */
  clearPlayerState(jid) {
    this.playerStates.delete(jid);
  }

  removePlayer(jid) {
    this.playerStates.delete(jid);
  }

  /** Set mode setelah player pilih !1 atau !2 */
  setMode(jid, mode) {
    const state = this.playerStates.get(jid);
    if (state) {
      state.mode = mode;
      state.state = mode === "bot" ? "IN_GAME" : "OPPONENT_SELECT";
    }
  }

  /** Set opponent setelah player tag lawan */
  setOpponent(jid, opponent) {
    const state = this.playerStates.get(jid);
    if (state) {
      state.opponent = opponent;
      state.state = "IN_GAME";
    }
  }

  getCurrentGame(jid) {
    const state = this.playerStates.get(jid);
    return state ? state.game : null;
  }

  getMode(jid) {
    const state = this.playerStates.get(jid);
    return state ? state.mode : null;
  }

  getOpponent(jid) {
    const state = this.playerStates.get(jid);
    return state ? state.opponent : null;
  }

  // ============================
  // INVITE SYSTEM
  // ============================

  /**
   * Buat invite baru dari sender ke target
   * @returns {string} inviteId
   */
  createInvite(from, to, game, bet, jid) {
    // Hapus invite lama dari player ini jika ada
    for (const [id, inv] of this.pendingInvites) {
      if (inv.from === from) this.pendingInvites.delete(id);
    }

    const inviteId = `${from}_${game}_${Date.now()}`;
    this.pendingInvites.set(inviteId, {
      from,
      to,
      game,
      bet,
      jid,        // groupJid atau privateJid tempat game berlangsung
      expiresAt: Date.now() + 2 * 60 * 1000 // 2 menit
    });

    // Set sender ke WAITING_INVITE
    this.setWaitingInvite(from, inviteId);

    return inviteId;
  }

  /**
   * Cari invite yang ditujukan ke jid tertentu
   */
  getInviteForPlayer(to) {
    for (const [id, invite] of this.pendingInvites) {
      if (invite.to === to && invite.expiresAt > Date.now()) {
        return { id, ...invite };
      }
    }
    return null;
  }

  /**
   * Ambil dan hapus invite (accept/decline)
   */
  consumeInvite(inviteId) {
    const invite = this.pendingInvites.get(inviteId);
    if (!invite) return null;
    this.pendingInvites.delete(inviteId);
    return invite;
  }

  /** Hapus invite yang sudah expired */
  cleanupInvites() {
    const now = Date.now();
    for (const [id, invite] of this.pendingInvites) {
      if (invite.expiresAt <= now) {
        this.pendingInvites.delete(id);
        // Bebaskan player pengirim jika masih WAITING_INVITE
        const senderState = this.playerStates.get(invite.from);
        if (senderState && senderState.state === "WAITING_INVITE") {
          this.playerStates.delete(invite.from);
        }
      }
    }
  }
}

export const gameStateManager = new GameStateManager();
export default gameStateManager;
