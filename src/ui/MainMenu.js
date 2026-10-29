// src/ui/MainMenu.js
import { ACTION_LABELS, RENDER_SCALES, formatKey } from '../state/Settings.js';

/**
 * MainMenu
 * Tela inicial em DOM: o oceano 3D continua renderizando por trás e o menu
 * o desfoca com `backdrop-filter: blur`. Botões centralizados:
 *   Jogar · Configurações (volume, resolução, controles e teclas)
 *
 * As teclas são remapeáveis: clique no botão da tecla e aperte a nova
 * (Esc cancela). Tudo é salvo pelo Settings.
 *
 * Uso:
 *   const menu = new MainMenu({ settings, onPlay: () => startGame() });
 *   menu.show();
 *   menu.hide();
 *   menu.dispose();
 */

const CSS = `
.mdh-menu {
  position: fixed; inset: 0; z-index: 30;
  display: none; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(ellipse at center, rgba(5, 30, 50, 0.25), rgba(2, 12, 24, 0.65));
  -webkit-backdrop-filter: blur(9px); backdrop-filter: blur(9px);
  color: #fff; font-family: Georgia, 'Times New Roman', serif; user-select: none;
}
.mdh-title {
  font-size: clamp(36px, 7vw, 72px); font-weight: 600; letter-spacing: 0.06em;
  margin: 0 0 6px; text-align: center; text-shadow: 0 4px 24px rgba(0, 0, 0, 0.55);
}
.mdh-sub { margin: 0 0 36px; font-size: 18px; font-style: italic; opacity: 0.8; text-align: center; }
.mdh-col { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.mdh-btn {
  min-width: 260px; padding: 13px 22px; font: inherit; font-size: 20px; color: #fff;
  background: rgba(255, 255, 255, 0.12); border: 1px solid rgba(255, 255, 255, 0.4);
  border-radius: 10px; cursor: pointer;
  transition: background 0.15s, transform 0.15s, border-color 0.15s;
}
.mdh-btn:hover { background: rgba(255, 255, 255, 0.24); transform: translateY(-1px); }
.mdh-btn:active { transform: translateY(0); }
.mdh-btn.small { min-width: 0; padding: 7px 14px; font-size: 15px; }
.mdh-btn.key { min-width: 96px; }
.mdh-btn.active { background: rgba(255, 200, 110, 0.35); border-color: rgba(255, 210, 130, 0.9); }
.mdh-panel {
  width: min(580px, 92vw); max-height: 78vh; overflow-y: auto; box-sizing: border-box;
  padding: 22px 26px; background: rgba(8, 24, 40, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 14px;
}
.mdh-panel h2 { margin: 0 0 18px; font-size: 26px; text-align: center; font-weight: 600; }
.mdh-section { margin-bottom: 22px; }
.mdh-section h3 { margin: 0 0 10px; font-size: 18px; font-weight: 600; color: #ffd9a0; }
.mdh-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.mdh-hint { margin: 8px 0 0; font-size: 13px; opacity: 0.65; }
.mdh-range { flex: 1; min-width: 160px; accent-color: #ffd9a0; }
.mdh-keys { display: grid; grid-template-columns: 1fr auto auto; gap: 8px 10px; align-items: center; }
.mdh-keys .head { font-size: 13px; opacity: 0.65; text-align: center; }
`;

function h(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined) el.textContent = text;
  return el;
}

export class MainMenu {
  constructor({ settings, onPlay }) {
    this.settings = settings;
    this.onPlay = onPlay;
    this._cancelCapture = null;

    this._style = document.createElement('style');
    this._style.textContent = CSS;
    document.head.appendChild(this._style);

    this.root = h('div', 'mdh-menu');
    this.root.appendChild(h('h1', 'mdh-title', 'Mar de Heranças'));
    this.root.appendChild(h('p', 'mdh-sub', 'Uma travessia pelo velho mar'));

    this._buildMain();
    this._buildSettings();
    document.body.appendChild(this.root);

    this._unsubscribe = settings.onChange(() => this._sync());
    this._onFullscreen = () => this._syncFullscreen();
    document.addEventListener('fullscreenchange', this._onFullscreen);

    this._sync();
    this._showView('main');
  }

  _buildMain() {
    this.mainView = h('div', 'mdh-col');

    const play = h('button', 'mdh-btn', 'Jogar');
    play.addEventListener('click', () => this.onPlay?.());

    const options = h('button', 'mdh-btn', 'Configurações');
    options.addEventListener('click', () => this._showView('settings'));

    this.mainView.append(play, options);
    this.root.appendChild(this.mainView);
  }

