// src/world/PointsOfInterest.js
import * as THREE from 'three';

/**
 * PointsOfInterest
 * Marcadores no mar SEM colisão: cada ponto é só um ARO (fita fina) que
 * mostra a área de chegada e acompanha a altura das ondas. O barco passa por
 * cima; "visitar" = entrar no aro (distância horizontal menor que o raio).
 *
 * Não guarda o progresso: quem sabe o que já foi visitado é o GameState.
 * Por isso os métodos recebem um `isVisited(id)`.
 *
 * O raio do aro é o mesmo do gatilho (padrão 15 = os 12 antigos + 25%) e fica
 * em `point.radius`: use esse valor no main.js em vez de um número fixo.
 *
 * Uso:
 *   const pois = new PointsOfInterest();
 *   pois.addTo(scene);
 *   gameState.onChange(() => pois.refresh((id) => gameState.hasVisited(id)));
 *
 *   // no loop de render:
 *   pois.update(elapsed, ocean);   // o aro acompanha as ondas
 *   for (const p of pois.getReached(boat.position, isVisited)) gameState.visitIsland(p.id);
 *   const alvo = pois.getNearestUnvisited(boat.position, isVisited);
 */

const RING_SEGMENTS = 96;
const RING_WIDTH = 0.5; // largura da fita
const RING_LIFT = 0.3; // sobe um pouco acima da água para não afundar na crista

export class PointsOfInterest {
  constructor({ positions, triggerRadius = 15 } = {}) {
    this.triggerRadius = triggerRadius;
    this.points = (positions ?? PointsOfInterest.defaultLayout()).map((position, index) =>
      this._createRing(position, `poi-${index}`, `Ponto ${index + 1}`)
    );
  }

  /** Mesmas posições das antigas ilhas. Trocar por geração procedural depois. */
  static defaultLayout() {
    return [
      new THREE.Vector3(45, 0, -70),
      new THREE.Vector3(-80, 0, -130),
      new THREE.Vector3(100, 0, 110),
    ];
  }

  _createRing(position, id, name) {
    const radius = this.triggerRadius;
    const group = new THREE.Group();

    // fita em volta do círculo: 2 vértices por segmento (borda de dentro e de fora)
    const positions = new Float32Array((RING_SEGMENTS + 1) * 2 * 3);
    const indices = [];
    for (let i = 0; i < RING_SEGMENTS; i++) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(geometry, ringMaterial);
    ring.frustumCulled = false; // os vértices estão em coordenadas do mundo
    ring.renderOrder = 3;
    group.add(ring);

    const point = {
      id,
      name,
      radius,
      position: new THREE.Vector3(position.x, 0, position.z),
      mesh: group,
      _ring: ring,
      _materials: { ringMaterial },
    };
    this._writeRing(point, null);
    return point;
  }

  /** Preenche os vértices da fita, na altura da água em cada ponto do círculo. */
  _writeRing(point, ocean) {
    const attr = point._ring.geometry.attributes.position;
    const half = RING_WIDTH / 2;
    for (let i = 0; i <= RING_SEGMENTS; i++) {
      const angle = (i / RING_SEGMENTS) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      for (let side = 0; side < 2; side++) {
        const r = point.radius + (side === 0 ? -half : half);
        const x = point.position.x + cos * r;
        const z = point.position.z + sin * r;
        const y = (ocean ? ocean.getHeightAt(x, z) : 0) + RING_LIFT;
        attr.setXYZ(i * 2 + side, x, y, z);
      }
    }
    attr.needsUpdate = true;
  }

  addTo(scene) {
    for (const point of this.points) scene.add(point.mesh);
  }

  /** Faz o aro subir e descer com as ondas. */
  update(elapsed, ocean) {
    if (!ocean) return;
    for (const point of this.points) this._writeRing(point, ocean);
  }

  /** Pontos cujo aro contém a posição e que ainda não foram visitados. */
  getReached(position, isVisited) {
    return this.points.filter(
      (point) =>
        !isVisited(point.id) &&
        Math.hypot(position.x - point.position.x, position.z - point.position.z) < point.radius
    );
  }

  /** Ponto não visitado mais próximo (distância horizontal) ou null. */
  getNearestUnvisited(position, isVisited) {
    let nearest = null;
    let best = Infinity;
    for (const point of this.points) {
      if (isVisited(point.id)) continue;
      const distance = Math.hypot(position.x - point.position.x, position.z - point.position.z);
      if (distance < best) {
        best = distance;
        nearest = point;
      }
    }
    return nearest;
  }

  /** Atualiza a cor do aro: visitado = verde e mais discreto. */
  refresh(isVisited) {
    for (const point of this.points) {
      const visited = isVisited(point.id);
      const { ringMaterial } = point._materials;
      ringMaterial.color.set(visited ? 0x6fe08a : 0xffd27a);
      ringMaterial.opacity = visited ? 0.35 : 0.7;
    }
  }

  dispose() {
    for (const point of this.points) {
      point._ring.geometry.dispose();
      point._materials.ringMaterial.dispose();
      point.mesh.removeFromParent();
    }
  }
}

export default PointsOfInterest;