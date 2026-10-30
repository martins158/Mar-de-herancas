// src/systems/BoatCollider.js
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
    this.ellipses = []; // elipses cheias (ilha oval)
  }

  addBox(minX, maxX, minZ, maxZ) {
    this.boxes.push({ minX, maxX, minZ, maxZ });
  }

  addCircle(x, z, r) {
    this.circles.push({ x, z, r });
  }

  /** Elipse cheia (ilha), alinhada aos eixos: centro (x, z), semieixos rx e rz. */
  addEllipse(x, z, rx, rz) {
    this.ellipses.push({ x, z, rx, rz });
  }

  addObstacles({ boxes = [], circles = [], ellipses = [] } = {}) {
    for (const b of boxes) this.addBox(b.minX, b.maxX, b.minZ, b.maxZ);
    for (const c of circles) this.addCircle(c.x, c.z, c.r);
    for (const e of ellipses) this.addEllipse(e.x, e.z, e.rx, e.rz);
  }

  resolve(position, yaw) {
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);
    let touched = false;

    for (let it = 0; it < this.iterations; it++) {
      let moved = false;

      for (const part of this.hull) {
        const cx = position.x + part.z * sin;
        const cz = position.z + part.z * cos;

        for (const b of this.boxes) {
          if (this._pushFromBox(position, cx, cz, part.r, b)) moved = true;
        }
        for (const c of this.circles) {
          if (this._pushFromCircle(position, cx, cz, part.r, c)) moved = true;
        }
        for (const e of this.ellipses) {
          if (this._pushFromEllipse(position, cx, cz, part.r, e)) moved = true;
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

  /** Empurra o círculo (cx, cz, r) para fora da elipse cheia, pela normal do contorno. */
  _pushFromEllipse(position, cx, cz, r, e) {
    const dx = cx - e.x;
    const dz = cz - e.z;
    const d = Math.sqrt((dx * dx) / (e.rx * e.rx) + (dz * dz) / (e.rz * e.rz));
    if (d < 1e-6) {
      position.x += e.rx + r;
      return true;
    }
    // gradiente de d: aproxima a distância assinada até o contorno por (d - 1) / |grad|
    const gx = dx / (e.rx * e.rx * d);
    const gz = dz / (e.rz * e.rz * d);
    const g = Math.hypot(gx, gz);
    const signed = (d - 1) / g;
    if (signed >= r) return false;
    const push = r - signed;
    position.x += (gx / g) * push;
    position.z += (gz / g) * push;
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