// src/world/LanternIsland.js
import * as THREE from 'three';

/**
 * LanternIsland
 * A Ilha da Lanterna, onde o mar escurece: uma ilha oval pequena de pedra escura com
 * uma praia estreita, duas colinas, uma torre baixa com a luz que nunca apaga (fixa,
 * só "respira", sem girar), a cabana do avô e um cais curto virado para o lado de
 * onde o barco chega (oeste, -X). Ninguém mora aqui.
 *
 * A ilha é desenhada em torno do centro `position` (o mesmo ponto do aro
 * 'ilha-lanterna' em data/story.js) e só aparece depois de setActive(true).
 *
 * Os sólidos (a terra oval e o cais) saem de getObstacles(), no formato do
 * BoatCollider. A elipse de calmaria das ondas sai de lanternIslandConfig(x, z) e vai
 * para o `island2` do Ocean.
 *
 * Uso:
 *   const island = new LanternIsland({ position: [x, z] });
 *   island.addTo(scene);
 *   island.setActive(true);            // quando a história liberar a ilha
 *   island.update(elapsed);            // no loop (a luz respira)
 *   collider.addObstacles(island.getObstacles());
 *   const { x, z, radius } = island.getLanding(); // onde o barco encosta para a cabana
 *   island.dispose();
 */

/** Semieixos da terra (sem a praia), em unidades do mundo. */
export const LANTERN_SIZE = { rx: 18, rz: 12 };
const SAND_K = 1.12; // a praia é a elipse da ilha x 1,12
const PLATEAU_K = 0.92; // o platô (onde ficam a torre e a cabana)
const BEACH_TOP = 0.7; // praia quase ao nível da água
const LAND_TOP = 2.4; // topo do platô, acima das cristas

// cais (coordenadas locais: o centro da ilha é a origem)
const DOCK = { x0: -23.5, x1: -17.5, z: 2, w: 1.8, y: 1.25 };
const LANDING_GAP = 4.5; // o barco para a esta distância da ponta do cais
const LANDING_RADIUS = 7;

