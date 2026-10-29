// src/world/Ocean.js
import * as THREE from 'three';

/**
 * Ocean
 * Oceano animado: um plano grande que acompanha a câmera + ShaderMaterial.
 *
 * - Ondas: soma de 4 ondas "afiadas" (cristas pontudas, cavas largas) que
 *   deslocam a malha. Velocidade segue a física de água profunda (onda
 *   comprida corre mais que onda curta).
 * - Luz: normal calculada analiticamente + ondulações finas só na normal
 *   (é isso que dá o brilho picado do sol), reflexo do céu com Fresnel,
 *   água funda → rasa, luz atravessando as cristas e espuma nas cristas.
 * - Névoa: radial, lê a scene.fog do SceneManager. O mar termina na cor do
 *   horizonte do céu, sem linha dura.
 * - As mesmas ondas existem em JS (getHeightAt), pro barco poder boiar.
 *
 * Uso:
 *   const ocean = new Ocean({ sunDirection: sceneManager.sunDirection });
 *   ocean.addTo(scene);
 *
 *   // dentro do loop de render:
 *   ocean.update(elapsed);
 *
 *   // altura da água em qualquer ponto do mundo:
 *   const y = ocean.getHeightAt(x, z);
 *
 *   // escurece a água para azul petróleo (0 = normal, 1 = petróleo):
 *   ocean.setPetrol(0.6);
 */

const GRAVITY = 9.81;
// média de exp(sin(x) - 1) num período: mantém o nível médio da água em y = 0
const WAVE_MEAN = 0.4658;

export class Ocean {
  /** direction em graus; wavelength e amplitude em unidades do mundo */
  static WAVES = [
    { direction: 20, wavelength: 160, amplitude: 1.6 },
    { direction: -35, wavelength: 95, amplitude: 0.9 },
    { direction: 115, wavelength: 55, amplitude: 0.5 },
    { direction: 200, wavelength: 32, amplitude: 0.25 },
  ];

  constructor({
    size = 1600,
    segments = 320,
    sunDirection = new THREE.Vector3(30, 50, -80),
    sunColor = new THREE.Color(1.0, 0.92, 0.75),
    deepColor = new THREE.Color(0x052b47),
    shallowColor = new THREE.Color(0x1f9bb0),
    skyTopColor = new THREE.Color(0x3a86c8),
    skyHorizonColor = new THREE.Color(0x87ceeb),
    speedScale = 0.6,
  } = {}) {
    this.size = size;
    this.cell = size / segments; // o plano anda em passos dessa largura (sem "nadar")
    this.speedScale = speedScale;
    this.time = 0;

    // cores base e cores "azul petróleo" (zona de pesca); setPetrol() mistura as duas
    this._deepColor = deepColor.clone();
    this._shallowColor = shallowColor.clone();
    this._petrolDeep = new THREE.Color(0x03181f);
    this._petrolShallow = new THREE.Color(0x174852);

    this._waves = Ocean.WAVES.map(({ direction, wavelength, amplitude }) => {
      const angle = THREE.MathUtils.degToRad(direction);
      const k = (Math.PI * 2) / wavelength;
      return {
        dx: Math.cos(angle),
        dz: Math.sin(angle),
        k,
        omega: Math.sqrt(GRAVITY * k) * speedScale,
        amplitude,
      };
    });

    this.geometry = new THREE.PlaneGeometry(size, size, segments, segments);
    this.geometry.rotateX(-Math.PI / 2); // deita o plano no eixo XZ

    this.material = new THREE.ShaderMaterial({
      defines: { WAVE_COUNT: this._waves.length },
      uniforms: THREE.UniformsUtils.merge([
        THREE.UniformsLib.fog,
        {
          uTime: { value: 0 },
          uSpeed: { value: speedScale },
          uWaves: {
            value: this._waves.map((w) => new THREE.Vector4(w.dx, w.dz, w.k, w.amplitude)),
          },
          uSunDir: { value: sunDirection.clone().normalize() },
          uSunColor: { value: sunColor.clone() },
          uDeepColor: { value: deepColor.clone() },
          uShallowColor: { value: shallowColor.clone() },
          uSkyTop: { value: skyTopColor.clone() },
          uSkyHorizon: { value: skyHorizonColor.clone() },
        },
      ]),
      vertexShader: Ocean.vertexShader,
      fragmentShader: Ocean.fragmentShader,
      fog: true, // faz o renderer atualizar as uniforms de névoa (a mistura é feita no shader)
    });
    this.uniforms = this.material.uniforms;

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    // o plano acompanha a câmera; as ondas usam coordenadas do mundo, então nada muda visualmente
    this.mesh.onBeforeRender = (renderer, scene, camera) => this._followCamera(camera);
  }

