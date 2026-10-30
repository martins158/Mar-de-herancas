// src/ui/HUD.js

/**
 * HUD
 * Overlay simples em DOM (sem framework de UI). Tem:
 *  - cartão de objetivo/dica no canto superior esquerdo (setObjective);
 *  - prompt na parte de baixo da tela ("Pressione G para pescar").
 * O painel de debug (fase, posição, bússola, itens, pontos) foi removido.
 *
 * Uso:
 *   const hud = new HUD({ gameState });
 *   hud.setVisible(true);                                       // cartão de objetivo
 *   hud.setObjective('Objetivo', 'Vá para a área de pesca inicial.');
 *   hud.setObjective(null);                                     // esconde o cartão
 *   hud.setPrompt('A / D para andar');                          // null esconde
 *
 *   hud.dispose();
 *
 * setCompass() e updatePosition() continuam existindo, sem efeito, só para
 * não quebrar chamadas antigas.
 */
export class HUD {
  constructor({ gameState = null } = {}) {
    this.gameState = gameState;
    this._visible = true;
    this._objective = null;
    this._promptText = null;

    this.card = document.createElement('div');
    this.card.style.cssText = `
      position: fixed;
      top: 14px;
      left: 14px;
      max-width: 300px;
      padding: 10px 16px 12px;
      background: rgba(6, 16, 26, 0.55);
      border-left: 3px solid #ffd9a0;
      border-radius: 6px;
      color: #fff;
      font-family: Georgia, serif;
      pointer-events: none;
      display: none;
      z-index: 10;
    `;
    this.cardTitle = document.createElement('div');
    this.cardTitle.style.cssText = `
      font-size: 12px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #ffd9a0;
      margin-bottom: 4px;
    `;
    this.cardText = document.createElement('div');
    this.cardText.style.cssText = 'font-size: 17px; line-height: 1.35;';
    this.card.append(this.cardTitle, this.cardText);
    document.body.appendChild(this.card);

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

    this._render();
  }

  /** Mostra/esconde o cartão de objetivo (o prompt é controlado à parte). */
  setVisible(visible) {
    this._visible = visible;
    this._render();
  }

  /** Objetivo/dica atual. `null` (título) esconde o cartão. */
  setObjective(title, text = '') {
    this._objective = title ? { title, text } : null;
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

  /** Mantido por compatibilidade: a bússola agora é só a seta 3D. */
  setCompass() {}

  /** Mantido por compatibilidade: a posição não aparece mais na tela. */
  updatePosition() {}

  _render() {
    const show = this._visible && this._objective;
    this.card.style.display = show ? 'block' : 'none';
    if (show) {
      this.cardTitle.textContent = this._objective.title;
      this.cardText.textContent = this._objective.text;
    }
  }

  dispose() {
    this.card.remove();
    this.prompt.remove();
  }
}

export default HUD;