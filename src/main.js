// src/main.js
import * as THREE from 'three';
import { SceneManager } from './core/SceneManager.js';
import { Engine } from './core/Engine.js';
import { FollowCamera } from './core/Camera.js';
import { InputSystem } from './systems/InputSystem.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { GameState } from './state/GameState.js';
import { HUD } from './ui/HUD.js';
import { Ocean } from './world/Ocean.js';
import { Skybox } from './world/Skybox.js';
import { Terrain } from './world/Terrain.js';
import { Player } from './entities/Player.js';

const sceneManager = new SceneManager();
const engine = new Engine({ sceneManager });
const input = new InputSystem();
const collisionSystem = new CollisionSystem();
const gameState = new GameState();

const skybox = new Skybox();
skybox.addTo(sceneManager.scene);

const ocean = new Ocean();
ocean.addTo(sceneManager.scene);

const terrain = new Terrain();
terrain.addTo(sceneManager.scene);
gameState.setTotalIslands(terrain.islands.length);

const player = new Player({
  position: new THREE.Vector3(0, 0.6, 0),
  input,
});
player.addTo(sceneManager.scene);

const followCamera = new FollowCamera({
  camera: sceneManager.camera,
  target: player.mesh,
  offset: new THREE.Vector3(0, 8, 14),
});

const hud = new HUD({ gameState });

// registra o barco e cada ilha no CollisionSystem
const playerCollider = collisionSystem.register({
  object3D: player.mesh,
  radius: 2.5,
  tag: 'player',
});

for (const island of terrain.islands) {
  collisionSystem.register({
    object3D: island.mesh,
    radius: island.radius,
    tag: 'island',
    id: island.id,
  });
}

engine.start((delta, elapsed) => {
  ocean.update(elapsed);

  // guarda a posição antes de mover, pra poder desfazer se colidir
  const previousPosition = player.mesh.position.clone();
  player.update(delta);

  const collisions = collisionSystem.update();
  for (const [a, b] of collisions) {
    if (a !== playerCollider && b !== playerCollider) continue;

    const other = a === playerCollider ? b : a;
    if (other.tag === 'island') {
      player.mesh.position.copy(previousPosition);
      gameState.visitIsland(other.id);
    }
  }

  hud.updatePosition(player.mesh.position);

  followCamera.update(delta);
  skybox.update(sceneManager.camera.position);
});