// src/world/SeaItems.js
import * as THREE from 'three';

/**
 * SeaItems
 * Itens que o mar devolve, boiando nas ondas: garrafas com mensagem e
 * relíquias. Cada um tem um MARCADOR sempre visível por cima ("?" nas garrafas,
 * "!" nas relíquias) que fica do mesmo tamanho na tela e some devagar quando
 * o barco está longe. Coleta = chegar perto (getNearby). Os dados vêm de
 * data/items.js; quem sabe o que já foi coletado é o GameState.
 *
 * Uso:
 *   const items = new SeaItems({ items: SEA_ITEMS, ocean });
 *   items.addTo(scene);
 *   items.refresh((id) => gameState.hasCollected(id), (flag) => gameState.hasFlag(flag));
 *
 *   // no loop:
 *   items.update(elapsed, boat.position);
 *   const near = items.getNearby(boat.position);      // item (dados) ou null
 *   items.dispose();
 */

const PICKUP_RADIUS = 5; // distância do centro do barco para coletar
const MARKER_NEAR = 120; // até aqui o marcador fica 100% visível
const MARKER_FAR = 190; // daqui em diante some

function markerTexture(glyph) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 96;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(48, 48, 40, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(22, 16, 10, 0.88)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#ffd27a';
  ctx.stroke();
  ctx.fillStyle = '#ffe9b0';
  ctx.font = 'bold 58px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 48, 52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class SeaItems {
  constructor({ items, ocean = null }) {
    this.ocean = ocean;
    this.group = new THREE.Group();
    this._textures = { bottle: markerTexture('?'), relic: markerTexture('!') };
    this._geometries = [];
    this._materials = [];
    this.entries = items.map((data) => this._build(data));
  }

  _mat(params) {
    const material = new THREE.MeshStandardMaterial(params);
    this._materials.push(material);
    return material;
  }

  _geo(geometry) {
    this._geometries.push(geometry);
    return geometry;
  }

  _mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(this._geo(geometry), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  _build(data) {
    const holder = new THREE.Group();
    holder.position.set(data.position[0], 0, data.position[1]);
    const body = new THREE.Group();
    holder.add(body);

    if (data.kind === 'bottle') {
      const glass = this._mat({ color: 0x5f8f6a, transparent: true, opacity: 0.8, roughness: 0.15 });
      const cork = this._mat({ color: 0x9a7448, roughness: 1 });
      const paper = this._mat({ color: 0xf1e6c8, roughness: 1 });
      const bottle = new THREE.Group();
      bottle.rotation.z = 1.25; // deitada, como boia na água
      this._mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.9, 12), glass, bottle, 0, 0, 0);
      this._mesh(new THREE.CylinderGeometry(0.08, 0.2, 0.3, 12), glass, bottle, 0, 0.6, 0);
      this._mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 10), cork, bottle, 0, 0.82, 0);
      this._mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.5, 8), paper, bottle, 0, -0.05, 0);
      body.add(bottle);
    } else {
      const wood = this._mat({ color: 0x7a5232, roughness: 0.95 });
      const gold = this._mat({ color: 0xd9a93c, roughness: 0.4, metalness: 0.6 });
      this._mesh(new THREE.BoxGeometry(0.85, 0.55, 0.65), wood, body, 0, 0.15, 0);
      this._mesh(new THREE.BoxGeometry(0.9, 0.08, 0.7), gold, body, 0, 0.3, 0);
      this._mesh(new THREE.BoxGeometry(0.9, 0.08, 0.7), gold, body, 0, 0.0, 0);
    }

    const marker = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: this._textures[data.kind === 'bottle' ? 'bottle' : 'relic'],
        depthTest: false,
        depthWrite: false,
        transparent: true,
        sizeAttenuation: false, // mesmo tamanho na tela, de perto ou de longe
        fog: false,
      })
    );
    marker.scale.set(0.055, 0.055, 1);
    marker.position.y = 3.2;
    marker.renderOrder = 12;
    holder.add(marker);
    this._materials.push(marker.material);

    this.group.add(holder);
    return { data, holder, body, marker, active: false, phase: (data.position[0] * 0.37 + data.position[1] * 0.21) % 6.28 };
  }

  addTo(scene) {
    scene.add(this.group);
  }

  /** Mostra só o que ainda não foi coletado e já foi liberado pela história. */
  refresh(isCollected, hasFlag) {
    for (const e of this.entries) {
      e.active = !isCollected(e.data.id) && (!e.data.after || hasFlag(e.data.after));
      e.holder.visible = e.active;
    }
  }

  update(elapsed, boatPosition) {
    for (const e of this.entries) {
      if (!e.active) continue;
      const { holder, body, marker, data } = e;
      const x = data.position[0];
      const z = data.position[1];
      holder.position.y = (this.ocean ? this.ocean.getHeightAt(x, z) : 0) + 0.12 + Math.sin(elapsed * 1.6 + e.phase) * 0.07;
      body.rotation.z = Math.sin(elapsed * 1.1 + e.phase) * 0.12;
      body.rotation.x = Math.cos(elapsed * 0.9 + e.phase) * 0.1;
      body.rotation.y = elapsed * 0.15 + e.phase;
      marker.position.y = 3.2 + Math.sin(elapsed * 2 + e.phase) * 0.18;

      const d = Math.hypot(boatPosition.x - x, boatPosition.z - z);
      marker.material.opacity = THREE.MathUtils.clamp((MARKER_FAR - d) / (MARKER_FAR - MARKER_NEAR), 0, 1);
    }
  }

  /** Item (dados) ao alcance do barco, ou null. */
  getNearby(position, radius = PICKUP_RADIUS) {
    for (const e of this.entries) {
      if (!e.active) continue;
      if (Math.hypot(position.x - e.data.position[0], position.z - e.data.position[1]) <= radius) return e.data;
    }
    return null;
  }

  dispose() {
    for (const g of this._geometries) g.dispose();
    for (const m of this._materials) m.dispose();
    for (const t of Object.values(this._textures)) t.dispose();
    this.group.removeFromParent();
  }
}

export default SeaItems;