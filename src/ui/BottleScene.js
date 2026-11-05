// src/ui/BottleScene.js
import { formatKey } from '../state/Settings.js';
import { itemArt } from './ItemIcon.js';

/**
 * BottleScene
 * Cena de uma GARRAFA recém-recolhida: a garrafa de vidro aparece, o papel sai
 * pelo gargalo e abre na frente do jogador, num pergaminho antigo com toda a
 * mensagem. Substitui a caixa de diálogo das garrafas. A fala do jogador (intro)
 * aparece em cima, durante a animação, e a reflexão final (outro) embaixo do papel.
 *
 * Etapas (data-stage): 1 garrafa aparece · 2 papel sai do gargalo · 3 papel aberto
 * (final). A tecla de interagir (advance) pula direto para a etapa 3; na etapa 3
 * fecha a cena. Texto vem de data/items.js (message[]); não guarda nada.
 *
 * Uso:
 *   const scene = new BottleScene({ settings });
 *   scene.open(item);           // item de data/items.js (kind 'bottle')
 *   // a cada frame, enquanto scene.isOpen:
 *   if (input.consumeInteract()) scene.advance();
 *   scene.dispose();
 */

const STAGE_2_MS = 1500; // quando o papel começa a sair
const STAGE_3_MS = 2900; // quando o papel abre
const GUARD_MS = 250; // ignora a tecla logo na abertura

