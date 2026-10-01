// src/entities/Player.js
import * as THREE from 'three';

/**
 * Player
 * Barco rústico do jogador: casco de tábuas com proa fina, vela quadrada
 * remendada, bancos, leme, barril e lanterna. Tudo gerado por código (sem
 * assets externos). O input vem de fora, via InputSystem.
 *
 * Estrutura: `mesh` é o pivô (posição + giro; câmera, colisão e HUD usam
 * ele). Dentro dele fica `boat`, o visual, que boia e balança nas ondas
 * quando o Player recebe o `ocean`.
 *
 * Uso:
 *   const input = new InputSystem();
 *   const player = new Player({ input, ocean });
 *   player.addTo(scene);
 *
 *   // no loop de render:
 *   player.update(delta);
 */

// ---------------------------------------------------------------------------
// Forma do casco. Nível da água = y 0 (quilha abaixo, borda acima).
// t = 0 na proa (-Z) ... t = 1 na popa (+Z).
// ---------------------------------------------------------------------------
const HULL = { length: 6, beam: 1.3, floorY: 0.4, sectionPower: 0.75 };

const sheer = (t) => 0.95 + 0.65 * Math.pow(1 - t, 2.2) + 0.18 * Math.pow(t, 3); // altura da borda
const keel = (t) => -0.55 + 0.5 * Math.pow(1 - t, 2.5) + 0.2 * Math.pow(t, 3); // fundo do casco
const halfBeam = (t) => HULL.beam * Math.pow(Math.sin(Math.PI * 0.88 * t), 0.65); // meia-largura na borda
const hullZ = (t) => -HULL.length / 2 + t * HULL.length;

/** Meia-largura interna do casco na altura y (pro assoalho e os bancos encaixarem). */
function halfWidthAt(t, y) {
  const top = sheer(t);
  const depth = top - keel(t);
  const ratio = THREE.MathUtils.clamp((top - y) / depth, 0, 1);
  const a = Math.asin(Math.pow(ratio, 1 / HULL.sectionPower));
  return halfBeam(t) * Math.cos(a);
}

/** Ponto da seção do casco: a = 0 (borda de boreste) → π/2 (fundo) → π (borda de bombordo). */
function hullPoint(t, a) {
  const top = sheer(t);
  const depth = top - keel(t);
  return [
    halfBeam(t) * Math.cos(a),
    top - depth * Math.pow(Math.sin(a), HULL.sectionPower),
    hullZ(t),
  ];
}

