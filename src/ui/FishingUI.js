// src/ui/FishingUI.js

/**
 * FishingUI
 * Interface da pescaria, em DOM puro:
 *   - barra de força do arremesso (verde → amarelo → laranja → vermelho);
 *   - a barra horizontal do quicktime e do recolher: trilho escuro, zona em
 *     degradê vermelho → laranja → verde → laranja → vermelho, marcador branco
 *     no centro da zona, ícone de peixe flutuando acima e o ponteiro vermelho
 *     com a base em "T" (a mesma barra serve para os dois momentos);
 *   - barrinha de progresso do peixe sendo trazido;
 *   - dica de controles, aviso rápido (PERFEITO!, ERROU!...) e o cartão do resultado.
 *
 * Uso:
 *   const ui = new FishingUI();
 *   ui.showPower(); ui.setPower(0..1); ui.hidePower();
 *   ui.showGauge('qte' | 'reel');
 *   ui.setGauge({ pointer, zoneCenter, zoneWidth, fishX, danger });  // tudo 0..1
 *   ui.setProgress(0..1);
 *   ui.setHint('texto'); ui.flash('PERFEITO!', 'good' | 'ok' | 'miss' | 'bite');
 *   ui.showResult({ ok, title, subtitle }); ui.hideResult();
 *   ui.hideGauge(); ui.hideAll(); ui.dispose();
 */

const FISH_SVG = `
<svg viewBox="0 0 100 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <path d="M94 28C80 5 46 1 29 22L7 5c4 13 4 33 0 46l22-17c17 21 51 17 65-6Z" fill="#f2f2f0"/>
  <circle cx="76" cy="24" r="3.6" fill="#1d1f22"/>
  <path d="M62 14c4 8 4 20 0 28" stroke="#cfcfcb" stroke-width="2.2" fill="none" stroke-linecap="round"/>
</svg>`;

