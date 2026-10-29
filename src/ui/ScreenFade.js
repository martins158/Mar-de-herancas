// src/ui/ScreenFade.js

/**
 * ScreenFade
 * Cortina preta em tela cheia para transições (menu → porto → mar).
 * Fica acima de tudo (menu incluso) e não bloqueia o mouse.
 *
 * Uso:
 *   const fade = new ScreenFade();
 *   await fade.to(1, 0.5);   // escurece em 0,5 s
 *   // ...troca de cena...
 *   await fade.to(0, 0.7);   // clareia em 0,7 s
 */
export class ScreenFade {
  constructor() {
    this.el = document.createElement('div');
    this.el.style.cssText = `
      position: fixed;
      inset: 0;
      background: #000;
      opacity: 0;
      pointer-events: none;
      z-index: 50;
    `;
    document.body.appendChild(this.el);
  }

  /** Anima a opacidade até `opacity` (0..1) e resolve quando terminar. */
  to(opacity, seconds = 0.5) {
    this.el.style.transition = `opacity ${seconds}s ease`;
    // força o navegador a registrar a transição antes de mudar o valor
    void this.el.offsetWidth;
    this.el.style.opacity = String(opacity);
    return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
  }

  dispose() {
    this.el.remove();
  }
}

export default ScreenFade;