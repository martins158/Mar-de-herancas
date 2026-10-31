// src/ui/FishIcon.js

/**
 * FishIcon
 * Desenha os peixes (e achados) no estilo de bestiário medieval: contorno de
 * tinta sépia com tremida de pena, aguada de cor no corpo, hachuras na barriga
 * e uma moldura de pergaminho no cartão. Tudo é SVG gerado por parâmetros
 * (data/fish.js → `art`), então novas espécies não precisam de arquivo de imagem.
 *
 * Uso:
 *   import { fishArt } from './FishIcon.js';
 *   element.innerHTML = fishArt(fish.art);          // string <svg>
 *
 * Parâmetros de `art` (todos opcionais): h (meia-altura), length, tail
 * ('fork'|'round'|'lunate'), dorsal ('single'|'double'|'long'|'sail'), pattern
 * ('none'|'vertical'|'horizontal'|'spots'|'scales'), base, belly, accent
 * (cores), halo (brilho dourado para lendários). `{ junk: 'boot'|'oar'|'can'|'weed' }`
 * desenha um achado.
 */

const INK = '#2b1d12';
let uid = 0;

const JUNK = {
  boot: `<path d="M70 28 L70 70 Q70 82 82 84 L150 84 Q166 84 166 72 Q166 62 150 60 L118 54 L108 28 Z" fill="#6a4a30" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M70 74 L166 74" stroke="${INK}" stroke-width="2.2"/><path d="M76 36 L104 36" stroke="${INK}" stroke-width="2" opacity=".5"/>`,
  oar: `<path d="M30 92 L150 38" stroke="#8a6a44" stroke-width="7" stroke-linecap="round"/><path d="M30 92 L150 38" stroke="${INK}" stroke-width="2" opacity=".5"/><path d="M142 20 Q172 22 178 44 Q160 52 146 42 Q136 34 142 20Z" fill="#8a6a44" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/>`,
  can: `<ellipse cx="110" cy="42" rx="34" ry="9" fill="#b0836a" stroke="${INK}" stroke-width="2.4"/><path d="M76 42 L76 78 Q110 94 144 78 L144 42" fill="#9a6a4e" stroke="${INK}" stroke-width="2.4"/><path d="M82 52 L82 74 M96 56 L96 80 M124 56 L124 80" stroke="${INK}" stroke-width="1.6" opacity=".4"/>`,
  weed: `<path d="M60 90 Q70 50 90 70 Q96 30 118 60 Q130 24 146 62 Q168 44 160 92 Q110 100 60 90Z" fill="#587a42" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M80 86 Q92 60 100 78 M120 86 Q130 56 140 80" stroke="${INK}" stroke-width="1.6" fill="none" opacity=".45"/>`,
};