const CSS = `
.mdh-bs { position: fixed; inset: 0; z-index: 27; display: none; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  background: rgba(4, 10, 18, 0.72); font-family: Georgia, 'Times New Roman', serif; color: #2b1d12; cursor: pointer; user-select: none; }
.mdh-bs-intro { max-width: min(640px, 88vw); min-height: 1.5em; text-align: center; font-size: 20px; font-style: italic; color: #dbeaf5; line-height: 1.4;
  opacity: 0; transition: opacity 0.6s; }
.mdh-bs[data-stage="1"] .mdh-bs-intro, .mdh-bs[data-stage="2"] .mdh-bs-intro { opacity: 1; }
.mdh-bs-stage { position: relative; width: 260px; height: 250px; flex: none; transition: height 0.9s ease; }
.mdh-bs[data-stage="3"] .mdh-bs-stage { height: 70px; }
.mdh-bs-bottle { position: absolute; left: 50%; top: 50%; width: 220px; opacity: 0;
  transform: translate(-50%, -30%) rotate(-10deg) scale(0.8); transition: transform 1s ease-out, opacity 0.8s; filter: drop-shadow(0 8px 14px rgba(0,0,0,0.5)); }
.mdh-bs-bottle svg { display: block; width: 100%; height: auto; }
.mdh-bs[data-stage="1"] .mdh-bs-bottle { opacity: 1; transform: translate(-50%, -50%) rotate(-3deg) scale(1); animation: mdh-bs-bob 2.4s ease-in-out infinite 1s; }
.mdh-bs[data-stage="2"] .mdh-bs-bottle { opacity: 1; transform: translate(-50%, -40%) rotate(4deg) scale(1); }
.mdh-bs[data-stage="3"] .mdh-bs-bottle { opacity: 0.55; transform: translate(-50%, -50%) rotate(0deg) scale(0.34); }
@keyframes mdh-bs-bob { 0%, 100% { translate: 0 0; } 50% { translate: 0 -7px; } }
.mdh-bs-roll { position: absolute; left: 50%; top: 24%; width: 24px; height: 84px; margin-left: -12px; opacity: 0; border: 2px solid #2b1d12; border-radius: 7px;
  background: repeating-linear-gradient(#f1e6c8 0 9px, #e2d2ac 9px 11px); transform: translateY(20px) rotate(0deg);
  transition: transform 1.3s ease-out, opacity 0.5s; }
.mdh-bs[data-stage="2"] .mdh-bs-roll { opacity: 1; transform: translateY(-96px) rotate(8deg); }
.mdh-bs-sheet { box-sizing: border-box; width: min(580px, 90vw); max-height: 0; overflow: hidden; opacity: 0; padding: 0 34px;
  background: linear-gradient(#efe3c6, #e2d2ac); border: 3px double #6b4a2b; border-radius: 6px; border-width: 0;
  box-shadow: 0 16px 50px rgba(0,0,0,0.65), inset 0 0 50px rgba(120,80,30,0.28);
  transition: max-height 1s ease, opacity 0.6s, padding 1s ease; }
.mdh-bs[data-stage="3"] .mdh-bs-sheet { max-height: 56vh; opacity: 1; padding: 22px 34px 24px; border-width: 3px; overflow-y: auto; }
.mdh-bs-title { font-size: 13px; letter-spacing: 0.3em; text-transform: uppercase; color: #6b4a2b; text-align: center; margin-bottom: 10px; }
.mdh-bs-msg { font-size: 21px; font-style: italic; line-height: 1.55; margin: 0 0 12px; opacity: 0; transition: opacity 0.8s; }
.mdh-bs[data-stage="3"] .mdh-bs-msg { opacity: 1; transition-delay: 0.7s; }
.mdh-bs[data-stage="3"] .mdh-bs-msg:nth-of-type(2) { transition-delay: 1.4s; }
.mdh-bs[data-stage="3"] .mdh-bs-msg:nth-of-type(3) { transition-delay: 2.1s; }
.mdh-bs-outro { max-width: min(640px, 88vw); text-align: center; font-size: 18px; font-style: italic; color: #dbeaf5; line-height: 1.4; margin-top: 8px;
  opacity: 0; transition: opacity 0.8s 2s; }
.mdh-bs[data-stage="3"] .mdh-bs-outro { opacity: 1; }
.mdh-bs-hint { margin-top: 6px; font-size: 13px; color: #f6ead2; opacity: 0.6; }
.mdh-bs-hint kbd { font-family: inherit; padding: 1px 8px; border: 1px solid rgba(255,255,255,0.5); border-radius: 5px; background: rgba(255,255,255,0.1); }
.mdh-bs.skip, .mdh-bs.skip * { transition: none !important; animation: none !important; }
`;

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export class BottleScene {
  constructor({ settings = null } = {}) {
    this.settings = settings;
    this._open = false;
    this._stage = 0;
    this._openedAt = 0;
    this._timers = [];

    this._style = el('style');
    this._style.textContent = CSS;
    document.head.appendChild(this._style);

    this.root = el('div', 'mdh-bs');
    this.introEl = el('div', 'mdh-bs-intro');
    const stage = el('div', 'mdh-bs-stage');
    this.bottleEl = el('div', 'mdh-bs-bottle');
    stage.append(this.bottleEl, el('div', 'mdh-bs-roll'));
    this.sheetEl = el('div', 'mdh-bs-sheet');
    this.outroEl = el('div', 'mdh-bs-outro');
    this.hintEl = el('div', 'mdh-bs-hint');
    this.root.append(this.introEl, stage, this.sheetEl, this.outroEl, this.hintEl);
    this.root.addEventListener('click', () => this.advance());
    document.body.appendChild(this.root);
  }

  get isOpen() {
    return this._open;
  }

  /** Abre a cena de uma garrafa (item de data/items.js). */
  open(item) {
    this._clearTimers();
    this._open = true;
    this._openedAt = performance.now();

    this.introEl.textContent = `“${item.intro}”`;
    this.bottleEl.innerHTML = itemArt(item.art, { width: 220, upright: true });
    this.sheetEl.replaceChildren(el('div', 'mdh-bs-title', item.name), ...item.message.map((text) => el('p', 'mdh-bs-msg', text)));
    this.outroEl.textContent = `“${item.outro}”`;

    this.root.classList.remove('skip');
    this.root.style.display = 'flex';
    this._setStage(1);
    this._timers.push(setTimeout(() => this._setStage(2), STAGE_2_MS));
    this._timers.push(setTimeout(() => this._setStage(3), STAGE_3_MS));
  }

  /** Antes do papel abrir: pula para o papel aberto. Com o papel aberto: fecha a cena. */
  advance() {
    if (!this._open) return;
    if (performance.now() - this._openedAt < GUARD_MS) return;
    if (this._stage < 3) {
      this._clearTimers();
      this.root.classList.add('skip');
      this._setStage(3);
      return;
    }
    this.close();
  }

  close() {
    if (!this._open) return;
    this._clearTimers();
    this._open = false;
    this.root.style.display = 'none';
  }

  dispose() {
    this._clearTimers();
    this.root.remove();
    this._style.remove();
  }

  // ---------- interno ----------

  _setStage(stage) {
    this._stage = stage;
    this.root.dataset.stage = String(stage);
    const key = formatKey(this.settings?.keymap?.interact?.[0] ?? 'KeyE');
    this.hintEl.replaceChildren(el('kbd', '', key), document.createTextNode(stage < 3 ? ' abrir logo' : ' guardar no diário'));
  }

  _clearTimers() {
    for (const t of this._timers) clearTimeout(t);
    this._timers = [];
  }
}

export default BottleScene;