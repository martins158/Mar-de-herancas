// src/ui/Journal.js
import { fishArt } from './FishIcon.js';
import { FISH, TIERS } from '../data/fish.js';
import { SEA_ITEMS, itemJournalText } from '../data/items.js';

/**
 * Journal
 * O diário do barco: uma tela de pergaminho com três abas (Peixes, Garrafas,
 * Relíquias). O que ainda não foi encontrado aparece como "???". Clicar num
 * cartão mostra o texto embaixo. Abre/fecha com a tecla do diário (J).
 * Só mostra dados do GameState (fishLog e collected); não guarda nada.
 *
 * Uso:
 *   const journal = new Journal({ gameState });
 *   journal.open(); journal.close(); journal.toggle(); journal.isOpen;
 *   journal.dispose();
 */

const BOTTLE_SVG = `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g stroke="#2b1d12" stroke-width="2.4" stroke-linejoin="round"><path d="M22 6h12v10l8 10v24q0 4-4 4H18q-4 0-4-4V26l8-10z" fill="#6b9a74" fill-opacity=".8"/><rect x="23" y="2" width="10" height="7" fill="#9a7448"/><rect x="21" y="28" width="14" height="20" fill="#f1e6c8"/></g></svg>`;
const RELIC_SVG = `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g stroke="#2b1d12" stroke-width="2.4" stroke-linejoin="round"><rect x="8" y="18" width="44" height="30" fill="#7a5232"/><rect x="6" y="14" width="48" height="8" fill="#d9a93c"/><rect x="6" y="40" width="48" height="8" fill="#d9a93c"/><circle cx="30" cy="31" r="4" fill="#f1e6c8"/></g></svg>`;

