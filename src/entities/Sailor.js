// src/entities/Sailor.js
import * as THREE from 'three';

/**
 * Sailor
 * O marinheiro (casaco azul, chapéu escuro de ponta, o mesmo do porto 2D) em
 * 3D, de pé dentro do barco, virado para boreste (+X do barco). Fica parado
 * enquanto você navega, com a vara deitada no banco de popa. Na pescaria ele
 * se abaixa, pega a vara, levanta, carrega o arremesso, lança, espera e
 * recolhe. Os braços usam um IK de dois ossos: as mãos sempre seguram a vara.
 *
 * Espaço local do marinheiro: pés em (0,0,0), olhando para -Z, direita = +X.
 * O grupo é virado -90° em Y para olhar para o +X do barco.
 *
 * Uso:
 *   const sailor = new Sailor();
 *   player.boat.add(sailor.group);
 *
 *   sailor.pickUp();                 // pega a vara (isReady fica true no fim)
 *   sailor.setCharge(0..1);          // enquanto segura a tecla (vara vai para trás)
 *   sailor.cast();                   // lança; consumeRelease() avisa a hora de soltar a linha
 *   sailor.setMode('wait' | 'reel' | 'ready');
 *   sailor.setTension(0..1);         // vara envergando
 *   sailor.putAway();                // guarda a vara
 *
 *   // no loop:
 *   sailor.update(delta, elapsed);
 *   sailor.getRodTip(vec3);          // ponta da vara em coordenadas do mundo
 */

const HIP_Y = 0.95;
const SHOULDER_X = 0.27;
const SHOULDER_Y = 0.58; // acima do quadril, dentro do tronco
const UPPER = 0.42;
const FORE = 0.4;
const ROD_BUTT = 0.45; // cabo atrás da empunhadura
const ROD_SEGMENTS = 6;
const ROD_SEG_LEN = 0.3;

const v = (x, y, z) => new THREE.Vector3(x, y, z);
const pose = (grip, dir, lean, rW, lW, bend = 0) => ({
  grip: v(...grip),
  dir: v(...dir).normalize(),
  lean,
  rW,
  lW,
  bend,
});

// poses (espaço local do marinheiro). lean > 0 = tronco inclinado para frente.
const STOWED_GRIP = [0.57, 0.58, -0.45]; // vara deitada em cima do banco de popa
const STOWED_DIR = [0, 0.2, -0.98];
const POSES = {
  stowed: pose(STOWED_GRIP, STOWED_DIR, 0.0, 0, 0),
  reach: pose(STOWED_GRIP, STOWED_DIR, 1.0, 1, 0), // abaixa e agarra a vara no banco
  ready: pose([0.1, 1.12, -0.42], [0, 0.55, -0.83], 0.08, 1, 1, 0.05),
  windup: pose([0.16, 1.45, -0.12], [0, 0.78, 0.62], -0.12, 1, 1, 0.1),
  swing: pose([0.1, 1.28, -0.5], [0, 0.38, -0.92], 0.28, 1, 1, 0.25),
  follow: pose([0.1, 1.15, -0.5], [0, 0.08, -1], 0.2, 1, 1, 0.1),
  wait: pose([0.1, 1.12, -0.45], [0, 0.18, -0.98], 0.1, 1, 1, 0.08),
  reel: pose([0.1, 1.15, -0.45], [0, 0.42, -0.9], 0.15, 1, 1, 0.1),
  lift: pose([0.12, 1.4, -0.3], [0, 0.85, -0.53], -0.05, 1, 1, 0.15),
};

const _tmpA = new THREE.Vector3();
const _tmpB = new THREE.Vector3();
const _tmpC = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _fwd = new THREE.Vector3(0, 0, -1);

export class Sailor {
  constructor({ position = new THREE.Vector3(0.3, 0.4, 0.75), yaw = -Math.PI / 2 } = {}) {
    this.group = new THREE.Group();
    this.group.position.copy(position);
    this.group.rotation.y = yaw;

    this.mode = 'stowed';
    this._seq = []; // { mode, dur, rate, onEnter }
    this._seqStep = null;
    this._seqTimer = 0;
    this._jerk = 0;
    this._rate = 8;
    this._released = false;
    this._time = 0;
    this._charge = 0;
    this._tension = 0;
    this._crank = false;
    this._crankAngle = 0;

    // pose atual (suavizada até a pose alvo)
    this.cur = {
      grip: POSES.stowed.grip.clone(),
      dir: POSES.stowed.dir.clone(),
      lean: 0,
      rW: 0,
      lW: 0,
      bend: 0,
    };

    this._materials = [];
    this._build();
    this.update(0.016, 0); // posiciona tudo na pose inicial
  }

