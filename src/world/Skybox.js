// src/world/Skybox.js
import * as THREE from 'three';

/**
 * Skybox
 * Cúpula de céu com gradiente (horizonte → topo) e um disco de sol.
 * A cor do horizonte é a mesma do fog da cena (0x87ceeb), então o mar
 * "emenda" no céu sem linha visível. A cúpula acompanha a câmera, o que
 * dá sensação de céu infinito.
 *
 * Uso:
 *   const skybox = new Skybox();
 *   skybox.addTo(scene);
 *
 *   // no loop de render, depois de mover a câmera:
 *   skybox.update(camera.position);
 */
export class Skybox {
  constructor({
    topColor = 0x3a86c8,
    horizonColor = 0x87ceeb,
    // mesma direção do sunLight do SceneManager (position 50, 80, 30)
    sunDirection = new THREE.Vector3(50, 80, 30),
    radius = 900, // precisa ser menor que o "far" da câmera (2000)
  } = {}) {
    this.material = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(topColor) },
        uHorizonColor: { value: new THREE.Color(horizonColor) },
        uSunDirection: { value: sunDirection.clone().normalize() },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTopColor;
        uniform vec3 uHorizonColor;
        uniform vec3 uSunDirection;
        varying vec3 vDirection;

        void main() {
          vec3 dir = normalize(vDirection);
          float height = clamp(dir.y, 0.0, 1.0);

          vec3 color = mix(uHorizonColor, uTopColor, pow(height, 0.6));

          float sun = pow(max(dot(dir, uSunDirection), 0.0), 256.0);
          color += vec3(1.0, 0.95, 0.8) * sun;

          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });

    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
  }

  /** Mantém a cúpula centrada na câmera. */
  update(cameraPosition) {
    this.mesh.position.copy(cameraPosition);
  }

  addTo(scene) {
    scene.add(this.mesh);
  }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();
  }
}

export default Skybox;