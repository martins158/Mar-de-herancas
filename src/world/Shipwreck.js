// src/world/Shipwreck.js
import * as THREE from 'three';

/**
 * Shipwreck
 * O naufrágio do ESPERANÇA II: casco de madeira inclinado e meio afundado, costado
 * aberto com as cavernas à mostra, mastro quebrado pendendo para o lado, vela
 * rasgada, destroços e uma boia salva-vidas boiando em volta. No alto do mastro
 * pisca uma LUZ DE SOCORRO vermelha (três piscadas, pausa), com um facho fraco
 * que se vê de longe. Depois do resgate a luz apaga (setRescued).
 *
 * Só desenha e anima; quem decide quando aparece e quando foi resgatado é o
 * main.js (flags 'note-found' e 'dutra-rescued'). O aro de resgate é um ponto de
 * data/story.js (PointsOfInterest). O casco ainda NÃO tem colisão no BoatCollider.
 *
 * Uso:
 *   const wreck = new Shipwreck({ position: [250, 30], ocean });
 *   wreck.addTo(scene);
 *   wreck.setActive(gameState.hasFlag('note-found'));
 *   wreck.setRescued(gameState.hasFlag('dutra-rescued'));
 *   wreck.update(elapsed);          // todo frame
 *   wreck.dispose();
 */

const DEBRIS = [
  [5.5, 2.5, 1.8, 0.4], [-6, 3.5, 1.2, -0.9], [3.5, -6, 1.5, 1.2], [-4, -5, 1.0, 0.3], [7.5, -3, 1.3, -0.5],
]; // x, z, comprimento, giro

const mulberry = (a) => () => {
  a |= 0; a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

function nameTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#3d4a55';
  ctx.fillRect(0, 0, 512, 96);
  ctx.fillStyle = '#e6dcc0';
  ctx.font = 'bold 54px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('ESPERANÇA II', 256, 52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function glowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,170,150,1)');
  g.addColorStop(0.25, 'rgba(255,60,40,0.7)');
  g.addColorStop(1, 'rgba(255,40,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(canvas);
}

export class Shipwreck {
  constructor({ position, ocean = null }) {
    this.ocean = ocean;
    this.x = position[0];
    this.z = position[1];
    this.active = false;
    this.rescued = false;
    this._geometries = [];
    this._materials = [];
    this._textures = [];

    this.group = new THREE.Group();
    this.group.position.set(this.x, 0, this.z);
    this.group.visible = false;

    this.hull = new THREE.Group();
    this.hull.rotation.order = 'YXZ';
    this.hull.rotation.y = 0.5;
    this.group.add(this.hull);

    this._buildHull();
    this._buildMast();
    this._buildDebris();
    this._buildLight();
  }

  // ---------- construção ----------

