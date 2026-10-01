// src/systems/CollisionSystem.js

/**
 * CollisionSystem
 * Colisão simples por esferas: cada entidade registrada tem uma posição
 * (via object3D) e um raio. A cada update(), verifica todos os pares e
 * retorna os que estão se sobrepondo — quem decide o que fazer com isso
 * é quem chama (main.js, por enquanto).
 *
 * O(n²) é de propósito: com poucas dezenas de objetos (barco + ilhas +
 * destroços) isso não pesa nada, e evita complexidade prematura de
 * particionamento espacial antes de precisar.
 *
 * Uso:
 *   const collisionSystem = new CollisionSystem();
 *   const playerCollider = collisionSystem.register({ object3D: player.mesh, radius: 2.5, tag: 'player' });
 *   collisionSystem.register({ object3D: island.mesh, radius: island.radius, tag: 'island' });
 *
 *   // no loop de render:
 *   const collisions = collisionSystem.update();
 *   const bateuEmIlha = collisions.some(([a, b]) => a === playerCollider || b === playerCollider);
 */
export class CollisionSystem {
  constructor() {
    this.colliders = [];
  }

  /**
   * Registra uma entidade colidível.
   * entry: { object3D: THREE.Object3D, radius: number, tag?: string, ...extra }
   * Qualquer campo extra (como `id`) é preservado no registro.
   * Retorna o próprio registro (guarde-o para comparar em `update()` ou para `unregister`).
   */
  register(entry) {
    const collider = { tag: null, ...entry };
    this.colliders.push(collider);
    return collider;
  }

  unregister(collider) {
    const index = this.colliders.indexOf(collider);
    if (index !== -1) this.colliders.splice(index, 1);
  }

  /** Retorna um array de pares [colliderA, colliderB] que estão se sobrepondo neste frame. */
  update() {
    const collisions = [];

    for (let i = 0; i < this.colliders.length; i++) {
      for (let j = i + 1; j < this.colliders.length; j++) {
        const a = this.colliders[i];
        const b = this.colliders[j];
        const minDistance = a.radius + b.radius;

        if (a.object3D.position.distanceTo(b.object3D.position) < minDistance) {
          collisions.push([a, b]);
        }
      }
    }

    return collisions;
  }
}

export default CollisionSystem;