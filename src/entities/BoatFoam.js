// src/entities/BoatFoam.js
import * as THREE from 'three';

/**
 * BoatFoam
 * Espuma na água em volta do barco INTEIRO, em três camadas:
 *   1. COLAR: uma faixa de espuma colada na linha d'água, contornando o casco todo
 *      (proa, os dois bordos, as alhetas e o espelho de popa). Parado ela é fina e discreta
 *      (a água batendo no casco); andando, engorda na proa (onda de proa), nos bordos e na
 *      popa, e a textura escorre para trás. O bordo que mergulha ao tombar engrossa muito.
 *   2. MANCHAS: bolhas soltas que ficam no mundo, nascem no casco e se espalham:
 *        - ESTEIRA na popa (faixa central + braços em V), só indo para frente;
 *        - ALHETAS: ao longo dos dois flancos enquanto o barco anda (a espuma desliza
 *          pelo casco e se junta à esteira);
 *        - LADOS ao tombar: o bordo que mergulha solta mais.
 *   3. As manchas acompanham as ondas e somem sozinhas; formam o rastro atrás do barco.
 *
 * A textura é gerada em canvas (bolhas e fios). Para usar a sua, passe `textureUrl`: PNG
 * branco com fundo transparente OU branco sobre preto, de preferência que repita bem
 * (a mesma imagem serve para as manchas e para o colar).
 *
 * Uso:
 *   const foam = new BoatFoam({ ocean, textureUrl: '/textures/water_foam.png', hullHalfWidth, hullLength });
 *   foam.addTo(scene);
 *   foam.update(delta, boat.position, boat.rotation.y, roll);   // a cada frame
 *   foam.clear();    // teleporte (o barco voltou ao início): o próprio update também detecta
 *   foam.dispose();
 *
 * Convenções (as do jogo): proa = −Z, popa = +Z, boreste = +X; roll > 0 = boreste sobe
 * (então é o bombordo, −X, que mergulha).
 */