function createHullGeometry(stations = 28, ring = 16) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    for (let j = 0; j <= ring; j++) {
      positions.push(...hullPoint(t, (j / ring) * Math.PI));
      uvs.push(t * 2, (j / ring) * 2);
    }
  }
  for (let i = 0; i < stations; i++) {
    for (let j = 0; j < ring; j++) {
      const a = i * (ring + 1) + j;
      const b = a + ring + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** Tampa da popa (espelho): fecha a ponta aberta do casco. */
function createTransomGeometry(ring = 16) {
  const shape = new THREE.Shape();
  for (let j = 0; j <= ring; j++) {
    const [x, y] = hullPoint(1, (j / ring) * Math.PI);
    if (j === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geometry = new THREE.ShapeGeometry(shape);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) * 0.6, pos.getY(i) * 0.6);
  geometry.translate(0, 0, HULL.length / 2);
  return geometry;
}

/** Assoalho de tábuas, acima da linha d'água. */
function createFloorGeometry(stations = 28) {
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let i = 0; i <= stations; i++) {
    const t = i / stations;
    const x = halfWidthAt(t, HULL.floorY) * 0.985;
    const z = hullZ(t);
    positions.push(-x, HULL.floorY, z, x, HULL.floorY, z);
    uvs.push(z * 0.7, -x, z * 0.7, x);
  }
  for (let i = 0; i < stations; i++) {
    const l0 = i * 2;
    indices.push(l0, l0 + 2, l0 + 1, l0 + 2, l0 + 3, l0 + 1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

// ---------------------------------------------------------------------------
// Texturas geradas em canvas
// ---------------------------------------------------------------------------
function createWoodTexture() {
  const size = 256;
  const bands = 4;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const bandH = size / bands;
  const tones = ['#7a5636', '#8a6340', '#6d4a2d', '#93693f'];

  for (let i = 0; i < bands; i++) {
    ctx.fillStyle = tones[i % tones.length];
    ctx.fillRect(0, i * bandH, size, bandH);

    // veios da madeira (começam e terminam na mesma altura pra repetir sem emenda)
    for (let g = 0; g < 26; g++) {
      const y = i * bandH + Math.random() * bandH;
      ctx.strokeStyle = `rgba(30, 18, 8, ${0.08 + Math.random() * 0.16})`;
      ctx.lineWidth = 0.6 + Math.random() * 1.2;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        size * 0.3, y + (Math.random() - 0.5) * 4,
        size * 0.7, y + (Math.random() - 0.5) * 4,
        size, y
      );
      ctx.stroke();
    }

    // junta entre tábuas + uma emenda de topo em posição aleatória
    ctx.fillStyle = 'rgba(15, 8, 3, 0.85)';
    ctx.fillRect(0, i * bandH, size, 2.5);
    ctx.fillRect(Math.random() * size, i * bandH, 2, bandH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createSailTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#d8c9a3';
  ctx.fillRect(0, 0, size, size);

  // trama do tecido
  ctx.strokeStyle = 'rgba(90, 70, 40, 0.07)';
  ctx.lineWidth = 1;
  for (let y = 0; y < size; y += 3) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }

  // costuras verticais entre os panos
  ctx.strokeStyle = 'rgba(70, 50, 25, 0.45)';
  ctx.setLineDash([5, 4]);
  for (let x = 64; x < size; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }

  // remendos
  const patches = [
    { x: 30, y: 40, w: 56, h: 46, c: '#bfa679' },
    { x: 150, y: 120, w: 62, h: 52, c: '#a8916a' },
    { x: 72, y: 170, w: 44, h: 50, c: '#c9b48a' },
  ];
  for (const p of patches) {
    ctx.setLineDash([]);
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = 'rgba(60, 40, 20, 0.7)';
    ctx.strokeRect(p.x + 3, p.y + 3, p.w - 6, p.h - 6);
  }

  // manchas de uso perto da borda de baixo
  ctx.setLineDash([]);
  const stain = ctx.createLinearGradient(0, size * 0.7, 0, size);
  stain.addColorStop(0, 'rgba(90, 65, 35, 0)');
  stain.addColorStop(1, 'rgba(90, 65, 35, 0.35)');
  ctx.fillStyle = stain;
  ctx.fillRect(0, size * 0.7, size, size * 0.3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Corda fina entre dois pontos. */
function createRope(from, to, material, radius = 0.02) {
  const dir = new THREE.Vector3().subVectors(to, from);
  const length = dir.length();
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 5), material);
  rope.position.copy(from).addScaledVector(dir, 0.5);
  rope.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return rope;
}

export class Player {
  constructor({
    position = new THREE.Vector3(0, 0, 0),
    speed = 12,      // unidades por segundo
    turnSpeed = 1.6, // radianos por segundo
    input = null,    // instância de InputSystem
    ocean = null,    // instância de Ocean: se vier, o barco boia e balança nas ondas
  } = {}) {
    this.speed = speed;
    this.turnSpeed = turnSpeed;
    this.input = input;
    this.ocean = ocean;

    this.mesh = new THREE.Group(); // pivô: posição + giro (yaw)
    this.mesh.position.copy(position);

    this.boat = Player.createBoatMesh(); // visual: sobe, desce e inclina com as ondas
    this.boat.position.y = -this.mesh.position.y; // começa com a linha d'água em y = 0
    this.mesh.add(this.boat);

    this._level = 0;
    this._forward = new THREE.Vector3();
  }

  static createBoatMesh() {
    const boat = new THREE.Group();

    const woodTexture = createWoodTexture();
    const sailTexture = createSailTexture();

    const planks = new THREE.MeshStandardMaterial({
      map: woodTexture,
      roughness: 0.92,
      side: THREE.DoubleSide,
    });
    const darkWood = new THREE.MeshStandardMaterial({ color: 0x4a2f1a, roughness: 0.9 });
    const lightWood = new THREE.MeshStandardMaterial({ color: 0x8a6a45, roughness: 0.9 });
    const ropeMaterial = new THREE.MeshStandardMaterial({ color: 0xb59b6b, roughness: 1 });

    // casco, tampa da popa e assoalho
    boat.add(new THREE.Mesh(createHullGeometry(), planks));
    boat.add(new THREE.Mesh(createTransomGeometry(), planks));
    boat.add(new THREE.Mesh(createFloorGeometry(), planks));

    // borda superior (fica grossa como um capitel de madeira)
    const railPoints = [];
    const stations = 28;
    for (let i = 0; i <= stations; i++) {
      const t = i / stations;
      railPoints.push(new THREE.Vector3(halfBeam(t), sheer(t), hullZ(t)));
    }
    railPoints.push(new THREE.Vector3(0, sheer(1) + 0.03, HULL.length / 2));
    for (let i = stations; i >= 1; i--) {
      const t = i / stations;
      railPoints.push(new THREE.Vector3(-halfBeam(t), sheer(t), hullZ(t)));
    }
    const railCurve = new THREE.CatmullRomCurve3(railPoints, true, 'centripetal');
    boat.add(new THREE.Mesh(new THREE.TubeGeometry(railCurve, 140, 0.065, 6, true), darkWood));

    // bancos
    for (const t of [0.42, 0.72]) {
      const y = 0.85;
      const width = halfWidthAt(t, y) * 2 * 0.97;
      const bench = new THREE.Mesh(new THREE.BoxGeometry(width, 0.07, 0.3), lightWood);
      bench.position.set(0, y, hullZ(t));
      boat.add(bench);
    }

    // mastro, verga e bandeirola
    const mastZ = -1.3;
    const mastTop = HULL.floorY + 4.8;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.085, 4.8, 8), darkWood);
    mast.position.set(0, HULL.floorY + 2.4, mastZ);
    boat.add(mast);

    const yardY = 4.55;
    const yard = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 3.5, 6), darkWood);
    yard.rotation.z = Math.PI / 2 + 0.04; // levemente torta, de propósito
    yard.position.set(0, yardY, mastZ);
    boat.add(yard);

    const pennantShape = new THREE.Shape();
    pennantShape.moveTo(0, 0);
    pennantShape.lineTo(0.7, -0.08);
    pennantShape.lineTo(0, -0.28);
    pennantShape.closePath();
    const pennant = new THREE.Mesh(
      new THREE.ShapeGeometry(pennantShape),
      new THREE.MeshStandardMaterial({ color: 0xa63d2f, roughness: 0.9, side: THREE.DoubleSide })
    );
    pennant.position.set(0, mastTop - 0.05, mastZ);
    pennant.rotation.y = Math.PI / 2; // estica pra frente (-Z)
    boat.add(pennant);

    // vela quadrada com barriga (infla pra frente); brilha um pouco contra a luz
    const sailWidth = 3.1;
    const sailHeight = 2.6;
    const sailGeometry = new THREE.PlaneGeometry(sailWidth, sailHeight, 14, 10);
    const sp = sailGeometry.attributes.position;
    for (let i = 0; i < sp.count; i++) {
      const nx = sp.getX(i) / (sailWidth / 2);
      const ny = (sp.getY(i) + sailHeight / 2) / sailHeight;
      sp.setZ(i, -0.45 * (1 - nx * nx) * Math.pow(Math.sin(Math.PI * ny), 0.8));
    }
    sailGeometry.computeVertexNormals();
    const sail = new THREE.Mesh(
      sailGeometry,
      new THREE.MeshStandardMaterial({
        map: sailTexture,
        roughness: 0.95,
        side: THREE.DoubleSide,
        emissive: 0xffffff,
        emissiveMap: sailTexture,
        emissiveIntensity: 0.3,
      })
    );
    sail.position.set(0, yardY - sailHeight / 2, mastZ + 0.1);
    boat.add(sail);

    // cordame: estai da proa, estai da popa e dois brandais
    const tMast = (mastZ + HULL.length / 2) / HULL.length;
    boat.add(createRope(
      new THREE.Vector3(0, mastTop - 0.05, mastZ),
      new THREE.Vector3(0, sheer(0), hullZ(0)),
      ropeMaterial
    ));
    boat.add(createRope(
      new THREE.Vector3(0, mastTop - 0.05, mastZ),
      new THREE.Vector3(0, sheer(1), hullZ(1)),
      ropeMaterial
    ));
    for (const side of [-1, 1]) {
      boat.add(createRope(
        new THREE.Vector3(0, 3.4, mastZ),
        new THREE.Vector3(side * halfBeam(tMast) * 0.97, sheer(tMast), mastZ),
        ropeMaterial
      ));
    }

    // leme e cana do leme na popa
    const rudder = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.3, 0.55), darkWood);
    rudder.position.set(0, 0.5, HULL.length / 2 + 0.28);
    boat.add(rudder);

    const tiller = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.5), darkWood);
    tiller.position.set(0, sheer(1) + 0.08, 2.3);
    tiller.rotation.x = -0.05;
    boat.add(tiller);

    // lanterna na proa
    const lanternPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.4, 6), darkWood);
    lanternPost.position.set(0, sheer(0) + 0.15, hullZ(0) + 0.05);
    boat.add(lanternPost);

    const lantern = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.2, 0.16),
      new THREE.MeshStandardMaterial({
        color: 0xffc46b,
        emissive: 0xff9a2e,
        emissiveIntensity: 1.4,
        roughness: 0.6,
      })
    );
    lantern.position.set(0, sheer(0) + 0.45, hullZ(0) + 0.05);
    boat.add(lantern);

    // barril (com aros de ferro) e caixote no convés
    const barrelProfile = [
      [0, 0], [0.2, 0], [0.26, 0.12], [0.29, 0.3], [0.26, 0.48], [0.2, 0.6], [0, 0.6],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const barrel = new THREE.Mesh(
      new THREE.LatheGeometry(barrelProfile, 14),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.9 })
    );
    barrel.position.set(-0.55, HULL.floorY, 1.9);
    boat.add(barrel);

    const hoopMaterial = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6, metalness: 0.5 });
    for (const y of [0.15, 0.45]) {
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.268, 0.018, 6, 16), hoopMaterial);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(-0.55, HULL.floorY + y, 1.9);
      boat.add(hoop);
    }

    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), lightWood);
    crate.position.set(0.55, HULL.floorY + 0.225, 2.2);
    crate.rotation.y = 0.4;
    boat.add(crate);

    boat.traverse((obj) => {
      if (obj.isMesh) obj.castShadow = true;
    });

    return boat;
  }

  /** Chame a cada frame, passando o delta time em segundos. */
  update(delta) {
    let turnAxis = 0;

    if (this.input) {
      turnAxis = this.input.getTurnAxis();
      if (turnAxis !== 0) {
        this.mesh.rotation.y += turnAxis * this.turnSpeed * delta;
      }

      const moveAxis = this.input.getMoveAxis();
      if (moveAxis !== 0) {
        this._forward
          .set(0, 0, -1)
          .applyQuaternion(this.mesh.quaternion)
          .multiplyScalar(moveAxis * this.speed * delta);
        this.mesh.position.add(this._forward);
      }
    }

    this._updateBuoyancy(delta, turnAxis);
  }

  /** Faz o visual do barco acompanhar a altura e a inclinação da água. */
  _updateBuoyancy(delta, turnAxis) {
    const smooth = 1 - Math.exp(-5 * delta);
    let level = 0;
    let pitch = 0;
    let roll = 0;

    if (this.ocean) {
      const { x, z } = this.mesh.position;
      const yaw = this.mesh.rotation.y;
      const fx = -Math.sin(yaw); // frente
      const fz = -Math.cos(yaw);
      const rx = Math.cos(yaw); // boreste (direita)
      const rz = -Math.sin(yaw);
      const halfLength = 2.4;
      const halfWidth = 1.1;
      const h = (px, pz) => this.ocean.getHeightAt(px, pz);

      const bow = h(x + fx * halfLength, z + fz * halfLength);
      const stern = h(x - fx * halfLength, z - fz * halfLength);
      const right = h(x + rx * halfWidth, z + rz * halfWidth);
      const left = h(x - rx * halfWidth, z - rz * halfWidth);

      level = (h(x, z) + bow + stern + right + left) / 5;
      pitch = Math.atan2(bow - stern, halfLength * 2); // proa sobe = positivo
      roll = Math.atan2(right - left, halfWidth * 2);  // boreste sobe = positivo
    }
    roll -= turnAxis * 0.06; // inclina um pouco pra fora nas curvas

    this._level += (level - this._level) * smooth;
    this.boat.rotation.x += (pitch - this.boat.rotation.x) * smooth;
    this.boat.rotation.z += (roll - this.boat.rotation.z) * smooth;
    this.boat.position.y = this._level - this.mesh.position.y;
  }

  addTo(scene) {
    scene.add(this.mesh);
  }

  // Input não é escutado aqui — quem cria/destrói o InputSystem chama input.dispose().
  dispose() {
    this.boat.traverse((obj) => {
      if (!obj.isMesh) return;
      obj.geometry.dispose();
      obj.material.map?.dispose();
      obj.material.emissiveMap?.dispose();
      obj.material.dispose();
    });
  }
}

export default Player;