  _mat(color, extra = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.95, ...extra });
    this._materials.push(m);
    return m;
  }

  _mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    this._geometries.push(geometry);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  _buildHull() {
    const hullMat = this._mat('#4a5a68');
    const wood = this._mat('#6f5338');
    const dark = this._mat('#33261a');

    this._mesh(new THREE.BoxGeometry(3.0, 0.5, 8.6), hullMat, this.hull, 0, -0.4, 0); // fundo
    this._mesh(new THREE.BoxGeometry(2.7, 0.12, 7.6), wood, this.hull, 0, 0.2, 0); // convés
    this._mesh(new THREE.BoxGeometry(0.28, 1.7, 8.0), hullMat, this.hull, -1.5, 0.45, 0); // costado inteiro (bombordo)
    this._mesh(new THREE.BoxGeometry(0.28, 1.5, 4.6), hullMat, this.hull, 1.5, 0.4, -1.8); // costado quebrado (boreste)
    this._mesh(new THREE.BoxGeometry(3.0, 1.9, 0.3), hullMat, this.hull, 0, 0.55, 4.2); // espelho de popa
    for (const side of [-1, 1]) {
      const bow = this._mesh(new THREE.BoxGeometry(0.28, 1.7, 3.6), hullMat, this.hull, side * 0.75, 0.45, -4.5);
      bow.rotation.y = -side * 0.36; // proa em V
    }

    // cavernas à mostra no lado aberto
    for (const [z, h] of [[0.9, 1.3], [1.9, 0.8], [2.9, 1.5], [3.6, 0.6]]) {
      const rib = this._mesh(new THREE.BoxGeometry(0.12, h, 0.14), dark, this.hull, 1.5, 0.2 + h / 2 - 0.3, z);
      rib.rotation.z = 0.12;
    }

    // nome no costado de bombordo
    const nameTex = nameTexture();
    this._textures.push(nameTex);
    const nameMat = new THREE.MeshBasicMaterial({ map: nameTex });
    this._materials.push(nameMat);
    const plate = this._mesh(new THREE.PlaneGeometry(3.4, 0.64), nameMat, this.hull, -1.65, 0.7, -0.4);
    plate.rotation.y = -Math.PI / 2;
    plate.castShadow = false;
  }

  _buildMast() {
    const wood = this._mat('#5b4129');
    const sailMat = this._mat('#d8cdb0', { side: THREE.DoubleSide });

    this.mast = new THREE.Group(); // tombado: caiu para boreste (o casco também está adernado)
    this.mast.position.set(0, 0.2, -1.2);
    this.mast.rotation.z = -1.1;
    this.hull.add(this.mast);
    this._mesh(new THREE.CylinderGeometry(0.13, 0.19, 6.4, 8), wood, this.mast, 0, 3.2, 0);

    // retranca pendurada e a vela rasgada
    const boom = this._mesh(new THREE.CylinderGeometry(0.08, 0.08, 4.2, 6), wood, this.mast, 0.2, 3.0, 0);
    boom.rotation.z = Math.PI / 2 + 0.25;
    const sailGeo = new THREE.PlaneGeometry(3.4, 3.2, 5, 5);
    const rand = mulberry(7);
    const pos = sailGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setZ(i, (rand() - 0.5) * 0.35);
      if (pos.getY(i) < -1.0) pos.setY(i, pos.getY(i) + (rand() - 0.5) * 0.6); // barra esfarrapada
    }
    pos.needsUpdate = true;
    sailGeo.computeVertexNormals();
    const sail = this._mesh(sailGeo, sailMat, this.mast, 0.35, 1.35, 0.05);
    sail.rotation.z = 0.1;
    sail.castShadow = false;
  }

  _buildDebris() {
    const wood = this._mat('#7a5a38');
    const ringMat = this._mat('#d9602a');
    this._debris = DEBRIS.map(([x, z, len, turn], i) => {
      const plank = this._mesh(new THREE.BoxGeometry(0.22, 0.08, len), wood, this.group, x, 0, z);
      plank.rotation.y = turn;
      return { mesh: plank, x, z, phase: i * 1.7 };
    });
    const ring = this._mesh(new THREE.TorusGeometry(0.38, 0.11, 8, 16), ringMat, this.group, -3.2, 0, 4.6); // boia salva-vidas
    ring.rotation.x = Math.PI / 2;
    this._debris.push({ mesh: ring, x: -3.2, z: 4.6, phase: 0.6 });
  }

  _buildLight() {
    const glowTex = glowTexture();
    this._textures.push(glowTex);
    this.glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
    );
    this.glow.scale.set(5, 5, 1);
    this.glow.position.set(0, 6.5, 0);
    this.mast.add(this.glow);
    this._materials.push(this.glow.material);

    this.light = new THREE.PointLight(0xff3a2a, 0, 45, 1.6);
    this.light.position.set(0, 6.5, 0);
    this.mast.add(this.light);

    // facho fraco e alto, para ser visto de longe
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0xff4a35, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
    });
    this._materials.push(beamMat);
    this.beam = this._mesh(new THREE.CylinderGeometry(0.6, 3, 90, 12, 1, true), beamMat, this.group, 0, 45, 0);
    this.beam.castShadow = false;
    this.beam.frustumCulled = false;
  }

  // ---------- estado ----------

  addTo(scene) {
    scene.add(this.group);
  }

  /** Mostra ou esconde o naufrágio (só aparece depois do bilhete do avô). */
  setActive(active) {
    this.active = active;
    this.group.visible = active;
  }

  /** Depois do resgate: a luz de socorro apaga. */
  setRescued(rescued) {
    this.rescued = rescued;
    if (rescued) {
      this.glow.material.opacity = 0;
      this.light.intensity = 0;
      this.beam.visible = false;
    } else {
      this.beam.visible = true;
    }
  }

  update(elapsed) {
    if (!this.active) return;

    const h = this.ocean ? this.ocean.getHeightAt(this.x, this.z) : 0;
    this.hull.position.y = h - 0.9 + Math.sin(elapsed * 0.8) * 0.12; // meio afundado
    this.hull.rotation.x = 0.16 + Math.sin(elapsed * 0.6) * 0.025;
    this.hull.rotation.z = 0.38 + Math.cos(elapsed * 0.5) * 0.03;

    for (const d of this._debris) {
      const y = this.ocean ? this.ocean.getHeightAt(this.x + d.x, this.z + d.z) : 0;
      d.mesh.position.y = y + 0.06 + Math.sin(elapsed * 1.4 + d.phase) * 0.05;
    }

    if (this.rescued) return;
    // três piscadas curtas e uma pausa (a cada 2,6 s)
    const t = elapsed % 2.6;
    const on = t < 0.2 || (t > 0.45 && t < 0.65) || (t > 0.9 && t < 1.1);
    const level = on ? 1 : 0.1;
    this.glow.material.opacity += (level - this.glow.material.opacity) * 0.35;
    this.light.intensity = this.glow.material.opacity * 3;
    this.beam.material.opacity = 0.05 + 0.1 * this.glow.material.opacity;
  }

  dispose() {
    for (const g of this._geometries) g.dispose();
    for (const m of this._materials) m.dispose();
    for (const t of this._textures) t.dispose();
    this.group.removeFromParent();
  }
}

export default Shipwreck;