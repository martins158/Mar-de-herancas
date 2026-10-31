// src/world/Harbor.js
import * as THREE from 'three';
import { dampFactor } from '../utils/MathUtils.js';

/**
 * Harbor
 * Área inicial 2D: o velho porto ao entardecer, visto de lado. Tem cena e
 * câmera ortográfica próprias (o Engine renderiza com engine.setView(harbor)).
 * O jogador só anda para esquerda/direita (A e D) pelo cais. Pelo caminho
 * há 4 pessoas (mãe, dois vizinhos e, no fim do cais, o pai): chegando perto
 * de uma delas, `getNearbyNPC()` a devolve e o jogo pode iniciar a conversa.
 * O pai bloqueia o caminho até o barco; zarpar acontece no fim da conversa
 * com ele (botão da caixa de diálogo).
 *
 * TUDO aqui é placeholder feito de formas simples (MeshBasicMaterial, sem
 * luz). Para trocar por arte de verdade, basta substituir os métodos
 * _build*() por sprites/texturas, mantendo as camadas de paralaxe.
 *
 * Coordenadas: 1 unidade = 1/18 da altura da tela. y = 0 é o horizonte,
 * o convés do cais fica em DECK_Y e a água sob o cais em WATER_Y.
 *
 * Uso:
 *   const harbor = new Harbor();
 *   engine.setView(harbor);                       // { scene, camera }
 *   engine.addResizeListener(() => harbor.onResize());
 *
 *   // no loop de render, enquanto a fase for 'harbor':
 *   harbor.update(delta, elapsed, input);                      // andando
 *   harbor.update(delta, elapsed, input, { frozen: true });    // em diálogo
 *   const npc = harbor.getNearbyNPC();                         // { id, name, x } ou null
 *   if (npc && input.consumeInteract()) { harbor.faceNPC(npc); ... }
 *   harbor.markTalked(npc.id);                                 // some o balão "..."
 */

const VIEW_HEIGHT = 18;
const WORLD_HALF_WIDTH = 40; // a câmera nunca mostra além de ±40
const WALK_SPEED = 5;
const WALK_MIN_X = -26;
const FATHER_X = 20.5;
const WALK_MAX_X = FATHER_X - 1.7; // o pai bloqueia o caminho até o barco
const INTERACT_RANGE = 2.6; // distância máxima para conversar
const START_X = -23;
const DECK_Y = -3.5;
const WATER_Y = -5.5;
const PIER_LEFT = -28;
const PIER_RIGHT = 25.5;

// Pessoas do porto. `look` descreve o desenho (ver _makeFigure); `facing` é
// para onde olham quando ninguém está perto (1 = direita/mar, -1 = esquerda).
const NPC_DEFS = [
  {
    id: 'mae',
    name: 'Mãe',
    x: -19.2,
    facing: 1,
    look: { coat: '#5b6577', skirt: '#5b6577', shawl: '#8a6f5a', hair: '#4a3a38', hairStyle: 'back', bun: true, scale: 0.95, stoop: 0.04 },
  },
  {
    id: 'anselmo',
    name: 'Seu Anselmo',
    x: -6.5,
    facing: 1,
    look: {
      coat: '#b59a3c', pants: '#3b3d4a', hat: { type: 'pointed', color: '#2f3a46' },
      beard: '#cfcfcf', cane: true, scale: 0.93, stoop: 0.16,
    },
  },
  {
    id: 'iracema',
    name: 'Dona Iracema',
    x: 6.8,
    facing: -1,
    look: { coat: '#3a3340', skirt: '#2d2833', shawl: '#6a5a78', hair: '#3a2c26', hairStyle: 'back', scale: 0.92, stoop: 0.07 },
  },
  {
    id: 'pai',
    name: 'Pai',
    x: FATHER_X,
    facing: 1,
    look: {
      coat: '#6b4a35', pants: '#2a2a32', hat: { type: 'cap', color: '#3a2a1e' },
      beard: '#8a8a8a', lantern: true, scale: 1.08, stoop: 0.06,
    },
  },
];