  _buildSettings() {
    this.panel = h('div', 'mdh-panel');
    this.panel.appendChild(h('h2', '', 'Configurações'));

    // volume
    const volume = h('div', 'mdh-section');
    volume.appendChild(h('h3', '', 'Volume'));
    const volumeRow = h('div', 'mdh-row');
    this.volumeInput = h('input', 'mdh-range');
    this.volumeInput.type = 'range';
    this.volumeInput.min = '0';
    this.volumeInput.max = '100';
    this.volumeInput.step = '1';
    this.volumeInput.addEventListener('input', () => {
      this.settings.setVolume(Number(this.volumeInput.value) / 100);
    });
    this.volumeLabel = h('span', '', '');
    this.volumeLabel.style.minWidth = '44px';
    volumeRow.append(this.volumeInput, this.volumeLabel);
    volume.appendChild(volumeRow);
    this.panel.appendChild(volume);

    // resolução
    const resolution = h('div', 'mdh-section');
    resolution.appendChild(h('h3', '', 'Resolução da tela'));
    const resolutionRow = h('div', 'mdh-row');
    this.scaleButtons = RENDER_SCALES.map((scale) => {
      const button = h('button', 'mdh-btn small', `${Math.round(scale * 100)}%`);
      button.addEventListener('click', () => this.settings.setRenderScale(scale));
      resolutionRow.appendChild(button);
      return { scale, button };
    });
    this.fullscreenButton = h('button', 'mdh-btn small', '');
    this.fullscreenButton.addEventListener('click', () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    });
    resolutionRow.appendChild(this.fullscreenButton);
    resolution.appendChild(resolutionRow);
    resolution.appendChild(
      h('p', 'mdh-hint', 'Escala de renderização: valores menores rodam mais leve; 100% = resolução nativa.')
    );
    this.panel.appendChild(resolution);

    // controles
    const controls = h('div', 'mdh-section');
    controls.appendChild(h('h3', '', 'Controles e teclas'));
    this.keysGrid = h('div', 'mdh-keys');
    controls.appendChild(this.keysGrid);
    this.interactHint = h('p', 'mdh-hint', '');
    controls.appendChild(this.interactHint);
    controls.appendChild(
      h('p', 'mdh-hint', 'Clique numa tecla e aperte a nova (Esc cancela). Cada ação tem uma tecla principal e uma alternativa.')
    );
    const reset = h('button', 'mdh-btn small', 'Restaurar padrão');
    reset.style.marginTop = '10px';
    reset.addEventListener('click', () => this.settings.resetKeymap());
    controls.appendChild(reset);
    this.panel.appendChild(controls);

    const back = h('button', 'mdh-btn', 'Voltar');
    back.style.display = 'block';
    back.style.margin = '0 auto';
    back.addEventListener('click', () => this._showView('main'));
    this.panel.appendChild(back);

    this.root.appendChild(this.panel);
  }

  _showView(view) {
    this._cancelCapture?.();
    this.mainView.style.display = view === 'main' ? 'flex' : 'none';
    this.panel.style.display = view === 'settings' ? 'block' : 'none';
  }

  /** Reflete o estado atual das configurações na interface. */
  _sync() {
    const { volume, renderScale } = this.settings;
    this.volumeInput.value = String(Math.round(volume * 100));
    this.volumeLabel.textContent = `${Math.round(volume * 100)}%`;

    for (const { scale, button } of this.scaleButtons) {
      button.classList.toggle('active', scale === renderScale);
    }

    this._syncFullscreen();
    this._renderKeys();
  }

  _syncFullscreen() {
    this.fullscreenButton.textContent = document.fullscreenElement
      ? 'Tela cheia: ligada'
      : 'Tela cheia: desligada';
    this.fullscreenButton.classList.toggle('active', Boolean(document.fullscreenElement));
  }

  _renderKeys() {
    this.keysGrid.replaceChildren();
    this.keysGrid.append(h('span', 'head', 'Ação'), h('span', 'head', 'Principal'), h('span', 'head', 'Alternativa'));

    for (const [action, label] of Object.entries(ACTION_LABELS)) {
      this.keysGrid.appendChild(h('span', '', label));
      for (const slot of [0, 1]) {
        const button = h('button', 'mdh-btn small key', formatKey(this.settings.keymap[action][slot]));
        button.addEventListener('click', () => this._startCapture(button, action, slot));
        this.keysGrid.appendChild(button);
      }
    }

    // ajuda dinâmica: acompanha o remapeamento da tecla de interagir
    const [main, alt] = this.settings.keymap.interact;
    const keys = alt ? `${formatKey(main)} ou ${formatKey(alt)}` : formatKey(main);
    this.interactHint.textContent = `Interagir (${keys}): conversar com as pessoas do porto, avançar os diálogos e zarpar.`;
  }

  /** Espera a próxima tecla apertada e grava no slot da ação. Esc cancela. */
  _startCapture(button, action, slot) {
    this._cancelCapture?.();
    button.textContent = 'Pressione…';
    button.classList.add('active');

    const finish = () => {
      window.removeEventListener('keydown', onKey, true);
      this._cancelCapture = null;
    };
    const onKey = (event) => {
      // captura antes do InputSystem e do resto do jogo
      event.preventDefault();
      event.stopImmediatePropagation();
      finish();
      if (event.code === 'Escape') this._renderKeys();
      else this.settings.setKey(action, slot, event.code); // dispara _sync → redesenha
    };

    window.addEventListener('keydown', onKey, true);
    this._cancelCapture = () => {
      finish();
      this._renderKeys();
    };
  }

  show() {
    this.root.style.display = 'flex';
    this._showView('main');
  }

  hide() {
    this._cancelCapture?.();
    this.root.style.display = 'none';
  }

  dispose() {
    this._cancelCapture?.();
    this._unsubscribe();
    document.removeEventListener('fullscreenchange', this._onFullscreen);
    this.root.remove();
    this._style.remove();
  }
}

export default MainMenu;