// utils/gameState.js
// Game State Manager - Mengelola state pemain dalam game

/**
 * Game States:
 * - NONE: Pemain tidak dalam game
 * - GAME_MENU: Memilih game mana yang ingin dimainkan
 * - MODE_SELECT: Memilih vs BOT (!1) atau vs PLAYER (!2)
 * - OPPONENT_SELECT: Menunggu tag atau nickname opponent (untuk multiplayer)
 * - IN_GAME: Sedang bermain
 */

class GameStateManager {
  constructor() {
    // playerStates[jid] = { state, game, mode, opponent, data }
    this.playerStates = new Map();
    // activeGames[gameId] = { players: [], gameData }
    this.activeGames = new Map();
  }

  /**
   * Set player state ketika memilih game
   */
  setPlayerInGame(jid, game) {
    this.playerStates.set(jid, {
      state: "IN_GAME",
      game: game,
      mode: null,
      opponent: null,
      data: {},
      createdAt: Date.now()
    });
  }

  /**
   * Set player state untuk mode selection
   */
  setModeSelection(jid, game) {
    this.playerStates.set(jid, {
      state: "MODE_SELECT",
      game: game,
      mode: null,
      opponent: null,
      data: {},
      createdAt: Date.now()
    });
  }

  /**
   * Set multiplayer mode dan tunggu opponent
   */
  setMultiplayerMode(jid, game, opponent) {
    this.playerStates.set(jid, {
      state: "OPPONENT_SELECT",
      game: game,
      mode: "multiplayer",
      opponent: opponent || null,
      data: {},
      createdAt: Date.now()
    });
  }

  /**
   * Update game data untuk player
   */
  updateGameData(jid, data) {
    const state = this.playerStates.get(jid);
    if (state) {
      state.data = { ...state.data, ...data };
    }
  }

  /**
   * Get player state
   */
  getPlayerState(jid) {
    return this.playerStates.get(jid) || null;
  }

  /**
   * Check jika player sedang dalam game
   */
  isPlayerInGame(jid) {
    const state = this.playerStates.get(jid);
    return state && (state.state === "IN_GAME" || state.state === "MODE_SELECT" || state.state === "OPPONENT_SELECT");
  }

  /**
   * Check jika player menunggu pilihan mode
   */
  isWaitingModeSelection(jid) {
    const state = this.playerStates.get(jid);
    return state && state.state === "MODE_SELECT";
  }

  /**
   * Check jika player menunggu opponent
   */
  isWaitingOpponent(jid) {
    const state = this.playerStates.get(jid);
    return state && state.state === "OPPONENT_SELECT";
  }

  /**
   * Remove player dari game state
   */
  removePlayer(jid) {
    this.playerStates.delete(jid);
  }

  /**
   * Clear all states untuk player (untuk !back atau !menu)
   */
  clearPlayerState(jid) {
    this.playerStates.delete(jid);
  }

  /**
   * Set mode untuk multiplayer games
   */
  setMode(jid, mode) {
    const state = this.playerStates.get(jid);
    if (state) {
      state.mode = mode;
      state.state = mode === "bot" ? "IN_GAME" : "OPPONENT_SELECT";
    }
  }

  /**
   * Set opponent untuk multiplayer games
   */
  setOpponent(jid, opponent) {
    const state = this.playerStates.get(jid);
    if (state) {
      state.opponent = opponent;
      state.state = "IN_GAME";
    }
  }

  /**
   * Get current game untuk player
   */
  getCurrentGame(jid) {
    const state = this.playerStates.get(jid);
    return state ? state.game : null;
  }

  /**
   * Get mode untuk player (bot atau multiplayer)
   */
  getMode(jid) {
    const state = this.playerStates.get(jid);
    return state ? state.mode : null;
  }

  /**
   * Get opponent untuk multiplayer
   */
  getOpponent(jid) {
    const state = this.playerStates.get(jid);
    return state ? state.opponent : null;
  }
}

export const gameStateManager = new GameStateManager();
export default gameStateManager;