// ---------- helpers de formas ----------

const basic = (color, extra = {}) => new THREE.MeshBasicMaterial({ color, ...extra });

function rect(w, h, color, x = 0, y = 0, z = 0, extra) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), basic(color, extra));
  mesh.position.set(x, y, z);
  return mesh;
}

function circle(r, color, x = 0, y = 0, z = 0, extra) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(r, 32), basic(color, extra));
  mesh.position.set(x, y, z);
  return mesh;
}

function poly(points, color, z = 0, extra) {
  const shape = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), basic(color, extra));
  mesh.position.z = z;
  return mesh;
}

function gradientTexture(stops, width = 2, height = 256) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  for (const [t, color] of stops) gradient.addColorStop(t, color);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function plankTexture(repeatX) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#6d4a2b' : '#85593a';
    ctx.fillRect(i * 32, 0, 32, 32);
    ctx.fillStyle = '#3a2616'; // fresta entre as tábuas
    ctx.fillRect(i * 32, 0, 2, 32);
    ctx.fillStyle = '#2a1a0e'; // pregos
    ctx.fillRect(i * 32 + 8, 5, 3, 3);
    ctx.fillRect(i * 32 + 8, 24, 3, 3);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, 1);
  return texture;
}

export class Harbor {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-16, 16, VIEW_HEIGHT / 2, -VIEW_HEIGHT / 2, 0.1, 100);
    this.camera.position.set(0, 0, 10);

    this.characterX = START_X;
    this._facing = 1;
    this._walkPhase = 0;
    this._layers = []; // { group, factor }: factor 1 = cola na câmera, 0 = fixo no mundo
    this._clouds = [];
    this._lampHalos = [];
    this._wavelets = [];
    this.npcs = []; // { id, name, x, holder, figure, bubble, ... }

    this._buildSky();
    this._buildFarLayers();
    this._buildSea();
    this._buildPier();
    this._buildBuildings();
    this._buildProps();
    this._buildBoat();
    this._buildFrontWater();
    this._buildCharacter();
    this._buildNPCs();

    this.onResize();
    this.reset();
  }

  // ---------- construção ----------

  _addLayer(factor) {
    const group = new THREE.Group();
    this.scene.add(group);
    this._layers.push({ group, factor });
    return group;
  }

  _buildSky() {
    // entardecer: o brilho mais claro fica na linha do horizonte (centro da tela)
    this.scene.background = gradientTexture([
      [0, '#26335f'],
      [0.3, '#6b4f7e'],
      [0.45, '#e58f62'],
      [0.5, '#f7cf8e'],
      [1, '#f7cf8e'],
    ]);
  }

  _buildFarLayers() {
    // sol (meio afundado no horizonte) + brilho
    const sun = this._addLayer(0.95);
    sun.add(circle(5.5, '#ffd08a', 8, 1, -9.6, { transparent: true, opacity: 0.22 }));
    sun.add(circle(2.6, '#ffe2a8', 8, 1, -9.5));

    // nuvens que derivam devagar
    const clouds = this._addLayer(0.9);
    for (let i = 0; i < 5; i++) {
      const cloud = circle(4 + (i % 3), '#f0a98a', -50 + i * 24, 4 + (i % 3) * 1.6, -9.8, {
        transparent: true,
        opacity: 0.35,
      });
      cloud.scale.y = 0.22;
      clouds.add(cloud);
      this._clouds.push(cloud);
    }

    // colinas distantes
    const farHills = this._addLayer(0.85);
    const farPoints = [];
    for (let x = -70; x <= 70; x += 5) {
      farPoints.push([x, 0.5 + 1.2 * Math.abs(Math.sin(x * 0.07 + 1)) + 0.8 * Math.sin(x * 0.23) ** 2]);
    }
    farPoints.push([70, -1], [-70, -1]);
    farHills.add(poly(farPoints, '#5a5a86', -9.2));

    // colinas próximas + farol
    const nearHills = this._addLayer(0.7);
    const nearPoints = [];
    for (let x = -70; x <= 70; x += 5) {
      nearPoints.push([x, 0.3 + 1.6 * Math.abs(Math.sin(x * 0.09)) + 0.9 * Math.sin(x * 0.27 + 1) ** 2]);
    }
    nearPoints.push([70, -1], [-70, -1]);
    nearHills.add(poly(nearPoints, '#3b3d66', -9.0));

    const lighthouse = new THREE.Group();
    lighthouse.position.set(-22, 0.2, -8.9);
    lighthouse.add(poly([[-1.1, 0], [1.1, 0], [0.7, 6.2], [-0.7, 6.2]], '#e8e0d0', 0));
    lighthouse.add(poly([[-0.95, 2], [0.95, 2], [0.86, 3.4], [-0.86, 3.4]], '#b5473a', 0.01));
    lighthouse.add(rect(2.2, 0.25, '#2b2a35', 0, 6.3, 0.02));
    lighthouse.add(rect(1.0, 0.9, '#ffd47a', 0, 6.9, 0.02));
    lighthouse.add(poly([[-0.8, 7.35], [0.8, 7.35], [0, 8.2]], '#b5473a', 0.02));
    lighthouse.add(
      poly([[0.5, 6.9], [14, 8.6], [14, 5.2]], '#ffe9b0', -0.01, { transparent: true, opacity: 0.12 })
    );
    nearHills.add(lighthouse);
  }

  _buildSea() {
    const sea = this._addLayer(1);
    const texture = gradientTexture([
      [0, '#5c8fa6'],
      [0.25, '#2f6482'],
      [1, '#0f2e47'],
    ]);
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(200, 9.5), basic('#ffffff', { map: texture }));
    plane.position.set(0, -4.75, -8.5);
    sea.add(plane);

    // reflexo do sol na água (traços que oscilam)
    this._shimmer = [];
    const shimmer = this._addLayer(0.95);
    for (let i = 0; i < 7; i++) {
      const line = rect(5 - i * 0.55, 0.14, '#f2b36b', 8, -0.5 - i * 0.55, -8.4, {
        transparent: true,
        opacity: 0.55,
      });
      shimmer.add(line);
      this._shimmer.push(line);
    }
  }

  _buildPier() {
    const pier = this._addLayer(0);
    const width = PIER_RIGHT - PIER_LEFT;
    const centerX = (PIER_LEFT + PIER_RIGHT) / 2;

    // pilares (ficam atrás da água da frente, que os "afunda")
    for (let x = PIER_LEFT + 1; x <= PIER_RIGHT - 0.5; x += 5) {
      pier.add(rect(0.55, 5.8, '#3d2a18', x, DECK_Y - 2.9, -0.5));
    }

    // convés + borda inferior
    const deck = new THREE.Mesh(new THREE.PlaneGeometry(width, 0.5), basic('#ffffff', { map: plankTexture(width / 4) }));
    deck.position.set(centerX, DECK_Y - 0.25, 0);
    pier.add(deck);
    pier.add(rect(width, 0.3, '#4a3220', centerX, DECK_Y - 0.65, 0.01));

    // vigas transversais sob o convés
    for (let x = PIER_LEFT + 2; x <= PIER_RIGHT; x += 5) {
      pier.add(rect(1.2, 0.35, '#2e1f12', x, DECK_Y - 1.0, -0.3));
    }
  }

  _addWindow(group, x, y, z) {
    group.add(rect(1.0, 1.1, '#2a1d18', x, y, z));
    group.add(rect(0.78, 0.88, '#ffd47a', x, y, z + 0.01));
    group.add(rect(0.08, 0.88, '#2a1d18', x, y, z + 0.02));
  }

  _addHouse(layer, x, w, h, wall, roof) {
    const house = new THREE.Group();
    house.position.set(x, DECK_Y, -3);

    house.add(rect(w, h, wall, 0, h / 2, 0));
    house.add(rect(w, 0.18, '#3b2a20', 0, h * 0.5, 0.005)); // viga (estilo enxaimel)
    house.add(rect(0.18, h, '#3b2a20', -w / 2 + 0.09, h / 2, 0.005));
    house.add(rect(0.18, h, '#3b2a20', w / 2 - 0.09, h / 2, 0.005));
    house.add(rect(0.7, 1.4, roof, w * 0.25, h + 1.0, -0.01)); // chaminé
    house.add(poly([[-w / 2 - 0.5, h], [w / 2 + 0.5, h], [0, h + w * 0.35]], roof, 0.01));

    const cols = Math.max(1, Math.round(w / 3));
    const step = w / cols;
    for (let i = 0; i < cols; i++) {
      const wx = -w / 2 + (i + 0.5) * step;
      this._addWindow(house, wx, h * 0.72, 0.02);
      if (i === 0) {
        house.add(rect(1.2, 2.2, '#3a2418', wx, 1.1, 0.02)); // porta
        house.add(circle(0.07, '#d9b45a', wx + 0.35, 1.0, 0.03));
      } else {
        this._addWindow(house, wx, h * 0.3, 0.02);
      }
    }

    layer.add(house);
  }

  _buildBuildings() {
    const layer = this._addLayer(0);
    // as casas ficam distribuídas por igual entre as pontas (nada passa da borda do cais)
    // [largura, altura, parede, telhado]
    const specs = [
      [6, 5, '#a8734f', '#4a2f2a'],
      [7.5, 6.2, '#7d8fa3', '#35404f'],
      [6, 4.4, '#c29a5b', '#5a3a2e'],
      [8, 5.4, '#8b5e4b', '#2f3a46'],
      [5.5, 4, '#9a8f7a', '#4a2f2a'],
    ];
    const from = -26.5;
    const to = 17.5;
    const gap = (to - from - specs.reduce((sum, spec) => sum + spec[0], 0)) / (specs.length - 1);

    this._lampXs = []; // os postes de luz ficam nos vãos entre as casas (não dentro de janelas)
    let left = from;
    specs.forEach(([w, h, wall, roof], i) => {
      this._addHouse(layer, left + w / 2, w, h, wall, roof);
      left += w;
      if (i < specs.length - 1) this._lampXs.push(left + gap / 2);
      left += gap;
    });
    this._lampXs.push(20); // o último, junto ao pai
  }

  _buildProps() {
    const layer = this._addLayer(0);

    // caixotes
    const crate = (x, y) => {
      const g = new THREE.Group();
      g.position.set(x, y, 0.8);
      g.add(rect(1.4, 1.4, '#8a6238', 0, 0.7, 0));
      g.add(rect(1.4, 0.1, '#4a3220', 0, 0.12, 0.01));
      g.add(rect(1.4, 0.1, '#4a3220', 0, 1.28, 0.01));
      g.add(rect(0.1, 1.4, '#4a3220', -0.65, 0.7, 0.01));
      g.add(rect(0.1, 1.4, '#4a3220', 0.65, 0.7, 0.01));
      layer.add(g);
    };
    crate(-11.5, DECK_Y);
    crate(14, DECK_Y);
    crate(15.5, DECK_Y);
    crate(14.7, DECK_Y + 1.4);

    // barris
    const barrel = (x) => {
      const g = new THREE.Group();
      g.position.set(x, DECK_Y, 0.8);
      g.add(rect(1.0, 1.4, '#6b4a2f', 0, 0.7, 0));
      g.add(rect(1.04, 0.1, '#2e2018', 0, 0.35, 0.01));
      g.add(rect(1.04, 0.1, '#2e2018', 0, 1.05, 0.01));
      layer.add(g);
    };
    barrel(-4);
    barrel(5.5);
    barrel(17.5);

    // postes de luz
    for (const x of this._lampXs) {
      const g = new THREE.Group();
      g.position.set(x, DECK_Y, 0.6);
      g.add(rect(0.2, 4, '#2b2622', 0, 2, 0));
      g.add(rect(0.7, 0.7, '#ffcf70', 0, 4.2, 0.01));
      g.add(rect(0.9, 0.12, '#2b2622', 0, 4.65, 0.02));
      const halo = circle(1.9, '#ffcf70', 0, 4.2, -0.01, { transparent: true, opacity: 0.14 });
      g.add(halo);
      this._lampHalos.push(halo);
      layer.add(g);
    }

    // poste de amarração no fim do cais
    const bollard = new THREE.Group();
    bollard.position.set(24.2, DECK_Y, 0.8);
    bollard.add(rect(0.5, 0.7, '#2b2622', 0, 0.35, 0));
    bollard.add(rect(0.8, 0.18, '#2b2622', 0, 0.75, 0.01));
    layer.add(bollard);
  }

  _buildBoat() {
    const boat = new THREE.Group();
    boat.position.set(31, WATER_Y, 0.1);

    boat.add(rect(0.3, 7.5, '#3b2a1a', 0.8, 5.25, -0.02)); // mastro
    boat.add(poly([[1.1, 8.4], [1.1, 2.4], [5.2, 2.4]], '#e9ddc0', -0.01)); // vela principal
    boat.add(poly([[0.5, 8.2], [0.5, 2.6], [-4.2, 2.2]], '#d8c9a6', -0.01)); // buja
    boat.add(poly([[0.9, 9.0], [0.9, 8.4], [2.2, 8.7]], '#b5473a', 0)); // bandeira
    boat.add(poly([[-5.2, 1.5], [5.8, 1.9], [4.3, -1.0], [-3.9, -1.0]], '#7a4a2a', 0.02)); // casco
    boat.add(poly([[-5.15, 1.2], [5.7, 1.55], [5.65, 1.3], [-5.1, 0.95]], '#c9a14a', 0.03)); // friso dourado
    boat.add(rect(0.35, 0.9, '#2b2622', -4.4, 1.9, 0.01)); // lanterna da popa
    boat.add(circle(0.25, '#ffcf70', -4.4, 2.1, 0.02));

    this.boat = boat;
    this.scene.add(boat);
  }

  _buildFrontWater() {
    // água na frente dos pilares e do casco: dá a ideia de que estão dentro d'água
    const front = this._addLayer(1);
    front.add(rect(200, 4, '#123a55', 0, WATER_Y - 2, 0.4, { transparent: true, opacity: 0.6 }));
    front.add(rect(200, 0.12, '#cfe6ee', 0, WATER_Y, 0.41, { transparent: true, opacity: 0.5 }));

    // marolas que balançam (fixas no mundo)
    const waves = this._addLayer(0);
    for (let i = 0; i < 19; i++) {
      const wavelet = rect(2.2, 0.1, '#cfe6ee', -45 + i * 5.1, WATER_Y - 0.4 - ((i * 0.618) % 1) * 2.8, 0.42, {
        transparent: true,
        opacity: 0.4,
      });
      wavelet.userData.baseX = wavelet.position.x;
      waves.add(wavelet);
      this._wavelets.push(wavelet);
    }
  }

  _buildCharacter() {
    const g = new THREE.Group();

    const makeLeg = (x) => {
      const leg = rect(0.28, 0.9, '#2a2a32', 0, 0, 0);
      leg.geometry.translate(0, -0.45, 0); // pivô no quadril
      leg.position.set(x, 0.9, 0);
      return leg;
    };
    this._legL = makeLeg(-0.17);
    this._legR = makeLeg(0.17);
    g.add(this._legL, this._legR);

    g.add(rect(0.8, 1.1, '#3b5f8a', 0, 1.45, 0.01)); // casaco
    g.add(rect(0.8, 0.14, '#2a2a32', 0, 1.0, 0.02)); // cinto
    g.add(circle(0.34, '#e5b98f', 0, 2.3, 0.02)); // cabeça
    g.add(circle(0.05, '#2a2a32', 0.14, 2.32, 0.03)); // olho (mostra para onde olha)
    g.add(rect(1.0, 0.16, '#2a2a32', 0, 2.55, 0.03)); // aba do chapéu
    g.add(poly([[-0.4, 2.6], [0.4, 2.6], [0, 3.1]], '#2a2a32', 0.04)); // chapéu

    this.character = g;
    this.scene.add(g);
  }

  /**
   * Desenha uma pessoa (olhando para +x; vira com scale.x negativo).
   * look: { coat, pants, skirt, shawl, hair, hairStyle, bun, hat:{type,color}, beard,
   *         cane, lantern, scale, stoop }
   * hairStyle: 'back' = cabelo preso atrás (franja no topo + coque baixo);
   * sem hairStyle, `hair` desenha o círculo antigo (usado pela Mãe).
   */
  _makeFigure(look) {
    const {
      coat, pants = '#2a2a32', skirt = null, shawl = null, hair = null, hairStyle = null, bun = false,
      hat = null, beard = null, cane = false, lantern = false, stoop = 0,
    } = look;
    const skin = '#e5b98f';
    const g = new THREE.Group();

    // pernas ou saia
    if (skirt) {
      g.add(poly([[-0.5, 1.0], [0.5, 1.0], [0.68, 0.18], [-0.68, 0.18]], skirt, 0));
      g.add(rect(0.26, 0.2, '#2a2a32', -0.17, 0.1, 0.01));
      g.add(rect(0.26, 0.2, '#2a2a32', 0.17, 0.1, 0.01));
    } else {
      g.add(rect(0.28, 0.9, pants, -0.17, 0.45, 0));
      g.add(rect(0.28, 0.9, pants, 0.17, 0.45, 0));
    }

    // tronco curvado para a frente (pivô no quadril)
    const upper = new THREE.Group();
    upper.position.set(0, 0.9, 0);
    upper.rotation.z = -stoop;
    const sleeve = new THREE.Color(coat).multiplyScalar(0.72);

    upper.add(rect(0.8, 1.1, coat, 0, 0.55, 0.01));
    upper.add(rect(0.8, 0.14, '#2a2a32', 0, 0.1, 0.02)); // cinto
    upper.add(rect(0.2, 0.85, sleeve, 0.06, 0.5, 0.035)); // braço
    if (shawl) upper.add(poly([[-0.55, 1.08], [0.55, 1.08], [0, 0.3]], shawl, 0.03));

    upper.add(circle(0.34, skin, 0, 1.4, 0.02)); // cabeça
    upper.add(circle(0.05, '#2a2a32', 0.14, 1.42, 0.03)); // olho
    if (hair && hairStyle === 'back') {
      // cabelo preso: massa atrás da cabeça, franja no topo e coque baixo na nuca
      upper.add(circle(0.35, hair, -0.07, 1.43, 0.012));
      const cap = [];
      for (let a = 10; a <= 175; a += 15) {
        const r = (a * Math.PI) / 180;
        cap.push([0.355 * Math.cos(r), 1.4 + 0.355 * Math.sin(r)]);
      }
      cap.push([-0.3, 1.5], [-0.1, 1.57], [0.12, 1.6], [0.3, 1.52]);
      upper.add(poly(cap, hair, 0.022));
      if (!bun) upper.add(circle(0.14, hair, -0.32, 1.28, 0.011)); // coque baixo (quem tem coque alto não)
    } else if (hair) {
      upper.add(circle(0.36, hair, -0.05, 1.48, 0.012));
    }
    if (bun) upper.add(circle(0.17, hair, -0.3, 1.72, 0.011));
    if (beard) upper.add(poly([[0.02, 1.28], [0.32, 1.28], [0.26, 0.9], [0.02, 0.86]], beard, 0.025));

    if (hat?.type === 'pointed') {
      upper.add(rect(1.0, 0.16, hat.color, 0, 1.65, 0.03));
      upper.add(poly([[-0.4, 1.7], [0.4, 1.7], [0, 2.2]], hat.color, 0.04));
    } else if (hat?.type === 'cap') {
      upper.add(rect(0.8, 0.3, hat.color, 0, 1.78, 0.04));
      upper.add(rect(0.5, 0.1, hat.color, 0.42, 1.66, 0.04)); // aba
    }
    g.add(upper);

    if (cane) g.add(rect(0.08, 1.9, '#4a3220', 0.55, 0.95, 0.045));
    if (lantern) {
      g.add(rect(0.3, 0.38, '#ffcf70', 0.66, 0.6, 0.05));
      g.add(rect(0.34, 0.06, '#2b2622', 0.66, 0.82, 0.055));
      g.add(circle(0.9, '#ffcf70', 0.66, 0.6, 0.04, { transparent: true, opacity: 0.16 }));
    }
    return g;
  }

  /** Balão "..." que aparece sobre quem ainda não conversou com o jogador. */
  _makeBubble() {
    const g = new THREE.Group();
    g.add(circle(0.55, '#f6ead2', 0, 0, 0.05, { transparent: true, opacity: 0.93 }));
    g.add(poly([[-0.15, -0.45], [0.15, -0.45], [0, -0.85]], '#f6ead2', 0.05));
    for (const i of [-1, 0, 1]) g.add(circle(0.07, '#3a2a20', i * 0.22, 0, 0.06));
    return g;
  }

  _buildNPCs() {
    NPC_DEFS.forEach((def, index) => {
      const holder = new THREE.Group();
      holder.position.set(def.x, DECK_Y, 1.0);

      const figure = new THREE.Group(); // vira com scale.x
      const body = this._makeFigure(def.look);
      figure.add(body);
      const baseScale = def.look.scale ?? 1;
      figure.scale.set(baseScale * def.facing, baseScale, 1);
      holder.add(figure);

      const bubbleY = 3.1 * baseScale + 1.1;
      const bubble = this._makeBubble();
      bubble.position.set(0, bubbleY, 0.1);
      holder.add(bubble);

      this.scene.add(holder);
      this.npcs.push({
        id: def.id, name: def.name, x: def.x, facing: def.facing,
        holder, figure, body, bubble, bubbleY, baseScale,
        phase: index * 1.7, talked: false,
      });
    });
  }

  // ---------- controle ----------

  /** Volta o personagem ao começo do cais e centra a câmera nele. */
  reset() {
    this.characterX = START_X;
    this._facing = 1;
    this._walkPhase = 0;
    this.camera.position.x = THREE.MathUtils.clamp(this.characterX, -this._cameraLimit(), this._cameraLimit());
    this._applyLayers();
    this.character.position.set(this.characterX, DECK_Y, 1.2);
    this.character.scale.x = 1;
    for (const npc of this.npcs) {
      npc.talked = false;
      npc.bubble.visible = true;
    }
  }

  /** Pessoa mais próxima dentro do alcance de conversa, ou null. */
  getNearbyNPC() {
    let best = null;
    let bestDistance = INTERACT_RANGE;
    for (const npc of this.npcs) {
      const distance = Math.abs(npc.x - this.characterX);
      if (distance <= bestDistance) {
        best = npc;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** Vira o personagem para a pessoa (usar ao começar a conversa). */
  faceNPC(npc) {
    this._facing = Math.sign(npc.x - this.characterX) || this._facing;
    this.character.scale.x = this._facing;
  }

  /** Esconde o balão da pessoa depois de conversar. */
  markTalked(id) {
    const npc = this.npcs.find((n) => n.id === id);
    if (!npc) return;
    npc.talked = true;
    npc.bubble.visible = false;
  }

  onResize() {
    const halfW = (VIEW_HEIGHT / 2) * (window.innerWidth / window.innerHeight);
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = VIEW_HEIGHT / 2;
    this.camera.bottom = -VIEW_HEIGHT / 2;
    this.camera.updateProjectionMatrix();
  }

  _cameraLimit() {
    return Math.max(0, WORLD_HALF_WIDTH - this.camera.right);
  }

  _applyLayers() {
    for (const { group, factor } of this._layers) {
      group.position.x = this.camera.position.x * factor;
    }
  }

  /**
   * Chame a cada frame enquanto a fase for 'harbor'.
   * `frozen: true` (durante uma conversa) impede o personagem de andar.
   */
  update(delta, elapsed, input, { frozen = false } = {}) {
    // andar (A/D)
    const axis = frozen ? 0 : input.getHorizontalAxis();
    this.characterX = THREE.MathUtils.clamp(
      this.characterX + axis * WALK_SPEED * delta,
      WALK_MIN_X,
      WALK_MAX_X
    );
    if (axis !== 0) this._facing = axis;

    // animação de caminhada
    const walking = axis !== 0;
    if (walking) this._walkPhase += delta * 11;
    const swing = walking ? Math.sin(this._walkPhase) * 0.6 : 0;
    const k = dampFactor(20, delta);
    this._legL.rotation.z += (swing - this._legL.rotation.z) * k;
    this._legR.rotation.z += (-swing - this._legR.rotation.z) * k;
    const bob = walking ? Math.abs(Math.sin(this._walkPhase)) * 0.08 : 0;
    this.character.position.set(this.characterX, DECK_Y + bob, 1.2);
    this.character.scale.x = this._facing;

    // câmera segue o personagem (limitada ao cenário) e as camadas fazem paralaxe
    const limit = this._cameraLimit();
    const targetX = THREE.MathUtils.clamp(this.characterX, -limit, limit);
    this.camera.position.x += (targetX - this.camera.position.x) * dampFactor(4, delta);
    this._applyLayers();

    // pessoas: respiram, viram para o jogador quando ele chega perto, balões flutuam
    for (const npc of this.npcs) {
      npc.body.position.y = Math.sin(elapsed * 1.6 + npc.phase) * 0.03;
      const dx = this.characterX - npc.x;
      const dir = Math.abs(dx) < INTERACT_RANGE + 3 ? Math.sign(dx) || npc.facing : npc.facing;
      npc.figure.scale.x = npc.baseScale * dir;
      npc.bubble.position.y = npc.bubbleY + Math.sin(elapsed * 2.4 + npc.phase) * 0.12;
    }

    // vida no cenário
    this.boat.position.y = WATER_Y + Math.sin(elapsed * 1.2) * 0.12;
    this.boat.rotation.z = Math.sin(elapsed * 0.9) * 0.02;

    this._wavelets.forEach((w, i) => {
      w.position.x = w.userData.baseX + Math.sin(elapsed * 0.8 + i) * 0.7;
    });
    this._shimmer.forEach((line, i) => {
      line.scale.x = 0.8 + 0.2 * Math.sin(elapsed * 1.7 + i * 1.3);
    });
    this._lampHalos.forEach((halo, i) => {
      halo.material.opacity = 0.13 + 0.04 * Math.sin(elapsed * 3 + i * 2);
    });
    for (const cloud of this._clouds) {
      cloud.position.x += delta * 0.3;
      if (cloud.position.x > 70) cloud.position.x = -70;
    }
  }

  dispose() {
    this.scene.traverse((child) => {
      child.geometry?.dispose();
      if (child.material) {
        child.material.map?.dispose();
        child.material.dispose();
      }
    });
    this.scene.background?.dispose?.();
  }
}

export default Harbor;