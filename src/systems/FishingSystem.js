// src/systems/FishingSystem.js
import * as THREE from 'three';
import { TIERS, fishForSpot, getFish } from '../data/fish.js';
import { TUTORIAL } from '../data/tutorial.js';

/**
 * FishingSystem
 * Regras da pescaria (a máquina de estados). Não desenha nada: comanda o
 * Sailor (animação), o FishingRig (boia e linha) e o FishingUI (barras).
 *
 * Fases (phase):
 *   'off'      → fora do modo de pesca
 *   'pickup'   → o marinheiro abaixa e pega a vara
 *   'ready'    → vara na mão; segurar a tecla de pescar para carregar
 *   'charging' → segurando: a barra de força sobe (verde → vermelho = fortíssimo)
 *   'casting'  → soltou: lança; a boia voa até a água
 *   'waiting'  → espera de 4 a 7 s até o peixe fisgar
 *   'qte'      → quicktime: apertar a tecla de pescar com o ponteiro dentro da zona verde
 *   'reel'     → recolher: segurar para puxar, soltar para dar linha, mantendo
 *                o ponteiro no meio; se sair da zona por tempo demais, a isca solta
 *   'result'   → pescou / a isca soltou (alguns segundos)
 *   'putaway'  → guarda a vara e sai do modo
 *
 * TUTORIAL (primeira pescaria, uma vez): lançar normal; o quicktime desacelera e
 * CONGELA no ponto perfeito (painel + espera a tecla); depois o recolher abre com
 * uma pausa explicativa (e outra na primeira vez que a linha afrouxa).
 * Durante as pausas o jogo congela (this._pause) e só o painel responde.
 *
 * Uso:
 *   const fishing = new FishingSystem({ input, sailor, rig, ui, ocean, boat, keys, tutorial, spotId });
 *   // tutorial = { pending: () => bool, done: () => void } (opcional)
 *   // spotId = ponto de pesca ('primeira-boia'): decide quais peixes aparecem (data/fish.js)
 *   // input = InputSystem (fishHeld, consumeFishPress/Release, consumeStow)
 *   // keys = { fish: () => 'G', stow: () => 'Q' } (nomes das teclas para as dicas)
 *   fishing.start();              // entra no modo (barco parado na zona)
 *   fishing.update(delta, elapsed);   // todo frame (também com o modo desligado)
 *   fishing.active                // true enquanto pesca
 *   fishing.focusDistance         // para a câmera de pesca enquadrar a água
 */

const CHARGE_TIME = 1.8; // s segurando até a força máxima
const MIN_POWER = 0.07;
const CAST_MIN = 8;
const CAST_MAX = 34;
const WAIT_RANGE = [4, 7]; // s
const BOAT_REEL_DISTANCE = 2.6; // até onde o peixe é trazido (encosta no casco)

const QTE = {
  zoneWidth: 0.3, // fração da barra
  speed: 0.95, // barras por segundo
  maxPasses: 3, // quantas idas e vindas antes de o peixe escapar
};

const REEL = {
  zoneHalf: 0.11, // meia-largura da zona de puxe (antes 0,17: agora menor)
  tutorialZoneHalf: 0.15, // no tutorial a zona é um pouco maior
  holdAccel: 1.7, // aceleração do ponteiro segurando
  releaseAccel: 1.7, // ... e soltando
  damping: 3,
  progressRate: 0.1, // por segundo dentro da zona
  progressLoss: 0.04, // por segundo fora da zona
  slackLimit: 1.5, // s fora da zona antes de a isca soltar
  resultTime: 2.8,
};


const rand = (min, max) => min + Math.random() * (max - min);
const clamp01 = (x) => Math.min(Math.max(x, 0), 1);

export class FishingSystem {
  constructor({ input, sailor, rig, ui, ocean = null, boat, keys = null, tutorial = null, spotId = 'primeira-boia' }) {
    this.keys = keys ?? { fish: () => 'G', stow: () => 'Q' };
    this.tutorial = tutorial;
    this.spotId = spotId;
    this._pause = null; // { onResume }: jogo congelado esperando a tecla
    this._timeScale = 1; // câmera lenta do tutorial (sailor e boia)
    this._tutorialRun = false;
    this.input = input;
    this.sailor = sailor;
    this.rig = rig;
    this.ui = ui;
    this.ocean = ocean;
    this.boat = boat; // player.mesh (posição + giro do barco)

    this.phase = 'off';
    this.focusDistance = 6; // para a câmera

    this._tmpTip = new THREE.Vector3();
    this._tmpTarget = new THREE.Vector3();
    this._dir = new THREE.Vector3(1, 0, 0); // direção do lançamento (mundo)
    this._timer = 0;
    this._power = 0;
    this._castDistance = CAST_MIN;
    this._reel = null;
    this._qte = null;
    this._fish = getFish('sardinha');
    this.lastCatch = null; // { fish, kg } do último peixe/achado
    this.stats = { caught: 0, lost: 0, junk: 0 };
  }

