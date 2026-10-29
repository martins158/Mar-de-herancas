// src/state/Settings.js

/**
 * Settings
 * Configurações do jogador: volume, escala de resolução e teclas.
 * Salvas no localStorage e observáveis (mesmo padrão do GameState).
 *
 * Cada ação tem 2 teclas ("principal" e "alternativa"). O InputSystem lê
 * `settings.keymap` a cada evento, então remapear vale na hora.
 *
 * Uso:
 *   const settings = new Settings();
 *   settings.setVolume(0.5);
 *   settings.setKey('forward', 0, 'KeyI');
 *   settings.onChange((s) => engine.setRenderScale(s.renderScale));
 */

const STORAGE_KEY = 'mardeherancas:settings';

export const DEFAULT_KEYMAP = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  interact: ['KeyE', 'Space'],
};

export const ACTION_LABELS = {
  forward: 'Avançar',
  backward: 'Ré',
  left: 'Esquerda',
  right: 'Direita',
  interact: 'Interagir / conversar / avançar diálogo',
};

/** Escalas de resolução de renderização (1 = nativa da tela). */
export const RENDER_SCALES = [0.5, 0.75, 1, 1.25];

/** Nome amigável de uma tecla (event.code → texto). */
export function formatKey(code) {
  if (!code) return '—';
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  const names = {
    ArrowUp: '↑',
    ArrowDown: '↓',
    ArrowLeft: '←',
    ArrowRight: '→',
    Space: 'Espaço',
    Enter: 'Enter',
    ShiftLeft: 'Shift',
    ShiftRight: 'Shift',
    ControlLeft: 'Ctrl',
    ControlRight: 'Ctrl',
    AltLeft: 'Alt',
    AltRight: 'Alt',
    Tab: 'Tab',
    Backspace: 'Backspace',
  };
  return names[code] ?? code;
}

const cloneKeymap = (keymap) =>
  Object.fromEntries(Object.entries(keymap).map(([action, codes]) => [action, [...codes]]));

export class Settings {
  constructor() {
    this.volume = 0.8; // 0..1 (ainda sem AudioSystem: só fica guardado)
    this.renderScale = 1;
    this.keymap = cloneKeymap(DEFAULT_KEYMAP);
    this._listeners = [];
    this._load();
  }

  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, volume));
    this._commit();
  }

  setRenderScale(scale) {
    if (!RENDER_SCALES.includes(scale)) return;
    this.renderScale = scale;
    this._commit();
  }

  /** Define a tecla de uma ação (slot 0 = principal, 1 = alternativa). Tira a mesma tecla de qualquer outro lugar. */
  setKey(action, slot, code) {
    if (!this.keymap[action]) return;
    for (const codes of Object.values(this.keymap)) {
      for (let i = 0; i < codes.length; i++) {
        if (codes[i] === code) codes[i] = null;
      }
    }
    this.keymap[action][slot] = code;
    this._commit();
  }

  resetKeymap() {
    this.keymap = cloneKeymap(DEFAULT_KEYMAP);
    this._commit();
  }

  /** Chama callback(settings) a cada mudança. Retorna função para cancelar. */
  onChange(callback) {
    this._listeners.push(callback);
    return () => {
      const index = this._listeners.indexOf(callback);
      if (index !== -1) this._listeners.splice(index, 1);
    };
  }

  _commit() {
    this._save();
    for (const listener of this._listeners) listener(this);
  }

  _save() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ volume: this.volume, renderScale: this.renderScale, keymap: this.keymap })
      );
    } catch {
      // localStorage indisponível (modo privado etc.): segue sem salvar
    }
  }

  _load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);

      if (typeof data.volume === 'number') this.volume = Math.min(1, Math.max(0, data.volume));
      if (RENDER_SCALES.includes(data.renderScale)) this.renderScale = data.renderScale;

      if (data.keymap && typeof data.keymap === 'object') {
        for (const action of Object.keys(DEFAULT_KEYMAP)) {
          const saved = data.keymap[action];
          if (!Array.isArray(saved)) continue;
          this.keymap[action] = [0, 1].map((i) => (typeof saved[i] === 'string' ? saved[i] : null));
        }
      }
    } catch {
      // dados corrompidos: mantém os padrões
    }
  }
}

export default Settings;