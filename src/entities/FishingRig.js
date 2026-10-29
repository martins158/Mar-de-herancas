// src/entities/FishingRig.js
import * as THREE from 'three';

/**
 * FishingRig
 * A parte da pescaria que fica na água: a boia (vermelha e branca), a linha
 * saindo da ponta da vara, as ondinhas no ponto em que a boia cai e o peixe
 * que salta para dentro do barco quando é fisgado. Só desenha: quem manda é o
 * FishingSystem.
 *
 * Uso:
 *   const rig = new FishingRig({ ocean });
 *   rig.addTo(scene);
 *
 *   rig.launch(from, target, duration);   // arremesso em arco até a água
 *   rig.consumeLanded();                  // true UMA vez quando a boia cai
 *   rig.setFloatPosition(x, z);           // enquanto recolhe
 *   rig.nibble(); rig.bite();             // beliscada / fisgada
 *   rig.playCatch(to, color);             // peixe salta para o barco
 *   rig.hide();
 *
 *   // no loop:
 *   rig.update(delta, elapsed, rodTipWorld);
 */

const LINE_POINTS = 24;
const RIPPLES = 6;

export class FishingRig {
  constructor({ ocean = null } = {}) {
    this.ocean = ocean;
    this.group = new THREE.Group();
    this.group.visible = false;

    this.state = 'hidden'; // 'hidden' | 'flight' | 'floating'
    this.floatPos = new THREE.Vector3();
    this.sag = 0.3; // barriga da linha (0 = esticada)
    this._from = new THREE.Vector3();
    this._target = new THREE.Vector3();
    this._flightT = 0;
    this._flightDur = 1;
    this._landed = false;
    this._submerge = 0;
    this._kick = 0;
    this._biting = false;
    this._time = 0;

    this._buildBobber();
    this._buildLine();
    this._buildRipples();
    this._buildFish();
  }

