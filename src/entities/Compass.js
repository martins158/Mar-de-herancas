// src/entities/Compass.js
import * as THREE from 'three';
import { dampFactor } from '../utils/MathUtils.js';

/**
 * Compass
 * "Bússola": uma seta chata que orbita o barco, perto da água, e aponta para
 * fora, em direção ao alvo (ponto de interesse). Gira com suavização pelo
 * caminho mais curto e é desenhada por cima de tudo (depthTest desligado)
 * para nunca ficar escondida pelas ondas.
 *
 * Não é filha do barco: ela só segue a posição dele, então o giro do barco
 * não interfere na direção da seta (que é sempre em coordenadas do mundo).
 *
 * Uso:
 *   const compass = new Compass();
 *   compass.addTo(scene);
 *
 *   // no loop de render (target = Vector3 ou null para esconder a seta):
 *   compass.update(delta, player.mesh.position, target);
 */
export class Compass {
  constructor({ radius = 5.2, height = 1.0, color = 0xffb02e, smoothing = 10 } = {}) {
    this.radius = radius;
    this.height = height;
    this.smoothing = smoothing;

    // seta com a ponta no +Y do Shape; depois de deitar, a ponta aponta para -Z
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.4);
    shape.lineTo(0.8, 0.2);
    shape.lineTo(0.3, 0.2);
    shape.lineTo(0.3, -1.0);
    shape.lineTo(-0.3, -1.0);
    shape.lineTo(-0.3, 0.2);
    shape.lineTo(-0.8, 0.2);
    shape.closePath();

    const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.2, bevelEnabled: false });
    geometry.rotateX(-Math.PI / 2);

    this.material = new THREE.MeshBasicMaterial({
      color,
      depthTest: false,
      transparent: true,
    });

    this.arrow = new THREE.Mesh(geometry, this.material);
    this.arrow.renderOrder = 10;
    this.arrow.scale.setScalar(1.3); // um pouco maior para ler bem à distância

    this.mesh = new THREE.Group();
    this.mesh.add(this.arrow);
    this.mesh.visible = false;
  }

  addTo(scene) {
    scene.add(this.mesh);
  }

  /** target: THREE.Vector3 (só x/z contam) ou null para esconder a seta. */
  update(delta, shipPosition, target) {
    if (!target) {
      this.mesh.visible = false;
      return;
    }

    this.mesh.visible = true;

    // com rotation.y = θ, a ponta (-Z) passa a apontar para (-sin θ, -cos θ)
    const desired = Math.atan2(-(target.x - shipPosition.x), -(target.z - shipPosition.z));
    let diff = desired - this.mesh.rotation.y;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); // caminho mais curto
    this.mesh.rotation.y += diff * dampFactor(this.smoothing, delta);

    // a seta orbita o barco a `radius` de distância, apontando para fora (para o alvo).
    // Fora do casco e perto da água, ela é vista de cima pela câmera e lê bem como seta.
    const angle = this.mesh.rotation.y;
    this.mesh.position.set(
      shipPosition.x - Math.sin(angle) * this.radius,
      shipPosition.y + this.height,
      shipPosition.z - Math.cos(angle) * this.radius
    );
  }

  dispose() {
    this.arrow.geometry.dispose();
    this.material.dispose();
  }
}

export default Compass;