const CSS = `
.mdh-jr { position: fixed; inset: 0; z-index: 28; display: none; align-items: center; justify-content: center; background: rgba(4, 10, 18, 0.55);
  font-family: Georgia, 'Times New Roman', serif; color: #2b1d12; }
.mdh-jr-book { width: min(880px, 94vw); max-height: 86vh; display: flex; flex-direction: column; padding: 22px 28px 20px;
  background: linear-gradient(#efe3c6, #e2d2ac); border: 3px double #6b4a2b; border-radius: 6px;
  box-shadow: 0 16px 50px rgba(0,0,0,0.65), inset 0 0 50px rgba(120,80,30,0.28); }
.mdh-jr-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.mdh-jr-title { font-size: 26px; font-weight: bold; letter-spacing: 0.06em; }
.mdh-jr-tabs { display: flex; gap: 8px; }
.mdh-jr-tab, .mdh-jr-close { font: inherit; font-size: 16px; padding: 6px 14px; color: #2b1d12; background: rgba(107,74,43,0.12);
  border: 1px solid #6b4a2b; border-radius: 4px; cursor: pointer; }
.mdh-jr-tab.on { background: #6b4a2b; color: #efe3c6; }
.mdh-jr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; overflow-y: auto; padding: 4px; min-height: 150px; }
.mdh-jr-card { padding: 8px 8px 6px; text-align: center; border: 1px solid rgba(107,74,43,0.6); border-radius: 4px; background: rgba(255,250,235,0.45); cursor: pointer; }
.mdh-jr-card.sel { outline: 2px solid #a8741a; }
.mdh-jr-card.unknown { opacity: 0.45; cursor: default; }
.mdh-jr-card .art { height: 58px; display: flex; align-items: center; justify-content: center; }
.mdh-jr-card .art svg { max-height: 58px; width: auto; max-width: 100%; }
.mdh-jr-card .nm { font-size: 14px; margin-top: 4px; }
.mdh-jr-card .tier { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; opacity: 0.7; }
.mdh-jr-detail { margin-top: 12px; padding: 12px 16px; min-height: 84px; white-space: pre-line; font-size: 17px; line-height: 1.45;
  border-top: 2px solid rgba(107,74,43,0.5); }
.mdh-jr-detail b { display: block; font-size: 19px; margin-bottom: 4px; }
.mdh-jr-foot { margin-top: 8px; font-size: 13px; opacity: 0.65; text-align: right; }
`;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export class Journal {
  constructor({ gameState, keyLabel = () => 'J' }) {
    this.gameState = gameState;
    this.keyLabel = keyLabel;
    this._tab = 'fish';
    this._selected = null;
    this._open = false;

    this._style = el('style');
    this._style.textContent = CSS;
    document.head.appendChild(this._style);

    this.root = el('div', 'mdh-jr');
    const book = el('div', 'mdh-jr-book');
    const head = el('div', 'mdh-jr-head');
    head.appendChild(el('div', 'mdh-jr-title', 'Diário do Barco'));
    this.tabsEl = el('div', 'mdh-jr-tabs');
    this._tabButtons = {};
    for (const [id, label] of [['fish', 'Peixes'], ['bottle', 'Garrafas'], ['relic', 'Relíquias']]) {
      const b = el('button', 'mdh-jr-tab', label);
      b.tabIndex = -1;
      b.addEventListener('click', () => this._setTab(id));
      this._tabButtons[id] = b;
      this.tabsEl.appendChild(b);
    }
    const close = el('button', 'mdh-jr-close', '✕');
    close.tabIndex = -1;
    close.addEventListener('click', () => this.close());
    head.append(this.tabsEl, close);

    this.gridEl = el('div', 'mdh-jr-grid');
    this.detailEl = el('div', 'mdh-jr-detail');
    this.footEl = el('div', 'mdh-jr-foot');
    book.append(head, this.gridEl, this.detailEl, this.footEl);
    this.root.appendChild(book);
    document.body.appendChild(this.root);
  }

  get isOpen() {
    return this._open;
  }

  open() {
    this._open = true;
    this.root.style.display = 'flex';
    this._render();
  }

  close() {
    this._open = false;
    this.root.style.display = 'none';
  }

  toggle() {
    if (this._open) this.close();
    else this.open();
  }

  _setTab(tab) {
    this._tab = tab;
    this._selected = null;
    this._render();
  }

  _entries() {
    const gs = this.gameState;
    if (this._tab === 'fish') {
      return FISH.map((f) => ({
        id: f.id,
        known: (gs.fishLog[f.id] ?? 0) > 0,
        name: f.name,
        tier: TIERS[f.tier].label,
        art: fishArt(f.art, { width: 120 }),
        title: `${f.name}  ·  ${TIERS[f.tier].label}`,
        text: `${f.lore}\n\nPescados: ${gs.fishLog[f.id] ?? 0}`,
      }));
    }
    return SEA_ITEMS.filter((i) => i.kind === this._tab).map((i) => ({
      id: i.id,
      known: gs.hasCollected(i.id),
      name: i.name,
      tier: '',
      art: i.kind === 'bottle' ? BOTTLE_SVG : RELIC_SVG,
      title: i.kind === 'bottle' ? `${i.name}  ·  ${i.author}` : i.name,
      text: itemJournalText(i),
    }));
  }

  _render() {
    for (const [id, b] of Object.entries(this._tabButtons)) b.classList.toggle('on', id === this._tab);
    const entries = this._entries();
    this.gridEl.replaceChildren();
    const known = entries.filter((e) => e.known).length;

    for (const e of entries) {
      const card = el('div', `mdh-jr-card${e.known ? '' : ' unknown'}${this._selected === e.id ? ' sel' : ''}`);
      const art = el('div', 'art');
      art.innerHTML = e.known ? e.art : '<span style="font-size:34px">?</span>';
      card.append(art, el('div', 'nm', e.known ? e.name : '???'));
      if (e.known && e.tier) card.appendChild(el('div', 'tier', e.tier));
      if (e.known) {
        card.addEventListener('click', () => {
          this._selected = e.id;
          this._render();
        });
      }
      this.gridEl.appendChild(card);
    }

    const sel = entries.find((e) => e.id === this._selected && e.known);
    this.detailEl.replaceChildren();
    if (sel) {
      this.detailEl.append(el('b', '', sel.title), document.createTextNode(sel.text));
    } else {
      this.detailEl.textContent = known ? 'Escolha um cartão para ler.' : 'Nada por aqui ainda. O mar guarda o que ainda não devolveu.';
    }
    this.footEl.textContent = `${known}/${entries.length} encontrados  ·  ${this.keyLabel()} fecha o diário`;
  }

  dispose() {
    this.root.remove();
    this._style.remove();
  }
}

export default Journal;