// src/ui/ItemIcon.js

/**
 * ItemIcon
 * Desenha as garrafas e relíquias do mar no mesmo estilo de bestiário do FishIcon:
 * contorno de tinta sépia com tremida de pena e aguada de cor. Tudo é SVG gerado
 * por parâmetros (data/items.js → `art`), então um novo item não precisa de arquivo
 * de imagem. Usado no diário (Journal), no cartão da relíquia (ItemCard) e na
 * cena da garrafa (BottleScene).
 *
 * Uso:
 *   import { itemArt } from './ItemIcon.js';
 *   element.innerHTML = itemArt(item.art, { width: 90 });          // string <svg>
 *   element.innerHTML = itemArt(item.art, { width: 220, upright: true }); // garrafa em pé
 *
 * Parâmetros de `art` (todos opcionais; `shape` escolhe o desenho):
 *   shape 'bottle' (padrão): glass (cor do vidro), seal ('cork'|'wax'|'tar'), sealColor,
 *         mark (true = marca riscada no lacre), paper (cor do papel), ink (cor da escrita),
 *         torn (true = papel rasgado), scribble (true = rabiscos de criança)
 *   shape 'buoy' (boia de cortiça), 'mug' (caneca esmaltada), 'watch' (relógio de bolso),
 *         'hook' (anzol de ouro), 'patch' (retalho de vela com ponto cruzado)
 */

const INK = '#2b1d12';
let uid = 0;

const f = (n) => n.toFixed(1);

function bottle(a) {
  const glass = a.glass ?? '#6b9a74';
  const paper = a.paper ?? '#f1e6c8';
  const ink = a.ink ?? INK;
  const sealColor = a.sealColor ?? '#a23a2a';

  const sheet = a.torn
    ? `M52 52 L68 52 L68 60 L65 63 L68 68 L64 72 L68 78 L68 92 L52 92Z`
    : `M52 52 L68 52 L68 92 L52 92Z`;

  let writing = '';
  if (a.scribble) {
    writing = `<path d="M54 58 l4 -3 l3 5 l3 -5 l3 4 M54 68 l5 3 l-3 4 l5 1 M60 82 l3 -4 l4 5" fill="none" stroke="${ink}" stroke-width="1.4" opacity=".7"/>`;
  } else {
    for (const y of [59, 65, 71, 77, 83]) writing += `<path d="M55 ${y} H${a.torn && y % 2 ? 63 : 65}" stroke="${ink}" stroke-width="1.3" opacity=".6"/>`;
  }

  let seal;
  if (a.seal === 'wax') {
    seal = `<path d="M49 27 Q45 8 60 8 Q75 8 71 27 Q72 34 62 32 Q60 36 56 32 Q48 33 49 27Z" fill="${sealColor}"/>` +
      (a.mark ? `<path d="M60 14 V26 M54 20 H66" stroke="#f1e6c8" stroke-width="2.2" opacity=".7" fill="none"/>` : `<circle cx="60" cy="20" r="4" fill="none" stroke="#f1e6c8" stroke-width="1.6" opacity=".45"/>`);
  } else if (a.seal === 'tar') {
    seal = `<path d="M50 26 Q48 10 60 10 Q72 10 70 26 Q70 31 60 31 Q50 31 50 26Z" fill="#2a2622"/>`;
  } else {
    seal = `<rect x="53" y="9" width="14" height="16" rx="2" fill="#9a7448"/><path d="M56 13 H64 M56 18 H64" stroke="${INK}" stroke-width="1" opacity=".4"/>`;
  }

  return `<g transform="rotate(-18 60 62)">
  <path d="${sheet}" fill="${paper}"/>
  <g stroke="none">${writing}</g>
  <path d="M44 46 L44 98 Q44 107 53 107 L67 107 Q76 107 76 98 L76 46 Q76 39 66 33 L66 22 L54 22 L54 33 Q44 39 44 46Z" fill="${glass}" fill-opacity=".6"/>
  <path d="M49 52 V94" stroke="#fff" stroke-width="2.6" opacity=".4" fill="none" stroke-linecap="round"/>
  ${seal}
</g>`;
}

function buoy() {
  let grain = '';
  for (const y of [50, 58, 66, 74, 82]) grain += `<path d="M${f(60 - 28 + Math.abs(y - 66) * 0.4)} ${y} Q60 ${y + 3} ${f(60 + 28 - Math.abs(y - 66) * 0.4)} ${y}" fill="none" stroke="${INK}" stroke-width="1" opacity=".3"/>`;
  return `<path d="M47 40 Q60 2 73 40" fill="none" stroke="#8a6a44" stroke-width="5"/>
  <path d="M47 40 Q60 2 73 40" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".5"/>
  <ellipse cx="60" cy="68" rx="32" ry="33" fill="#c79a5f"/>
  ${grain}
  <ellipse cx="60" cy="68" rx="32" ry="33" fill="none"/>
  <text x="60" y="75" text-anchor="middle" font-family="Georgia, serif" font-size="20" font-weight="bold" fill="#3a1d0e" stroke="none">T.B.</text>`;
}

