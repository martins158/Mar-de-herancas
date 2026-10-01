// src/world/Terrain.js
import * as THREE from 'three';

/**
 * Terrain
 * Gera ilhas placeholder (base de areia + morro em cone) espalhadas pelo
 * oceano — primeiro destino/ponto de interesse do jogo. Cada ilha expõe
 * um `radius` pronto para ser registrado no CollisionSystem.
 *
 * Uso:
 *   const terrain = new Terrain();
 *   terrain.addTo(scene);
 *
 *   for (const island of terrain.islands) {
 *     collisionSystem.register({ object3D: island.mesh, radius: island.radius, tag: 'island' });
 *   }
 */
export class Terrain {
  constructor({ islandPositions } = {}) {
    const positions = islandPositions ?? Terrain.defaultLayout();
    this.islands = positions.map((position, index) =>
      Terrain.createIsland(position, `island-${index}`)
    );
  }

  /** Posições fixas por enquanto — trocar por geração procedural depois. */
  static defaultLayout() {
    return [
      new THREE.Vector3(45, 0, -70),
      new THREE.Vector3(-80, 0, -130),
      new THREE.Vector3(100, 0, 110),
    ];
  }

  static createIsland(position, id) {
    const baseRadius = 8 + Math.random() * 6;
    const group = new THREE.Group();
    group.position.copy(position);

    const sandGeometry = new THREE.CylinderGeometry(baseRadius, baseRadius * 1.2, 2, 16);
    const sandMaterial = new THREE.MeshStandardMaterial({ color: 0xdccb8a });
    const sand = new THREE.Mesh(sandGeometry, sandMaterial);
    sand.position.y = 1;
    group.add(sand);

    const hillGeometry = new THREE.ConeGeometry(baseRadius * 0.6, 10, 16);
    const hillMaterial = new THREE.MeshStandardMaterial({ color: 0x4a7c3a });
    const hill = new THREE.Mesh(hillGeometry, hillMaterial);
    hill.position.y = 2 + 5;
    hill.castShadow = true;
    group.add(hill);

    // raio de colisão um pouco maior que a base de areia, pra não deixar
    // o barco encostar visualmente na ilha antes de colidir
    return { id, mesh: group, radius: baseRadius * 1.1 };
  }

  addTo(scene) {
    for (const island of this.islands) {
      scene.add(island.mesh);
    }
  }
}

export default Terrain;