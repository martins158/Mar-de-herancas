// src/systems/SeaBounds.js

/**
 * SeaBounds
 * Parede invisível em volta da área jogável do mar (um retângulo no plano XZ).
 * O barco não passa dela e, perto da borda, o jogo avisa que o rumo está errado
 * (o texto fica em data/story.js: SEA_MESSAGES.wrongWay).
 *
 * Não desenha nada e não conhece a história. Os limites vêm de data/story.js (SEA_BOUNDS)
 * e o main.js ainda os aumenta, se preciso, para caberem todos os pontos e itens do mar.
 *
 * Uso:
 *   const bounds = new SeaBounds({ minX, maxX, minZ, maxZ, warn: 14 });
 *   bounds.include(x, z, margin);               // garante que o ponto (x, z) fica dentro, com folga
 *   bounds.resolve(player.mesh.position);       // depois do collider: devolve true se encostou na parede
 *   bounds.isNear(player.mesh.position);        // true a menos de `warn` da borda: mostrar o aviso
 */
export class SeaBounds {
  constructor({ minX = -Infinity, maxX = Infinity, minZ = -Infinity, maxZ = Infinity, warn = 14 } = {}) {
    this.minX = minX;
    this.maxX = maxX;
    this.minZ = minZ;
    this.maxZ = maxZ;
    this.warn = warn; // distância (u) da borda em que o aviso aparece
  }

  /** Aumenta o retângulo, se precisar, para o ponto (x, z) caber com `margin` de folga. */
  include(x, z, margin = 0) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return;
    this.minX = Math.min(this.minX, x - margin);
    this.maxX = Math.max(this.maxX, x + margin);
    this.minZ = Math.min(this.minZ, z - margin);
    this.maxZ = Math.max(this.maxZ, z + margin);
  }

  /** Empurra a posição para dentro do retângulo (só x e z). true = estava fora e foi trazida de volta. */
  resolve(position) {
    let hit = false;
    if (position.x < this.minX) { position.x = this.minX; hit = true; }
    else if (position.x > this.maxX) { position.x = this.maxX; hit = true; }
    if (position.z < this.minZ) { position.z = this.minZ; hit = true; }
    else if (position.z > this.maxZ) { position.z = this.maxZ; hit = true; }
    return hit;
  }

  /** Menor distância (u) da posição até a parede (negativa = fora). */
  distanceToEdge(position) {
    return Math.min(position.x - this.minX, this.maxX - position.x, position.z - this.minZ, this.maxZ - position.z);
  }

  /** A posição está a menos de `warn` da parede? */
  isNear(position) {
    return this.distanceToEdge(position) < this.warn;
  }
}

export default SeaBounds;