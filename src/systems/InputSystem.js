// src/systems/InputSystem.js
import { DEFAULT_KEYMAP } from '../state/Settings.js';

/**
 * InputSystem
 * Centraliza o estado do teclado para que outras partes do jogo (Player,
 * Harbor, etc.) leiam o input sem registrar seus próprios listeners.
 *
 * As teclas vêm de `settings.keymap` (remapeáveis no menu). Sem settings,
 * usa o mapa padrão (WASD / setas / E ou Espaço para interagir).
 *
 * Uso:
 *   const input = new InputSystem({ settings });
 *
 *   input.getMoveAxis();        // -1, 0 ou 1  (frente/trás)
 *   input.getTurnAxis();        // -1, 0 ou 1  (esquerda = +1, giro do barco)
 *   input.getHorizontalAxis();  // -1, 0 ou 1  (direita = +1, andar no porto 2D)
 *   input.consumeInteract();    // true UMA vez por aperto da tecla de interagir
 *   input.reset();              // solta todas as teclas (use ao trocar de tela)
 *
 *   input.dispose();
 */
export class InputSystem {
  constructor({ settings = null } = {}) {
    this.settings = settings;
    this.keys = { forward: false, backward: false, left: false, right: false, interact: false };
    this._interactQueued = false;

    this._onKeyDown = (event) => this._setKeyState(event.code, true, event.repeat);
    this._onKeyUp = (event) => this._setKeyState(event.code, false, false);
    // se a janela perder o foco, o keyup nunca chega: solta tudo
    this._onBlur = () => this.reset();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  get keymap() {
    return this.settings ? this.settings.keymap : DEFAULT_KEYMAP;
  }

  _actionFor(code) {
    for (const [action, codes] of Object.entries(this.keymap)) {
      if (codes.includes(code)) return action;
    }
    return null;
  }

  _setKeyState(code, isPressed, isRepeat) {
    const action = this._actionFor(code);
    if (!action) return;

    if (action === 'interact' && isPressed && !isRepeat) this._interactQueued = true;
    this.keys[action] = isPressed;
  }

  isForward() {
    return this.keys.forward;
  }

  isBackward() {
    return this.keys.backward;
  }

  isLeft() {
    return this.keys.left;
  }

  isRight() {
    return this.keys.right;
  }

  /** -1, 0 ou 1 — direção de avanço (frente/trás). */
  getMoveAxis() {
    return (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0);
  }

  /** -1, 0 ou 1 — direção de giro (esquerda/direita), mesmo sentido do rotation.y original. */
  getTurnAxis() {
    return (this.keys.left ? 1 : 0) - (this.keys.right ? 1 : 0);
  }

  /** -1, 0 ou 1 — movimento lateral na tela (direita = +1). Usado no porto 2D. */
  getHorizontalAxis() {
    return (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
  }

  /** true uma única vez por aperto da tecla de interagir. */
  consumeInteract() {
    const pressed = this._interactQueued;
    this._interactQueued = false;
    return pressed;
  }

  /** Solta todas as teclas e descarta apertos pendentes. */
  reset() {
    for (const key of Object.keys(this.keys)) this.keys[key] = false;
    this._interactQueued = false;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}

export default InputSystem;