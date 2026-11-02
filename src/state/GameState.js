// src/state/GameState.js

const SAVE_KEY = 'mardeherancas:save';
const SAVE_VERSION = 1;

/**
 * GameState
 * Fonte única de verdade para fase do jogo, inventário e progresso
 * (pontos visitados, peixes pescados, flags da história). Container
 * observável simples. O PROGRESSO DA CAMPANHA (peixes, flags, tutoriais,
 * pontos visitados) é salvo no localStorage; as conversas do porto não.
 * Para começar do zero: abrir o jogo com ?novo na URL (ou GameState.clearSave()).
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
 *   gameState.completeTutorial('fishing');   // só quando o jogador consegue o 1º peixe
 *   gameState.failTutorial('fishing');       // não conseguiu: o tutorial se repete
 *   gameState.recordCatch(fish);       // peixe de verdade conta; achado não
 *   gameState.setFlag('note-found');   // marcos da história
 *   gameState.collectItem('garrafa-davi');  // garrafas e relíquias do mar (data/items.js)
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
    this.fishCaught = 0; // peixes de verdade pescados (achados não contam)
    this.fishLog = {}; // id da espécie/achado -> quantas vezes (diário)
    this.flags = new Set(); // marcos da história ('note-found'...)
    this.collected = new Set(); // garrafas e relíquias já recolhidas (ids de data/items.js)
    this.tutorialFails = {}; // tutorial id -> tentativas que NÃO deram certo (ex.: perdeu o 1º peixe)
    this._listeners = [];
    this._load();
  }

  /** Apaga o progresso salvo (próximo carregamento começa do zero). */
  static clearSave() {
    try {
      localStorage.removeItem(SAVE_KEY);
    } catch {
      // sem localStorage: nada a apagar
    }
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
      this._save();
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
    this._save();
    this._notify();
  }

  hasTutorial(id) {
    return this.tutorials.has(id);
  }

  /** O jogador não conseguiu concluir o tutorial: ele se repete (com outra fala). */
  failTutorial(id) {
    this.tutorialFails[id] = (this.tutorialFails[id] ?? 0) + 1;
    this._save();
    this._notify();
  }

  /** Quantas vezes o tutorial já falhou. */
  tutorialAttempts(id) {
    return this.tutorialFails[id] ?? 0;
  }

  /** Registra uma pesca. Só peixes de verdade contam para a meta. Devolve o total de peixes. */
  recordCatch(fish) {
    this.fishLog[fish.id] = (this.fishLog[fish.id] ?? 0) + 1;
    if (!fish.junk) this.fishCaught += 1;
    this._save();
    this._notify();
    return this.fishCaught;
  }

  setFlag(flag) {
    if (this.flags.has(flag)) return;
    this.flags.add(flag);
    this._save();
    this._notify();
  }

  hasFlag(flag) {
    return this.flags.has(flag);
  }

  /** Recolhe um item do mar. Devolve true só na primeira vez. */
  collectItem(id) {
    if (this.collected.has(id)) return false;
    this.collected.add(id);
    this._save();
    this._notify();
    return true;
  }

  hasCollected(id) {
    return this.collected.has(id);
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

  _save() {
    try {
      localStorage.setItem(
        SAVE_KEY,
        JSON.stringify({
          v: SAVE_VERSION,
          fishCaught: this.fishCaught,
          fishLog: this.fishLog,
          flags: [...this.flags],
          collected: [...this.collected],
          tutorialFails: this.tutorialFails,
          tutorials: [...this.tutorials],
          visited: [...this.visitedIslands],
        })
      );
    } catch {
      // localStorage indisponível: o jogo segue sem salvar
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.v !== SAVE_VERSION) return;
      this.fishCaught = Number(data.fishCaught) || 0;
      this.fishLog = data.fishLog && typeof data.fishLog === 'object' ? data.fishLog : {};
      this.flags = new Set(Array.isArray(data.flags) ? data.flags : []);
      this.collected = new Set(Array.isArray(data.collected) ? data.collected : []);
      this.tutorialFails = data.tutorialFails && typeof data.tutorialFails === 'object' ? data.tutorialFails : {};
      this.tutorials = new Set(Array.isArray(data.tutorials) ? data.tutorials : []);
      this.visitedIslands = new Set(Array.isArray(data.visited) ? data.visited : []);
    } catch {
      // save corrompido: começa do zero
    }
  }
}

export default GameState;