/** Elipse da ilha em coordenadas do MUNDO (praia incluída) para a colisão e as ondas. */
export function lanternIslandConfig(x, z) {
  return { x, z, rx: LANTERN_SIZE.rx * SAND_K, rz: LANTERN_SIZE.rz * SAND_K, fall: 2.5 };
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export class LanternIsland {
  constructor({ position = [0, 0] } = {}) {
    this.x = position[0];
    this.z = position[1];
    this.group = new THREE.Group();
    this.group.position.set(this.x, 0, this.z);
    this.group.visible = false;
    this.active = false;

    this._glowMap = glowTexture();
    this._glow = null;
    this._light = null;

    this._buildLand();
    this._buildTower();
    this._buildCabin();
    this._buildDock();
  }

  // ---------- helpers ----------

  _std(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.95, ...extra });
  }

  _box(w, h, d, material, x, y, z, parent = this.group) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // ---------- construção ----------

  _buildLand() {
    const { rx, rz } = LANTERN_SIZE;

    const beach = new THREE.Mesh(
      new THREE.CylinderGeometry(SAND_K, SAND_K + 0.1, 6, 64),
      this._std('#7d6e55', { roughness: 1 })
    );
    beach.scale.set(rx, 1, rz);
    beach.position.set(0, BEACH_TOP - 3, 0);
    beach.receiveShadow = true;
    this.group.add(beach);

    const land = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATEAU_K, PLATEAU_K + 0.1, 8, 64),
      this._std('#33352f', { roughness: 1 })
    );
    land.scale.set(rx, 1, rz);
    land.position.set(0, LAND_TOP - 4, 0);
    land.receiveShadow = true;
    this.group.add(land);

    // duas colinas escuras ao fundo (lado leste, longe do cais)
    const hillMat = this._std('#2f3158', { roughness: 1 });
    for (const [hx, hz, r] of [[9, 4, 5.5], [11, -4.5, 3.8]]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 10), hillMat);
      hill.scale.y = 0.5;
      hill.position.set(hx, LAND_TOP - 0.6, hz);
      this.group.add(hill);
    }
  }

  _buildTower() {
    const g = new THREE.Group();
    g.position.set(4, LAND_TOP, -1.5);

    const stone = this._std('#6b675f');
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.8, 10, 12), stone);
    tower.position.y = 5;
    g.add(tower);
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.7, 0.35, 12), this._std('#2b2a35'));
    gallery.position.y = 10.1;
    g.add(gallery);
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 1.7, 10),
      new THREE.MeshBasicMaterial({ color: '#ffe2a0' })
    );
    lantern.position.y = 11.1;
    g.add(lantern);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.25, 1.4, 10), this._std('#2b2a35'));
    top.position.y = 12.65;
    g.add(top);

    // a luz que nunca apaga: brilho fixo que só respira
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this._glowMap, color: '#ffd990', transparent: true, opacity: 0.5,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    glow.scale.setScalar(8);
    glow.position.y = 11.1;
    g.add(glow);
    this._glow = glow;

    const light = new THREE.PointLight('#ffd990', 1.2, 60, 1.6);
    light.position.y = 11.1;
    g.add(light);
    this._light = light;

    this.group.add(g);
  }

  _buildCabin() {
    // a cabana do avô: pequena, de tábuas escuras, porta virada para o cais (oeste)
    const g = new THREE.Group();
    g.position.set(-10.5, LAND_TOP, 2);
    g.rotation.y = Math.PI; // a fachada (+x local) passa a olhar para -X do mundo

    const d = 4;
    const l = 5;
    const h = 2.8;
    this._box(d, h, l, this._std('#4a3626'), 0, h / 2, 0, g);

    const roofShape = new THREE.Shape([
      new THREE.Vector2(-d / 2 - 0.4, 0), new THREE.Vector2(d / 2 + 0.4, 0), new THREE.Vector2(0, d * 0.4),
    ]);
    const roof = new THREE.Mesh(
      new THREE.ExtrudeGeometry(roofShape, { depth: l + 0.6, bevelEnabled: false }),
      this._std('#2a2420')
    );
    roof.position.set(0, h, -(l + 0.6) / 2);
    roof.castShadow = true;
    g.add(roof);

    const fx = d / 2 + 0.03;
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.0), this._std('#241710'));
    door.position.set(fx + 0.01, 1.0, -0.9);
    door.rotation.y = Math.PI / 2;
    g.add(door);
    const windowPane = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.8), new THREE.MeshBasicMaterial({ color: '#c9a35a' }));
    windowPane.position.set(fx + 0.01, 1.6, 1.1);
    windowPane.rotation.y = Math.PI / 2;
    g.add(windowPane);

    this.group.add(g);
  }

  _buildDock() {
    const wood = this._std('#5a3d25');
    const len = DOCK.x1 - DOCK.x0;
    const cx = (DOCK.x0 + DOCK.x1) / 2;
    this._box(len, 0.18, DOCK.w, wood, cx, DOCK.y, DOCK.z);
    for (const dz of [-1, 1]) this._box(len, 0.2, 0.14, this._std('#3d2a18'), cx, DOCK.y - 0.2, DOCK.z + dz * (DOCK.w / 2 - 0.1));
    // pilares do cais
    for (const x of [DOCK.x0 + 0.3, (DOCK.x0 + DOCK.x1) / 2, DOCK.x1 - 0.3]) {
      for (const dz of [-1, 1]) {
        const pile = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 2.6, 8), this._std('#2e1f12'));
        pile.position.set(x, DOCK.y - 1.2, DOCK.z + dz * (DOCK.w / 2 - 0.1));
        pile.castShadow = true;
        this.group.add(pile);
      }
    }
  }

  // ---------- API ----------

  /** Mostra/esconde a ilha (some até a história liberar). */
  setActive(active) {
    this.active = active;
    this.group.visible = active;
  }

  /** Onde o barco encosta para entrar na cabana (mundo). */
  getLanding() {
    return { x: this.x + DOCK.x0 - LANDING_GAP, z: this.z + DOCK.z, radius: LANDING_RADIUS };
  }

  /** Sólidos em coordenadas do mundo, no formato do BoatCollider. */
  getObstacles() {
    const half = DOCK.w / 2 + 0.2;
    return {
      boxes: [
        {
          minX: this.x + DOCK.x0,
          maxX: this.x + DOCK.x1,
          minZ: this.z + DOCK.z - half,
          maxZ: this.z + DOCK.z + half,
        },
      ],
      circles: [],
      ellipses: [lanternIslandConfig(this.x, this.z)],
    };
  }

  addTo(scene) {
    scene.add(this.group);
  }

  update(elapsed) {
    if (!this.active) return;
    const breath = Math.sin(elapsed * 1.1);
    if (this._glow) this._glow.material.opacity = 0.45 + 0.05 * breath;
    if (this._light) this._light.intensity = 1.2 + 0.15 * breath;
  }

  dispose() {
    this.group.traverse((child) => {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
      for (const material of materials) material.dispose();
    });
    this._glowMap.dispose();
    this.group.removeFromParent();
  }
}

export default LanternIsland;