export function fishArt(art = {}, { width = 220 } = {}) {
  const id = `fa${uid++}`;

  if (art.junk) {
    return `<svg viewBox="0 0 220 120" width="${width}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><filter id="${id}w"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="5"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></defs><g filter="url(#${id}w)">${JUNK[art.junk] ?? JUNK.can}</g></svg>`;
  }

  const {
    h = 18, length = 138, tail = 'fork', dorsal = 'single', pattern = 'none',
    base = '#8fa6a0', belly = '#ece5d0', accent = '#3d4f4c', halo = false,
  } = art;
  const cy = 60;
  const x1 = 204;
  const x0 = x1 - length;
  const f = (n) => n.toFixed(1);

  const body = `M${x1} ${cy} C${f(x1 - 34)} ${f(cy - h * 1.3)} ${f(x0 + 46)} ${f(cy - h * 1.15)} ${x0} ${f(cy - h * 0.34)} L${x0} ${f(cy + h * 0.34)} C${f(x0 + 46)} ${f(cy + h * 1.15)} ${f(x1 - 34)} ${f(cy + h * 1.3)} ${x1} ${cy}Z`;

  const tails = {
    fork: `M${x0 + 3} ${f(cy - h * 0.34)} L${x0 - 32} ${f(cy - h * 1.05)} Q${x0 - 17} ${cy} ${x0 - 32} ${f(cy + h * 1.05)} L${x0 + 3} ${f(cy + h * 0.34)}Z`,
    round: `M${x0 + 3} ${f(cy - h * 0.34)} Q${x0 - 10} ${f(cy - h * 0.7)} ${x0 - 28} ${f(cy - h * 1.0)} Q${x0 - 40} ${cy} ${x0 - 28} ${f(cy + h * 1.0)} Q${x0 - 10} ${f(cy + h * 0.7)} ${x0 + 3} ${f(cy + h * 0.34)}Z`,
    lunate: `M${x0 + 3} ${f(cy - h * 0.34)} Q${x0 - 8} ${f(cy - h * 0.8)} ${x0 - 36} ${f(cy - h * 1.5)} Q${x0 - 14} ${cy} ${x0 - 36} ${f(cy + h * 1.5)} Q${x0 - 8} ${f(cy + h * 0.8)} ${x0 + 3} ${f(cy + h * 0.34)}Z`,
  };

  const top = cy - h * 0.92;
  const dorsals = {
    single: `M${x0 + 50} ${f(top)} L${x0 + 64} ${f(cy - h * 1.95)} Q${x0 + 82} ${f(cy - h * 1.4)} ${x0 + 96} ${f(top + 3)}Z`,
    double: `M${x0 + 38} ${f(top + 2)} L${x0 + 46} ${f(cy - h * 1.7)} L${x0 + 60} ${f(top)}Z M${x0 + 70} ${f(top)} L${x0 + 80} ${f(cy - h * 1.6)} L${x0 + 98} ${f(top + 3)}Z`,
    long: `M${x0 + 30} ${f(top + 3)} Q${x0 + 70} ${f(cy - h * 1.75)} ${x0 + 114} ${f(top + 4)}Z`,
    sail: `M${x0 + 44} ${f(top + 2)} Q${x0 + 72} ${f(cy - h * 3.1)} ${x0 + 116} ${f(top + 4)}Z`,
  };

  const anal = `M${x0 + 34} ${f(cy + h * 0.88)} L${x0 + 44} ${f(cy + h * 1.5)} Q${x0 + 58} ${f(cy + h * 1.25)} ${x0 + 68} ${f(cy + h * 0.95)}Z`;
  const pect = `M${x1 - 62} ${f(cy + h * 0.35)} Q${x1 - 82} ${f(cy + h * 1.15)} ${x1 - 94} ${f(cy + h * 1.05)} Q${x1 - 86} ${f(cy + h * 0.5)} ${x1 - 72} ${f(cy + h * 0.3)}Z`;

  let marks = '';
  if (pattern === 'vertical') {
    for (let x = x0 + 34; x < x1 - 50; x += 13) marks += `<path d="M${x} ${f(cy - h * 1.3)} Q${x + 5} ${cy} ${x} ${f(cy + h * 1.3)}" stroke="${accent}" stroke-width="3.4" fill="none" opacity=".55"/>`;
  } else if (pattern === 'horizontal') {
    for (const k of [-0.45, 0.05, 0.5]) marks += `<path d="M${x0 + 10} ${f(cy + h * k)} Q${f((x0 + x1) / 2)} ${f(cy + h * k - 3)} ${x1 - 30} ${f(cy + h * k * 0.8)}" stroke="${accent}" stroke-width="2.6" fill="none" opacity=".5"/>`;
  } else if (pattern === 'spots') {
    for (let i = 0; i < 16; i++) {
      const sx = x0 + 22 + ((i * 37) % (length - 60));
      const sy = cy + (((i * 53) % 100) / 100 - 0.5) * h * 1.6;
      marks += `<circle cx="${sx}" cy="${f(sy)}" r="${2.4 + (i % 3)}" fill="${accent}" opacity=".5"/>`;
    }
  } else if (pattern === 'scales') {
    for (let r = -1; r <= 1; r++) for (let x = x0 + 22; x < x1 - 46; x += 14) marks += `<path d="M${x} ${f(cy + r * h * 0.55 - 4)} q7 4 0 9" stroke="${accent}" stroke-width="1.6" fill="none" opacity=".5"/>`;
  }

  let hatch = '';
  for (let x = x0 + 24; x < x1 - 36; x += 7) hatch += `<path d="M${x} ${f(cy + h * 0.5)} l-5 ${f(h * 0.7)}" stroke="${INK}" stroke-width="1" opacity=".3"/>`;

  const glow = halo ? `<circle cx="${(x0 + x1) / 2}" cy="${cy}" r="${length * 0.55}" fill="url(#${id}g)"/>` : '';

  return `<svg viewBox="0 0 220 120" width="${width}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs>
  <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${base}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${belly}"/></linearGradient>
  <radialGradient id="${id}g"><stop offset="0" stop-color="#f6d778" stop-opacity=".55"/><stop offset="1" stop-color="#f6d778" stop-opacity="0"/></radialGradient>
  <clipPath id="${id}c"><path d="${body}"/></clipPath>
  <filter id="${id}w"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="3"/><feDisplacementMap in="SourceGraphic" scale="3"/></filter>
</defs>
${glow}
<g filter="url(#${id}w)" stroke="${INK}" stroke-width="2.3" stroke-linejoin="round">
  <path d="${tails[tail] ?? tails.fork}" fill="${base}"/>
  <path d="${dorsals[dorsal] ?? dorsals.single}" fill="${base}"/>
  <path d="${anal}" fill="${belly}"/>
  <path d="${body}" fill="url(#${id}b)"/>
  <g clip-path="url(#${id}c)" stroke="none">${marks}${hatch}</g>
  <path d="${pect}" fill="${belly}"/>
  <path d="M${x1 - 52} ${f(cy - h * 0.55)} Q${x1 - 61} ${cy} ${x1 - 52} ${f(cy + h * 0.6)}" fill="none"/>
  <path d="M${x1} ${cy} l-9 3" fill="none"/>
  <circle cx="${x1 - 30}" cy="${f(cy - h * 0.18)}" r="5" fill="#f4ecd8"/>
  <circle cx="${x1 - 29}" cy="${f(cy - h * 0.18)}" r="2.3" fill="${INK}" stroke="none"/>
</g>
</svg>`;
}

export default fishArt;