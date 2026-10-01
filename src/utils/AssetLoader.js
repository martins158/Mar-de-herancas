// src/utils/AssetLoader.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * AssetLoader
 * Carrega modelos (.glb/.gltf), texturas e áudio de public/assets em
 * paralelo, guarda tudo em cache por nome e avisa o progresso. Pensado
 * pra rodar UMA vez antes de iniciar o jogo (ex.: tela de carregamento).
 *
 * Uso:
 *   const assets = new AssetLoader();
 *   await assets.loadAll(
 *     {
 *       models:   { barco: '/assets/models/barco.glb' },
 *       textures: { areia: '/assets/textures/areia.jpg' },
 *       audio:    { ondas: '/assets/audio/ondas.mp3' },
 *     },
 *     (carregados, total) => console.log(`${carregados}/${total}`)
 *   );
 *
 *   const barco = assets.getModel('barco'); // clone pronto pra scene.add()
 */
export class AssetLoader {
  constructor() {
    this.manager = new THREE.LoadingManager();
    this._gltfLoader = new GLTFLoader(this.manager);
    this._textureLoader = new THREE.TextureLoader(this.manager);
    this._audioLoader = new THREE.AudioLoader(this.manager);

    this._models = new Map();
    this._textures = new Map();
    this._audio = new Map();
  }

  /**
   * assets: { models?: {nome: url}, textures?: {nome: url}, audio?: {nome: url} }
   * onProgress(carregados, total) é opcional.
   */
  async loadAll({ models = {}, textures = {}, audio = {} } = {}, onProgress) {
    if (onProgress) {
      this.manager.onProgress = (_url, loaded, total) => onProgress(loaded, total);
    }

    await Promise.all([
      ...Object.entries(models).map(async ([name, url]) => {
        this._models.set(name, await this._gltfLoader.loadAsync(url));
      }),
      ...Object.entries(textures).map(async ([name, url]) => {
        const texture = await this._textureLoader.loadAsync(url);
        // texturas de cor (albedo) precisam ser sRGB; normal/roughness/etc.
        // devem voltar para THREE.NoColorSpace depois de pegar com getTexture()
        texture.colorSpace = THREE.SRGBColorSpace;
        this._textures.set(name, texture);
      }),
      ...Object.entries(audio).map(async ([name, url]) => {
        this._audio.set(name, await this._audioLoader.loadAsync(url));
      }),
    ]);
  }

  /** Retorna um clone do modelo (cada chamada gera uma instância nova). */
  getModel(name) {
    const gltf = this._get(this._models, name, 'modelo');
    return gltf.scene.clone(true);
  }

  /** Retorna o glTF original completo (animações, câmeras, etc.). */
  getGLTF(name) {
    return this._get(this._models, name, 'modelo');
  }

  getTexture(name) {
    return this._get(this._textures, name, 'textura');
  }

  /** Retorna o AudioBuffer (pra usar com THREE.Audio / AudioSystem). */
  getAudio(name) {
    return this._get(this._audio, name, 'áudio');
  }

  _get(map, name, kind) {
    const asset = map.get(name);
    if (!asset) {
      throw new Error(`AssetLoader: ${kind} "${name}" não foi carregado (use loadAll antes).`);
    }
    return asset;
  }

  dispose() {
    for (const texture of this._textures.values()) texture.dispose();
    this._models.clear();
    this._textures.clear();
    this._audio.clear();
  }
}

export default AssetLoader;