// src/world/HarborPier3D.js
import * as THREE from 'three';

/**
 * HarborPier3D
 * O mesmo porto do início, agora em 3D, para o barco nascer "perto de casa":
 * um cais de tábuas e pilares, lampiões acesos, caixotes e barris, dois cascos
 * apodrecendo na água, a vila (as mesmas casas e cores do porto 2D) em terra
 * firme à esquerda e o farol com seu feixe de luz girando ao longe.
 *
 * Layout (o barco nasce em (0, 0.6, 0), olhando para -Z):
 *   - o cais sai da praia (x = -34) e acaba em x = -4, a ~4 m do barco;
 *   - a terra é uma ILHA OVAL pequena a oeste do cais (ISLAND_L); a vila, as
 *     colinas (as "grandes rochas") e o farol ficam dentro dela.
 * O porto inteiro é escalado por HARBOR_SCALE em torno do fim do cais (o fim do
 * cais continua a ~4 m do barco; o resto encolhe). Os sólidos (terra, cais com
 * pilares e os dois cascos velhos) saem de getObstacles(), já em coordenadas do
 * mundo, para o BoatCollider.
 *
 * Uso:
 *   const pier = new HarborPier3D();
 *   pier.addTo(scene);
 *   pier.update(elapsed);   // chama no loop (farol girando, lampiões tremulando)
 *   collider.addObstacles(pier.getObstacles());
 *   pier.dispose();
 */

const DECK_Y = 3.4; // altura do convés (local; com a escala 0,6 fica ~2 m acima da água)
const PIER_X0 = -36;
const PIER_X1 = -4;
const PIER_Z = -3;
const PIER_W = 3.2;
const LAND_TOP = 4.0; // topo da ilha (local): acima das cristas mesmo sem amortecimento
const BEACH_TOP = 1.0; // praia quase ao nível da água

/** Quanto o porto encolhe (1 = tamanho original). O fim do cais fica no lugar. */
export const HARBOR_SCALE = 0.6;
const PIVOT_X = PIER_X1;
const PIVOT_Z = PIER_Z;

// ilha oval, em coordenadas locais (antes da escala): centro e semieixos
const ISLAND_L = { x: -82, z: -13, rx: 50, rz: 33 };
const SAND_K = 1.12; // a praia é a elipse da ilha x 1,12
const PLATEAU_K = 0.93; // o platô (onde ficam as casas) é x 0,93
const HOUSE_K = 0.8; // casas menores que as originais

// sólidos, em coordenadas locais (antes da escala)
const PIER_BOX = {
  minX: PIER_X0,
  maxX: PIER_X1 + 0.5,
  minZ: PIER_Z - (PIER_W / 2 + 0.3), // inclui os pilares das bordas
  maxZ: PIER_Z + (PIER_W / 2 + 0.3),
};
const WRECKS = [
  { x: -16, z: -10, yaw: 0.35 },
  { x: -24, z: 7, yaw: -0.2 },
];