const CSS = `
.mdh-fish { position: fixed; inset: 0; z-index: 25; pointer-events: none; font-family: Georgia, 'Times New Roman', serif; color: #f4ecd8; }
.mdh-fish [hidden] { display: none !important; }

/* ---- força do arremesso ---- */
.mdh-fish-power { position: absolute; left: 50%; bottom: 24%; width: min(48vw, 480px); transform: translateX(-50%); text-align: center; }
.mdh-fish-power .label { font-size: 15px; letter-spacing: 0.3em; text-shadow: 0 2px 6px #000; margin-bottom: 8px; }
.mdh-fish-power .track { position: relative; height: 22px; border-radius: 11px; overflow: hidden;
  background: linear-gradient(180deg, #4b4e53 0%, #25272a 45%, #0d0e10 100%);
  box-shadow: inset 0 2px 3px rgba(255,255,255,0.12), 0 6px 14px rgba(0,0,0,0.5); }
.mdh-fish-power .fill { position: absolute; inset: 0; border-radius: 11px;
  background: linear-gradient(90deg, #2fd04a 0%, #a6d63a 32%, #f3c12c 58%, #f0731d 80%, #e3201b 100%);
  clip-path: inset(0 100% 0 0); }
.mdh-fish-power .fill::after { content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(180deg, rgba(255,255,255,0.28), rgba(255,255,255,0) 45%, rgba(0,0,0,0.3)); }
.mdh-fish-power.max .track { animation: mdh-fish-pulse 0.28s ease-in-out infinite alternate; }
@keyframes mdh-fish-pulse { from { box-shadow: 0 0 6px 1px rgba(255,50,30,0.5), 0 6px 14px rgba(0,0,0,0.5); } to { box-shadow: 0 0 22px 6px rgba(255,50,30,0.95), 0 6px 14px rgba(0,0,0,0.5); } }

/* ---- barra do quicktime / recolher ---- */
.mdh-fish-gauge { position: absolute; left: 50%; top: 46%; width: min(86vw, 1000px); transform: translateX(-50%); --d: 0; }
.mdh-fish-gauge .track { position: relative; height: 38px; border-radius: 19px;
  background: linear-gradient(180deg, #54575c 0%, #2a2c2f 42%, #0c0d0f 100%);
  box-shadow: inset 0 2px 3px rgba(255,255,255,0.14), 0 7px 16px rgba(0,0,0,0.55),
    0 0 calc(var(--d) * 30px) calc(var(--d) * 6px) rgba(255, 40, 30, calc(var(--d) * 0.9)); }
.mdh-fish-gauge .zone { position: absolute; top: 0; height: 100%; border-radius: 16px; overflow: hidden;
  background: linear-gradient(90deg, #c8160f 0%, #e0701a 16%, #c9cf1d 34%, #35cc1f 50%, #c9cf1d 66%, #e0701a 84%, #c8160f 100%); }
.mdh-fish-gauge .zone::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(255,255,255,0.24), rgba(255,255,255,0) 42%, rgba(0,0,0,0.4)); }
.mdh-fish-gauge .marker { position: absolute; top: -26px; width: 7px; height: 64px; background: #fff; border-radius: 1px;
  transform: translateX(-50%); box-shadow: 0 0 5px rgba(0,0,0,0.55); }
.mdh-fish-gauge .fishicon { position: absolute; top: -90px; width: 104px; transform: translateX(-50%); filter: drop-shadow(0 3px 5px rgba(0,0,0,0.55)); }
.mdh-fish-gauge .fishicon svg { display: block; width: 100%; animation: mdh-fish-bob 1.3s ease-in-out infinite alternate; }
@keyframes mdh-fish-bob { from { transform: translateY(0) rotate(-2deg); } to { transform: translateY(-5px) rotate(2deg); } }
.mdh-fish-gauge .ptr { position: absolute; top: -58px; width: 3px; height: 130px; background: #e3141a; transform: translateX(-50%);
  box-shadow: 0 0 4px rgba(0,0,0,0.6); }
.mdh-fish-gauge .ptr::after { content: ''; position: absolute; left: 50%; bottom: 0; width: 15px; height: 3px; background: #e3141a; transform: translateX(-50%); }

/* progresso do peixe sendo trazido (só no recolher) */
.mdh-fish-progress { width: 44%; margin: 78px auto 0; }
.mdh-fish-progress .cap { display: flex; justify-content: space-between; font-size: 13px; letter-spacing: 0.2em; text-shadow: 0 2px 5px #000; margin-bottom: 6px; opacity: 0.85; }
.mdh-fish-progress .bar { position: relative; height: 10px; border-radius: 5px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.16); }
.mdh-fish-progress .fill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; border-radius: 5px; background: linear-gradient(90deg, #1f8f7a, #7fe3c8); }
.mdh-fish-progress .mini { position: absolute; top: -14px; width: 30px; transform: translateX(-50%); }
.mdh-fish-progress .mini svg { display: block; width: 100%; }

/* ---- textos ---- */
.mdh-fish-hint { position: absolute; left: 50%; bottom: 12%; transform: translateX(-50%); width: 92vw; text-align: center; font-size: 20px; text-shadow: 0 2px 8px #000, 0 0 3px #000; }
.mdh-fish-flash { position: absolute; left: 50%; top: 32%; transform: translateX(-50%); font-size: 44px; font-weight: bold; letter-spacing: 0.08em; text-shadow: 0 3px 10px #000; opacity: 0; white-space: nowrap; }
.mdh-fish-flash.show { animation: mdh-fish-flash 1.1s ease-out forwards; }
.mdh-fish-flash.good { color: #7dff6a; } .mdh-fish-flash.ok { color: #ffd34d; }
.mdh-fish-flash.miss { color: #ff5a4a; } .mdh-fish-flash.bite { color: #ffffff; }
@keyframes mdh-fish-flash { 0% { opacity: 0; transform: translateX(-50%) scale(0.6); } 15% { opacity: 1; transform: translateX(-50%) scale(1.12); } 70% { opacity: 1; transform: translateX(-50%) scale(1); } 100% { opacity: 0; transform: translateX(-50%) scale(1); } }

.mdh-fish-result { position: absolute; left: 50%; top: 34%; transform: translateX(-50%); min-width: 320px; max-width: 86vw; padding: 22px 34px 24px; text-align: center;
  border-radius: 16px; background: rgba(12,16,20,0.82); border: 1px solid rgba(255,255,255,0.18); box-shadow: 0 10px 34px rgba(0,0,0,0.6);
  animation: mdh-fish-pop 0.35s ease-out; }
.mdh-fish-result .icon { width: 96px; margin: 0 auto 10px; }
.mdh-fish-result .icon svg { display: block; width: 100%; }
.mdh-fish-result .title { font-size: 30px; }
.mdh-fish-result .sub { font-size: 19px; opacity: 0.85; margin-top: 6px; }
.mdh-fish-result.ok { border-color: rgba(125,255,106,0.55); }
.mdh-fish-result.lost { border-color: rgba(255,90,74,0.55); }
.mdh-fish-result.lost .icon { opacity: 0.35; filter: grayscale(1); }
@keyframes mdh-fish-pop { from { opacity: 0; transform: translateX(-50%) scale(0.85); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
`;

