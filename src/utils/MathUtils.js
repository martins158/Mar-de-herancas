// src/utils/MathUtils.js

/** Limita value ao intervalo [min, max]. */
export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/** Interpolação linear entre a e b (t de 0 a 1). */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Converte value do intervalo [inMin, inMax] para [outMin, outMax]. */
export function remap(value, inMin, inMax, outMin, outMax) {
  return outMin + ((value - inMin) / (inMax - inMin)) * (outMax - outMin);
}

/** Número aleatório entre min e max. */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Fator de suavização independente de frame rate, pra usar como "t" num lerp.
 * Um lerp(a, b, 0.08) por frame anda mais rápido em 144 Hz do que em 60 Hz;
 * com dampFactor(lambda, delta) a velocidade é a mesma em qualquer monitor.
 * Maior lambda = mais "colado" no alvo.
 */
export function dampFactor(lambda, delta) {
  return 1 - Math.exp(-lambda * delta);
}

/** Versão escalar: aproxima current de target de forma suave. */
export function damp(current, target, lambda, delta) {
  return lerp(current, target, dampFactor(lambda, delta));
}

export default { clamp, lerp, remap, randomRange, dampFactor, damp };