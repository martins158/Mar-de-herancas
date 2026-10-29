// src/ui/DialogueBox.js
import { formatKey } from '../state/Settings.js';
import { YOU } from '../data/dialogues.js';

/**
 * DialogueBox
 * Caixa de diálogo em DOM puro, fixa na parte de baixo da tela. O texto
 * aparece letra por letra (efeito de máquina de escrever, com pausas em
 * pontuação). Avança com a tecla de interagir (o main.js chama advance()),
 * com clique na caixa, ou completa a fala atual se ela ainda estiver sendo
 * escrita. A dica de tecla acompanha o remapeamento das configurações.
 *
 * Se a conversa tiver `action` (ex.: { label: 'Zarpar' }), depois da última
 * fala aparece um botão; apertar a tecla de interagir também o aciona.
 *
 * Uso:
 *   const dialogue = new DialogueBox({ settings });
 *   dialogue.open({
 *     name: 'Pai',
 *     lines: [{ text: 'Você veio.' }, { speaker: 'Você', text: 'Vim.' }],
 *     action: { label: 'Zarpar' },
 *     onClose: () => {},
 *     onAction: () => {},
 *   });
 *
 *   // a cada frame:
 *   if (dialogue.isOpen) {
 *     if (input.consumeInteract()) dialogue.advance();
 *     dialogue.update(delta);
 *   }
 */

const CHARS_PER_SECOND = 42;
const ACTION_GUARD_MS = 350; // evita zarpar sem querer ao apertar a tecla rápido demais

