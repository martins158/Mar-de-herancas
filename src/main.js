// src/main.js
import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { Engine } from './core/Engine.js';
import { FollowCamera } from './core/Camera.js';
import { InputSystem } from './systems/InputSystem.js';
import { GameState } from './state/GameState.js';
import { Settings, formatKey } from './state/Settings.js';
import { HUD } from './ui/HUD.js';
import { DialogueBox } from './ui/DialogueBox.js';
import { getDialogue } from './data/dialogues.js';
import { MainMenu } from './ui/MainMenu.js';
import { ScreenFade } from './ui/ScreenFade.js';
import { Ocean } from './world/Ocean.js';
import { Skybox } from './world/Skybox.js';
import { Harbor } from './world/Harbor.js';
import { HarborPier3D } from './world/HarborPier3D.js';
import { PointsOfInterest } from './world/PointsOfInterest.js';
import { Player } from './entities/Player.js';
import { Compass } from './entities/Compass.js';
import { Sailor } from './entities/Sailor.js';
import { FishingRig } from './entities/FishingRig.js';
import { FishingInput } from './systems/FishingInput.js';
import { FishingSystem } from './systems/FishingSystem.js';
import { BoatCollider } from './systems/BoatCollider.js';
import { FishingUI } from './ui/FishingUI.js';
import { dampFactor } from './utils/MathUtils.js';

/*
 * Fluxo do jogo (GameState.phase):
 *   'menu'    → oceano desfocado por trás do menu inicial
 *   'harbor'  → porto 2D (A/D): conversar (tecla de interagir) com a mãe, os
 *               vizinhos e, no fim do cais, o pai; o botão "Zarpar" da última
 *               conversa leva ao mar
 *   'sailing' → mar 3D: barco + bússola até a zona de pesca; parado nela, G/H
 *               entra no modo de pescaria (FishingSystem)
 *   'won'     → não dispara mais: a zona de pesca não é um objetivo de vitória
 */

const settings = new Settings();
const sceneManager = new SceneManager();
const engine = new Engine({ sceneManager });
const input = new InputSystem({ settings });
const gameState = new GameState(); // começa em 'menu'

engine.setRenderScale(settings.renderScale);
settings.onChange((s) => engine.setRenderScale(s.renderScale));

// ---------- mundo 3D ----------

const skybox = new Skybox();
skybox.addTo(sceneManager.scene);

const ocean = new Ocean();
ocean.addTo(sceneManager.scene);

// o porto de casa em 3D (cais de madeira, vila e farol): o barco nasce ao lado dele
const pier = new HarborPier3D();
pier.addTo(sceneManager.scene);

// o barco não atravessa o cais, os pilares, os cascos velhos nem a terra
const collider = new BoatCollider();
collider.addObstacles(pier.getObstacles());

// só o terceiro ponto de interesse sobrou: ele é a zona de pesca (sem colisão)
const pois = new PointsOfInterest({ positions: [PointsOfInterest.defaultLayout()[2]] });
pois.addTo(sceneManager.scene);
gameState.setTotalIslands(0); // 0 = sem objetivo de vitória
const spot = pois.points[0];
const SPOT_RADIUS = 12; // o mesmo raio do anel de chegada (triggerRadius padrão)
const FISHING_NAME = 'Zona de pesca';

const isVisited = (id) => gameState.hasVisited(id);
gameState.onChange(() => pois.refresh(isVisited));
pois.refresh(isVisited);

const player = new Player({
  position: new THREE.Vector3(0, 0.6, 0),
  input,
});
player.addTo(sceneManager.scene);

const compass = new Compass();
compass.addTo(sceneManager.scene);

// marinheiro dentro do barco + pescaria
const sailor = new Sailor();
player.boat.add(sailor.group);

const fishInput = new FishingInput();
const fishUI = new FishingUI();
const rig = new FishingRig({ ocean });
rig.addTo(sceneManager.scene);
const fishing = new FishingSystem({ input: fishInput, sailor, rig, ui: fishUI, ocean, boat: player.mesh });

// câmera da pescaria: atrás do barco, olhando para o lado do lançamento (boreste)
const FISH_CAM_OFFSET = new THREE.Vector3(-1.5, 5.5, 11); // local ao barco
const _camWant = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _fishLook = new THREE.Vector3();
let fishLookDistance = 6;
let fishCamWasActive = false;
let petrol = 0; // 0 = água normal, 1 = azul petróleo

const followCamera = new FollowCamera({
  camera: sceneManager.camera,
  target: player.mesh,
  offset: new THREE.Vector3(0, 8, 14),
});

// ---------- porto 2D, interface e transições ----------

const harbor = new Harbor();
engine.addResizeListener(() => harbor.onResize());

const hud = new HUD({ gameState });
hud.setVisible(false);

const dialogue = new DialogueBox({ settings });

const fade = new ScreenFade();
let transitioning = false;

const menu = new MainMenu({ settings, onPlay: startGame });
menu.show();

/** Leva o barco de volta ao ponto de partida e posiciona a câmera atrás dele. */
function resetBoat() {
  fishInput.reset();
  player.mesh.position.set(0, 0.6, 0);
  player.mesh.rotation.set(0, 0, 0);
  sceneManager.camera.position.set(0, 8, 14);
  sceneManager.camera.lookAt(player.mesh.position);
}

