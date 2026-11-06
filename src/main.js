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
import { Captain } from './entities/Captain.js';
import { FishingRig } from './entities/FishingRig.js';
import { FishingSystem } from './systems/FishingSystem.js';
import { BoatCollider } from './systems/BoatCollider.js';
import { FishingUI } from './ui/FishingUI.js';
import { dampFactor } from './utils/MathUtils.js';
import { FISH_GOAL, POINTS, RESCUE, SEA_BOUNDS, SEA_MESSAGES, SCENES, OBJECTIVES } from './data/story.js';
import { SEA_ITEMS, ITEMS_BY_ID } from './data/items.js';
import { SeaItems } from './world/SeaItems.js';
import { Shipwreck } from './world/Shipwreck.js';
import { LanternIsland, lanternIslandConfig } from './world/LanternIsland.js';
import { RescueSystem } from './systems/RescueSystem.js';
import { SeaBounds } from './systems/SeaBounds.js';
import { RescueBar } from './ui/RescueBar.js';
import { Journal } from './ui/Journal.js';
import { BottleScene } from './ui/BottleScene.js';
import { ItemCard } from './ui/ItemCard.js';
import { CabinScene } from './ui/CabinScene.js';

/*
 * Fluxo do jogo (GameState.phase):
 *   'menu'    → oceano desfocado por trás do menu inicial
 *   'harbor'  → porto 2D (A/D): conversar (tecla de interagir) com a mãe, os
 *               vizinhos e, no fim do cais, o pai; o botão "Zarpar" da última
 *               conversa leva ao mar
 *   'sailing' → mar 3D: barco + bússola até a zona de pesca; parado nela, a
 *               tecla de pescar (G/F) entra no modo de pescaria (FishingSystem).
 *               Pescados FISH_GOAL peixes, aparece o bilhete do avô e a bússola
 *               passa a apontar para a Ilha da Lanterna (data/story.js).
 *               No caminho o mar devolve garrafas (?) e relíquias (!): chegar
 *               perto recolhe: garrafa abre a cena do papel (BottleScene), relíquia
 *               abre o cartão (ItemCard); o diário (J) guarda tudo
 *               Depois do bilhete a bússola aponta para o naufrágio do Esperança II:
 *               parado dentro do aro por alguns segundos, o barco resgata o
 *               Capitão Dutra (RescueSystem); só então a bússola volta para a ilha
 *               Na Ilha da Lanterna: cena de chegada, cabana do avô (interior animado + diário) e a água da ilha,
 *               onde se pesca os peixes lendários (spotId 'ilha-lanterna')
 *   'won'     → não dispara mais: a zona de pesca não é um objetivo de vitória
 */

const settings = new Settings();
const sceneManager = new SceneManager();
const engine = new Engine({ sceneManager });
const input = new InputSystem({ settings });
// ?novo na URL apaga o progresso salvo (peixes, bilhete, tutorial) e recomeça.
// Em desenvolvimento (npm run dev) o save é apagado SEMPRE; ?manter na URL mantém o save.
const urlParams = new URLSearchParams(window.location.search);
if (urlParams.has('novo') || (import.meta.env.DEV && !urlParams.has('manter'))) GameState.clearSave();
const gameState = new GameState(); // começa em 'menu'

engine.setRenderScale(settings.renderScale);
settings.onChange((s) => engine.setRenderScale(s.renderScale));

// ---------- mundo 3D ----------

const skybox = new Skybox();
skybox.addTo(sceneManager.scene);

// o porto de casa em 3D (cais de madeira, vila e farol): o barco nasce ao lado dele
const pier = new HarborPier3D();
pier.addTo(sceneManager.scene);

// a Ilha da Lanterna (Sprint 6) fica no centro do aro 'ilha-lanterna'; o mar também fica calmo em volta dela
const lanternPos = POINTS.find((p) => p.id === 'ilha-lanterna').position;
const ocean = new Ocean({
  island: HarborPier3D.ISLAND_CONFIG,
  island2: lanternIslandConfig(lanternPos[0], lanternPos[2]),
});
ocean.addTo(sceneManager.scene);

