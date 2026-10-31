// src/state/GameState.js

/**
 * GameState
 * Fonte única de verdade para fase do jogo, inventário e progresso
 * (pontos de interesse visitados por enquanto). Container observável
 * simples — sem persistência/save ainda, isso fica pra depois.
 *
 * Fases: 'menu' (tela inicial) → 'harbor' (porto 2D) → 'sailing' (mar 3D)
 *        → 'won'. Também existe 'paused' (reservada, ainda sem uso).
 *
 * Os nomes visitIsland/visitedIslands/totalIslands foram mantidos por
 * compatibilidade: hoje cada "ilha" é um ponto de interesse (sem colisão).
 *
 * Uso:
 *   const gameState = new GameState();
 *   gameState.addItem('mapa-antigo');
 *   gameState.visitIsland('poi-0');
 *   gameState.markTalked('mae');       // conversas do porto
 *   gameState.completeTutorial('fishing');
 *
 *   const unsubscribe = gameState.onChange((state) => hud.render(state));
 */
export class GameState {
  constructor() {
    this.phase = 'menu'; // 'menu' | 'harbor' | 'sailing' | 'paused' | 'won'
    this.inventory = [];
    this.visitedIslands = new Set();
    this.totalIslands = 0; // 0 = sem objetivo definido
    this.talkedTo = new Set(); // ids das pessoas do porto com quem o jogador já conversou
    this.tutorials = new Set(); // tutoriais já vistos ('fishing' = primeira pescaria)
    this._listeners = [];
  }

  /** Define quantos pontos precisam ser visitados para completar o objetivo. */
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

  /** Marca um ponto como visitado. Retorna true só na primeira vez. */
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

  /** Registra que o jogador conversou com um personagem do porto. */
  markTalked(npcId) {
    if (this.talkedTo.has(npcId)) return;
    this.talkedTo.add(npcId);
    this._notify();
  }

  hasTalked(npcId) {
    return this.talkedTo.has(npcId);
  }

  /** Marca um tutorial como concluído (não dispara de novo nesta sessão). */
  completeTutorial(id) {
    if (this.tutorials.has(id)) return;
    this.tutorials.add(id);
    this._notify();
  }

  hasTutorial(id) {
    return this.tutorials.has(id);
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