  _followCamera(camera) {
    const e = camera.matrixWorld.elements;
    const x = Math.round(e[12] / this.cell) * this.cell;
    const z = Math.round(e[14] / this.cell) * this.cell;
    if (x !== this.mesh.position.x || z !== this.mesh.position.z) {
      this.mesh.position.set(x, 0, z);
      this.mesh.updateMatrixWorld();
    }
  }

  /** Chame a cada frame, passando o tempo total decorrido em segundos. */
  update(elapsedTime) {
    this.time = elapsedTime;
    this.uniforms.uTime.value = elapsedTime;
  }

  /** Altura da água em (x, z), igual à que o shader desenha. */
  getHeightAt(x, z) {
    let h = 0;
    for (const w of this._waves) {
      const phase = w.k * (w.dx * x + w.dz * z) + w.omega * this.time;
      h += w.amplitude * (Math.exp(Math.sin(phase) - 1) - WAVE_MEAN);
    }
    return h;
  }

  /** Mistura a água com o azul petróleo: 0 = cores originais, 1 = petróleo escuro. */
  setPetrol(amount) {
    const t = THREE.MathUtils.clamp(amount, 0, 1);
    this.uniforms.uDeepColor.value.copy(this._deepColor).lerp(this._petrolDeep, t);
    this.uniforms.uShallowColor.value.copy(this._shallowColor).lerp(this._petrolShallow, t);
  }

  setSunDirection(direction) {
    this.uniforms.uSunDir.value.copy(direction).normalize();
  }

  addTo(scene) {
    scene.add(this.mesh);
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

Ocean.vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSpeed;
  uniform vec4 uWaves[WAVE_COUNT]; // xy = direção, z = número de onda k, w = amplitude

  varying vec3 vWorldPos;
  varying vec2 vSlope;
  varying float vHeight;

  const float GRAVITY = 9.81;
  const float WAVE_MEAN = 0.4658;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);

    float h = 0.0;
    vec2 slope = vec2(0.0);
    for (int i = 0; i < WAVE_COUNT; i++) {
      vec2 dir = uWaves[i].xy;
      float k = uWaves[i].z;
      float amp = uWaves[i].w;
      float phase = k * dot(dir, world.xz) + sqrt(GRAVITY * k) * uSpeed * uTime;
      float crest = exp(sin(phase) - 1.0);
      h += amp * (crest - WAVE_MEAN);
      slope += dir * (amp * k * crest * cos(phase));
    }

    world.y += h;
    vWorldPos = world.xyz;
    vSlope = slope;
    vHeight = h;

    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

Ocean.fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSkyTop;
  uniform vec3 uSkyHorizon;

  #ifdef USE_FOG
    uniform vec3 fogColor;
    uniform float fogNear;
    uniform float fogFar;
  #endif

  varying vec3 vWorldPos;
  varying vec2 vSlope;
  varying float vHeight;