// o barco não atravessa o cais, os pilares, os cascos velhos nem a terra
const collider = new BoatCollider();
collider.addObstacles(pier.getObstacles());

// a Ilha da Lanterna: aparece depois do bilhete do avô; o barco também não a atravessa
const lantern = new LanternIsland({ position: [lanternPos[0], lanternPos[2]] });
lantern.addTo(sceneManager.scene);
collider.addObstacles(lantern.getObstacles());

// parede invisível do mar (data/story.js): não dá para ir para trás da ilha do porto nem para o nada;
// o retângulo cresce sozinho se algum ponto ou item do mar ficar fora dele
const bounds = new SeaBounds(SEA_BOUNDS);
for (const p of POINTS) bounds.include(p.position[0], p.position[2], (p.radius ?? 15) + 20);
for (const it of SEA_ITEMS) {
  const q = it.position;
  const x = Array.isArray(q) ? q[0] : q?.x;
  const z = Array.isArray(q) ? q[q.length - 1] : q?.z;
  if (x < SEA_BOUNDS.minX || x > SEA_BOUNDS.maxX || z < SEA_BOUNDS.minZ || z > SEA_BOUNDS.maxZ) {
    console.warn(`[SeaBounds] item "${it.id}" fora de SEA_BOUNDS (data/story.js): a parede foi ampliada para ele. Mova o item ou os limites.`);
  }
  bounds.include(x, z, 30);
}

// garrafas e relíquias boiando no mar (data/items.js)
const seaItems = new SeaItems({ items: SEA_ITEMS, ocean });
seaItems.addTo(sceneManager.scene);

// pontos de interesse (aros sem colisão): a Primeira Boia (zona de pesca) e, depois do
// bilhete do avô, a Ilha da Lanterna (data/story.js)
const pois = new PointsOfInterest({
  points: POINTS.map((p) => ({ ...p, position: new THREE.Vector3(...p.position) })),
});
pois.addTo(sceneManager.scene);
gameState.setTotalIslands(0); // 0 = sem objetivo de vitória
const spot = pois.getById('primeira-boia');
const island = pois.getById('ilha-lanterna');
const wreckPoint = pois.getById('esperanca-ii');
const SPOT_RADIUS = spot.radius; // o mesmo raio do aro (PointsOfInterest)

// naufrágio do Esperança II (aparece depois do bilhete) e o resgate do Capitão Dutra
const wreck = new Shipwreck({ position: [wreckPoint.position.x, wreckPoint.position.z], ocean });
wreck.addTo(sceneManager.scene);
const rescue = new RescueSystem({ position: wreckPoint.position, radius: wreckPoint.radius, ...RESCUE });
let captain = null; // criado junto do barco, mais abaixo

/** Libera/esconde os pontos conforme a história (flags salvas no GameState). */
function applyStage() {
  const noteFound = gameState.hasFlag('note-found');
  const rescued = gameState.hasFlag('dutra-rescued');
  // só o ponto ATUAL tem aro e luz (a bússola já mostra o caminho): boia → naufrágio → ilha
  pois.setActive('primeira-boia', !noteFound);
  pois.setActive('esperanca-ii', noteFound && !rescued);
  pois.setActive('ilha-lanterna', rescued);
  wreck.setActive(noteFound);
  wreck.setRescued(rescued);
  lantern.setActive(rescued); // a ilha e a luz dela só aparecem quando ela vira o destino
  captain?.setVisible(rescued);
  seaItems.refresh((id) => gameState.hasCollected(id), (flag) => gameState.hasFlag(flag));
}
applyStage();

/** Destino da bússola agora: boia → naufrágio (até resgatar o Dutra) → ilha. */
const currentTarget = () => {
  if (!gameState.hasFlag('note-found')) return spot;
  return gameState.hasFlag('dutra-rescued') ? island : wreckPoint;
};
const distTo = (p, pos) => Math.hypot(p.position.x - pos.x, p.position.z - pos.z);

