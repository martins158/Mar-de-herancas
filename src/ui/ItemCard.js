// src/ui/ItemCard.js
import { formatKey } from '../state/Settings.js';
import { itemArt } from './ItemIcon.js';

/**
 * ItemCard
 * Cartão de pergaminho que aparece quando o jogador recolhe uma RELÍQUIA no mar:
 * o desenho do item (ItemIcon), o nome, a fala do jogador (intro) e a descrição.
 * Mesmo visual do cartão de peixe do FishingUI e do Journal. Fecha com a tecla de
 * interagir (o main.js chama advance()) ou com clique. Não guarda nada: o
 * GameState já registrou a coleta.
 *
 * Uso:
 *   const card = new ItemCard({ settings });
 *   card.open(item);            // item de data/items.js (kind 'relic')
 *   // a cada frame, enquanto card.isOpen:
 *   if (input.consumeInteract()) card.advance();   // fecha
 *   card.dispose();
 */

const GUARD_MS = 250; // ignora a tecla logo na abertura (evita fechar sem querer)
const DEFAULT_INTRO = 'Algo boia por aqui. Eu puxo para dentro do barco.';

const CSS = `
.mdh-ic { position: fixed; inset: 0; z-index: 27; display: none; align-items: center; justify-content: center; background: rgba(4, 10, 18, 0.45);
  font-family: Georgia, 'Times New Roman', serif; color: #2b1d12; cursor: pointer; user-select: none; }
.mdh-ic-card { width: min(460px, 90vw); box-sizing: border-box; padding: 20px 30px 16px; text-align: center;
  background: linear-gradient(#efe3c6, #e2d2ac); border: 3px double #6b4a2b; border-radius: 6px;
  box-shadow: 0 16px 50px rgba(0,0,0,0.65), inset 0 0 50px rgba(120,80,30,0.28); animation: mdh-ic-in 0.35s ease-out; }
@keyframes mdh-ic-in { from { opacity: 0; transform: translateY(14px) scale(0.94); } to { opacity: 1; transform: none; } }
.mdh-ic-kind { font-size: 12px; letter-spacing: 0.3em; text-transform: uppercase; color: #6b4a2b; }
.mdh-ic-art { margin: 4px auto 0; width: 170px; }
.mdh-ic-art svg { display: block; width: 100%; height: auto; }
.mdh-ic-name { font-size: 28px; font-weight: bold; margin-top: 2px; }
.mdh-ic-intro { font-size: 16px; font-style: italic; opacity: 0.75; margin-top: 8px; line-height: 1.4; }
.mdh-ic-text { font-size: 19px; line-height: 1.5; margin-top: 10px; padding-top: 10px; border-top: 2px solid rgba(107,74,43,0.5); }
.mdh-ic-hint { margin-top: 12px; font-size: 13px; opacity: 0.6; }
.mdh-ic-hint kbd { font-family: inherit; padding: 1px 8px; border: 1px solid rgba(43,29,18,0.6); border-radius: 5px; background: rgba(43,29,18,0.08); }
`;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export class ItemCard {
  constructor({ settings = null } = {}) {
    this.settings = settings;
    this._open = false;
    this._openedAt = 0;

    this._style = el('style');
    this._style.textContent = CSS;
    document.head.appendChild(this._style);

    this.root = el('div', 'mdh-ic');
    this.card = el('div', 'mdh-ic-card');
    this.kindEl = el('div', 'mdh-ic-kind', 'Relíquia recolhida');
    this.artEl = el('div', 'mdh-ic-art');
    this.nameEl = el('div', 'mdh-ic-name');
    this.introEl = el('div', 'mdh-ic-intro');
    this.textEl = el('div', 'mdh-ic-text');
    this.hintEl = el('div', 'mdh-ic-hint');
    this.card.append(this.kindEl, this.artEl, this.nameEl, this.introEl, this.textEl, this.hintEl);
    this.root.appendChild(this.card);
    this.root.addEventListener('click', () => this.advance());
    document.body.appendChild(this.root);
  }

  get isOpen() {
    return this._open;
  }

  open(item) {
    this._open = true;
    this._openedAt = performance.now();
    this.artEl.innerHTML = itemArt(item.art, { width: 170 });
    this.nameEl.textContent = item.name;
    this.introEl.textContent = `“${item.intro ?? DEFAULT_INTRO}”`;
    this.textEl.textContent = item.text;
    const key = formatKey(this.settings?.keymap?.interact?.[0] ?? 'KeyE');
    this.hintEl.replaceChildren(el('kbd', '', key), document.createTextNode(' guardar no diário'));
    this.card.style.animation = 'none';
    void this.card.offsetWidth; // reinicia a animação de entrada
    this.card.style.animation = '';
    this.root.style.display = 'flex';
  }

  /** Fecha o cartão (com uma pequena guarda logo após abrir). */
  advance() {
    if (!this._open) return;
    if (performance.now() - this._openedAt < GUARD_MS) return;
    this.close();
  }

  close() {
    this._open = false;
    this.root.style.display = 'none';
  }

  dispose() {
    this.root.remove();
    this._style.remove();
  }
}

export default ItemCard;