/** Gerador pseudoaleatório determinístico (o cenário é sempre igual). */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function woodTexture(base, grain, seed) {
  const rng = makeRng(seed);
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 64, 128);
  ctx.fillStyle = grain;
  for (let i = 0; i < 26; i++) {
    ctx.globalAlpha = 0.15 + rng() * 0.35;
    ctx.fillRect(Math.floor(rng() * 64), 0, 1 + Math.floor(rng() * 2), 128);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#2a1a0e'; // pregos
  ctx.fillRect(10, 8, 3, 3);
  ctx.fillRect(50, 8, 3, 3);
  ctx.fillRect(10, 117, 3, 3);
  ctx.fillRect(50, 117, 3, 3);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
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

export class HarborPier3D {
  constructor() {
    this.group = new THREE.Group();
    this._glows = []; // { material, base, phase }
    this._beam = null;
    this._rng = makeRng(1847);

    this._glowMap = glowTexture();
    this._plankMats = [
      new THREE.MeshStandardMaterial({ map: woodTexture('#85593a', '#5a3a22', 1), roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ map: woodTexture('#6d4a2b', '#47301c', 2), roughness: 0.95 }),
      new THREE.MeshStandardMaterial({ map: woodTexture('#7a5233', '#4f331d', 3), roughness: 0.95 }),
    ];
    this._darkWood = new THREE.MeshStandardMaterial({ color: '#3d2a18', roughness: 1 });
    this._beamWood = new THREE.MeshStandardMaterial({ color: '#2e1f12', roughness: 1 });

    this._buildLand();
    this._buildPier();
    this._buildProps();
    this._buildLamps();
    this._buildWrecks();
    this._buildVillage();
    this._buildLighthouse();

    // encolhe o porto em torno do fim do cais (a água fica em y = 0)
    this.group.scale.setScalar(HARBOR_SCALE);
    this.group.position.set(PIVOT_X * (1 - HARBOR_SCALE), 0, PIVOT_Z * (1 - HARBOR_SCALE));
  }

  // ---------- helpers ----------

  _box(w, h, d, material, x, y, z, parent = this.group) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  _std(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.95, ...extra });
  }

  // ---------- construção ----------

  _buildLand() {
    const { x, z, rx, rz } = ISLAND_L;

    // praia de areia, quase ao nível da água, em volta do platô
    const beach = new THREE.Mesh(
      new THREE.CylinderGeometry(SAND_K, SAND_K + 0.1, 6, 72),
      this._std('#8d7a5a', { roughness: 1 })
    );
    beach.scale.set(rx, 1, rz);
    beach.position.set(x, BEACH_TOP - 3, z);
    beach.receiveShadow = true;
    this.group.add(beach);

    // platô da ilha (oval)
    const land = new THREE.Mesh(
      new THREE.CylinderGeometry(PLATEAU_K, PLATEAU_K + 0.1, 8, 72),
      this._std('#3d3a33', { roughness: 1 })
    );
    land.scale.set(rx, 1, rz);
    land.position.set(x, LAND_TOP - 4, z);
    land.receiveShadow = true;
    this.group.add(land);

    // as grandes colinas escuras ao fundo (menores e dentro da ilha)
    const hillMat = this._std('#3b3d66', { roughness: 1 });
    for (const [hx, hz, r] of [[-112, 4, 18], [-116, -22, 13], [-98, 14, 9]]) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10), hillMat);
      hill.scale.y = 0.45;
      hill.position.set(hx, LAND_TOP - 2, hz);
      this.group.add(hill);
    }
  }

  _buildPier() {
    const length = PIER_X1 - PIER_X0;
    const cx = (PIER_X0 + PIER_X1) / 2;

    // tábuas do convés (cada uma um pouco diferente, como as do porto 2D)
    const step = 0.58;
    for (let x = PIER_X0 + 0.3, i = 0; x < PIER_X1; x += step, i++) {
      const mat = this._plankMats[Math.floor(this._rng() * this._plankMats.length)];
      const plank = this._box(0.5, 0.14, PIER_W, mat, x, DECK_Y - 0.07 + (this._rng() - 0.5) * 0.03, PIER_Z);
      plank.rotation.y = (this._rng() - 0.5) * 0.03;
      plank.receiveShadow = true;
    }

    // longarinas e vigas transversais sob o convés
    for (const dz of [-(PIER_W / 2 - 0.2), 0, PIER_W / 2 - 0.2]) {
      this._box(length, 0.22, 0.26, this._beamWood, cx, DECK_Y - 0.28, PIER_Z + dz);
    }
    for (let x = PIER_X0 + 1; x <= PIER_X1; x += 3) {
      this._box(0.3, 0.26, PIER_W + 0.5, this._beamWood, x, DECK_Y - 0.55, PIER_Z);
    }

    // pilares: sobem acima do convés de dois em dois (postes de amarração)
    const rng = this._rng;
    const pile = (x, z, top) => {
      const height = top + 4;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, height, 8), this._darkWood);
      mesh.position.set(x, top - height / 2, z);
      mesh.rotation.z = (rng() - 0.5) * 0.04;
      mesh.castShadow = true;
      this.group.add(mesh);
    };
    let i = 0;
    for (let x = PIER_X0 + 1; x <= PIER_X1; x += 4, i++) {
      for (const side of [-1, 1]) {
        const top = i % 2 === 0 ? DECK_Y + 0.4 : DECK_Y - 0.3;
        pile(x, PIER_Z + side * (PIER_W / 2 + 0.05), top);
      }
    }

    // poste de amarração no fim do cais (o mesmo do porto 2D)
    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, 0.7, 10), this._std('#2b2622'));
    bollard.position.set(PIER_X1 - 0.5, DECK_Y + 0.35, PIER_Z);
    this.group.add(bollard);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.28, 0.16, 10), this._std('#2b2622'));
    cap.position.set(PIER_X1 - 0.5, DECK_Y + 0.75, PIER_Z);
    this.group.add(cap);
  }

  _buildProps() {
    const crateMat = this._std('#8a6238');
    const crateBand = this._std('#4a3220');
    const crate = (x, y, z) => {
      const c = this._box(1.4, 1.4, 1.4, crateMat, x, y + 0.7, z);
      // cintas escuras nas bordas
      this._box(1.44, 0.1, 1.44, crateBand, x, y + 0.14, z);
      this._box(1.44, 0.1, 1.44, crateBand, x, y + 1.26, z);
      return c;
    };
    crate(-12, DECK_Y, PIER_Z + 0.5);
    crate(-10.5, DECK_Y, PIER_Z + 0.2);
    crate(-11.3, DECK_Y + 1.4, PIER_Z + 0.4).rotation.y = 0.2;

    const barrelMat = this._std('#6b4a2f');
    const hoop = this._std('#2e2018');
    const barrel = (x, z) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.4, 12), barrelMat);
      b.position.set(x, DECK_Y + 0.7, z);
      b.castShadow = true;
      this.group.add(b);
      for (const dy of [-0.35, 0.35]) {
        const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.53, 0.53, 0.1, 12), hoop);
        ring.position.set(x, DECK_Y + 0.7 + dy, z);
        this.group.add(ring);
      }
    };
    barrel(-22, PIER_Z - 0.6);
    barrel(-8, PIER_Z - 0.7);
    barrel(-6.6, PIER_Z + 0.5);

    // rolo de corda perto do fim do cais
    const rope = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.1, 8, 16), this._std('#b59b6a'));
    rope.rotation.x = Math.PI / 2;
    rope.position.set(-5.4, DECK_Y + 0.1, PIER_Z + 0.9);
    this.group.add(rope);
  }

  _buildLamps() {
    const pole = this._std('#2b2622');
    const flame = new THREE.MeshBasicMaterial({ color: '#ffcf70' });
    const xs = [-30, -22, -14, -7];

    xs.forEach((x, i) => {
      const z = PIER_Z - PIER_W / 2 + 0.15;
      this._box(0.12, 3.4, 0.12, pole, x, DECK_Y + 1.7, z);
      this._box(0.5, 0.1, 0.5, pole, x, DECK_Y + 3.45, z);
      this._box(0.34, 0.4, 0.34, flame, x, DECK_Y + 3.25, z).castShadow = false;

      const glow = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: this._glowMap, color: '#ffb85c', transparent: true, opacity: 0.55,
          depthWrite: false, blending: THREE.AdditiveBlending,
        })
      );
      glow.position.set(x, DECK_Y + 3.25, z);
      glow.scale.setScalar(4.2);
      this.group.add(glow);
      this._glows.push({ material: glow.material, base: 0.5, phase: i * 2.1 });
    });

    // um ponto de luz quente perto do barco (ilumina o convés e o casco)
    const light = new THREE.PointLight('#ffb55a', 28, 26, 2);
    light.position.set(-7, DECK_Y + 3.2, PIER_Z - PIER_W / 2 + 0.15);
    this.group.add(light);
  }

  /** Dois cascos apodrecendo na água ("barcos que o porto afunda devagar"). */
  _buildWrecks() {
    const hullMat = this._std('#4a3220');
    const ribMat = this._std('#35261a');

    const wreck = (x, z, yaw, roll) => {
      const g = new THREE.Group();
      const profile = new THREE.Shape([
        new THREE.Vector2(-3.2, 0.9), new THREE.Vector2(3.4, 1.2),
        new THREE.Vector2(2.6, -0.6), new THREE.Vector2(-2.6, -0.6),
      ]);
      const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(profile, { depth: 1.8, bevelEnabled: false }), hullMat);
      hull.position.z = -0.9;
      hull.castShadow = true;
      g.add(hull);

      // costelas e mastro quebrado saindo do casco
      for (let i = -2; i <= 2; i++) {
        const rib = this._box(0.12, 1.5, 0.12, ribMat, i * 1.15, 1.45, i % 2 ? 0.7 : -0.7, g);
        rib.rotation.z = (this._rng() - 0.5) * 0.25;
      }
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 3.2, 6), ribMat);
      mast.position.set(0.4, 2.2, 0);
      mast.rotation.z = -0.35;
      g.add(mast);

      g.position.set(x, -0.15, z);
      g.rotation.set(0, yaw, roll);
      this.group.add(g);
    };
    wreck(WRECKS[0].x, WRECKS[0].z, WRECKS[0].yaw, 0.22);
    wreck(WRECKS[1].x, WRECKS[1].z, WRECKS[1].yaw, -0.18);
  }

  _buildVillage() {
    // as mesmas casas e cores do porto 2D, de frente para o mar (porta virada para +x)
    // fileira da frente (voltada para o mar) e fileira de trás, mais para dentro da ilha
    const base = [
      { row: 0, z: -31, d: 6, l: 7.5, h: 5, wall: '#a8734f', roof: '#4a2f2a' },
      { row: 0, z: -20, d: 6, l: 7, h: 6.2, wall: '#7d8fa3', roof: '#35404f' },
      { row: 0, z: -10, d: 5, l: 6, h: 4.4, wall: '#c29a5b', roof: '#5a3a2e' },
      { row: 0, z: 6, d: 5.5, l: 6, h: 4, wall: '#9a8f7a', roof: '#4a2f2a' },
      { row: 1, z: -26, d: 5, l: 6.5, h: 4.6, wall: '#6f7f6a', roof: '#3a2f2a' },
      { row: 1, z: -4, d: 5.5, l: 7, h: 5.2, wall: '#b08a6a', roof: '#4a3a30' },
    ];
    // a fachada fica a 2,5 da borda leste do platô, medida nas DUAS pontas da casa
    // (a elipse curva para dentro: assim nenhum canto sai da terra)
    const { x: cx, z: cz, rx, rz } = ISLAND_L;
    const edgeX = (zz) => cx + PLATEAU_K * rx * Math.sqrt(Math.max(0, 1 - ((zz - cz) / (PLATEAU_K * rz)) ** 2));
    const houses = base.map((h) => {
      const d = h.d * HOUSE_K;
      const l = h.l * HOUSE_K;
      const edge = Math.min(edgeX(h.z - l / 2), edgeX(h.z + l / 2));
      const front = edge - 2.5 - d / 2;
      return { ...h, d, l, h: h.h * HOUSE_K, x: h.row === 0 ? front : front - 13 };
    });
    HarborPier3D._houses = houses; // (só para teste/inspeção)

    const beam = this._std('#3b2a20');
    const windowMat = new THREE.MeshBasicMaterial({ color: '#ffd47a' });
    const doorMat = this._std('#3a2418');

    for (const hs of houses) {
      const g = new THREE.Group();
      g.position.set(hs.x, LAND_TOP, hs.z);

      this._box(hs.d, hs.h, hs.l, this._std(hs.wall), 0, hs.h / 2, 0, g);

      // telhado: prisma triangular com a cumeeira ao longo de z
      const roofShape = new THREE.Shape([
        new THREE.Vector2(-hs.d / 2 - 0.5, 0), new THREE.Vector2(hs.d / 2 + 0.5, 0),
        new THREE.Vector2(0, hs.d * 0.4),
      ]);
      const roof = new THREE.Mesh(
        new THREE.ExtrudeGeometry(roofShape, { depth: hs.l + 0.8, bevelEnabled: false }),
        this._std(hs.roof)
      );
      roof.position.set(0, hs.h, -(hs.l + 0.8) / 2);
      roof.castShadow = true;
      g.add(roof);

      // fachada (+x): vigas estilo enxaimel, porta e janelas acesas
      const fx = hs.d / 2 + 0.03;
      this._box(0.1, 0.18, hs.l, beam, fx, hs.h * 0.5, 0, g);
      for (const dz of [-1, 1]) this._box(0.1, hs.h, 0.18, beam, fx, hs.h / 2, dz * (hs.l / 2 - 0.09), g);

      const cols = Math.max(1, Math.round(hs.l / 3));
      const span = hs.l / cols;
      for (let i = 0; i < cols; i++) {
        const wz = -hs.l / 2 + (i + 0.5) * span;
        if (i === 0) {
          const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), doorMat);
          door.position.set(fx + 0.01, 1.1, wz);
          door.rotation.y = Math.PI / 2;
          g.add(door);
        } else {
          const low = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), windowMat);
          low.position.set(fx + 0.01, hs.h * 0.3, wz);
          low.rotation.y = Math.PI / 2;
          g.add(low);
        }
        const high = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.9), windowMat);
        high.position.set(fx + 0.01, hs.h * 0.72, wz);
        high.rotation.y = Math.PI / 2;
        g.add(high);
      }
      this.group.add(g);
    }
  }

  _buildLighthouse() {
    const g = new THREE.Group();
    g.position.set(-96, LAND_TOP, -34);
    g.scale.setScalar(0.8);

    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.5, 16, 14), this._std('#e8e0d0'));
    tower.position.y = 8;
    g.add(tower);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 2.1, 4, 14), this._std('#b5473a'));
    band.position.y = 8;
    g.add(band);
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.4, 14), this._std('#2b2a35'));
    gallery.position.y = 16.2;
    g.add(gallery);
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.2, 2.2, 12),
      new THREE.MeshBasicMaterial({ color: '#ffd47a' })
    );
    lantern.position.y = 17.5;
    g.add(lantern);
    const top = new THREE.Mesh(new THREE.ConeGeometry(1.7, 1.8, 12), this._std('#b5473a'));
    top.position.y = 19.5;
    g.add(top);

    // feixe de luz que gira devagar
    const beamGeo = new THREE.ConeGeometry(5, 80, 16, 1, true);
    beamGeo.translate(0, -40, 0); // ponta na lanterna
    beamGeo.rotateZ(Math.PI / 2); // aponta para +x
    const beam = new THREE.Mesh(
      beamGeo,
      new THREE.MeshBasicMaterial({
        color: '#ffe9b0', transparent: true, opacity: 0.13, side: THREE.DoubleSide,
        depthWrite: false, blending: THREE.AdditiveBlending,
      })
    );
    this._beam = new THREE.Group();
    this._beam.position.y = 17.5;
    this._beam.add(beam);
    g.add(this._beam);

    this.group.add(g);
  }

  // ---------- API ----------

  /**
   * Sólidos do porto em coordenadas do mundo (já com a escala), no plano XZ:
   * { boxes: [{ minX, maxX, minZ, maxZ }], circles: [{ x, z, r }], ellipses: [{ x, z, rx, rz }] }
   */
  getObstacles() {
    const toX = (x) => PIVOT_X + (x - PIVOT_X) * HARBOR_SCALE;
    const toZ = (z) => PIVOT_Z + (z - PIVOT_Z) * HARBOR_SCALE;
    const box = (b) => ({ minX: toX(b.minX), maxX: toX(b.maxX), minZ: toZ(b.minZ), maxZ: toZ(b.maxZ) });

    const circles = [];
    for (const w of WRECKS) {
      // o casco tem ~6,6 de comprimento ao longo do eixo local x: uma fileira de círculos cobre ele
      for (const t of [-2.4, -0.8, 0.8, 2.4]) {
        circles.push({
          x: toX(w.x + t * Math.cos(w.yaw)),
          z: toZ(w.z - t * Math.sin(w.yaw)),
          r: 1.15 * HARBOR_SCALE,
        });
      }
    }
    return { boxes: [box(PIER_BOX)], circles, ellipses: [HarborPier3D.ISLAND_CONFIG] };
  }

  addTo(scene) {
    scene.add(this.group);
  }

  update(elapsed) {
    if (this._beam) this._beam.rotation.y = elapsed * 0.35;
    for (const glow of this._glows) {
      glow.material.opacity = glow.base + 0.08 * Math.sin(elapsed * 3 + glow.phase);
    }
  }

  dispose() {
    this.group.traverse((child) => {
      child.geometry?.dispose();
      const materials = Array.isArray(child.material) ? child.material : child.material ? [child.material] : [];
      for (const material of materials) {
        material.map?.dispose();
        material.dispose();
      }
    });
    this._glowMap.dispose();
    this.group.removeFromParent();
  }
}

/**
 * Elipse da ilha em coordenadas do MUNDO (praia incluída), já com a escala.
 * Usada na colisão do barco e para acalmar as ondas perto da costa
 * (new Ocean({ island: HarborPier3D.ISLAND_CONFIG })). `fall` = a quantos raios
 * da ilha o mar volta a ter 100% das ondas.
 */
HarborPier3D.ISLAND_CONFIG = {
  x: PIVOT_X + (ISLAND_L.x - PIVOT_X) * HARBOR_SCALE,
  z: PIVOT_Z + (ISLAND_L.z - PIVOT_Z) * HARBOR_SCALE,
  rx: ISLAND_L.rx * SAND_K * HARBOR_SCALE,
  rz: ISLAND_L.rz * SAND_K * HARBOR_SCALE,
  fall: 2.5,
};

export default HarborPier3D;