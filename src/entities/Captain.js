// src/entities/Captain.js
import * as THREE from 'three';

/**
 * Captain
 * O Capitão Dutra, o náufrago do Esperança II, sentado no banco do barco do
 * jogador depois do resgate: capa de chuva amarela surrada, um cobertor nos
 * ombros, boné de capitão e barba branca, olhando para a proa. Mesmo molde do
 * Sailor (grupo local, pés no chão do barco, materiais próprios, dispose).
 * Respira devagar e balança a cabeça com o mar.
 *
 * Espaço local: pés em (0,0,0), olhando para -Z (a proa do barco), direita = +X.
 *
 * Uso:
 *   const captain = new Captain();             // position opcional (local ao barco)
 *   player.boat.add(captain.group);
 *   captain.setVisible(gameState.hasFlag('dutra-rescued'));
 *   captain.update(delta, elapsed);            // todo frame
 *   captain.dispose();
 */

export class Captain {
  constructor({ position = new THREE.Vector3(-0.42, 0.4, -0.2), yaw = 0 } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = yaw;
    this.group.visible = false;
    this._materials = [];
    this._build();
  }

  _mat(color, extra = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
    this._materials.push(m);
    return m;
  }

  _mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  _build() {
    const coat = this._mat('#c2961f');
    const blanket = this._mat('#6e6455');
    const trousers = this._mat('#2a2a32');
    const skin = this._mat('#d9a67f');
    const beardMat = this._mat('#e9e6df');
    const cap = this._mat('#1d2a3a');

    // pernas sentadas: coxas para a proa, canelas para baixo
    for (const x of [-0.1, 0.1]) {
      this._mesh(new THREE.BoxGeometry(0.17, 0.17, 0.5), trousers, this.group, x, 0.5, -0.22);
      this._mesh(new THREE.BoxGeometry(0.16, 0.5, 0.16), trousers, this.group, x, 0.25, -0.5);
    }

    this.torso = new THREE.Group(); // pivô no quadril: respira e se inclina um pouco
    this.torso.position.set(0, 0.55, 0.05);
    this.group.add(this.torso);
    this._mesh(new THREE.BoxGeometry(0.46, 0.56, 0.3), coat, this.torso, 0, 0.28, 0);
    this._mesh(new THREE.BoxGeometry(0.54, 0.16, 0.38), blanket, this.torso, 0, 0.55, 0.02); // cobertor nos ombros
    this._mesh(new THREE.BoxGeometry(0.4, 0.3, 0.08), blanket, this.torso, 0, 0.32, 0.18);

    // braços caídos, mãos nos joelhos
    for (const side of [-1, 1]) {
      const arm = this._mesh(new THREE.BoxGeometry(0.11, 0.1, 0.45), coat, this.torso, side * 0.28, 0.1, -0.2);
      arm.rotation.x = 0.35;
      this._mesh(new THREE.SphereGeometry(0.055, 8, 6), skin, this.torso, side * 0.28, -0.02, -0.42);
    }

    this.head = new THREE.Group();
    this.head.position.set(0, 0.7, 0);
    this.torso.add(this.head);
    this._mesh(new THREE.SphereGeometry(0.16, 14, 10), skin, this.head, 0, 0.06, 0);
    const beard = this._mesh(new THREE.SphereGeometry(0.15, 12, 8), beardMat, this.head, 0, -0.05, -0.06);
    beard.scale.set(1, 1.1, 0.85);
    this._mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.1, 14), cap, this.head, 0, 0.2, 0); // boné
    this._mesh(new THREE.BoxGeometry(0.22, 0.02, 0.12), cap, this.head, 0, 0.17, -0.16); // aba
  }

  setVisible(visible) {
    this.group.visible = visible;
  }

  update(delta, elapsed = 0) {
    if (!this.group.visible) return;
    const breathe = Math.sin(elapsed * 1.3);
    this.torso.scale.y = 1 + breathe * 0.012;
    this.torso.rotation.x = 0.08 + Math.sin(elapsed * 0.5) * 0.02; // curvado de cansaço
    this.head.rotation.y = Math.sin(elapsed * 0.35) * 0.25; // olha o mar
    this.head.rotation.x = 0.1 + Math.sin(elapsed * 0.9) * 0.03;
  }

  dispose() {
    this.group.traverse((obj) => obj.geometry?.dispose());
    for (const m of this._materials) m.dispose();
    this.group.removeFromParent();
  }
}

export default Captain;