// teclas (remapeáveis no menu) para os textos da tela
const keyName = (action) => formatKey(settings.keymap[action].find(Boolean));

// cartão de objetivo do HUD: textos em data/story.js (a assinatura inclui o nº de peixes)
let currentObjective = null;
function setObjective(key) {
  const signature = key ? `${key}:${gameState.fishCaught}` : null;
  if (signature === currentObjective) return;
  currentObjective = signature;
  const data = key ? OBJECTIVES[key]({ n: gameState.fishCaught, goal: FISH_GOAL, fishKey: keyName('fish'), interactKey: keyName('interact') }) : null;
  hud.setObjective(data?.title ?? null, data?.text ?? null);
}

// cenas de história pendentes (tocam quando a pesca terminar)
let pendingScene = null;
function playScene(id, onClose, custom = null) {
  const scene = custom ?? SCENES[id];
  input.reset();
  hud.setPrompt(null);
  dialogue.open({ name: scene.name, lines: scene.lines, onClose });
}

const isVisited = (id) => gameState.hasVisited(id);
gameState.onChange(() => {
  pois.refresh(isVisited);
  seaItems.refresh((id) => gameState.hasCollected(id), (flag) => gameState.hasFlag(flag));
});
pois.refresh(isVisited);

const player = new Player({
  position: new THREE.Vector3(0, 0.6, 0),
  input,
  ocean, // o barco flutua nas ondas (PhysicsSystem)
});
player.addTo(sceneManager.scene);

const compass = new Compass();
compass.addTo(sceneManager.scene);

// marinheiro dentro do barco + pescaria
const sailor = new Sailor();
player.boat.add(sailor.group);
captain = new Captain(); // o Dutra só aparece depois do resgate
player.boat.add(captain.group);
captain.setVisible(gameState.hasFlag('dutra-rescued'));

const fishUI = new FishingUI();
const rig = new FishingRig({ ocean });
rig.addTo(sceneManager.scene);
const fishing = new FishingSystem({
  input, sailor, rig, ui: fishUI, ocean, boat: player.mesh,
  keys: { fish: () => keyName('fish'), stow: () => keyName('stow') },
  spotId: 'primeira-boia',
  // cada peixe de verdade conta para a meta; no último, o bilhete do avô
  onCatch: ({ fish }) => {
    const n = gameState.recordCatch(fish); // o diário guarda tudo; só peixe de verdade conta para a meta
    if (fish.junk) return null;
    if (fish.tier === 'lendario') {
      gameState.setFlag('island-fished'); // pescou na água da ilha (quebrou o pacto): vai pesar no final
      return 'Ilha da Lanterna';
    }
    if (n >= FISH_GOAL && !gameState.hasFlag('note-found')) {
      fishing.endSessionAfterResult(); // sai da pesca depois do cartão
      pendingScene = 'note';
    }
    return `Peixes ${Math.min(n, FISH_GOAL)}/${FISH_GOAL}`;
  },
  // a primeira pescaria do jogo é um treino; se o jogador não pescar o 1º peixe, repete
  tutorial: {
    pending: () => !gameState.hasTutorial('fishing'),
    done: () => gameState.completeTutorial('fishing'), // pescou o 1º peixe
    failed: () => gameState.failTutorial('fishing'), // perdeu: o treino se repete com uma dica de mestre
    attempts: () => gameState.tutorialAttempts('fishing'),
  },
});

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
hud.setToolHint(`${keyName('journal')} · Diário`);

const journal = new Journal({ gameState, keyLabel: () => keyName('journal') });
const bottleScene = new BottleScene({ settings }); // garrafa recolhida: o papel sai e abre
const rescueBar = new RescueBar(); // progresso do resgate (topo da tela)
const itemCard = new ItemCard({ settings }); // relíquia recolhida: cartão com o desenho
const cabinScene = new CabinScene(); // interior da cabana do avô: tela cheia, animado (fica sob a caixa de diálogo)

const dialogue = new DialogueBox({ settings });

