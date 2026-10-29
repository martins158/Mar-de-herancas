// src/systems/BoatCollider.js

/**
 * BoatCollider
 * Colisão do barco contra sólidos estáticos (cais, pilares, cascos velhos, terra).
 * Tudo no plano XZ: os sólidos são caixas alinhadas aos eixos e círculos; o
 * barco é uma fileira de círculos ao longo do casco (proa fina, meio largo).
 * Não impede o movimento: depois que o barco anda, resolve() empurra a posição
 * para fora do que ele atravessou, então ele escorrega pelas paredes.
 *
 * Uso:
 *   const collider = new BoatCollider();
 *   collider.addObstacles(pier.getObstacles());
 *
 *   // no loop, logo depois de player.update(delta):
 *   collider.resolve(player.mesh.position, player.mesh.rotation.y);
 */

// círculos do casco: z local (-Z = proa) e raio
const DEFAULT_HULL = [
  { z: -2.6, r: 0.6 },
  { z: -0.9, r: 1.1 },
  { z: 0.9, r: 1.1 },
  { z: 2.5, r: 0.85 },
];

export class BoatCollider {
  constructor({ hull = DEFAULT_HULL, iterations = 3 } = {}) {
    this.hull = hull;
    this.iterations = iterations;
    this.boxes = [];
    this.circles = [];
  }

  addBox(minX, maxX, minZ, maxZ) {
    this.boxes.push({ minX, maxX, minZ, maxZ });
  }

  addCircle(x, z, r) {
    this.circles.push({ x, z, r });
  }

  /** Aceita o formato de HarborPier3D.getObstacles(). */
  addObstacles({ boxes = [], circles = [] } = {}) {
    for (const b of boxes) this.addBox(b.minX, b.maxX, b.minZ, b.maxZ);
    for (const c of circles) this.addCircle(c.x, c.z, c.r);
  }

  /**
   * Empurra `position` (Vector3, modificado no lugar) para fora dos sólidos.
   * Devolve true se houve contato.
   */
  resolve(position, yaw) {
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    let touched = false;

    for (let it = 0; it < this.iterations; it++) {
      let moved = false;

      for (const part of this.hull) {
        // centro do círculo no mundo (z local → mundo: (z·sin, z·cos))
        const cx = position.x + part.z * sin;
        const cz = position.z + part.z * cos;

        for (const b of this.boxes) {
          if (this._pushFromBox(position, cx, cz, part.r, b)) moved = true;
        }
        for (const c of this.circles) {
          if (this._pushFromCircle(position, cx, cz, part.r, c)) moved = true;
        }
      }

      if (!moved) break;
      touched = true;
    }
    return touched;
  }

  _pushFromBox(position, cx, cz, r, b) {
    const px = Math.min(Math.max(cx, b.minX), b.maxX);
    const pz = Math.min(Math.max(cz, b.minZ), b.maxZ);
    let dx = cx - px;
    let dz = cz - pz;
    const distSq = dx * dx + dz * dz;
    if (distSq >= r * r && !(distSq === 0)) return false;

    if (distSq > 1e-10) {
      const dist = Math.sqrt(distSq);
      const push = r - dist;
      position.x += (dx / dist) * push;
      position.z += (dz / dist) * push;
      return true;
    }

    // centro dentro da caixa: sai pelo lado mais perto
    const left = cx - b.minX;
    const right = b.maxX - cx;
    const near = cz - b.minZ;
    const far = b.maxZ - cz;
    const min = Math.min(left, right, near, far);
    if (min === left) position.x -= left + r;
    else if (min === right) position.x += right + r;
    else if (min === near) position.z -= near + r;
    else position.z += far + r;
    return true;
  }

  _pushFromCircle(position, cx, cz, r, c) {
    const dx = cx - c.x;
    const dz = cz - c.z;
    const min = r + c.r;
    const distSq = dx * dx + dz * dz;
    if (distSq >= min * min) return false;

    const dist = Math.sqrt(distSq);
    if (dist < 1e-6) {
      position.x += min;
      return true;
    }
    const push = min - dist;
    position.x += (dx / dist) * push;
    position.z += (dz / dist) * push;
    return true;
  }
}

export default BoatCollider;