async function startGame() {
  if (transitioning) return;
  transitioning = true;

  await fade.to(1, 0.4);
  menu.hide();
  harbor.reset();
  engine.setView(harbor);
  gameState.setPhase('harbor');
  input.reset();
  await fade.to(0, 0.6);

  transitioning = false;
}

/** Abre a conversa com uma pessoa do porto. O pai termina com o botão "Zarpar". */
function startConversation(npc) {
  const data = getDialogue(npc.id, gameState.talkedTo);
  if (!data) return;

  hud.setPrompt(null);
  harbor.faceNPC(npc);
  input.reset();

  dialogue.open({
    name: data.name,
    lines: data.lines,
    action: data.action,
    onClose: () => {
      gameState.markTalked(npc.id);
      harbor.markTalked(npc.id);
    },
    onAction: () => boardShip(),
  });
}

async function boardShip() {
  if (transitioning) return;
  transitioning = true;
  hud.setPrompt(null);

  await fade.to(1, 0.6);
  resetBoat();
  engine.setView(sceneManager);
  gameState.setPhase('sailing');
  hud.setVisible(true);
  input.reset();
  await fade.to(0, 0.8);

  transitioning = false;
}

// ---------- loop ----------

engine.start((delta, elapsed) => {
  ocean.update(elapsed);
  pier.update(elapsed);
  pois.update(elapsed, ocean);

  const { phase } = gameState;

  if (phase === 'menu') {
    // câmera orbita devagar em volta do barco, por trás do menu desfocado
    const angle = elapsed * 0.07;
    sceneManager.camera.position.set(
      Math.sin(angle) * 24,
      6.5 + Math.sin(elapsed * 0.2) * 0.8,
      Math.cos(angle) * 24
    );
    sceneManager.camera.lookAt(0, 2, 0);
    compass.update(delta, player.mesh.position, null);
    skybox.update(sceneManager.camera.position);
    return;
  }

  if (phase === 'harbor') {
    // em conversa: o personagem fica parado e a tecla de interagir avança as falas
    if (dialogue.isOpen) {
      if (input.consumeInteract()) dialogue.advance();
      dialogue.update(delta);
      harbor.update(delta, elapsed, input, { frozen: true });
      return;
    }

    harbor.update(delta, elapsed, input);

    const wantsTalk = input.consumeInteract();
    if (transitioning) return; // durante o fade o prompt não deve voltar

    const npc = harbor.getNearbyNPC();
    if (npc) {
      hud.setPrompt(`Pressione ${formatKey(settings.keymap.interact[0])} para conversar com ${npc.name}`);
      if (wantsTalk) startConversation(npc);
    } else {
      const left = formatKey(settings.keymap.left[0]);
      const right = formatKey(settings.keymap.right[0]);
      hud.setPrompt(`${left} / ${right} para andar pelo cais`);
    }
    return;
  }

  // 'sailing' ou 'won'
  const boatPos = player.mesh.position;
  const toSpot = Math.hypot(spot.position.x - boatPos.x, spot.position.z - boatPos.z);
  const inSpot = toSpot <= SPOT_RADIUS;

  // modo de pesca: o barco fica parado; senão, navega e esbarra nos sólidos
  if (!fishing.active) {
    player.update(delta);
    collider.resolve(player.mesh.position, player.mesh.rotation.y);
  }

  // parado na zona: G/H entra no modo de pescaria
  const canFish = inSpot && !fishing.active && !transitioning;
  if (canFish) {
    if (fishInput.consumePress()) fishing.start();
  } else if (!fishing.active) {
    fishInput.consumePress();
    fishInput.consumeRelease();
  }
  hud.setPrompt(canFish ? 'Pressione G ou H para pescar' : null);

  fishing.update(delta, elapsed);

  // a água escurece para azul petróleo dentro da zona de pesca
  petrol += ((inSpot ? 1 : 0) - petrol) * dampFactor(1.6, delta);
  ocean.setPetrol(petrol);

  // bússola: aponta para a zona de pesca (some enquanto pesca)
  const showCompass = !fishing.active;
  compass.update(delta, boatPos, showCompass ? spot.position : null);
  hud.setCompass(showCompass ? { name: FISHING_NAME, distance: toSpot } : null);
  hud.updatePosition(boatPos);

  if (fishing.active) {
    updateFishingCamera(delta);
  } else {
    fishCamWasActive = false;
    followCamera.update(delta);
  }
  skybox.update(sceneManager.camera.position);
});

/** Câmera da pescaria: atrás do barco, enquadrando o marinheiro e a água do lançamento. */
function updateFishingCamera(delta) {
  const camera = sceneManager.camera;
  const boatPos = player.mesh.position;
  const yaw = player.mesh.rotation.y;
  const side = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw)); // boreste no mundo

  fishLookDistance += (Math.max(fishing.focusDistance, 6) - fishLookDistance) * dampFactor(2.5, delta);
  _camWant.copy(FISH_CAM_OFFSET).applyAxisAngle(THREE.Object3D.DEFAULT_UP, yaw).add(boatPos);
  _camLook.copy(boatPos).addScaledVector(side, fishLookDistance * 0.5);
  _camLook.y = 0.6;

  if (!fishCamWasActive) {
    fishCamWasActive = true;
    _fishLook.copy(boatPos).setY(2); // começa olhando para o barco e desliza até o lançamento
  }
  camera.position.lerp(_camWant, dampFactor(2.5, delta));
  _fishLook.lerp(_camLook, dampFactor(3, delta));
  camera.lookAt(_fishLook);
}