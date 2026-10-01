// src/core/Camera.js
import * as THREE from 'three';
import { dampFactor } from '../utils/MathUtils.js';

/**
 * FollowCamera
 * Câmera em 3ª pessoa: fica sempre atrás e acima do alvo (respeitando a
 * rotação dele) e o segue com suavização. Extraída do main.js. Não cria a
 * câmera — recebe a que o SceneManager já tem.
 *
 * `smoothing` usa dampFactor (independente de frame rate). O valor 5
 * reproduz o lerp(0.08) por frame que existia antes, rodando a 60 fps.
 *
 * Uso:
 *   const followCamera = new FollowCamera({
 *     camera: sceneManager.camera,
 *     target: player.mesh,
 *   });
 *
 *   // no loop de render:
 *   followCamera.update(delta);
 */
export class FollowCamera {
  constructor({
    camera,
    target = null, // qualquer THREE.Object3D
    offset = new THREE.Vector3(0, 8, 14),
    smoothing = 5,
  } = {}) {
    this.camera = camera;
    this.target = target;
    this.offset = offset.clone();
    this.smoothing = smoothing;

    // reaproveitados a cada frame pra não alocar Vector3 novo
    this._desiredOffset = new THREE.Vector3();
    this._desiredPosition = new THREE.Vector3();
  }

  setTarget(target) {
    this.target = target;
  }

  /** Chame a cada frame, depois de mover o alvo. */
  update(delta) {
    if (!this.target) return;

    this._desiredOffset.copy(this.offset).applyQuaternion(this.target.quaternion);
    this._desiredPosition.copy(this.target.position).add(this._desiredOffset);

    this.camera.position.lerp(this._desiredPosition, dampFactor(this.smoothing, delta));
    this.camera.lookAt(this.target.position);
  }
}

export default FollowCamera;