/** Tudo que se ajusta a olho fica aqui. */
export const FOAM = {
  max: 320, // manchas vivas ao mesmo tempo
  lift: 0.22, // sobe um pouco acima da água (as cristas do shader são mais pontudas que a malha)
  teleport: 6, // se o barco andar mais que isso (u) num único quadro, foi teleporte: limpa
  collar: {
    base: 0.3, // força da espuma com o barco parado (0..1)
    speed: 0.35, // quanto a velocidade soma nos bordos
    bow: 0.55, // soma na proa (onda de proa), com velocidade
    stern: 0.5, // soma na popa/espelho, com velocidade
    dip: 0.9, // soma no bordo que mergulha ao tombar
    inset: 0.05, // a faixa começa um pouco para dentro do casco (esconde a emenda)
    minWidth: 0.3, // largura mínima para fora do casco (u)
    width: 0.5, // largura extra com a força da espuma
    bowWidth: 0.4, // alarga na proa com velocidade
    flow: 0.12, // velocidade da textura parado (voltas/s)
    flowSpeed: 0.05, // idem, a mais por u/s de velocidade
    tile: 2, // comprimento (u) que uma repetição da textura cobre
  },
  wake: {
    minSpeed: 1.2, // u/s para frente: abaixo disso não há esteira nem alhetas
    fullSpeed: 8, // u/s em que a espuma chega à força total
    mainSpacing: 0.6, // distância (u) entre manchas da faixa central
    armSpacing: 0.9, // idem, para os dois braços em "V"
    armX: 0.55, // afastamento lateral dos braços na popa
    mainLife: 2.8, mainSize: [1.1, 3.6], mainAlpha: 0.75,
    armLife: 2.3, armSize: [0.9, 2.6], armAlpha: 0.5, armDrift: 0.9, // armDrift: u/s para fora
  },
  flank: {
    rate: 11, // manchas por segundo, por bordo, na velocidade total
    life: 1.7, size: [0.7, 1.7], alpha: 0.5, drift: 0.3, // drift: u/s para fora do casco
    tStart: 0.3, tEnd: 0.95, // trecho do casco (0 = proa, 1 = popa): as alhetas ficam na parte de trás
  },
  side: {
    rollMin: 0.07, // rad: abaixo disso, o tombo não conta (o balanço normal das ondas não deve espumar)
    rollFull: 0.25, // rad: espuma total
    rate: 16, // manchas por segundo na inclinação total
    life: 1.5, size: [0.7, 1.6], alpha: 0.7, drift: 0.4,
    tStart: 0.2, tEnd: 0.9,
  },
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (a, b, v) => {
  const t = clamp01((v - a) / (b - a));
  return t * t * (3 - 2 * t);
};

/** Gerador pseudoaleatório fixo (a textura sai igual em toda execução). */
function makeRand(seed) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Mancha solta: disco macio + bolhas brancas. */
function createFoamTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const rand = makeRand(20260);

  const base = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  base.addColorStop(0, 'rgba(255,255,255,0.65)');
  base.addColorStop(0.55, 'rgba(255,255,255,0.3)');
  base.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 140; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand()) * size * 0.42;
    const rad = 1 + rand() * 4.5;
    ctx.fillStyle = `rgba(255,255,255,${0.35 + rand() * 0.55})`;
    ctx.beginPath();
    ctx.arc(size / 2 + Math.cos(a) * r, size / 2 + Math.sin(a) * r, rad, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Faixa do colar: bolhas e fios de espuma que REPETEM sem emenda (nos dois sentidos). */
function createStripTexture() {
  const w = 256;
  const h = 128;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const rand = makeRand(77031);

  // desenha cada forma também deslocada de ±w/±h para a textura fechar nas bordas
  const wrapped = (x, y, draw) => {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) draw(x + dx * w, y + dy * h);
  };

  // fios compridos no sentido do escoamento (eixo U)
  for (let i = 0; i < 46; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const rx = 10 + rand() * 34;
    const ry = 1.2 + rand() * 3.2;
    const alpha = 0.18 + rand() * 0.35;
    wrapped(x, y, (cx, cy) => {
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  // bolhas
  for (let i = 0; i < 260; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const r = 0.9 + rand() * 3.6;
    const alpha = 0.3 + rand() * 0.6;
    wrapped(x, y, (cx, cy) => {
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

const PARTICLE_VERTEX = /* glsl */ `
  attribute vec3 aPos;     // centro da mancha (mundo)
  attribute vec3 aParams;  // x = tamanho, y = giro, z = opacidade
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vec2 p = position.xy * aParams.x;
    float c = cos(aParams.y);
    float s = sin(aParams.y);
    vec2 r = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
    vec3 world = aPos + vec3(r.x, 0.0, r.y); // deitada na água (plano XZ)
    vUv = uv;
    vAlpha = aParams.z;
    gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
  }
`;

const PARTICLE_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vec4 t = texture2D(uMap, vUv);
    float m = t.a * dot(t.rgb, vec3(0.3333)); // vale para PNG com alpha e para branco-sobre-preto
    float edge = 1.0 - smoothstep(0.32, 0.5, length(vUv - 0.5)); // apaga a borda quadrada
    float a = m * edge * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// o colar: os vértices já vêm em coordenadas do mundo (a malha é refeita a cada quadro)
const COLLAR_VERTEX = /* glsl */ `
  attribute float aAlpha; // força da espuma neste ponto do contorno (0..1)
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    vUv = uv;
    vAlpha = aAlpha;
    gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  }
`;

const COLLAR_FRAGMENT = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uScroll; // a espuma escorre da proa para a popa
  varying vec2 vUv;
  varying float vAlpha;

  void main() {
    // duas leituras da textura em escalas e velocidades diferentes, para não parecer um padrão repetido
    vec4 t1 = texture2D(uMap, vec2(vUv.x - uScroll, vUv.y));
    vec4 t2 = texture2D(uMap, vec2(vUv.x * 1.7 - uScroll * 0.6 + 0.31, vUv.y * 1.3 + 0.37));
    float m1 = t1.a * dot(t1.rgb, vec3(0.3333));
    float m2 = t2.a * dot(t2.rgb, vec3(0.3333));
    float m = clamp(m1 * 0.75 + m2 * 0.55, 0.0, 1.0);
    // v = 0 encostado no casco, v = 1 na borda de fora: cheio perto do casco e some para fora
    float across = smoothstep(0.0, 0.12, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
    float a = clamp(m * (0.55 + 0.9 * across) * across * 1.6, 0.0, 1.0) * vAlpha;
    if (a < 0.003) discard;
    gl_FragColor = vec4(uColor, a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export class BoatFoam {
  /**
   * @param {object} o
   * @param {object} o.ocean  precisa de getHeightAt(x, z)
   * @param {string|null} [o.textureUrl]  textura própria (opcional)
   * @param {(t:number)=>number} [o.hullHalfWidth]  meia-largura do casco na linha d'água (t: 0 proa → 1 popa)
   * @param {number} [o.hullLength]
   */
  constructor({ ocean, textureUrl = null, hullHalfWidth = () => 0.9, hullLength = 6 } = {}) {
    this.ocean = ocean;
    this.hullHalfWidth = hullHalfWidth;
    this.hullLength = hullLength;

    this._buildParticles();
    this._buildCollar();
    if (textureUrl) this.setTexture(textureUrl);

    this._last = new THREE.Vector3();
    this._hasLast = false;
    this._fwd = 0; // velocidade para frente (u/s), suavizada
    this._rollS = 0; // roll suavizado (rad)
    this._time = 0;
    this._scroll = 0;
    this._mainAcc = 0;
    this._armAcc = 0;
    this._flankAcc = [0, 0];
    this._sideAcc = 0;
  }

  // ---------------------------------------------------------------- construção

  _buildParticles() {
    const n = FOAM.max;
    this._n = n;
    this._next = 0; // anel: a mancha mais antiga é reaproveitada
    this._age = new Float32Array(n).fill(1);
    this._life = new Float32Array(n).fill(0); // 0 = livre
    this._size0 = new Float32Array(n);
    this._size1 = new Float32Array(n);
    this._peak = new Float32Array(n);
    this._rot = new Float32Array(n);
    this._rotSpeed = new Float32Array(n);
    this._vx = new Float32Array(n);
    this._vz = new Float32Array(n);
    this._x = new Float32Array(n);
    this._z = new Float32Array(n);

    const base = new THREE.PlaneGeometry(1, 1);
    this.geometry = new THREE.InstancedBufferGeometry();
    this.geometry.index = base.index;
    this.geometry.setAttribute('position', base.getAttribute('position'));
    this.geometry.setAttribute('uv', base.getAttribute('uv'));
    this._aPos = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this._aParams = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('aPos', this._aPos);
    this.geometry.setAttribute('aParams', this._aParams);
    this.geometry.instanceCount = n;

    this._texture = createFoamTexture();
    this.material = new THREE.ShaderMaterial({
      uniforms: { uMap: { value: this._texture }, uColor: { value: new THREE.Color(0.93, 0.97, 1.0) } },
      vertexShader: PARTICLE_VERTEX,
      fragmentShader: PARTICLE_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false; // as manchas estão em coordenadas do mundo
    this.mesh.renderOrder = 2;
  }

  /** Contorno do casco na linha d'água (volta completa pela proa) e a faixa que o acompanha. */
  _buildCollar() {
    const L = this.hullLength;
    const C = FOAM.collar;
    const pts = [];
    const nSide = 22;
    const nTransom = 4;

    // boreste: da proa (t = 0) à popa (t = 1)
    for (let i = 0; i <= nSide; i++) {
      const t = i / nSide;
      pts.push({ lx: this.hullHalfWidth(t), lz: -L / 2 + t * L, t, side: 1 });
    }
    // espelho de popa: de boreste para bombordo
    const hwStern = this.hullHalfWidth(1);
    for (let i = 1; i <= nTransom; i++) {
      const f = i / (nTransom + 1);
      pts.push({ lx: hwStern - 2 * hwStern * f, lz: L / 2, t: 1, side: 0 });
    }
    // bombordo: da popa de volta à proa
    for (let i = nSide; i >= 0; i--) {
      const t = i / nSide;
      pts.push({ lx: -this.hullHalfWidth(t), lz: -L / 2 + t * L, t, side: -1 });
    }
    pts.push({ ...pts[0] }); // fecha a volta na proa
    this._pts = pts;

    // normais para fora (a volta vai de boreste pela popa até bombordo: normal = (tz, −tx))
    const m = pts.length;
    for (let i = 0; i < m; i++) {
      const a = pts[i === 0 ? m - 2 : i - 1]; // anterior (na proa, o último ponto antes de fechar a volta)
      const b = pts[i === m - 1 ? 1 : i + 1];
      let tx = b.lx - a.lx;
      let tz = b.lz - a.lz;
      const len = Math.hypot(tx, tz) || 1;
      tx /= len;
      tz /= len;
      pts[i].nx = tz;
      pts[i].nz = -tx;
    }
    // proa: a normal aponta para frente (−Z)
    pts[0].nx = pts[m - 1].nx = 0;
    pts[0].nz = pts[m - 1].nz = -1;

    // malha: 2 vértices por ponto (0 = encostado no casco, 1 = borda de fora)
    const verts = m * 2;
    this._collarPos = new THREE.BufferAttribute(new Float32Array(verts * 3), 3).setUsage(THREE.DynamicDrawUsage);
    this._collarAlpha = new THREE.BufferAttribute(new Float32Array(verts), 1).setUsage(THREE.DynamicDrawUsage);
    const uv = new Float32Array(verts * 2);
    for (let i = 0; i < m; i++) {
      const p = pts[i];
      // u igual nos dois bordos (a espuma escorre para a popa dos dois lados); o espelho segue de boreste a bombordo
      const u = p.side === 0 ? (L + (hwStern - p.lx) / (2 * hwStern)) / C.tile : (p.lz + L / 2) / C.tile;
      uv[i * 4] = u;
      uv[i * 4 + 1] = 0;
      uv[i * 4 + 2] = u;
      uv[i * 4 + 3] = 1;
    }
    const index = [];
    for (let i = 0; i < m - 1; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    this.collarGeometry = new THREE.BufferGeometry();
    this.collarGeometry.setAttribute('position', this._collarPos);
    this.collarGeometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.collarGeometry.setAttribute('aAlpha', this._collarAlpha);
    this.collarGeometry.setIndex(index);

    this._stripTexture = createStripTexture();
    this.collarMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this._stripTexture },
        uColor: { value: new THREE.Color(0.93, 0.97, 1.0) },
        uScroll: { value: 0 },
      },
      vertexShader: COLLAR_VERTEX,
      fragmentShader: COLLAR_FRAGMENT,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.collarMesh = new THREE.Mesh(this.collarGeometry, this.collarMaterial);
    this.collarMesh.frustumCulled = false; // os vértices estão em coordenadas do mundo
    this.collarMesh.renderOrder = 2;
  }

  /** Troca a textura por uma imagem sua (URL). As geradas em canvas servem até ela carregar. */
  setTexture(url) {
    new THREE.TextureLoader().load(url, (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping; // o colar repete a imagem
      const oldBlob = this.material.uniforms.uMap.value;
      const oldStrip = this.collarMaterial.uniforms.uMap.value;
      this.material.uniforms.uMap.value = texture;
      this.collarMaterial.uniforms.uMap.value = texture;
      if (oldBlob !== texture) oldBlob.dispose();
      if (oldStrip !== texture && oldStrip !== oldBlob) oldStrip.dispose();
      this._texture = texture;
      this._stripTexture = texture;
    });
  }

  addTo(scene) {
    scene.add(this.collarMesh);
    scene.add(this.mesh);
  }

  /** Apaga toda a espuma solta (teleporte ou reinício). O colar se refaz sozinho no próximo quadro. */
  clear() {
    this._life.fill(0);
    this._aParams.array.fill(0);
    this._aParams.needsUpdate = true;
    this._hasLast = false;
    this._fwd = 0;
    this._mainAcc = this._armAcc = this._sideAcc = 0;
    this._flankAcc = [0, 0];
  }

  // ---------------------------------------------------------------- emissão

  /** Local do barco (lx = boreste, lz = popa) → mundo, dado o pivô e o giro. */
  _toWorld(pos, yaw, lx, lz, out) {
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    out.x = pos.x + lx * c + lz * s;
    out.z = pos.z - lx * s + lz * c;
    return out;
  }

  _emit({ x, z, vx = 0, vz = 0, life, size, peak }) {
    const i = this._next;
    this._next = (i + 1) % this._n;
    this._x[i] = x;
    this._z[i] = z;
    this._vx[i] = vx;
    this._vz[i] = vz;
    this._age[i] = 0;
    this._life[i] = life * (0.85 + Math.random() * 0.3);
    const grow = 0.85 + Math.random() * 0.3;
    this._size0[i] = size[0] * grow;
    this._size1[i] = size[1] * grow;
    this._peak[i] = peak;
    this._rot[i] = Math.random() * Math.PI * 2;
    this._rotSpeed[i] = (Math.random() - 0.5) * 0.6;
  }

  /** Mancha no casco, no bordo `side` (−1 bombordo, +1 boreste), no ponto t da proa à popa, indo para fora. */
  _emitAtHull(pos, yaw, side, t, cfg, peak, tmp) {
    const lz = -this.hullLength / 2 + t * this.hullLength;
    this._toWorld(pos, yaw, side * (this.hullHalfWidth(t) + 0.08), lz, tmp);
    this._emit({
      x: tmp.x, z: tmp.z,
      vx: side * Math.cos(yaw) * cfg.drift, vz: -side * Math.sin(yaw) * cfg.drift, // para fora do casco
      life: cfg.life, size: cfg.size, peak,
    });
  }

  /**
   * @param {number} delta  segundos
   * @param {THREE.Vector3} pos  posição do pivô do barco (Player.mesh.position)
   * @param {number} yaw  giro do barco (Player.mesh.rotation.y)
   * @param {number} roll  inclinação lateral do casco em rad (Player.boat.rotation.z; > 0 = boreste sobe)
   */
  update(delta, pos, yaw, roll) {
    if (!(delta > 0)) return;
    delta = Math.min(delta, 0.1);
    this._time += delta;
    const fx = -Math.sin(yaw); // frente do barco no mundo
    const fz = -Math.cos(yaw);

    // velocidade para frente (a partir do deslocamento real: colisões e escorregões contam)
    let moved = 0;
    if (!this._hasLast) {
      this._hasLast = true;
    } else {
      const dx = pos.x - this._last.x;
      const dz = pos.z - this._last.z;
      if (Math.hypot(dx, dz) > FOAM.teleport) {
        this.clear();
        this._hasLast = true;
      } else {
        moved = dx * fx + dz * fz; // > 0 = andou para frente
        this._fwd += (moved / delta - this._fwd) * (1 - Math.exp(-8 * delta));
      }
    }
    this._last.copy(pos);
    this._rollS += (roll - this._rollS) * (1 - Math.exp(-6 * delta));

    const W = FOAM.wake;
    const speedK = smooth(W.minSpeed, W.fullSpeed, this._fwd);
    const tmp = { x: 0, z: 0 };

    // 1) esteira: só indo para frente
    if (this._fwd > W.minSpeed && moved > 0) {
      this._mainAcc += moved;
      this._armAcc += moved;
      const sternZ = this.hullLength / 2 + 0.1;
      while (this._mainAcc >= W.mainSpacing) {
        this._mainAcc -= W.mainSpacing;
        this._toWorld(pos, yaw, (Math.random() - 0.5) * 0.3, sternZ + Math.random() * 0.3, tmp);
        this._emit({ x: tmp.x, z: tmp.z, life: W.mainLife, size: W.mainSize, peak: W.mainAlpha * (0.5 + 0.5 * speedK) });
      }
      while (this._armAcc >= W.armSpacing) {
        this._armAcc -= W.armSpacing;
        for (const side of [-1, 1]) {
          this._toWorld(pos, yaw, side * W.armX, sternZ - 0.4, tmp);
          this._emit({
            x: tmp.x, z: tmp.z,
            vx: side * Math.cos(yaw) * W.armDrift, vz: -side * Math.sin(yaw) * W.armDrift,
            life: W.armLife, size: W.armSize, peak: W.armAlpha * (0.4 + 0.6 * speedK),
          });
        }
      }
    } else {
      this._mainAcc = this._armAcc = 0;
    }

    // 2) alhetas: espuma escorrendo pelos dois flancos enquanto o barco anda
    const F = FOAM.flank;
    if (speedK > 0) {
      for (let s = 0; s < 2; s++) {
        const side = s === 0 ? -1 : 1;
        this._flankAcc[s] += F.rate * speedK * delta;
        while (this._flankAcc[s] >= 1) {
          this._flankAcc[s] -= 1;
          const t = F.tStart + Math.random() * (F.tEnd - F.tStart);
          this._emitAtHull(pos, yaw, side, t, F, F.alpha * (0.4 + 0.6 * speedK), tmp);
        }
      }
    } else {
      this._flankAcc = [0, 0];
    }

    // 3) lados ao tombar: o bordo que mergulha (roll > 0 = boreste sobe, então mergulha o bombordo)
    const S = FOAM.side;
    const k = smooth(S.rollMin, S.rollFull, Math.abs(roll));
    if (k > 0) {
      const side = roll > 0 ? -1 : 1;
      this._sideAcc += S.rate * k * (0.6 + 0.4 * speedK) * delta;
      while (this._sideAcc >= 1) {
        this._sideAcc -= 1;
        const t = S.tStart + Math.random() * (S.tEnd - S.tStart);
        this._emitAtHull(pos, yaw, side, t, S, S.alpha * (0.5 + 0.5 * k), tmp);
      }
    } else {
      this._sideAcc = 0;
    }

    this._step(delta);
    this._updateCollar(delta, pos, yaw, speedK);
  }

  // ---------------------------------------------------------------- desenho

  /** Refaz a faixa em volta do casco: posição na água, largura e força em cada ponto do contorno. */
  _updateCollar(delta, pos, yaw, speedK) {
    const C = FOAM.collar;
    const S = FOAM.side;
    const rollK = smooth(S.rollMin, S.rollFull, Math.abs(this._rollS));
    const dipSide = this._rollS > 0 ? -1 : 1;
    const c = Math.cos(yaw);
    const s = Math.sin(yaw);
    const out = this._collarPos.array;
    const alpha = this._collarAlpha.array;
    const tmp = { x: 0, z: 0 };

    for (let i = 0; i < this._pts.length; i++) {
      const p = this._pts[i];

      let I = C.base + C.speed * speedK;
      I += C.bow * speedK * smooth(0.35, 0, p.t) * (p.side === 0 ? 0 : 1); // onda de proa
      I += C.stern * (0.35 + 0.65 * speedK) * smooth(0.65, 1, p.t) * (p.side === 0 ? 1.2 : 0.8); // popa e espelho
      if (p.side === dipSide) I += C.dip * rollK * smooth(0.05, 0.3, p.t) * (1 - smooth(0.9, 1, p.t)); // bordo que mergulha
      I *= 0.88 + 0.12 * Math.sin(this._time * 2.1 + i * 0.9); // cintila de leve
      I = clamp01(I);

      let width = C.minWidth + C.width * I;
      if (p.side !== 0 || p.t === 0) width += C.bowWidth * speedK * smooth(0.3, 0, p.t);

      // vértice 0 (encostado no casco) e vértice 1 (para fora)
      for (let v = 0; v < 2; v++) {
        const off = v === 0 ? -C.inset : width;
        const lx = p.lx + p.nx * off;
        const lz = p.lz + p.nz * off;
        tmp.x = pos.x + lx * c + lz * s;
        tmp.z = pos.z - lx * s + lz * c;
        const k = (i * 2 + v) * 3;
        out[k] = tmp.x;
        out[k + 1] = this.ocean.getHeightAt(tmp.x, tmp.z) + FOAM.lift; // acompanha as ondas
        out[k + 2] = tmp.z;
        alpha[i * 2 + v] = I;
      }
    }
    this._collarPos.needsUpdate = true;
    this._collarAlpha.needsUpdate = true;

    // a espuma escorre da proa para a popa, mais rápido quanto mais o barco corre
    this._scroll += (C.flow + C.flowSpeed * Math.max(0, this._fwd)) * delta;
    this.collarMaterial.uniforms.uScroll.value = this._scroll % 1000;
  }

  /** Envelhece as manchas e escreve posição, tamanho e opacidade para o desenho. */
  _step(delta) {
    const pos = this._aPos.array;
    const prm = this._aParams.array;
    const damp = Math.exp(-1.5 * delta);

    for (let i = 0; i < this._n; i++) {
      if (this._life[i] <= 0) continue;
      this._age[i] += delta;
      const u = this._age[i] / this._life[i];
      if (u >= 1) {
        this._life[i] = 0;
        prm[i * 3] = 0;
        prm[i * 3 + 2] = 0;
        continue;
      }
      this._x[i] += this._vx[i] * delta;
      this._z[i] += this._vz[i] * delta;
      this._vx[i] *= damp;
      this._vz[i] *= damp;
      this._rot[i] += this._rotSpeed[i] * delta;

      const grow = 1 - (1 - u) * (1 - u); // abre rápido e depois devagar
      const fade = smooth(0, 0.08, u) * Math.pow(1 - u, 1.4); // surge e some suave
      pos[i * 3] = this._x[i];
      pos[i * 3 + 1] = this.ocean.getHeightAt(this._x[i], this._z[i]) + FOAM.lift; // acompanha as ondas
      pos[i * 3 + 2] = this._z[i];
      prm[i * 3] = this._size0[i] + (this._size1[i] - this._size0[i]) * grow;
      prm[i * 3 + 1] = this._rot[i];
      prm[i * 3 + 2] = this._peak[i] * fade;
    }
    this._aPos.needsUpdate = true;
    this._aParams.needsUpdate = true;
  }

  /** Quantas manchas soltas estão vivas (útil para teste e depuração). */
  get alive() {
    let n = 0;
    for (let i = 0; i < this._n; i++) if (this._life[i] > 0) n++;
    return n;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.collarGeometry.dispose();
    this.collarMaterial.dispose();
    if (this._stripTexture !== this._texture) this._stripTexture.dispose();
    this._texture.dispose();
    this.mesh.removeFromParent();
    this.collarMesh.removeFromParent();
  }
}

export default BoatFoam;