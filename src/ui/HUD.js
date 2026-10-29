// src/ui/HUD.js

/**
 * HUD
 * Overlay simples em DOM (sem framework de UI ainda) mostrando fase do
 * jogo, posição do barco, bússola e progresso. Se inscreve no GameState
 * via onChange — só re-renderiza quando o estado muda ou quando
 * updatePosition() é chamado.
 *
 * Além do painel, tem:
 *  - banner de vitória (fase 'won');
 *  - prompt na parte de baixo da tela ("Pressione E para zarpar").
 *
 * Uso:
 *   const hud = new HUD({ gameState });
 *   hud.setVisible(true);                                  // painel + banner
 *   hud.setPrompt('A / D para andar');                     // null esconde
 *
 *   // no loop de render:
 *   hud.setCompass({ name: 'Ponto 1', distance: 120 });    // null = sem alvo
 *   hud.updatePosition(player.mesh.position);
 *
 *   // ao destruir:
 *   hud.dispose();
 */
export class HUD {
  constructor({ gameState }) {
    this.gameState = gameState;
    this._position = { x: 0, z: 0 };
    this._compass = null;
    this._visible = true;
    this._promptText = null;

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
    this.banner.textContent = 'Você visitou todos os pontos!';
    document.body.appendChild(this.banner);

    this.prompt = document.createElement('div');
    this.prompt.style.cssText = `
      position: fixed;
      bottom: 12%;
      left: 50%;
      transform: translateX(-50%);
      padding: 10px 22px;
      background: rgba(0, 0, 0, 0.55);
      color: #fff;
      font-family: Georgia, serif;
      font-size: 20px;
      text-align: center;
      border-radius: 10px;
      pointer-events: none;
      display: none;
      z-index: 10;
    `;
    document.body.appendChild(this.prompt);

    this._unsubscribe = gameState.onChange(() => this._render());
    this._render();
  }

  /** Mostra/esconde o painel e o banner (o prompt é controlado à parte). */
  setVisible(visible) {
    this._visible = visible;
    this._render();
  }

  /** Texto fixo na parte de baixo da tela. null/'' esconde. */
  setPrompt(text) {
    const next = text || null;
    if (next === this._promptText) return;
    this._promptText = next;
    this.prompt.textContent = next ?? '';
    this.prompt.style.display = next ? 'block' : 'none';
  }

  /** Alvo da bússola: { name, distance } ou null. Aparece no próximo render. */
  setCompass(compass) {
    this._compass = compass;
  }

  /** Chame a cada frame com player.mesh.position (ou qualquer Vector3 com x/z). */
  updatePosition(position) {
    this._position = position;
    this._render();
  }

  _render() {
    this.root.style.display = this._visible ? 'block' : 'none';
    if (!this._visible) {
      this.banner.style.display = 'none';
      return;
    }

    const { phase, inventory, visitedIslands, totalIslands } = this.gameState;
    const pos = this._position;
    const compass = this._compass
      ? `${this._compass.name} · ${Math.round(this._compass.distance)} m`
      : '—';

    this.root.textContent =
      `fase: ${phase}\n` +
      `posição: (${pos.x.toFixed(1)}, ${pos.z.toFixed(1)})\n` +
      `bússola: ${compass}\n` +
      `itens: ${inventory.length ? inventory.join(', ') : '—'}\n` +
      `pontos visitados: ${visitedIslands.size}${totalIslands ? `/${totalIslands}` : ''}`;

    this.banner.style.display = phase === 'won' ? 'block' : 'none';
  }

  dispose() {
    this._unsubscribe();
    this.root.remove();
    this.banner.remove();
    this.prompt.remove();
  }
}

export default HUD;