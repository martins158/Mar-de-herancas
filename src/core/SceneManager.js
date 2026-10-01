// src/core/SceneManager.js
import * as THREE from 'three';

/**
 * SceneManager
 * Dono da cena, da câmera e das luzes. Não sabe nada sobre renderer,
 * loop de render ou input — isso é responsabilidade do Engine.
 *
 * Uso:
 *   const sceneManager = new SceneManager();
 *   ocean.addTo(sceneManager.scene);
 *   // no resize:
 *   sceneManager.onResize();
 */
export class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.Fog(0x87ceeb, 100, 800);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 8, 14);

    this._createLights();
  }

  _createLights() {
    const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
    sunLight.position.set(50, 80, 30);
    sunLight.castShadow = true;
    this.scene.add(sunLight);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  }

  /** Chame quando a janela for redimensionada. */
  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}

export default SceneManager;