const fade = new ScreenFade();
let transitioning = false;
let boatSpeed = 0; // u/s, suavizada: o resgate exige o barco quase parado
const lastBoat = new THREE.Vector3();
let hasLastBoat = false;

const menu = new MainMenu({ settings, onPlay: startGame });
menu.show();

/** Leva o barco de volta ao ponto de partida e posiciona a câmera atrás dele. */
function resetBoat() {
  input.reset();
  hasLastBoat = false;
  boatSpeed = 0;
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
  wreck.update(elapsed);
  lantern.update(elapsed);

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
    player.float(delta); // o barco boia atrás do menu
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
  const inSpot = distTo(spot, boatPos) <= SPOT_RADIUS;

  seaItems.update(elapsed, boatPos);
  captain.update(delta, elapsed);

  // velocidade do barco (suavizada) para o resgate
  if (hasLastBoat && delta > 0) {
    const raw = Math.hypot(boatPos.x - lastBoat.x, boatPos.z - lastBoat.z) / delta;
    boatSpeed += (raw - boatSpeed) * dampFactor(6, delta);
  }
  lastBoat.copy(boatPos);
  hasLastBoat = true;

  // diário aberto: o jogo espera, o barco só boia
  if (journal.isOpen) {
    rescueBar.hide();
    if (input.consumeJournal()) journal.close();
    player.float(delta);
    hud.setPrompt(null);
    compass.update(delta, boatPos, null);
    followCamera.update(delta);
    skybox.update(sceneManager.camera.position);
    return;
  }

  // garrafa ou relíquia recém-recolhida na tela: o barco fica parado, boiando
  const itemScreen = bottleScene.isOpen ? bottleScene : itemCard.isOpen ? itemCard : null;
  if (itemScreen) {
    rescueBar.hide();
    if (input.consumeInteract()) itemScreen.advance();
    input.consumeJournal(); // J durante a cena não abre o diário depois
    player.float(delta);
    hud.setPrompt(null);
    setObjective(null);
    compass.update(delta, boatPos, null);
    followCamera.update(delta);
    skybox.update(sceneManager.camera.position);
    return;
  }

  // cena de história aberta (bilhete, chegada): o barco fica parado, boiando
  if (dialogue.isOpen) {
    rescueBar.hide();
    if (input.consumeInteract()) dialogue.advance();
    dialogue.update(delta);
    player.float(delta);
    hud.setPrompt(null);
    setObjective(null);
    compass.update(delta, boatPos, null);
    followCamera.update(delta);
    skybox.update(sceneManager.camera.position);
    return;
  }

  // modo de pesca: o barco fica parado; senão, navega e esbarra nos sólidos
  if (!fishing.active) {
    player.update(delta);
    collider.resolve(player.mesh.position, player.mesh.rotation.y);
    bounds.resolve(player.mesh.position); // parede invisível do mar
  } else {
    player.float(delta); // parado, mas ainda boiando nas ondas
  }

  // parado na zona (ou, depois da chegada, na água da ilha): a tecla de pescar entra no modo de pescaria
  const islandReached = gameState.hasFlag('island-reached');
  const inIslandWater = islandReached && distTo(island, boatPos) <= island.radius;
  const canFish = (inSpot || inIslandWater) && !fishing.active && !transitioning;
  if (canFish) {
    if (input.consumeFishPress()) {
      fishing.spotId = inIslandWater ? 'ilha-lanterna' : 'primeira-boia'; // decide os peixes (data/fish.js)
      fishing.start();
    }
  } else if (!fishing.active) {
    input.consumeFishPress();
    input.consumeFishRelease();
  }

  // cabana do avô: perto do cais da ilha, a tecla de interagir entra (o diário abre a cena `cabin`)
  const landing = lantern.getLanding();
  const nearCabin =
    islandReached && !fishing.active && !transitioning &&
    Math.hypot(boatPos.x - landing.x, boatPos.z - landing.z) <= landing.radius;
  if (nearCabin) {
    if (input.consumeInteract()) {
      input.reset();
      hud.setPrompt(null);
      cabinScene.open(); // o interior da cabana aparece por baixo do diário
      playScene('cabin', () => {
        cabinScene.close();
        gameState.setFlag('cabin-read');
      });
    }
  } else if (!fishing.active) {
    input.consumeInteract(); // descarta toques soltos para não abrirem a cabana depois
  }
  const nearWall = !fishing.active && bounds.isNear(boatPos); // perto da parede invisível: rumo errado
  hud.setPrompt(
    nearWall && !dialogue.isOpen ? SEA_MESSAGES.wrongWay
      : nearCabin && !dialogue.isOpen ? `Pressione ${keyName('interact')} para entrar na cabana`
      : canFish && !dialogue.isOpen ? `Pressione ${keyName('fish')} para pescar` : null
  );

  fishing.update(delta, elapsed);

  // diário: J abre (não durante a pesca nem durante uma cena)
  if (input.consumeJournal() && !fishing.active && !transitioning) journal.open();

  // garrafa ou relíquia ao alcance: recolhe e abre a cena (garrafa) ou o cartão (relíquia)
  if (!fishing.active && !journal.isOpen && !transitioning) {
    const found = seaItems.getNearby(boatPos);
    if (found) {
      gameState.collectItem(found.id); // some do mar (onChange atualiza os itens)
      const item = ITEMS_BY_ID[found.id];
      input.reset();
      hud.setPrompt(null);
      (item.kind === 'bottle' ? bottleScene : itemCard).open(item);
    }
  }

  // a pesca terminou e há uma cena esperando (o bilhete do avô)
  if (pendingScene && !fishing.active && !transitioning && !dialogue.isOpen) {
    const id = pendingScene;
    pendingScene = null;
    if (id === 'note') {
      playScene('note', () => {
        gameState.setFlag('note-found');
        applyStage();
      });
    }
  }

  // resgate do Capitão Dutra: parado dentro do aro do naufrágio
  if (gameState.hasFlag('note-found') && !gameState.hasFlag('dutra-rescued') && !fishing.active && !transitioning) {
    const r = rescue.update(delta, boatPos, boatSpeed);
    if (r.inside) rescueBar.show(r);
    else rescueBar.hide();
    if (r.done) {
      rescueBar.hide();
      gameState.setFlag('dutra-rescued');
      applyStage(); // a luz de socorro apaga, o aro some, o Dutra aparece no barco
      playScene('rescue');
    }
  } else {
    rescueBar.hide();
  }

  // chegou à Ilha da Lanterna: cena de chegada (depois dela, cabana e pesca lendária)
  const target = currentTarget();
  const inTarget = distTo(target, boatPos) <= target.radius;
  if (target === island && inTarget && !gameState.hasVisited(island.id) && !dialogue.isOpen) {
    gameState.visitIsland(island.id);
    playScene(gameState.hasFlag('dutra-rescued') ? 'islandDutra' : 'islandPlaceholder', () => gameState.setFlag('island-reached'));
  }

  // objetivo do HUD
  let objective = null;
  if (!fishing.active) {
    if (gameState.hasFlag('note-found')) {
      if (!gameState.hasFlag('dutra-rescued')) objective = inTarget ? 'wreckHere' : 'goWreck';
      else if (!gameState.hasFlag('island-reached')) objective = inTarget ? 'islandHere' : 'goIslandDutra';
      else objective = gameState.hasFlag('cabin-read') ? 'islandFish' : 'cabin';
    }
    else if (inSpot) objective = 'fish';
    else objective = gameState.fishCaught === 0 ? 'goFishing' : 'backFishing';
  }
  setObjective(objective);

  // a água escurece para azul petróleo dentro da zona de pesca
  petrol += ((inSpot ? 1 : 0) - petrol) * dampFactor(1.6, delta);
  ocean.setPetrol(petrol);

  // bússola: aponta para o destino atual (some enquanto pesca e dentro do aro)
  const showCompass = !fishing.active && !inTarget;
  compass.update(delta, boatPos, showCompass ? target.position : null);

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