  float oceanHash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float oceanNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = oceanHash(i);
    float b = oceanHash(i + vec2(1.0, 0.0));
    float c = oceanHash(i + vec2(0.0, 1.0));
    float d = oceanHash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float oceanFbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * oceanNoise(p);
      p = p * 2.03 + 17.0;
      a *= 0.5;
    }
    return v;
  }

  // inclinação de uma ondulação fina (não mexe na malha, só na normal)
  vec2 ripple(vec2 p, vec2 dir, float k, float amp, float speed) {
    vec2 d = normalize(dir);
    return d * (amp * k * cos(k * dot(d, p) + speed * uTime));
  }

  // mesmo gradiente do Skybox: horizonte → topo
  vec3 skyColor(vec3 dir) {
    return mix(uSkyHorizon, uSkyTop, pow(clamp(dir.y, 0.0, 1.0), 0.6));
  }

  void main() {
    vec3 toCamera = cameraPosition - vWorldPos;
    float dist = length(toCamera);
    vec3 V = toCamera / dist;
    vec3 L = normalize(uSunDir);

    // normal = ondas grandes (analítica) + ondulações finas (somem com a distância)
    float detail = 1.0 - smoothstep(80.0, 400.0, dist);
    vec2 p = vWorldPos.xz;
    vec2 slope = vSlope;
    slope += detail * (
        ripple(p, vec2( 1.0,  0.3), 0.55, 0.16, 1.1)
      + ripple(p, vec2(-0.7,  1.0), 0.95, 0.09, 1.5)
      + ripple(p, vec2( 0.2, -1.0), 1.60, 0.05, 2.0)
      + ripple(p, vec2(-1.0, -0.4), 2.40, 0.03, 2.6)
      + ripple(p, vec2( 0.6,  0.9), 3.50, 0.02, 3.2)
    );
    vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));

    float ndv = clamp(dot(N, V), 0.0, 1.0);
    float ndl = max(dot(N, L), 0.0);

    // cor do corpo da água: funda → rasa, mais clara onde o sol bate e nas cristas
    float crest = smoothstep(-0.2, 1.4, vHeight);
    float backlit = pow(clamp(dot(L, -V), 0.0, 1.0), 2.0); // olhando na direção do sol
    vec3 body = mix(uDeepColor, uShallowColor, 0.12 + 0.30 * ndl + 0.30 * crest);
    body += uShallowColor * crest * backlit * 0.8; // luz atravessando a crista

    // reflexo do céu (Fresnel: quanto mais rasante, mais espelho)
    vec3 R = reflect(-V, N);
    R.y = abs(R.y);
    vec3 sky = skyColor(R) + uSunColor * pow(max(dot(R, L), 0.0), 24.0) * 0.25;
    float fresnel = 0.02 + 0.98 * pow(1.0 - ndv, 5.0);
    vec3 color = mix(body, sky, fresnel);

    // brilho do sol: pontinhos fortes + um halo mais largo
    vec3 H = normalize(L + V);
    float ndh = max(dot(N, H), 0.0);
    float spec = pow(ndh, 400.0) * 4.0 + pow(ndh, 60.0) * 0.18;
    color += uSunColor * spec * mix(0.5, 1.0, fresnel);

    // espuma nas cristas mais altas, quebrada por ruído
    float n1 = oceanFbm(p * 0.22 + vec2(uTime * 0.05, -uTime * 0.04));
    float n2 = oceanFbm(p * 0.90 - vec2(uTime * 0.07, uTime * 0.05));
    float foam = smoothstep(0.62, 1.05, vHeight + (n1 - 0.5) * 0.55);
    foam *= smoothstep(0.30, 0.62, mix(0.55, n2, detail));
    vec3 foamColor = mix(vec3(0.55, 0.62, 0.68), vec3(0.95, 0.98, 1.0), ndl);
    color = mix(color, foamColor, foam * 0.9);

    gl_FragColor = vec4(color, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>

    // névoa radial: no limite do plano o mar já é a cor do horizonte
    #ifdef USE_FOG
      gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, smoothstep(fogNear, fogFar, dist));
    #endif
  }
`;

export default Ocean;