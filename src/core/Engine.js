// src/core/Engine.js
import * as THREE from 'three';

/**
 * Engine
 * Dono do renderer, do timer e do loop de render (requestAnimationFrame).
 * Recebe um SceneManager pronto e chama um callback a cada frame, antes
 * de renderizar — é ali que o jogo atualiza oceano, jogador, câmera etc.
 *
 * O delta entregue ao callback é limitado a maxDelta (padrão 0.1 s), pra
 * que um travamento ou a volta de outra aba não faça o barco "pular" e
 * atravessar uma ilha. O elapsed continua sendo o tempo real acumulado.
 *
 * Uso:
 *   const engine = new Engine({ sceneManager });
 *   engine.start((delta, elapsed) => {
 *     ocean.update(elapsed);
 *     player.update(delta);
 *   });
 */
export class Engine {
  constructor({ sceneManager, maxDelta = 0.1 }) {
    this.sceneManager = sceneManager;
    this.maxDelta = maxDelta;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    document.body.appendChild(this.renderer.domElement);

    // Timer substitui o THREE.Clock (deprecado desde o r183). O connect()
    // usa a Page Visibility API: com a aba escondida o delta fica em 0 e,
    // ao voltar, o tempo é resetado em vez de virar um salto gigante.
    this.timer = new THREE.Timer();
    this.timer.connect(document);
    this._onFrame = null;

    window.addEventListener('resize', this._onResize);
  }

  _onResize = () => {
    this.sceneManager.onResize();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  /** Inicia o loop de render. onFrame(delta, elapsed) roda antes do render. */
  start(onFrame) {
    this._onFrame = onFrame;
    this._animate();
  }

  _animate = () => {
    this.timer.update();

    // limita o delta (também cobre o primeiro frame, que soma o tempo de
    // carregamento desde que o Timer foi criado)
    const delta = Math.min(this.timer.getDelta(), this.maxDelta);
    const elapsed = this.timer.getElapsed();

    if (this._onFrame) this._onFrame(delta, elapsed);

    this.renderer.render(this.sceneManager.scene, this.sceneManager.camera);
    requestAnimationFrame(this._animate);
  };

  dispose() {
    window.removeEventListener('resize', this._onResize);
    this.timer.dispose();
  }
}

export default Engine;