  get active() {
    return this.phase !== 'off';
  }

  /** Entra no modo de pesca. */
  start() {
    if (this.active) return;
    this.input.reset();
    this.sailor.pickUp();
    this.ui.setHint('');
    this.focusDistance = 6;
    this._tutorialRun = this.tutorial?.pending() ?? false; // primeira pescaria do jogo?
    this._timeScale = 1;
    this._setPhase('pickup');
  }

  _setPhase(phase) {
    this.phase = phase;
    this._timer = 0;
  }

  // ---------- helpers ----------

  _boatDirection() {
    // +X local do barco (boreste) no mundo
    const yaw = this.boat.rotation.y;
    return this._dir.set(Math.cos(yaw), 0, -Math.sin(yaw));
  }

  _pointAt(distance, lateral = 0, out = this._tmpTarget) {
    const p = this.boat.position;
    out.set(p.x + this._dir.x * distance - this._dir.z * lateral, 0, p.z + this._dir.z * distance + this._dir.x * lateral);
    return out;
  }

  /** Sorteia peixe/achado do ponto (raridade: data/fish.js). Lançar mais forte favorece faixas altas. */
  _pickFish(power) {
    if (this._tutorialRun) return getFish('tainha'); // o primeiro peixe é sempre uma tainha
    const pool = fishForSpot(this.spotId);
    const weights = pool.map((f) => {
      const tier = TIERS[f.tier];
      return Math.max(0.05, tier.weight * (f.weight ?? 1) * (1 + (tier.index - 1.5) * (power - 0.5) * 0.9));
    });
    let roll = Math.random() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return pool[i];
    }
    return pool[0];
  }

  // ---------- pausa (tutorial) ----------

  /** Congela o jogo e mostra o passo do tutorial; ao apertar a tecla, chama onResume. */
  _pauseWith(step, onResume) {
    const data = TUTORIAL[step](this.keys);
    this._pause = { onResume };
    this.ui.showTutorial({ ...data, key: this.keys.fish() });
    this.input.consumeFishPress();
    this.input.consumeFishRelease();
  }

  _updatePause() {
    this.input.consumeFishRelease();
    if (!this.input.consumeFishPress()) return;
    const { onResume } = this._pause;
    this._pause = null;
    this.ui.hideTutorial();
    onResume?.();
  }

  _toReady() {
    this.rig.hide();
    this.ui.hideGauge();
    this.ui.hidePower();
    this.ui.hideResult();
    this.sailor.setMode('ready');
    this.sailor.setCrank(false);
    this.sailor.setTension(0);
    this.input.consumeFishPress();
    this.input.consumeFishRelease();
    this.focusDistance = 6;
    this.ui.setHint(
      this._tutorialRun
        ? TUTORIAL.firstCast(this.keys)
        : `Segure ${this.keys.fish()} para lançar  ·  ${this.keys.stow()} guarda a vara`
    );
    this._setPhase('ready');
  }

  // ---------- loop ----------

  update(delta, elapsed) {
    if (this._pause) this._updatePause();
    else switch (this.phase) {
      case 'pickup': this._updatePickup(); break;
      case 'ready': this._updateReady(); break;
      case 'charging': this._updateCharging(delta); break;
      case 'casting': this._updateCasting(delta); break;
      case 'waiting': this._updateWaiting(delta); break;
      case 'qte': this._updateQte(delta); break;
      case 'reel': this._updateReel(delta, elapsed); break;
      case 'result': this._updateResult(delta); break;
      case 'putaway': this._updatePutAway(); break;
      default: break; // 'off'
    }

    // durante a pausa o mundo congela; na câmera lenta ele anda devagar
    const ts = this._pause ? 0 : this._timeScale;
    this.sailor.update(delta * ts, elapsed);
    if (this.rig.state !== 'hidden' || this.phase !== 'off') {
      this.rig.update(delta * ts, elapsed, this.sailor.getRodTip(this._tmpTip));
    }
  }

  _updatePickup() {
    this.input.consumeFishPress();
    if (this.sailor.isReady) this._toReady();
  }

  _updateReady() {
    if (this.input.consumeStow()) {
      this.ui.setHint('');
      this.sailor.putAway();
      this._setPhase('putaway');
      return;
    }
    if (this.input.consumeFishPress()) {
      this._power = 0;
      this.input.consumeFishRelease();
      this.ui.showPower();
      this.ui.setPower(0);
      this.ui.setHint('Solte para lançar');
      this._setPhase('charging');
    }
  }

  _updateCharging(delta) {
    this._power = clamp01(this._power + delta / CHARGE_TIME);
    this.sailor.setCharge(this._power);
    this.ui.setPower(this._power);

    if (this.input.consumeFishRelease() || !this.input.fishHeld) {
      this.input.consumeFishRelease();
      if (this._power < MIN_POWER) {
        // soltou cedo demais: não lança
        this.ui.hidePower();
        this._toReady();
        return;
      }
      this._boatDirection();
      this._castDistance = THREE.MathUtils.lerp(CAST_MIN, CAST_MAX, Math.pow(this._power, 0.9));
      this.focusDistance = this._castDistance;
      this.sailor.cast();
      this.ui.setHint('');
      this._setPhase('casting');
    }
  }

  _updateCasting(delta) {
    this._timer += delta;
    if (this._timer > 0.5) this.ui.hidePower();

    if (this.sailor.consumeRelease()) {
      const lateral = rand(-1, 1) * this._castDistance * 0.04;
      const target = this._pointAt(this._castDistance, lateral);
      target.y = this.rig.ocean ? this.rig.ocean.getHeightAt(target.x, target.z) : 0;
      const flight = 0.55 + this._castDistance * 0.018;
      this.rig.launch(this.sailor.getRodTip(this._tmpTip), target, flight);
      this._cast = { x: target.x, z: target.z, lateral };
    }

    if (this.rig.consumeLanded()) {
      this.sailor.setMode('wait');
      this.ui.setHint('Aguarde o peixe fisgar...');
      this._waitTotal = rand(WAIT_RANGE[0], WAIT_RANGE[1]);
      this._nibbleAt = rand(1.2, Math.max(1.6, this._waitTotal - 1.2));
      this._nibbled = false;
      this._setPhase('waiting');
    }
  }

  _updateWaiting(delta) {
    this._timer += delta;
    this.input.consumeFishPress(); // apertar à toa não faz nada
    this.input.consumeFishRelease();

    if (this.input.consumeStow()) {
      // recolhe a linha vazia e volta para a vara pronta
      this._toReady();
      return;
    }

    if (!this._nibbled && this._timer >= this._nibbleAt) {
      this._nibbled = true;
      this.rig.nibble();
    }

    if (this._timer >= this._waitTotal) this._startQte();
  }

  // ---------- quicktime ----------

  _startQte() {
    const half = QTE.zoneWidth / 2;
    this._qte = {
      zoneCenter: rand(0.2 + half, 0.8 - half),
      pointer: 0,
      dir: 1,
      passes: 0,
      tutorial: this._tutorialRun,
    };
    this._fish = this._pickFish(this._power);
    this.rig.bite();
    this.sailor.jerk();
    this.ui.showGauge('qte');
    this.ui.setGauge({ pointer: 0, zoneCenter: this._qte.zoneCenter, zoneWidth: QTE.zoneWidth });
    this.ui.setHint(
      this._tutorialRun ? 'Peixe fisgou! Olhe o ponteiro...' : `Peixe fisgou! Aperte ${this.keys.fish()} com o ponteiro na zona verde!`
    );
    this.ui.flash('FISGOU!', 'bite');
    this.input.consumeFishPress();
    this._setPhase('qte');
  }

  /** QTE do tutorial: o ponteiro sobe, desacelera e congela exatamente no centro (perfeito). */
  _updateTutorialQte(delta) {
    const q = this._qte;
    this.input.consumeFishPress(); // só vale depois do congelamento
    const near = clamp01((q.zoneCenter - q.pointer) / 0.28); // 1 = longe, 0 = chegou
    this._timeScale = 0.3 + 0.7 * near;
    this.ui.setSlowmo(near < 0.95);
    q.pointer = Math.min(q.zoneCenter, q.pointer + QTE.speed * (0.12 + 0.88 * near * near) * delta);
    this.ui.setGauge({ pointer: q.pointer });
    if (q.pointer < q.zoneCenter - 0.0005) return;

    q.pointer = q.zoneCenter;
    this.ui.setGauge({ pointer: q.pointer });
    this._pauseWith('qte', () => {
      this.ui.setSlowmo(false);
      this._timeScale = 1;
      this.ui.flash('PERFEITO!', 'good');
      this._startReel(1);
    });
  }

  _updateQte(delta) {
    const q = this._qte;
    if (q.tutorial) {
      this._updateTutorialQte(delta);
      return;
    }
    // o ponteiro vai e volta pela barra inteira (um pouco mais rápido a cada ida e volta)
    const speed = QTE.speed * (1 + q.passes * 0.12);
    q.pointer += q.dir * speed * delta;
    if (q.pointer >= 1) { q.pointer = 1; q.dir = -1; q.passes += 1; }
    if (q.pointer <= 0) { q.pointer = 0; q.dir = 1; q.passes += 1; }
    this.ui.setGauge({ pointer: q.pointer });

    if (this.input.consumeFishPress()) {
      const half = QTE.zoneWidth / 2;
      const offset = Math.abs(q.pointer - q.zoneCenter);
      if (offset <= half) {
        const quality = 1 - offset / half; // 1 = no centro
        this.ui.flash(quality > 0.8 ? 'PERFEITO!' : quality > 0.45 ? 'BOM!' : 'QUASE!', quality > 0.45 ? 'good' : 'ok');
        this._startReel(quality);
      } else {
        this.ui.flash('ERROU!', 'miss');
        this._finish(false, 'Errou o tempo: o peixe escapou levando a isca.');
      }
      return;
    }

    if (q.passes >= QTE.maxPasses) {
      this.ui.flash('DEVAGAR DEMAIS!', 'miss');
      this._finish(false, 'Demorou demais: o peixe escapou levando a isca.');
    }
  }

  // ---------- recolher ----------

  _startReel(quality) {
    this.rig.endBite();
    const fish = this._fish;
    const tut = this._tutorialRun;
    const zoneHalf = tut ? REEL.tutorialZoneHalf : REEL.zoneHalf;
    this._reel = {
      needle: 0.5,
      velocity: 0,
      progress: 0.1 + 0.2 * quality, // acertar no centro dá uma vantagem
      slack: 0,
      force: 0,
      forceTarget: 0,
      forceTimer: 0.6,
      amplitude: (0.55 + 0.45 * fish.strength) * (tut ? 0.7 : 1),
      startDistance: this._castDistance,
      startLateral: this._cast?.lateral ?? 0,
      zoneHalf,
      zone: { center: 0.5, target: 0.5, vel: 0, timer: 0.9 }, // a zona de puxe anda sozinha
      zoneSpeed: tut ? 0.6 : 1,
      waitRelease: false, // depois de uma pausa, só vale quando soltar a tecla
      tutorial: tut,
      dangerShown: false,
    };
    this.ui.showGauge('reel');
    this.ui.setGauge({ zoneCenter: 0.5, zoneWidth: zoneHalf * 2, pointer: 0.5, fishX: 0.5, danger: 0 });
    this.ui.setProgress(this._reel.progress);
    this.ui.setHint(`Segure ${this.keys.fish()} para puxar  ·  solte para dar linha  ·  siga a zona verde`);
    this.sailor.setMode('reel');
    this._setPhase('reel');

    if (tut) {
      this._pauseWith('reelIntro', () => {
        this._reel.waitRelease = true;
        this.tutorial?.done(); // o jogador já viu o tutorial: não repete
        this._tutorialRun = false;
      });
    }
  }

  _updateReel(delta, elapsed) {
    const r = this._reel;
    let held = this.input.fishHeld;
    this.input.consumeFishPress();
    this.input.consumeFishRelease();
    if (r.waitRelease) {
      if (held) held = false;
      else r.waitRelease = false;
    }

    // a zona de puxe vai para a esquerda e para a direita, de forma aleatória e suave
    const z = r.zone;
    z.timer -= delta;
    if (z.timer <= 0) {
      const dir = Math.random() < 0.5 ? -1 : 1;
      const span = rand(0.14, 0.3);
      let target = z.center + dir * span;
      if (target < 0.25 || target > 0.75) target = z.center - dir * span;
      z.target = Math.min(Math.max(target, 0.22), 0.78);
      z.timer = rand(1.0, 2.2) / r.zoneSpeed;
    }
    z.vel += ((z.target - z.center) * 7 - z.vel * 3.4) * delta;
    z.center = Math.min(Math.max(z.center + z.vel * delta, 0.2), 0.8);

    // o peixe puxa para um lado e para o outro, em arrancadas
    r.forceTimer -= delta;
    if (r.forceTimer <= 0) {
      const run = Math.random() < 0.22; // arrancada forte
      r.forceTarget = (Math.random() * 2 - 1) * r.amplitude * (run ? 1 : 0.65);
      r.forceTimer = rand(0.7, 1.8);
    }
    r.force += (r.forceTarget - r.force) * (1 - Math.exp(-3 * delta));

    const accel = (held ? REEL.holdAccel : -REEL.releaseAccel) + r.force;
    r.velocity += accel * delta;
    r.velocity *= Math.exp(-REEL.damping * delta);
    r.needle += r.velocity * delta;
    let atLimit = false;
    if (r.needle <= 0 || r.needle >= 1) {
      r.needle = clamp01(r.needle);
      r.velocity = 0;
      atLimit = true;
    }

    const inZone = Math.abs(r.needle - z.center) <= r.zoneHalf;
    if (inZone) {
      r.progress += REEL.progressRate * delta;
      r.slack = Math.max(0, r.slack - 2 * delta);
    } else {
      r.progress = Math.max(0, r.progress - REEL.progressLoss * delta);
      r.slack += delta * (atLimit ? 2.5 : 1);
    }
    const danger = clamp01(r.slack / REEL.slackLimit);

    // visual
    const distance = THREE.MathUtils.lerp(BOAT_REEL_DISTANCE, r.startDistance, 1 - r.progress);
    this.focusDistance = Math.max(distance, 6);
    const wobble = Math.sin(elapsed * 5) * 0.5 + r.force * 1.1;
    this._pointAt(distance, r.startLateral * (1 - r.progress) + wobble);
    this.rig.setFloatPosition(this._tmpTarget.x, this._tmpTarget.z);
    this.rig.setSubmerge(0.5 + 0.5 * Math.abs(r.force) / r.amplitude);
    this.rig.setSlack(inZone ? 0.1 : danger);
    if (Math.random() < delta * 3) this.rig.ripple(this._tmpTarget.x, this._tmpTarget.z, 0.7);

    this.sailor.setTension(clamp01(Math.abs(r.needle - z.center) * 2 * 0.5 + 0.4 * Math.abs(r.force) / r.amplitude));
    this.sailor.setCrank(held);

    this.ui.setGauge({
      zoneCenter: z.center,
      zoneWidth: r.zoneHalf * 2,
      pointer: r.needle,
      fishX: z.center + (r.force / r.amplitude) * 0.08,
      danger,
    });
    this.ui.setProgress(r.progress);

    if (r.progress >= 1) {
      this._finish(true);
    } else if (r.slack >= REEL.slackLimit) {
      this._finish(false, 'A linha ficou frouxa: a isca soltou e o peixe levou.');
    } else if (r.tutorial && !r.dangerShown && r.slack > 0.35) {
      r.dangerShown = true; // segunda pausa do tutorial: o que acontece fora da zona
      this._pauseWith('reelDanger', () => {
        r.waitRelease = true;
      });
    }
  }

  // ---------- resultado ----------

  _finish(caught, message = '') {
    this.ui.hideGauge();
    this.sailor.setCrank(false);
    this.sailor.setTension(0);
    this.input.consumeFishPress();
    this.input.consumeFishRelease();

    if (caught) {
      const fish = this._fish;
      const kg = rand(fish.kg[0], fish.kg[1]);
      if (fish.junk) this.stats.junk += 1;
      else this.stats.caught += 1;
      this.lastCatch = { fish, kg };
      this.sailor.setMode('lift', 9);
      const to = this.sailor.getRodTip(this._tmpTip).clone();
      to.y -= 0.8;
      this.rig.playCatch(to, fish.color);
      this.ui.showResult({
        ok: true,
        title: fish.junk ? `Você puxou: ${fish.name}` : `${fish.name} fisgado!`,
        subtitle: `${kg.toFixed(1).replace('.', ',')} kg`,
        fish,
      });
    } else {
      this.stats.lost += 1;
      this.rig.endBite();
      this.rig.hide();
      this.sailor.setMode('ready');
      this.ui.showResult({ ok: false, title: 'A isca se foi', subtitle: message });
    }
    this.ui.setHint('');
    this._setPhase('result');
  }

  _updateResult(delta) {
    this._timer += delta;
    this.input.consumeFishPress();
    this.input.consumeFishRelease();
    if (this._timer >= REEL.resultTime) this._toReady();
  }

  _updatePutAway() {
    this.input.consumeFishPress();
    if (this.sailor.isStowed) {
      this.rig.hide();
      this.ui.hideAll();
      this._setPhase('off');
    }
  }

  dispose() {
    this.rig.hide();
    this.ui.hideAll();
  }
}

export default FishingSystem;