  // ---------- construção ----------

  _mat(color, extra = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra });
    this._materials.push(m);
    return m;
  }

  _mesh(geometry, material, parent, x = 0, y = 0, z = 0) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  _build() {
    const coat = this._mat('#3b5f8a');
    const sleeve = this._mat('#33527a');
    const dark = this._mat('#2a2a32');
    const skin = this._mat('#e5b98f');

    // pernas e tronco
    for (const x of [-0.12, 0.12]) {
      this._mesh(new THREE.BoxGeometry(0.2, 0.9, 0.22), dark, this.group, x, 0.45, 0);
    }
    this.torso = new THREE.Group(); // pivô no quadril: inclina para pegar a vara
    this.torso.position.y = HIP_Y;
    this.group.add(this.torso);

    this._mesh(new THREE.BoxGeometry(0.54, 0.64, 0.3), coat, this.torso, 0, 0.32, 0);
    this._mesh(new THREE.BoxGeometry(0.56, 0.08, 0.32), dark, this.torso, 0, 0.03, 0);
    this._mesh(new THREE.SphereGeometry(0.17, 14, 10), skin, this.torso, 0, 0.82, 0);
    this._mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.035, 16), dark, this.torso, 0, 0.95, 0); // aba
    this._mesh(new THREE.ConeGeometry(0.18, 0.34, 12), dark, this.torso, 0, 1.13, 0); // chapéu de ponta

    // braços (atualizados por IK a cada frame; ficam no grupo, não no tronco)
    this._arms = [1, -1].map((side) => {
      const upper = this._mesh(new THREE.CylinderGeometry(0.06, 0.055, 1, 8), sleeve, this.group);
      const fore = this._mesh(new THREE.CylinderGeometry(0.05, 0.045, 1, 8), sleeve, this.group);
      const hand = this._mesh(new THREE.SphereGeometry(0.06, 10, 8), skin, this.group);
      return { side, upper, fore, hand };
    });

    this._buildRod();
  }

  _buildRod() {
    const handleMat = this._mat('#3a2a1c');
    const blankMat = this._mat('#8a7650');
    const metalMat = this._mat('#a8a8a6', { metalness: 0.6, roughness: 0.4 });

    this.rod = new THREE.Group(); // origem = empunhadura; vara aponta para -Z
    this.group.add(this.rod);

    const handleGeo = new THREE.CylinderGeometry(0.028, 0.026, ROD_BUTT + 0.15, 8);
    handleGeo.rotateX(-Math.PI / 2);
    this._mesh(handleGeo, handleMat, this.rod, 0, 0, (ROD_BUTT - 0.15) / 2);

    const reelGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.05, 12);
    reelGeo.rotateZ(Math.PI / 2);
    this._mesh(reelGeo, metalMat, this.rod, 0, -0.08, -0.05);
    this._mesh(new THREE.BoxGeometry(0.018, 0.05, 0.018), metalMat, this.rod, 0.04, -0.08, -0.05); // manivela

    // ponta em segmentos encadeados: cada um gira um pouco (envergar)
    this._rodSegs = [];
    let parent = this.rod;
    for (let i = 0; i < ROD_SEGMENTS; i++) {
      const seg = new THREE.Group();
      seg.position.z = i === 0 ? -0.15 : -ROD_SEG_LEN;
      const rBase = THREE.MathUtils.lerp(0.024, 0.008, i / ROD_SEGMENTS);
      const rTop = THREE.MathUtils.lerp(0.024, 0.008, (i + 1) / ROD_SEGMENTS);
      const geo = new THREE.CylinderGeometry(rTop, rBase, ROD_SEG_LEN, 6);
      geo.rotateX(-Math.PI / 2);
      geo.translate(0, 0, -ROD_SEG_LEN / 2);
      this._mesh(geo, blankMat, seg);
      parent.add(seg);
      this._rodSegs.push(seg);
      parent = seg;
    }
    this.rodTip = new THREE.Object3D();
    this.rodTip.position.z = -ROD_SEG_LEN;
    parent.add(this.rodTip);
  }

  // ---------- comandos ----------

  /** Abaixa, pega a vara no banco e levanta. */
  pickUp() {
    this._seq = [
      { mode: 'reach', dur: 0.6, rate: 9 },
      { mode: 'ready', dur: 0.8, rate: 6 },
    ];
  }

  /** Guarda a vara de volta no banco. */
  putAway() {
    this._seq = [
      { mode: 'reach', dur: 0.8, rate: 5 },
      { mode: 'stowed', dur: 0.7, rate: 8 },
    ];
  }

  /** Muda a pose direto ('ready', 'wait', 'reel', 'lift'...). */
  setMode(mode, rate = 6) {
    this._seq = [];
    this._seqStep = null;
    this.mode = mode;
    this._rate = rate;
  }

  /** Força do arremesso (0..1): leva a vara para trás da cabeça. Use no modo 'charge'. */
  setCharge(power) {
    if (this.mode !== 'charge') {
      this._seq = [];
      this._seqStep = null;
      this.mode = 'charge';
      this._rate = 10;
    }
    this._charge = THREE.MathUtils.clamp(power, 0, 1);
  }

  /** Arremesso: chicoteia a vara e avisa (consumeRelease) o momento de soltar a linha. */
  cast() {
    this._released = false;
    this._seq = [
      { mode: 'windup', dur: 0.12, rate: 14 },
      { mode: 'swing', dur: 0.14, rate: 22 },
      { mode: 'swing', dur: 0.01, rate: 22, onEnter: () => (this._released = true) },
      { mode: 'follow', dur: 0.55, rate: 7 },
      { mode: 'wait', dur: 0.2, rate: 5 },
    ];
  }

  /** true UMA vez, no instante em que a linha deve sair da ponta da vara. */
  consumeRelease() {
    const value = this._released;
    this._released = false;
    return value;
  }

  /** Tensão da linha (0..1): a vara envergada e tremendo. */
  setTension(t) {
    this._tension = THREE.MathUtils.clamp(t, 0, 1);
  }

  /** true enquanto a mão gira a manivela (recolhendo). */
  setCrank(on) {
    this._crank = on;
  }

  /** Puxão rápido da vara (peixe fisgou). */
  jerk() {
    this._jerk = 1;
  }

  get isReady() {
    return this._seq.length === 0 && this.mode === 'ready';
  }

  get isStowed() {
    return this._seq.length === 0 && this.mode === 'stowed';
  }

  get busy() {
    return this._seq.length > 0;
  }

  // ---------- animação ----------

  _targetPose() {
    if (this.mode === 'charge') {
      const a = POSES.ready;
      const b = POSES.windup;
      const t = this._charge;
      const tremble = t > 0.95 ? Math.sin(this._time * 55) * 0.02 : 0;
      return {
        grip: _tmpA.copy(a.grip).lerp(b.grip, t),
        dir: _tmpB.copy(a.dir).lerp(b.dir, t).normalize(),
        lean: THREE.MathUtils.lerp(a.lean, b.lean, t) + tremble,
        rW: 1,
        lW: 1,
        bend: THREE.MathUtils.lerp(a.bend, b.bend, t),
      };
    }
    return POSES[this.mode] ?? POSES.ready;
  }

  update(delta, elapsed = this._time + delta) {
    this._time = elapsed;

    // fila de animações (pegar, lançar, guardar)
    if (this._seq.length > 0) {
      const step = this._seq[0];
      if (this._seqStep !== step) {
        this._seqStep = step;
        this._seqTimer = 0;
        this.mode = step.mode;
        this._rate = step.rate;
        step.onEnter?.();
      }
      this._seqTimer += delta;
      if (this._seqTimer >= step.dur) {
        this._seq.shift();
        this._seqStep = null;
      }
    }

    const target = this._targetPose();
    const k = 1 - Math.exp(-this._rate * delta);
    const cur = this.cur;
    cur.grip.lerp(target.grip, k);
    cur.dir.lerp(target.dir, k).normalize();
    cur.lean += (target.lean - cur.lean) * k;
    cur.rW += (target.rW - cur.rW) * k;
    cur.lW += (target.lW - cur.lW) * k;
    cur.bend += (target.bend - cur.bend) * k;

    if (this._jerk > 0) this._jerk = Math.max(0, this._jerk - delta * 4);

    // vara: posição, direção e envergadura
    const tension = this.mode === 'reel' ? this._tension : 0;
    const shake = tension > 0.55 ? Math.sin(elapsed * 38) * 0.008 * (tension - 0.4) : 0;
    this.rod.position.copy(cur.grip);
    this.rod.position.y += shake;
    this.rod.quaternion.setFromUnitVectors(_fwd, cur.dir);

    const bendTotal = cur.bend + tension * 0.55 + this._jerk * 0.5;
    for (const seg of this._rodSegs) seg.rotation.x = -bendTotal / ROD_SEGMENTS;

    // tronco inclinado
    this.torso.rotation.x = -cur.lean;
    const cosL = Math.cos(cur.lean);
    const sinL = Math.sin(cur.lean);
    const shoulderY = HIP_Y + SHOULDER_Y * cosL;
    const shoulderZ = -SHOULDER_Y * sinL;

    // alvos das mãos
    const gripR = _tmpC.copy(cur.grip);
    let crank = null;
    if (this._crank && this.mode === 'reel') {
      this._crankAngle += delta * 11;
      crank = [Math.cos(this._crankAngle) * 0.07, Math.sin(this._crankAngle) * 0.07];
    }

    for (const arm of this._arms) {
      const sx = arm.side * SHOULDER_X;
      const shoulder = _tmpA.set(sx, shoulderY, shoulderZ);
      const rest = _tmpB.set(sx + arm.side * 0.05, shoulderY - 0.66, shoulderZ + 0.04);

      const hold = arm.side === 1 ? gripR.clone() : gripR.clone().addScaledVector(cur.dir, -0.28);
      if (arm.side === 1 && crank) {
        hold.addScaledVector(cur.dir, -0.05);
        hold.x += crank[0];
        hold.y += crank[1];
      }
      const w = arm.side === 1 ? cur.rW : cur.lW;
      const target = rest.clone().lerp(hold, THREE.MathUtils.clamp(w, 0, 1));
      this._solveArm(arm, shoulder.clone(), target);
    }
  }

  /** IK de dois ossos: ombro → cotovelo → mão (limita ao alcance do braço). */
  _solveArm(arm, shoulder, target) {
    const toTarget = target.clone().sub(shoulder);
    const dist = Math.min(toTarget.length(), UPPER + FORE - 0.002);
    const dir = toTarget.normalize();
    const hand = shoulder.clone().addScaledVector(dir, dist);

    const a = (UPPER * UPPER - FORE * FORE + dist * dist) / (2 * dist || 1);
    const h = Math.sqrt(Math.max(UPPER * UPPER - a * a, 0));
    const pole = v(arm.side * 0.6, -0.7, 0.25); // cotovelo para fora e para baixo
    pole.addScaledVector(dir, -pole.dot(dir)).normalize();
    const elbow = shoulder.clone().addScaledVector(dir, a).addScaledVector(pole, h);

    this._placeLimb(arm.upper, shoulder, elbow);
    this._placeLimb(arm.fore, elbow, hand);
    arm.hand.position.copy(hand);
  }

  _placeLimb(mesh, from, to) {
    const d = _tmpA.copy(to).sub(from);
    const len = d.length() || 0.0001;
    mesh.position.copy(from).addScaledVector(d, 0.5);
    mesh.scale.set(1, len, 1);
    mesh.quaternion.setFromUnitVectors(_up, d.divideScalar(len));
  }

  /** Ponta da vara em coordenadas do mundo (escreve em `out`). */
  getRodTip(out = new THREE.Vector3()) {
    this.group.updateWorldMatrix(true, true);
    return this.rodTip.getWorldPosition(out);
  }

  dispose() {
    this.group.traverse((obj) => obj.geometry?.dispose());
    for (const m of this._materials) m.dispose();
    this.group.removeFromParent();
  }
}

export default Sailor;