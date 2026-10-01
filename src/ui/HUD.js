// src/ui/HUD.js

/**
 * HUD
 * Overlay simples em DOM (sem framework de UI ainda) mostrando fase do
 * jogo, posição do barco e progresso (itens, ilhas visitadas). Se
 * inscreve no GameState via onChange — só re-renderiza quando o estado
 * muda ou quando updatePosition() é chamado.
 *
 * Uso:
 *   const hud = new HUD({ gameState });
 *
 *   // no loop de render:
 *   hud.updatePosition(player.mesh.position);
 *
 *   // ao destruir:
 *   hud.dispose();
 */
export class HUD {
  constructor({ gameState }) {
    this.gameState = gameState;
    this._position = { x: 0, z: 0 };

    this.root = document.createElement('div');
    this.root.style.cssText = `
      position: fixed;
      top: 12px;
      left: 12px;
      padding: 8px 12px;
      background: rgba(0, 0, 0, 0.45);
      color: #fff;
      font-family: monospace;
      font-size: 13px;
      line-height: 1.5;
      border-radius: 6px;
      pointer-events: none;
      white-space: pre;
      z-index: 10;
    `;
    document.body.appendChild(this.root);

    this.banner = document.createElement('div');
    this.banner.style.cssText = `
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 20px 32px;
      background: rgba(0, 0, 0, 0.6);
      color: #fff;
      font-family: sans-serif;
      font-size: 28px;
      text-align: center;
      border-radius: 10px;
      pointer-events: none;
      display: none;
      z-index: 10;
    `;
    this.banner.textContent = 'Você visitou todas as ilhas!';
    document.body.appendChild(this.banner);

    this._unsubscribe = gameState.onChange(() => this._render());
    this._render();
  }

  /** Chame a cada frame com player.mesh.position (ou qualquer Vector3 com x/z). */
  updatePosition(position) {
    this._position = position;
    this._render();
  }

  _render() {
    const { phase, inventory, visitedIslands, totalIslands } = this.gameState;
    const pos = this._position;

    this.root.textContent =
      `fase: ${phase}\n` +
      `posição: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})\n` +
      `itens: ${inventory.length ? inventory.join(', ') : '—'}\n` +
      `ilhas visitadas: ${visitedIslands.size}${totalIslands ? `/${totalIslands}` : ''}`;

    this.banner.style.display = phase === 'won' ? 'block' : 'none';
  }

  dispose() {
    this._unsubscribe();
    this.root.remove();
    this.banner.remove();
  }
}

export default HUD;