export class FishingUI {
  constructor() {
    this.style = document.createElement('style');
    this.style.textContent = CSS;
    document.head.appendChild(this.style);

    this.root = document.createElement('div');
    this.root.className = 'mdh-fish';
    this.root.innerHTML = `
      <div class="mdh-fish-power" hidden>
        <div class="label">FORÇA</div>
        <div class="track"><div class="fill"></div></div>
      </div>
      <div class="mdh-fish-gauge" hidden>
        <div class="track">
          <div class="zone"></div>
          <div class="marker"></div>
          <div class="fishicon">${FISH_SVG}</div>
          <div class="ptr"></div>
        </div>
        <div class="mdh-fish-progress" hidden>
          <div class="cap"><span>PEIXE</span><span>BARCO</span></div>
          <div class="bar"><div class="fill"></div><div class="mini">${FISH_SVG}</div></div>
        </div>
      </div>
      <div class="mdh-fish-hint"></div>
      <div class="mdh-fish-flash"></div>
      <div class="mdh-fish-result" hidden>
        <div class="icon">${FISH_SVG}</div>
        <div class="title"></div>
        <div class="sub"></div>
      </div>`;
    document.body.appendChild(this.root);

    const $ = (sel) => this.root.querySelector(sel);
    this.el = {
      power: $('.mdh-fish-power'),
      powerFill: $('.mdh-fish-power .fill'),
      gauge: $('.mdh-fish-gauge'),
      zone: $('.mdh-fish-gauge .zone'),
      marker: $('.mdh-fish-gauge .marker'),
      fishIcon: $('.mdh-fish-gauge .fishicon'),
      pointer: $('.mdh-fish-gauge .ptr'),
      progress: $('.mdh-fish-progress'),
      progressFill: $('.mdh-fish-progress .fill'),
      progressFish: $('.mdh-fish-progress .mini'),
      hint: $('.mdh-fish-hint'),
      flash: $('.mdh-fish-flash'),
      result: $('.mdh-fish-result'),
      resultTitle: $('.mdh-fish-result .title'),
      resultSub: $('.mdh-fish-result .sub'),
    };
    this._hint = '';
  }

  // ---------- força ----------

  showPower() {
    this.el.power.hidden = false;
  }

  /** p = 0..1 (a cor revelada acompanha: verde até vermelho). */
  setPower(p) {
    const v = Math.min(Math.max(p, 0), 1);
    this.el.powerFill.style.clipPath = `inset(0 ${((1 - v) * 100).toFixed(2)}% 0 0)`;
    this.el.power.classList.toggle('max', v >= 0.97);
  }

  hidePower() {
    this.el.power.hidden = true;
  }

  // ---------- barra do quicktime / recolher ----------

  showGauge(mode) {
    this.el.gauge.hidden = false;
    this.el.progress.hidden = mode !== 'reel';
    this.setGauge({ danger: 0 });
  }

  /** Todos os campos são opcionais e vão de 0 a 1 (fração da barra). */
  setGauge({ pointer, zoneCenter, zoneWidth, fishX, danger } = {}) {
    if (zoneCenter !== undefined || zoneWidth !== undefined) {
      if (zoneCenter !== undefined) this._zoneCenter = zoneCenter;
      if (zoneWidth !== undefined) this._zoneWidth = zoneWidth;
      const c = this._zoneCenter ?? 0.5;
      const w = this._zoneWidth ?? 0.3;
      this.el.zone.style.left = `${((c - w / 2) * 100).toFixed(2)}%`;
      this.el.zone.style.width = `${(w * 100).toFixed(2)}%`;
      this.el.marker.style.left = `${(c * 100).toFixed(2)}%`;
      if (fishX === undefined) this.el.fishIcon.style.left = `${(c * 100).toFixed(2)}%`;
    }
    if (fishX !== undefined) this.el.fishIcon.style.left = `${(fishX * 100).toFixed(2)}%`;
    if (pointer !== undefined) this.el.pointer.style.left = `${(pointer * 100).toFixed(2)}%`;
    if (danger !== undefined) this.el.gauge.style.setProperty('--d', danger.toFixed(3));
  }

  /** Quanto o peixe já foi trazido (0 = longe, 1 = no barco). */
  setProgress(p) {
    const v = Math.min(Math.max(p, 0), 1);
    this.el.progressFill.style.width = `${(v * 100).toFixed(1)}%`;
    this.el.progressFish.style.left = `${(v * 100).toFixed(1)}%`;
  }

  hideGauge() {
    this.el.gauge.hidden = true;
  }

  // ---------- textos ----------

  setHint(text) {
    if (text === this._hint) return;
    this._hint = text;
    this.el.hint.textContent = text;
  }

  flash(text, kind = 'good') {
    const el = this.el.flash;
    el.className = `mdh-fish-flash ${kind}`;
    el.textContent = text;
    void el.offsetWidth; // reinicia a animação
    el.classList.add('show');
  }

  showResult({ ok, title, subtitle = '' }) {
    this.el.result.className = `mdh-fish-result ${ok ? 'ok' : 'lost'}`;
    this.el.resultTitle.textContent = title;
    this.el.resultSub.textContent = subtitle;
    this.el.result.hidden = false;
  }

  hideResult() {
    this.el.result.hidden = true;
  }

  hideAll() {
    this.hidePower();
    this.hideGauge();
    this.hideResult();
    this.setHint('');
  }

  dispose() {
    this.root.remove();
    this.style.remove();
  }
}

export default FishingUI;