  _buildBobber() {
    this.bobber = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: 0xd63a2a, roughness: 0.5 });
    const white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.5 });
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), red);
    const bottom = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      white
    );
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), white);
    stick.position.y = 0.3;
    this.bobber.add(top, bottom, stick);
    this.bobber.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.group.add(this.bobber);
  }

  _buildLine() {
    this._linePositions = new Float32Array(LINE_POINTS * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this._linePositions, 3));
    this.line = new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: 0xf1f1e8, transparent: true, opacity: 0.85 })
    );
    this.line.frustumCulled = false;
    this.group.add(this.line);
  }

  _buildRipples() {
    const geometry = new THREE.RingGeometry(0.3, 0.4, 36);
    geometry.rotateX(-Math.PI / 2);
    this._ripples = [];
    for (let i = 0; i < RIPPLES; i++) {
      const mesh = new THREE.Mesh(
        geometry,
        new THREE.MeshBasicMaterial({ color: 0xe8f4f2, transparent: true, opacity: 0, depthWrite: false })
      );
      mesh.visible = false;
      mesh.renderOrder = 4;
      this.group.add(mesh);
      this._ripples.push({ mesh, age: 0, life: 1.5, active: false, size: 1 });
    }
    this._rippleIndex = 0;
  }

  _buildFish() {
    this.fish = new THREE.Group();
    this._fishMat = new THREE.MeshStandardMaterial({ color: 0xb9c7d1, roughness: 0.35, metalness: 0.3 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 14, 10), this._fishMat);
    body.scale.set(1, 0.34, 0.26);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 4), this._fishMat);
    tail.rotation.z = Math.PI / 2;
    tail.position.x = -0.62;
    this.fish.add(body, tail);
    this.fish.visible = false;
    this.fish.traverse((o) => {
      if (o.isMesh) o.castShadow = true;
    });
    this.group.add(this.fish);
    this._catch = null; // { from, to, t, dur }
  }

  // ---------- comandos ----------

  /** Arremesso em arco: da ponta da vara até o ponto da água. */
  launch(from, target, duration) {
    this._from.copy(from);
    this._target.copy(target);
    this._flightT = 0;
    this._flightDur = Math.max(duration, 0.2);
    this._landed = false;
    this._submerge = 0;
    this._biting = false;
    this._kick = 0;
    this.sag = 0.15;
    this.state = 'flight';
    this.group.visible = true;
    this.floatPos.copy(from);
  }

  consumeLanded() {
    const value = this._landed;
    this._landed = false;
    return value;
  }

  /** Move a boia na água (xz) enquanto recolhe. */
  setFloatPosition(x, z) {
    this.floatPos.x = x;
    this.floatPos.z = z;
  }

  /** 0..1: o quanto a boia é puxada para baixo pelo peixe. */
  setSubmerge(amount) {
    this._submerge = amount;
  }

  /** Barriga da linha: 0 = esticada, 1 = bem frouxa. */
  setSlack(amount) {
    this.sag = THREE.MathUtils.lerp(0.05, 1.6, THREE.MathUtils.clamp(amount, 0, 1));
  }

  /** Beliscada: a boia afunda um pouquinho. */
  nibble() {
    this._kick = 0.22;
    this.ripple(this.floatPos.x, this.floatPos.z, 0.6);
  }

  /** Fisgada: a boia some e volta, tremendo. */
  bite() {
    this._biting = true;
    this.ripple(this.floatPos.x, this.floatPos.z, 1.2);
  }

  endBite() {
    this._biting = false;
  }

  /** Ondinha que se abre na água. */
  ripple(x, z, size = 1) {
    const r = this._ripples[this._rippleIndex++ % RIPPLES];
    r.active = true;
    r.age = 0;
    r.size = size;
    r.mesh.visible = true;
    r.mesh.position.set(x, this._waterHeight(x, z) + 0.12, z);
  }

  /** Peixe que salta da boia para `to` (mundo). */
  playCatch(to, color = 0xb9c7d1) {
    this._fishMat.color.setHex(color);
    this._catch = { from: this.floatPos.clone(), to: to.clone(), t: 0, dur: 0.9 };
    this.fish.visible = true;
    this.bobber.visible = false;
    this.line.visible = false;
  }

  hide() {
    this.state = 'hidden';
    this.group.visible = false;
    this._catch = null;
    this.fish.visible = false;
    this.bobber.visible = true;
    this.line.visible = true;
    this._biting = false;
    for (const r of this._ripples) {
      r.active = false;
      r.mesh.visible = false;
    }
  }

  // ---------- loop ----------

  _waterHeight(x, z) {
    return this.ocean ? this.ocean.getHeightAt(x, z) : 0;
  }

  update(delta, elapsed, tip) {
    this._time = elapsed;
    if (this.state === 'hidden' && !this._catch) return;

    if (this.state === 'flight') {
      this._flightT += delta / this._flightDur;
      const t = Math.min(this._flightT, 1);
      const arc = Math.sin(Math.PI * t) * (2.5 + this._from.distanceTo(this._target) * 0.12);
      this.floatPos.lerpVectors(this._from, this._target, t);
      this.floatPos.y = THREE.MathUtils.lerp(this._from.y, this._waterHeight(this._target.x, this._target.z), t) + arc;
      this.bobber.position.copy(this.floatPos);
      if (t >= 1) {
        this.state = 'floating';
        this._landed = true;
        this.ripple(this._target.x, this._target.z, 1.5);
      }
    }

    if (this.state === 'floating') {
      this._kick *= Math.exp(-4 * delta);
      let dip = this._kick + this._submerge * 0.3;
      if (this._biting) dip += 0.3 + Math.sin(elapsed * 22) * 0.1;
      const bob = Math.sin(elapsed * 2.1 + this.floatPos.x) * 0.035;
      this.floatPos.y = this._waterHeight(this.floatPos.x, this.floatPos.z) + 0.05 + bob - dip;
      this.bobber.position.copy(this.floatPos);
      this.bobber.rotation.z = Math.sin(elapsed * 1.7) * 0.12 + (this._biting ? Math.sin(elapsed * 30) * 0.2 : 0);
    }

    if (tip) this._updateLine(tip);
    this._updateRipples(delta);
    this._updateCatch(delta);
  }

  _updateLine(tip) {
    const end = this.floatPos;
    const sag = this.state === 'flight' ? 0.15 : this.sag;
    const length = tip.distanceTo(end);
    const drop = sag * Math.min(length, 20) * 0.12;
    for (let i = 0; i < LINE_POINTS; i++) {
      const s = i / (LINE_POINTS - 1);
      const k = i * 3;
      this._linePositions[k] = THREE.MathUtils.lerp(tip.x, end.x, s);
      this._linePositions[k + 1] = THREE.MathUtils.lerp(tip.y, end.y + 0.2, s) - drop * 4 * s * (1 - s);
      this._linePositions[k + 2] = THREE.MathUtils.lerp(tip.z, end.z, s);
    }
    this.line.geometry.attributes.position.needsUpdate = true;
  }

  _updateRipples(delta) {
    for (const r of this._ripples) {
      if (!r.active) continue;
      r.age += delta;
      const t = r.age / r.life;
      if (t >= 1) {
        r.active = false;
        r.mesh.visible = false;
        continue;
      }
      r.mesh.scale.setScalar((1 + t * 5) * r.size);
      r.mesh.material.opacity = (1 - t) * 0.55;
    }
  }

  _updateCatch(delta) {
    const c = this._catch;
    if (!c) return;
    c.t += delta / c.dur;
    const t = Math.min(c.t, 1);
    this.fish.position.lerpVectors(c.from, c.to, t);
    this.fish.position.y += Math.sin(Math.PI * t) * 2.2;
    this.fish.rotation.z = Math.sin(t * 24) * 0.5; // se debatendo
    this.fish.rotation.y = Math.atan2(-(c.to.z - c.from.z), c.to.x - c.from.x);
    if (t >= 1) {
      this._catch = null;
      this.fish.visible = false;
    }
  }

  addTo(scene) {
    scene.add(this.group);
  }

  dispose() {
    this.group.traverse((obj) => {
      obj.geometry?.dispose();
      const mats = Array.isArray(obj.material) ? obj.material : obj.material ? [obj.material] : [];
      for (const m of mats) m.dispose();
    });
    this.group.removeFromParent();
  }
}

export default FishingRig;