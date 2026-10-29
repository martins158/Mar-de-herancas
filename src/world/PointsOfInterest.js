// src/world/PointsOfInterest.js
import * as THREE from 'three';

/**
 * PointsOfInterest
 * Substitui as ilhas-obstáculo: são marcadores no mar SEM colisão (uma
 * boia + facho de luz + anel mostrando a área de chegada). O barco passa
 * por cima; "visitar" = entrar no anel (distância horizontal menor que
 * triggerRadius).
 *
 * Não guarda o progresso: quem sabe o que já foi visitado é o GameState.
 * Por isso os métodos recebem um `isVisited(id)`.
 *
 * Uso:
 *   const pois = new PointsOfInterest();
 *   pois.addTo(scene);
 *   gameState.onChange(() => pois.refresh((id) => gameState.hasVisited(id)));
 *
 *   // no loop de render:
 *   pois.update(elapsed, ocean);   // boia acompanha as ondas
 *   for (const p of pois.getReached(boat.position, isVisited)) gameState.visitIsland(p.id);
 *   const alvo = pois.getNearestUnvisited(boat.position, isVisited);
 */
export class PointsOfInterest {
  constructor({ positions, triggerRadius = 12 } = {}) {
    this.triggerRadius = triggerRadius;
    this.points = (positions ?? PointsOfInterest.defaultLayout()).map((position, index) =>
      this._createBeacon(position, `poi-${index}`, `Ponto ${index + 1}`)
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

  _createBeacon(position, id, name) {
    const group = new THREE.Group();
    group.position.set(position.x, 0, position.z);

    // facho de luz (aberto, translúcido)
    const pillarMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.6, 40, 16, 1, true), pillarMaterial);
    pillar.position.y = 20;
    group.add(pillar);

    // boia
    const buoyMaterial = new THREE.MeshBasicMaterial({ color: 0xe8503a });
    const buoy = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 12), buoyMaterial);
    buoy.position.y = 0.4;
    group.add(buoy);

    // anel da área de chegada
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xffd27a,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(this.triggerRadius, 0.25, 8, 64), ringMaterial);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.4;
    group.add(ring);

    return {
      id,
      name,
      position: new THREE.Vector3(position.x, 0, position.z),
      mesh: group,
      _materials: { pillarMaterial, buoyMaterial, ringMaterial },
    };
  }

  addTo(scene) {
    for (const point of this.points) scene.add(point.mesh);
  }

  /** Faz as boias subirem e descerem com as ondas. */
  update(elapsed, ocean) {
    if (!ocean) return;
    for (const point of this.points) {
      point.mesh.position.y = ocean.getHeightAt(point.position.x, point.position.z);
    }
  }

  /** Pontos cujo anel contém a posição e que ainda não foram visitados. */
  getReached(position, isVisited) {
    return this.points.filter(
      (point) =>
        !isVisited(point.id) &&
        Math.hypot(position.x - point.position.x, position.z - point.position.z) < this.triggerRadius
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

  /** Atualiza as cores: visitado = verde e mais discreto. */
  refresh(isVisited) {
    for (const point of this.points) {
      const visited = isVisited(point.id);
      const { pillarMaterial, buoyMaterial, ringMaterial } = point._materials;
      pillarMaterial.color.set(visited ? 0x6fe08a : 0xffd27a);
      pillarMaterial.opacity = visited ? 0.12 : 0.3;
      ringMaterial.color.set(visited ? 0x6fe08a : 0xffd27a);
      ringMaterial.opacity = visited ? 0.25 : 0.55;
      buoyMaterial.color.set(visited ? 0x4caf50 : 0xe8503a);
    }
  }

  dispose() {
    for (const point of this.points) {
      point.mesh.traverse((child) => {
        child.geometry?.dispose();
        child.material?.dispose();
      });
    }
  }
}

export default PointsOfInterest;