const CSS = `
.mdh-dlg {
  position: fixed; left: 50%; bottom: 4vh; transform: translateX(-50%);
  width: min(860px, 92vw); box-sizing: border-box; padding: 18px 26px 14px;
  display: none; flex-direction: column; gap: 8px; z-index: 20;
  background: linear-gradient(180deg, rgba(20, 14, 12, 0.9), rgba(10, 8, 10, 0.94));
  border: 1px solid rgba(255, 214, 150, 0.45); border-radius: 14px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.55);
  color: #f6ead2; font-family: Georgia, 'Times New Roman', serif; user-select: none; cursor: pointer;
  animation: mdh-dlg-in 0.25s ease-out;
}
@keyframes mdh-dlg-in { from { opacity: 0; transform: translate(-50%, 12px); } to { opacity: 1; transform: translate(-50%, 0); } }
.mdh-dlg-name { font-size: 17px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: #ffcf7a; }
.mdh-dlg-name.you { color: #9ec8e8; }
.mdh-dlg-text { font-size: 21px; line-height: 1.5; min-height: 4.5em; white-space: pre-wrap; }
.mdh-dlg-text.you { font-style: italic; color: #dbeaf5; }
.mdh-dlg-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 40px; }
.mdh-dlg-hint { font-size: 14px; opacity: 0.65; }
.mdh-dlg-hint kbd {
  font-family: inherit; padding: 1px 8px; border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 5px; background: rgba(255, 255, 255, 0.1);
}
.mdh-dlg-action {
  display: none; padding: 9px 30px; font: inherit; font-size: 19px; color: #1c120a;
  background: #ffcf7a; border: 0; border-radius: 9px; cursor: pointer;
  transition: transform 0.15s, background 0.15s;
}
.mdh-dlg-action:hover { background: #ffe0a3; transform: translateY(-1px); }
`;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class DialogueBox {
  constructor({ settings = null } = {}) {
    this.settings = settings;
    this._open = false;
    this._lines = [];
    this._index = 0;
    this._shown = 0; // letras reveladas da fala atual
    this._timer = 0;
    this._typing = false;
    this._action = null;
    this._actionShownAt = 0;
    this._onClose = null;
    this._onAction = null;

    this._style = document.createElement('style');
    this._style.textContent = CSS;
    document.head.appendChild(this._style);

    this.root = el('div', 'mdh-dlg');
    this.nameEl = el('div', 'mdh-dlg-name');
    this.textEl = el('div', 'mdh-dlg-text');
    this.hintEl = el('span', 'mdh-dlg-hint');
    this.actionBtn = el('button', 'mdh-dlg-action');
    this.actionBtn.tabIndex = -1; // não rouba o foco do teclado
    this.actionBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      this._fireAction();
    });

    const foot = el('div', 'mdh-dlg-foot');
    foot.append(this.hintEl, this.actionBtn);
    this.root.append(this.nameEl, this.textEl, foot);
    this.root.addEventListener('click', () => this.advance());
    document.body.appendChild(this.root);
  }

  get isOpen() {
    return this._open;
  }

  /** Abre uma conversa. */
  open({ name, lines, action = null, onClose = null, onAction = null }) {
    if (!lines?.length) return;
    this._name = name;
    this._lines = lines;
    this._index = 0;
    this._action = action;
    this._onClose = onClose;
    this._onAction = onAction;
    this._open = true;
    this.root.style.display = 'flex';
    this._startLine();
  }

  /** Completa a fala atual ou passa para a próxima; na última, fecha ou aciona o botão. */
  advance() {
    if (!this._open) return;

    if (this._typing) {
      this._shown = this._fullText.length;
      this._renderText();
      this._finishTyping();
      return;
    }

    if (this._index < this._lines.length - 1) {
      this._index++;
      this._startLine();
      return;
    }

    if (this._action) {
      if (performance.now() - this._actionShownAt >= ACTION_GUARD_MS) this._fireAction();
      return;
    }
    this.close();
  }

  /** Chame a cada frame enquanto estiver aberta (efeito de máquina de escrever). */
  update(delta) {
    if (!this._open || !this._typing) return;

    this._timer += delta;
    while (this._typing) {
      const char = this._fullText[this._shown] ?? '';
      const wait = this._delayFor(char);
      if (this._timer < wait) break;
      this._timer -= wait;
      this._shown++;
      if (this._shown >= this._fullText.length) {
        this._renderText();
        this._finishTyping();
        return;
      }
    }
    this._renderText();
  }

  close() {
    if (!this._open) return;
    this._open = false;
    this._typing = false;
    this.root.style.display = 'none';
    const onClose = this._onClose;
    this._onClose = null;
    onClose?.();
  }

  dispose() {
    this.root.remove();
    this._style.remove();
  }

  // ---------- interno ----------

  _delayFor(char) {
    const base = 1 / CHARS_PER_SECOND;
    if ('.!?…'.includes(char)) return base * 9;
    if (',;:'.includes(char)) return base * 4;
    return base;
  }

  _startLine() {
    const line = this._lines[this._index];
    const speaker = line.speaker ?? this._name;
    const isYou = speaker === YOU;

    this._fullText = line.text;
    this._shown = 0;
    this._timer = 0;
    this._typing = true;

    this.nameEl.textContent = speaker;
    this.nameEl.classList.toggle('you', isYou);
    this.textEl.classList.toggle('you', isYou);
    this.actionBtn.style.display = 'none';
    this._renderText();
    this._renderHint();
  }

  _finishTyping() {
    this._typing = false;
    const isLast = this._index === this._lines.length - 1;
    if (isLast && this._action) {
      this.actionBtn.textContent = this._action.label;
      this.actionBtn.style.display = 'inline-block';
      this._actionShownAt = performance.now();
    }
    this._renderHint();
  }

  _renderText() {
    this.textEl.textContent = this._fullText.slice(0, this._shown);
  }

  _renderHint() {
    const key = formatKey(this.settings?.keymap?.interact?.[0] ?? 'KeyE');
    const isLast = this._index === this._lines.length - 1;
    let label = 'continuar';
    if (this._typing) label = 'mostrar tudo';
    else if (isLast) label = this._action ? this._action.label.toLowerCase() : 'fechar';
    this.hintEl.replaceChildren(el('kbd', '', key), document.createTextNode(` ${label}`));
  }

  _fireAction() {
    if (!this._open || !this._action) return;
    const onAction = this._onAction;
    this.close();
    onAction?.();
  }
}

export default DialogueBox;