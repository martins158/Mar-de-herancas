// src/ui/RescueBar.js

/**
 * RescueBar
 * Barra de progresso do resgate, no topo da tela (regra de leitura: dicas em cima),
 * logo abaixo da dica do HUD. Mostra o que fazer ("Fique parado perto dos
 * destroços…") e enche enquanto o barco está parado dentro do aro. Só DOM; quem
 * calcula o progresso é o RescueSystem.
 *
 * Uso:
 *   const bar = new RescueBar();
 *   bar.show({ progress: 0.4, slow: true });   // todo frame dentro do aro
 *   bar.hide();                                // fora do aro / depois do resgate
 *   bar.dispose();
 */

const CSS = `
.mdh-rb { position: fixed; left: 50%; top: 11vh; transform: translateX(-50%); z-index: 10; display: none; flex-direction: column; align-items: center; gap: 6px;
  font-family: Georgia, 'Times New Roman', serif; color: #f6ead2; text-shadow: 0 1px 4px rgba(0,0,0,0.8); pointer-events: none; }
.mdh-rb-label { font-size: 19px; }
.mdh-rb-track { width: min(340px, 70vw); height: 12px; border-radius: 8px; background: rgba(10, 8, 10, 0.65); border: 1px solid rgba(255, 214, 150, 0.5); overflow: hidden; }
.mdh-rb-fill { height: 100%; width: 0; background: linear-gradient(90deg, #ff8a5a, #ffd27a); transition: width 0.1s linear; }
.mdh-rb.fast .mdh-rb-fill { background: linear-gradient(90deg, #7a3a2a, #a85a3a); }
`;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export class RescueBar {
  constructor() {
    this._style = el('style');
    this._style.textContent = CSS;
    document.head.appendChild(this._style);

    this.root = el('div', 'mdh-rb');
    this.labelEl = el('div', 'mdh-rb-label');
    const track = el('div', 'mdh-rb-track');
    this.fillEl = el('div', 'mdh-rb-fill');
    track.appendChild(this.fillEl);
    this.root.append(this.labelEl, track);
    document.body.appendChild(this.root);
    this._shown = false;
  }

  /** progress 0..1; slow = false mostra o aviso para reduzir. */
  show({ progress, slow }) {
    if (!this._shown) {
      this._shown = true;
      this.root.style.display = 'flex';
    }
    this.root.classList.toggle('fast', !slow);
    this.labelEl.textContent = slow ? 'Fique parado perto dos destroços…' : 'Devagar: reduza para puxar o náufrago';
    this.fillEl.style.width = `${Math.round(progress * 100)}%`;
  }

  hide() {
    if (!this._shown) return;
    this._shown = false;
    this.root.style.display = 'none';
  }

  dispose() {
    this.root.remove();
    this._style.remove();
  }
}

export default RescueBar;