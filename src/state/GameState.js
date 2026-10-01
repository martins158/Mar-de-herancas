// src/state/GameState.js

/**
 * GameState
 * Fonte única de verdade para fase do jogo, inventário e progresso
 * (ilhas visitadas por enquanto). Container observável simples — sem
 * persistência/save ainda, isso fica pra depois.
 *
 * Uso:
 *   const gameState = new GameState();
 *   gameState.addItem('mapa-antigo');
 *   gameState.visitIsland('island-0');
 *
 *   const unsubscribe = gameState.onChange((state) => hud.render(state));
 */
export class GameState {
  constructor() {
    this.phase = 'sailing'; // 'sailing' | 'paused' | 'menu' | 'won'
    this.inventory = [];
    this.visitedIslands = new Set();
    this.totalIslands = 0; // 0 = sem objetivo de ilhas definido
    this._listeners = [];
  }

  /** Define quantas ilhas precisam ser visitadas para completar o objetivo. */
  setTotalIslands(total) {
    this.totalIslands = total;
    this._notify();
  }

  get isComplete() {
    return this.totalIslands > 0 && this.visitedIslands.size >= this.totalIslands;
  }

  setPhase(phase) {
    this.phase = phase;
    this._notify();
  }

  addItem(itemId) {
    this.inventory.push(itemId);
    this._notify();
  }

  hasItem(itemId) {
    return this.inventory.includes(itemId);
  }

  /** Marca uma ilha como visitada. Retorna true só na primeira vez. */
  visitIsland(islandId) {
    const isNew = !this.visitedIslands.has(islandId);
    this.visitedIslands.add(islandId);
    if (isNew) {
      if (this.isComplete) this.phase = 'won';
      this._notify();
    }
    return isNew;
  }

  hasVisited(islandId) {
    return this.visitedIslands.has(islandId);
  }

  /** Chama callback(state) sempre que algo mudar. Retorna função para cancelar a inscrição. */
  onChange(callback) {
    this._listeners.push(callback);
    return () => {
      const index = this._listeners.indexOf(callback);
      if (index !== -1) this._listeners.splice(index, 1);
    };
  }

  _notify() {
    for (const listener of this._listeners) listener(this);
  }
}

export default GameState;