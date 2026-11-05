// src/systems/RescueSystem.js

/**
 * RescueSystem
 * A regra do resgate: o barco precisa ficar DENTRO do aro e QUASE PARADO por
 * `holdTime` segundos para puxar o náufrago. Dentro do aro mas rápido demais, o
 * progresso desce devagar; fora do aro, desce rápido. Não desenha nada (veja
 * ui/RescueBar.js) e não sabe de história: só devolve o estado.
 *
 * Uso:
 *   const rescue = new RescueSystem({ position: wreckPoint.position, radius: wreckPoint.radius });
 *   // todo frame em que o resgate está valendo:
 *   const r = rescue.update(delta, boat.position, boatSpeed);
 *   // r = { inside, slow, progress (0..1), done }  (done vale true UMA vez)
 *   rescue.reset();
 */

export class RescueSystem {
  constructor({ position, radius = 14, holdTime = 3.5, maxSpeed = 1.3 }) {
    this.position = position;
    this.radius = radius;
    this.holdTime = holdTime; // s parado dentro do aro
    this.maxSpeed = maxSpeed; // u/s: acima disso não conta como parado
    this.progress = 0;
    this._done = false;
  }

  update(delta, boatPos, speed) {
    const inside = Math.hypot(boatPos.x - this.position.x, boatPos.z - this.position.z) <= this.radius;
    const slow = speed <= this.maxSpeed;

    if (this._done) return { inside, slow, progress: 1, done: false };

    if (inside && slow) this.progress += delta / this.holdTime;
    else if (inside) this.progress -= (delta / this.holdTime) * 0.8; // dentro, mas rápido: desce devagar
    else this.progress -= (delta / this.holdTime) * 3; // fora do aro: desce rápido
    this.progress = Math.min(Math.max(this.progress, 0), 1);

    if (this.progress >= 1) {
      this._done = true;
      return { inside, slow, progress: 1, done: true };
    }
    return { inside, slow, progress: this.progress, done: false };
  }

  reset() {
    this.progress = 0;
    this._done = false;
  }
}

export default RescueSystem;