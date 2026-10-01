// src/systems/InputSystem.js

/**
 * InputSystem
 * Centraliza o estado do teclado (WASD / setas) para que outras partes
 * do jogo (Player, futura câmera livre, etc.) leiam o input sem precisar
 * registrar seus próprios listeners de window.
 *
 * Uso:
 *   const input = new InputSystem();
 *
 *   // no update de quem precisa:
 *   const moveAxis = input.getMoveAxis(); // -1, 0 ou 1
 *   const turnAxis = input.getTurnAxis(); // -1, 0 ou 1
 *
 *   // ao destruir:
 *   input.dispose();
 */
export class InputSystem {
  constructor() {
    this.keys = { forward: false, backward: false, left: false, right: false };

    this._onKeyDown = (event) => this._setKeyState(event.code, true);
    this._onKeyUp = (event) => this._setKeyState(event.code, false);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _setKeyState(code, isPressed) {
    switch (code) {
      case 'KeyW':
      case 'ArrowUp':
        this.keys.forward = isPressed;
        break;
      case 'KeyS':
      case 'ArrowDown':
        this.keys.backward = isPressed;
        break;
      case 'KeyA':
      case 'ArrowLeft':
        this.keys.left = isPressed;
        break;
      case 'KeyD':
      case 'ArrowRight':
        this.keys.right = isPressed;
        break;
    }
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

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
  }
}

export default InputSystem;