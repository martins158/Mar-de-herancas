// src/systems/FishingInput.js

/**
 * FishingInput
 * Teclas da pescaria: G ou H (a mesma tecla serve para tudo: entrar no modo,
 * carregar o lançamento, acertar o quicktime e recolher) e Esc/Q para guardar
 * a vara. Fica separado do InputSystem para não mexer no mapeamento de teclas
 * do resto do jogo.
 *
 * Uso:
 *   const fishInput = new FishingInput();
 *   fishInput.held                 // alguma tecla de pescar está pressionada
 *   fishInput.consumePress()       // true UMA vez por aperto (ignora auto-repeat)
 *   fishInput.consumeRelease()     // true UMA vez ao soltar
 *   fishInput.consumeExit()        // Esc / Q
 *   fishInput.reset();             // chamar ao trocar de tela
 *   fishInput.dispose();
 */

export const FISH_KEYS = ['KeyG', 'KeyH'];
export const EXIT_KEYS = ['Escape', 'KeyQ'];

export class FishingInput {
  constructor() {
    this._down = new Set();
    this._pressed = false;
    this._released = false;
    this._exit = false;

    this._onKeyDown = (event) => {
      if (FISH_KEYS.includes(event.code)) {
        if (event.repeat) return;
        if (this._down.size === 0) this._pressed = true;
        this._down.add(event.code);
      } else if (EXIT_KEYS.includes(event.code) && !event.repeat) {
        this._exit = true;
      }
    };

    this._onKeyUp = (event) => {
      if (!this._down.delete(event.code)) return;
      if (this._down.size === 0) this._released = true;
    };

    this._onBlur = () => this.reset();

    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
  }

  get held() {
    return this._down.size > 0;
  }

  consumePress() {
    const value = this._pressed;
    this._pressed = false;
    return value;
  }

  consumeRelease() {
    const value = this._released;
    this._released = false;
    return value;
  }

  consumeExit() {
    const value = this._exit;
    this._exit = false;
    return value;
  }

  reset() {
    this._down.clear();
    this._pressed = false;
    this._released = false;
    this._exit = false;
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
  }
}

export default FishingInput;