function mug() {
  return `<path d="M86 52 Q110 52 110 70 Q110 88 86 88" fill="none" stroke="${INK}" stroke-width="9"/>
  <path d="M86 52 Q110 52 110 70 Q110 88 86 88" fill="none" stroke="#e8e2d0" stroke-width="5" stroke-linecap="round"/>
  <path d="M32 40 L32 92 Q32 102 42 102 L78 102 Q88 102 88 92 L88 40Z" fill="#e8e2d0"/>
  <path d="M32 40 H88" stroke="#2f4f7a" stroke-width="6"/>
  <ellipse cx="60" cy="40" rx="28" ry="7" fill="#5a3a22"/>
  <path d="M40 74 l5 7 l-6 3Z M70 90 l5 4 l-6 2Z M80 62 l3 5 l-5 1Z" fill="#6a5a48" stroke="none"/>
  <path d="M38 50 V94" stroke="#fff" stroke-width="3" opacity=".45" fill="none" stroke-linecap="round"/>`;
}

function watch() {
  let ticks = '';
  for (let i = 0; i < 12; i++) {
    const ang = (i * Math.PI) / 6;
    const r1 = i % 3 === 0 ? 20 : 23;
    ticks += `<path d="M${f(60 + Math.sin(ang) * r1)} ${f(64 - Math.cos(ang) * r1)} L${f(60 + Math.sin(ang) * 26)} ${f(64 - Math.cos(ang) * 26)}" stroke="${INK}" stroke-width="${i % 3 === 0 ? 2.2 : 1.2}" fill="none"/>`;
  }
  return `<circle cx="60" cy="14" r="7" fill="none" stroke="#b8862c" stroke-width="3"/>
  <rect x="53" y="19" width="14" height="10" rx="2" fill="#d9a93c"/>
  <circle cx="60" cy="64" r="35" fill="#d9a93c"/>
  <circle cx="60" cy="64" r="28" fill="#f1e6c8"/>
  ${ticks}
  <path d="M60 64 L71.3 72.2" stroke="${INK}" stroke-width="3" fill="none"/>
  <path d="M60 64 L80.9 57.2" stroke="${INK}" stroke-width="2" fill="none"/>
  <circle cx="60" cy="64" r="2.6" fill="${INK}"/>
  <path d="M46 48 L57 62 L51 78" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".5"/>`;
}

function hook() {
  return `<path d="M62 20 L62 72 Q62 98 40 98 Q22 98 22 78" fill="none" stroke="${INK}" stroke-width="12"/>
  <path d="M62 20 L62 72 Q62 98 40 98 Q22 98 22 78" fill="none" stroke="#e0b23e" stroke-width="7"/>
  <path d="M22 80 L12 66 L31 68Z" fill="#e0b23e"/>
  <circle cx="62" cy="14" r="7" fill="none" stroke="${INK}" stroke-width="9"/>
  <circle cx="62" cy="14" r="7" fill="none" stroke="#e0b23e" stroke-width="4.5"/>
  <path d="M66 34 V70" stroke="#fff" stroke-width="2" opacity=".5" fill="none" stroke-linecap="round"/>
  <path d="M86 28 l6 -6 M92 40 h8 M84 16 v-7" stroke="#d9a93c" stroke-width="2.4" fill="none"/>`;
}

function patch() {
  let stitches = '';
  for (let i = 0; i < 6; i++) {
    const x = 30 + i * 11;
    const y = 54 - i * 1.2;
    stitches += `<path d="M${x} ${f(y)} l7 8 M${x} ${f(y + 8)} l7 -8" stroke="#6a4a30" stroke-width="2.2" fill="none"/>`;
  }
  return `<path d="M18 28 L52 22 L100 24 L103 52 L99 86 L60 92 L24 98 L20 62Z" fill="#e2d5b0"/>
  <path d="M26 34 L96 30 M26 90 L96 84" stroke="#6a4a30" stroke-width="1.6" stroke-dasharray="5 4" fill="none" opacity=".7"/>
  ${stitches}
  <path d="M20 62 L22 60 L19 56" fill="none" stroke="${INK}" stroke-width="1.2" opacity=".5"/>`;
}

const SHAPES = { bottle, buoy, mug, watch, hook, patch };

export function itemArt(art = {}, { width = 120, upright = false } = {}) {
  const id = `ia${uid++}`;
  let inner = (SHAPES[art.shape] ?? SHAPES.bottle)(art);
  if (upright && (art.shape ?? 'bottle') === 'bottle') inner = inner.replace('rotate(-18 60 62)', 'rotate(0 60 62)');
  return `<svg viewBox="0 0 120 120" width="${width}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<defs><filter id="${id}w"><feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="2" seed="4"/><feDisplacementMap in="SourceGraphic" scale="2.4"/></filter></defs>
<g filter="url(#${id}w)" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${inner}</g>
</svg>`;
}

export default itemArt;