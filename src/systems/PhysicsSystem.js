// src/systems/PhysicsSystem.js
import * as THREE from 'three';

/**
 * FloatingBody
 * Flutuação passiva do barco nas ondas. O barco segue a água com uma mola
 * amortecida na altura (heave) e no balanço (pitch e roll), calculados a
 * partir de uma grade de pontos do casco amostrada no oceano
 * (ocean.getHeightAt), e uma RESTRIÇÃO DURA garante que:
 *   - o assoalho nunca fica abaixo da água (a água não entra no barco);
 *   - a borda sempre fica acima da água com folga (nada de "passar por dentro
 *     da onda").
 *
 * Convenções (iguais às do Player): `level` = altura MUNDIAL da linha d'água
 * do barco (y local 0 do visual); pitch > 0 = proa sobe; roll > 0 = boreste
 * (direita) sobe.
 *
 * Uso:
 *   const body = new FloatingBody({ ocean });
 *   const { level, pitch, roll } = body.update(delta, x, z, yaw, turnAxis);
 *   boat.position.y = level - mesh.position.y;
 *   boat.rotation.x = pitch;  boat.rotation.z = roll;
 */

// medidas do casco (iguais às do Player): assoalho em y 0.4; borda >= 0.95
const FLOOR_Y = 0.4;
const SHEER_MIN = 0.95;
const FLOOR_MARGIN = 0.12; // assoalho sempre pelo menos isso acima da água
const RAIL_MARGIN = 0.35; // borda sempre pelo menos isso acima da água

// pontos de amostra (z local: -Z = proa; x local: +X = boreste)
const STATIONS = [-2.6, -1.3, 0, 1.3, 2.6];
const half = (z) => 1.0 * (1 - 0.55 * (Math.abs(z) / 3) ** 2); // meia-largura aproximada
const SAMPLES = [];
for (const z of STATIONS) for (const k of [-1, 0, 1]) SAMPLES.push({ x: k * half(z), z });

const MAX_PITCH = 0.2; // ~11°
const MAX_ROLL = 0.26; // ~15°

export class FloatingBody {
  constructor({ ocean, heaveFreq = 5.2, heaveDamp = 0.9, tiltFreq = 6.5, tiltDamp = 0.85 } = {}) {
    this.ocean = ocean;
    this.kHeave = heaveFreq * heaveFreq;
    this.cHeave = 2 * heaveDamp * heaveFreq;
    this.kTilt = tiltFreq * tiltFreq;
    this.cTilt = 2 * tiltDamp * tiltFreq;

    this.y = null; // nível atual (null = ainda não inicializado)
    this.vy = 0;
    this.pitch = 0;
    this.roll = 0;
    this.vPitch = 0;
    this.vRoll = 0;
    this._w = new Float32Array(SAMPLES.length);
  }

  update(dt, x, z, yaw, turnAxis = 0) {
    if (!this.ocean) return { level: 0, pitch: 0, roll: 0 };
    dt = Math.min(dt, 1 / 20);
    const sin = Math.sin(yaw);
    const cos = Math.cos(yaw);

    // altura da água sob cada ponto da grade
    const w = this._w;
    let sum = 0;
    let sumZ = 0;
    let sumX = 0;
    for (let i = 0; i < SAMPLES.length; i++) {
      const s = SAMPLES[i];
      w[i] = this.ocean.getHeightAt(x + s.x * cos + s.z * sin, z - s.x * sin + s.z * cos);
      sum += w[i];
      sumZ += s.z;
      sumX += s.x;
    }
    const n = SAMPLES.length;
    const avg = sum / n;
    const zMean = sumZ / n;
    const xMean = sumX / n;

    // inclinação média da água ao longo e através do barco (mínimos quadrados)
    let szz = 0;
    let sxx = 0;
    let szw = 0;
    let sxw = 0;
    for (let i = 0; i < n; i++) {
      const dz = SAMPLES[i].z - zMean;
      const dx = SAMPLES[i].x - xMean;
      szz += dz * dz;
      sxx += dx * dx;
      szw += dz * (w[i] - avg);
      sxw += dx * (w[i] - avg);
    }
    const slopeZ = szw / szz; // água sobe em direção à popa (+z)
    const slopeX = sxw / sxx; // água sobe em direção ao boreste (+x)
    const targetPitch = THREE.MathUtils.clamp(Math.atan(-slopeZ), -MAX_PITCH, MAX_PITCH);
    const targetRoll = THREE.MathUtils.clamp(Math.atan(slopeX) - turnAxis * 0.06, -MAX_ROLL, MAX_ROLL);

    if (this.y === null) {
      this.y = avg;
      this.pitch = targetPitch;
      this.roll = targetRoll;
    }

    // mola amortecida (semi-implícita; em 2 passos para ficar estável com delta grande)
    const steps = 2;
    const h = dt / steps;
    for (let s = 0; s < steps; s++) {
      this.vy += ((avg - this.y) * this.kHeave - this.vy * this.cHeave) * h;
      this.y += this.vy * h;
      this.vPitch += ((targetPitch - this.pitch) * this.kTilt - this.vPitch * this.cTilt) * h;
      this.pitch += this.vPitch * h;
      this.vRoll += ((targetRoll - this.roll) * this.kTilt - this.vRoll * this.cTilt) * h;
      this.roll += this.vRoll * h;
    }
    this.pitch = THREE.MathUtils.clamp(this.pitch, -MAX_PITCH, MAX_PITCH);
    this.roll = THREE.MathUtils.clamp(this.roll, -MAX_ROLL, MAX_ROLL);

    // RESTRIÇÃO DURA: assoalho seco e borda acima da água, com a pose atual
    let required = -Infinity;
    for (let i = 0; i < n; i++) {
      const { x: sx, z: sz } = SAMPLES[i];
      const tilt = -sz * this.pitch + sx * this.roll; // quanto a pose levanta o ponto
      const floorNeeds = w[i] + FLOOR_MARGIN - FLOOR_Y - tilt;
      const railNeeds = w[i] + RAIL_MARGIN - SHEER_MIN - tilt;
      required = Math.max(required, floorNeeds, railNeeds);
    }
    if (this.y < required) {
      this.y = required;
      if (this.vy < 0) this.vy = 0;
    }

    return { level: this.y, pitch: this.pitch, roll: this.roll };
  }
}

export default FloatingBody;