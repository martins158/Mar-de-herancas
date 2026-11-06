// src/ui/CabinScene.js

/**
 * CabinScene
 * O interior da cabana do avô, em tela cheia, desenhado em SVG e animado com CSS (nada de
 * imagem externa). É uma cena "viva": a lareira ainda está acesa (chamas tremendo, brasas
 * subindo, o clarão varia a luz da sala) e, como a casa fica no meio do mar, algumas coisas
 * balançam devagar: o quadro sobre a lareira, a cadeira de balanço de pés em meia-lua, a
 * lamparina pendurada, a rede de pesca, os peixes secos e até o horizonte na vigia.
 * Sobre a mesa, o caderno de capa de lona do avô, aberto.
 *
 * A cena fica ABAIXO da caixa de diálogo (z-index 18 contra 20): o texto do diário aparece
 * por cima, embaixo da tela. Só desenha; quem decide quando abre é o main.js.
 * Respeita `prefers-reduced-motion` (sem animação).
 *
 * Uso:
 *   const cabin = new CabinScene();
 *   cabin.open();      // entra com fade; chame junto de abrir o diálogo do diário
 *   cabin.close();     // sai com fade
 *   cabin.isOpen;
 *   cabin.dispose();
 *
 * O desenho em si vem de cabinInteriorSvg() (exportada para teste): viewBox 1600×900, cobre a
 * tela inteira (preserveAspectRatio "slice"). Para mexer em ritmo/intensidade, ver SWAY e
 * as variáveis --amp/--dur no CSS.
 */

const FADE_MS = 650;

/** Itens que balançam: origem do giro (x, y em unidades do desenho), amplitude (graus), duração (s). */
const SWAY = {
  picture: { ox: 800, oy: 196, amp: 2.4, dur: 6.4, delay: -1.3 },
  lantern: { ox: 1090, oy: 62, amp: 3.2, dur: 5.2, delay: -2.6 },
  net: { ox: 1445, oy: 92, amp: 1.4, dur: 7.6, delay: -3.1 },
  fish: { ox: 462, oy: 62, amp: 4.2, dur: 4.3, delay: -0.8 },
  chair: { ox: 1245, oy: 852, amp: 3.6, dur: 5.6, delay: -2 },
  horizon: { ox: 290, oy: 332, amp: 3, dur: 7, delay: -4 },
};

const sway = (name, content) => {
  const s = SWAY[name];
  return `<g class="sway" style="--ox:${s.ox}px;--oy:${s.oy}px;--amp:${s.amp}deg;--dur:${s.dur}s;--delay:${s.delay}s">${content}</g>`;
};

/** Gerador pseudoaleatório fixo: a madeira e as pedras saem iguais em toda abertura. */
function makeRand(seed) {
  let s = seed;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const f1 = (n) => Math.round(n * 10) / 10;

/** Tábuas verticais da parede de fundo. */
function wallPlanks(rand) {
  const tones = ['#6a472d', '#5f3f28', '#70492c', '#583a24', '#664429'];
  let out = '';
  for (let x = 0, i = 0; x < 1600; x += 100, i++) {
    const tone = tones[Math.floor(rand() * tones.length)];
    out += `<rect x="${x}" y="60" width="100" height="672" fill="${tone}"/>`;
    for (let g = 0; g < 3; g++) {
      const gx = x + 14 + rand() * 72;
      out += `<path d="M${f1(gx)} 62 C${f1(gx + 5)} 260 ${f1(gx - 6)} 460 ${f1(gx + 2)} 730" stroke="#2a1a10" stroke-opacity="${f1(0.1 + rand() * 0.14)}" stroke-width="${f1(1 + rand() * 1.5)}" fill="none"/>`;
    }
    if (rand() < 0.45) {
      const ky = 160 + rand() * 480;
      const kx = x + 22 + rand() * 56;
      out += `<ellipse cx="${f1(kx)}" cy="${f1(ky)}" rx="${f1(6 + rand() * 5)}" ry="${f1(10 + rand() * 8)}" fill="#3a2414" fill-opacity=".55"/><ellipse cx="${f1(kx)}" cy="${f1(ky)}" rx="3" ry="6" fill="#241409" fill-opacity=".6"/>`;
    }
    out += `<rect x="${x}" y="60" width="3" height="672" fill="#1e1209" fill-opacity=".55"/>`;
  }
  return out;
}

/** Piso em perspectiva: tábuas que fogem para o fundo. */
function floorBoards(rand) {
  let out = '<rect x="0" y="730" width="1600" height="170" fill="url(#cabFloor)"/>';
  const tones = ['#5a3a22', '#4d311c', '#63402a', '#52361f'];
  const bottoms = [];
  for (let x = -200; x <= 1800; x += 150) bottoms.push(x);
  for (let i = 0; i < bottoms.length - 1; i++) {
    const xb0 = bottoms[i];
    const xb1 = bottoms[i + 1];
    const xt0 = 800 + (xb0 - 800) * 0.74;
    const xt1 = 800 + (xb1 - 800) * 0.74;
    out += `<polygon points="${f1(xt0)},730 ${f1(xt1)},730 ${xb1},900 ${xb0},900" fill="${tones[Math.floor(rand() * tones.length)]}" fill-opacity=".85"/>`;
    out += `<line x1="${f1(xt0)}" y1="730" x2="${xb0}" y2="900" stroke="#1e1209" stroke-opacity=".6" stroke-width="2"/>`;
  }
  for (const y of [772, 822, 870]) out += `<rect x="0" y="${y}" width="1600" height="2" fill="#1e1209" fill-opacity=".28"/>`;
  out += '<rect x="0" y="730" width="1600" height="14" fill="#1e1209" fill-opacity=".5"/>'; // rodapé
  return out;
}

/** Pedras da chaminé, em fileiras que se desencontram. */
function chimneyStones(rand) {
  const tones = ['#8b8274', '#7a7164', '#6f685c', '#847b6d', '#766d60', '#8f8678'];
  let out = '';
  for (let y = 60, row = 0; y < 732; y += 38, row++) {
    let x = 590 - (row % 2 ? 40 : 0);
    while (x < 1010) {
      const w = 62 + rand() * 54;
      const x0 = Math.max(x, 590);
      const x1 = Math.min(x + w, 1010);
      if (x1 - x0 > 14) out += `<rect x="${f1(x0 + 1)}" y="${y + 1}" width="${f1(x1 - x0 - 2)}" height="36" rx="7" fill="${tones[Math.floor(rand() * tones.length)]}" stroke="#3b362f" stroke-width="2"/>`;
      x += w;
    }
  }
  return out;
}

/** Brasas que sobem pela boca da lareira. */
function embers(rand) {
  let out = '';
  for (let i = 0; i < 16; i++) {
    const x = 760 + rand() * 80;
    const dx = (rand() - 0.5) * 70;
    const dy = -(70 + rand() * 120);
    const t = 2.2 + rand() * 2.6;
    const d = -rand() * 5;
    const r = 1.6 + rand() * 2.2;
    out += `<circle class="ember" cx="${f1(x)}" cy="706" r="${f1(r)}" fill="${rand() < 0.5 ? '#ffb347' : '#ff7a2a'}" style="--dx:${f1(dx)}px;--dy:${f1(dy)}px;--t:${f1(t)}s;--d:${f1(d)}s"/>`;
  }
  return out;
}

/** Grãos de poeira no ar, subindo devagar na luz do fogo. */
function dust(rand) {
  let out = '';
  for (let i = 0; i < 14; i++) {
    const x = 120 + rand() * 1360;
    const y = 200 + rand() * 520;
    const dy = -(40 + rand() * 90);
    const dx = (rand() - 0.5) * 60;
    out += `<circle class="mote" cx="${f1(x)}" cy="${f1(y)}" r="${f1(1 + rand() * 1.4)}" fill="#ffe3b0" style="--dx:${f1(dx)}px;--dy:${f1(dy)}px;--t:${f1(9 + rand() * 9)}s;--d:${f1(-rand() * 14)}s"/>`;
  }
  return out;
}

/** Rede de pesca pendurada. */
function netArt() {
  let lines = '';
  for (let k = -300; k < 300; k += 26) {
    lines += `<line x1="${1350 + k}" y1="96" x2="${1350 + k + 320}" y2="480" /><line x1="${1530 + k + 40}" y1="96" x2="${1530 + k - 280}" y2="480" />`;
  }
  let floats = '';
  for (let x = 1372; x <= 1522; x += 30) floats += `<circle cx="${x}" cy="104" r="7" fill="#c8a66a" stroke="#4a3118" stroke-width="2"/>`;
  return `
    <clipPath id="cabNetClip"><path d="M1360 98 L1532 98 L1512 420 Q1446 480 1382 420 Z"/></clipPath>
    <line x1="1340" y1="92" x2="1552" y2="92" stroke="#3a2616" stroke-width="5" stroke-linecap="round"/>
    <path d="M1360 98 L1532 98 L1512 420 Q1446 480 1382 420 Z" fill="#241609" fill-opacity=".25"/>
    <g clip-path="url(#cabNetClip)" stroke="#c9b787" stroke-width="2" stroke-opacity=".85" fill="none">${lines}</g>
    ${floats}
    <circle cx="1396" cy="428" r="6" fill="#55575b" stroke="#222" stroke-width="2"/>
    <circle cx="1446" cy="450" r="6" fill="#55575b" stroke="#222" stroke-width="2"/>
    <circle cx="1498" cy="426" r="6" fill="#55575b" stroke="#222" stroke-width="2"/>`;
}

/** Os peixes secos pendurados numa corda. */
function driedFish() {
  const fish = (y, tone) => `
    <line x1="462" y1="${y - 16}" x2="462" y2="${y}" stroke="#3a2616" stroke-width="2"/>
    <path d="M462 ${y} C448 ${y + 14} 447 ${y + 46} 462 ${y + 68} C477 ${y + 46} 476 ${y + 14} 462 ${y} Z" fill="${tone}" stroke="#2b1d12" stroke-width="2"/>
    <path d="M462 ${y + 68} L450 ${y + 86} L462 ${y + 78} L474 ${y + 86} Z" fill="${tone}" stroke="#2b1d12" stroke-width="2"/>
    <path d="M455 ${y + 12} Q462 ${y + 30} 455 ${y + 50}" stroke="#2b1d12" stroke-opacity=".35" stroke-width="1.5" fill="none"/>
    <circle cx="462" cy="${y + 14}" r="2.2" fill="#2b1d12"/>`;
  return `<line x1="430" y1="62" x2="494" y2="62" stroke="#3a2616" stroke-width="4" stroke-linecap="round"/>
    <line x1="462" y1="62" x2="462" y2="108" stroke="#3a2616" stroke-width="2"/>
    ${fish(108, '#a8a291')}${fish(206, '#9a8f78')}`;
}

/** A lamparina de teto, apagada, que refleta o fogo. */
function hangingLantern() {
  return `
    <line x1="1090" y1="62" x2="1090" y2="150" stroke="#2b1d12" stroke-width="3" stroke-dasharray="7 3"/>
    <path d="M1066 176 L1114 176 L1104 152 L1076 152 Z" fill="#3a3430" stroke="#1e1a17" stroke-width="2"/>
    <circle cx="1090" cy="148" r="6" fill="#3a3430" stroke="#1e1a17" stroke-width="2"/>
    <rect x="1070" y="176" width="40" height="62" fill="#ffcf8a" fill-opacity=".14" stroke="#1e1a17" stroke-width="3"/>
    <line x1="1090" y1="176" x2="1090" y2="238" stroke="#1e1a17" stroke-width="2"/>
    <path d="M1064 238 L1116 238 L1110 252 L1070 252 Z" fill="#3a3430" stroke="#1e1a17" stroke-width="2"/>
    <ellipse class="flick" cx="1098" cy="206" rx="6" ry="18" fill="#ffb868" fill-opacity=".35"/>`;
}

/** O quadro sobre a lareira: um barco ao pôr do sol. */
function pictureFrame() {
  return `
    <line x1="800" y1="196" x2="722" y2="262" stroke="#2a1a10" stroke-width="3"/>
    <line x1="800" y1="196" x2="878" y2="262" stroke="#2a1a10" stroke-width="3"/>
    <circle cx="800" cy="196" r="6" fill="#8a8a90" stroke="#222" stroke-width="2"/>
    <rect x="698" y="254" width="204" height="154" rx="6" fill="#6b4a28" stroke="#2a1a10" stroke-width="3"/>
    <rect x="698" y="254" width="204" height="10" rx="5" fill="#8a6338" fill-opacity=".8"/>
    <rect x="712" y="268" width="176" height="126" fill="#e9dcc0" stroke="#2a1a10" stroke-opacity=".6" stroke-width="2"/>
    <clipPath id="cabPicClip"><rect x="722" y="278" width="156" height="106"/></clipPath>
    <g clip-path="url(#cabPicClip)">
      <rect x="722" y="278" width="156" height="106" fill="url(#cabPicSky)"/>
      <circle cx="808" cy="346" r="17" fill="#ffe08a"/>
      <rect x="722" y="346" width="156" height="40" fill="#1c4658"/>
      <path d="M722 352 Q740 347 758 352 T794 352 T830 352 T866 352 T902 352" stroke="#4b8aa0" stroke-width="2" fill="none"/>
      <path d="M722 364 Q744 359 766 364 T810 364 T854 364 T898 364" stroke="#4b8aa0" stroke-width="2" fill="none" stroke-opacity=".7"/>
      <path d="M770 345 L846 345 L836 357 L780 357 Z" fill="#2a1a10"/>
      <path d="M808 342 L808 308 L836 340 Z" fill="#ece0c2"/>
      <path d="M804 342 L804 316 L782 340 Z" fill="#d8c9a4"/>
    </g>`;
}

/** Cadeira de balanço de perfil, com os pés em meia-lua. */
function rockingChair() {
  return `
    <path d="M1108 826 Q1235 890 1382 826" stroke="#2a1a10" stroke-width="16" stroke-linecap="round" fill="none"/>
    <path d="M1108 824 Q1235 888 1382 824" stroke="#8b6238" stroke-width="9" stroke-linecap="round" fill="none"/>
    <line x1="1160" y1="720" x2="1160" y2="846" stroke="#3a2616" stroke-width="12" stroke-linecap="round"/>
    <line x1="1334" y1="720" x2="1334" y2="843" stroke="#3a2616" stroke-width="12" stroke-linecap="round"/>
    <line x1="1160" y1="796" x2="1334" y2="792" stroke="#3a2616" stroke-width="7" stroke-linecap="round"/>
    <path d="M1325 722 L1366 512" stroke="#3a2616" stroke-width="13" stroke-linecap="round"/>
    <path d="M1338 700 L1374 524" stroke="#5b3d20" stroke-width="5" stroke-linecap="round"/>
    <path d="M1304 686 L1342 686 M1311 646 L1349 646 M1318 606 L1356 606 M1325 566 L1362 566" stroke="#5b3d20" stroke-width="8" stroke-linecap="round"/>
    <g transform="rotate(14 1370 516)"><rect x="1342" y="498" width="56" height="34" rx="12" fill="#6b4a28" stroke="#2a1a10" stroke-width="3"/><rect x="1348" y="502" width="44" height="6" rx="3" fill="#a37a48" fill-opacity=".7"/></g>
    <rect x="1150" y="708" width="196" height="22" rx="9" fill="#6b4a28" stroke="#2a1a10" stroke-width="3"/>
    <path d="M1162 644 L1166 716" stroke="#3a2616" stroke-width="9" stroke-linecap="round"/>
    <path d="M1148 640 Q1250 628 1340 646" stroke="#4a3018" stroke-width="12" stroke-linecap="round" fill="none"/>
    <rect x="1156" y="698" width="108" height="16" rx="8" fill="#9a7a4a" stroke="#2a1a10" stroke-width="3"/>
    <path d="M1268 698 Q1308 686 1344 696 L1340 758 Q1314 784 1294 748 Q1282 776 1272 742 Z" fill="#a8452f" stroke="#2a1a10" stroke-width="3"/>
    <path d="M1288 706 Q1298 746 1288 744 M1316 704 Q1326 748 1316 756" stroke="#e6c27a" stroke-width="5" stroke-linecap="round" fill="none" stroke-opacity=".85"/>`;
}

/** Mesa à esquerda, o caderno do avô aberto e a lamparina apagada. */
function tableAndDiary() {
  const lines = (x0, y0, n) => Array.from({ length: n }, (_, i) => `<path d="M${x0} ${y0 + i * 9} q16 -3 32 0 t34 0" stroke="#2b1d12" stroke-opacity=".6" stroke-width="2" fill="none"/>`).join('');
  return `
    <ellipse cx="320" cy="858" rx="260" ry="26" fill="#000" fill-opacity=".28"/>
    <rect x="124" y="756" width="22" height="104" fill="#3a2616" stroke="#1e1209" stroke-width="2"/>
    <rect x="494" y="756" width="22" height="104" fill="#3a2616" stroke="#1e1209" stroke-width="2"/>
    <polygon points="140,688 500,688 548,734 92,734" fill="url(#cabTable)" stroke="#1e1209" stroke-width="3"/>
    <rect x="92" y="734" width="456" height="26" fill="#4d311c" stroke="#1e1209" stroke-width="3"/>
    <ellipse cx="290" cy="712" rx="130" ry="26" fill="#ffd28a" fill-opacity=".16"/>
    <path d="M212 700 L316 690 L318 726 L206 736 Z" fill="#4c4a3a" stroke="#1e1209" stroke-width="3"/>
    <path d="M318 690 L426 700 L432 736 L318 726 Z" fill="#3f3d30" stroke="#1e1209" stroke-width="3"/>
    <path d="M216 698 L314 689 L316 721 L212 730 Z" fill="#e8dcb8" stroke="#2b1d12" stroke-width="2"/>
    <path d="M320 689 L420 698 L424 730 L320 721 Z" fill="#e0d3aa" stroke="#2b1d12" stroke-width="2"/>
    ${lines(224, 703, 3)}${lines(332, 700, 3)}
    <path d="M316 689 L320 721" stroke="#2b1d12" stroke-opacity=".6" stroke-width="3"/>
    <ellipse cx="468" cy="716" rx="34" ry="8" fill="#000" fill-opacity=".3"/>
    <g transform="translate(-4 36)">
      <rect x="456" y="652" width="36" height="14" rx="3" fill="#a07a38" stroke="#1e1209" stroke-width="2"/>
      <rect x="462" y="610" width="24" height="42" fill="#d8c8a0" fill-opacity=".22" stroke="#1e1209" stroke-width="2.5"/>
      <path d="M460 610 L488 610 L482 598 L466 598 Z" fill="#8a7a58" stroke="#1e1209" stroke-width="2"/>
      <path d="M450 666 L498 666 L492 684 L456 684 Z" fill="#a07a38" stroke="#1e1209" stroke-width="2"/>
    </g>`;
}

/** Janela redonda (vigia) com o mar lá fora; o horizonte inclina com o balanço. */
function porthole() {
  let bolts = '';
  for (let a = 0; a < 8; a++) {
    const rad = (a / 8) * Math.PI * 2 + 0.2;
    bolts += `<circle cx="${f1(290 + Math.cos(rad) * 132)}" cy="${f1(330 + Math.sin(rad) * 132)}" r="5" fill="#d2a85a" stroke="#2a1a10" stroke-width="2"/>`;
  }
  return `
    <circle cx="290" cy="330" r="146" fill="#1e1209" fill-opacity=".45"/>
    <circle cx="290" cy="330" r="140" fill="#6b5530" stroke="#2a1a10" stroke-width="4"/>
    <circle cx="290" cy="330" r="124" fill="url(#cabBrass)" stroke="#2a1a10" stroke-width="3"/>
    <clipPath id="cabPortClip"><circle cx="290" cy="330" r="112"/></clipPath>
    <g clip-path="url(#cabPortClip)">
      ${sway('horizon', `
        <rect x="60" y="60" width="460" height="290" fill="url(#cabPortSky)"/>
        <ellipse cx="410" cy="300" rx="70" ry="20" fill="#f6a860" fill-opacity=".35"/>
        <ellipse cx="220" cy="262" rx="60" ry="9" fill="#f4c89a" fill-opacity=".28"/>
        <ellipse cx="330" cy="236" rx="46" ry="7" fill="#f4c89a" fill-opacity=".2"/>
        <rect x="60" y="342" width="460" height="260" fill="url(#cabPortSea)"/>
        <path d="M150 366 Q180 360 210 366 T270 366 T330 366 T390 366" stroke="#6aa6b4" stroke-opacity=".55" stroke-width="3" fill="none"/>
        <path d="M130 392 Q166 385 202 392 T274 392 T346 392 T418 392" stroke="#6aa6b4" stroke-opacity=".4" stroke-width="3" fill="none"/>
        <path d="M330 345 L350 345 L344 356 L336 356 Z" fill="#ffd28a" fill-opacity=".6"/>`)}
    </g>
    <path d="M200 270 Q240 232 300 226" stroke="#fff" stroke-opacity=".28" stroke-width="7" stroke-linecap="round" fill="none"/>
    ${bolts}`;
}

/** O desenho completo (SVG em texto). */
export function cabinInteriorSvg() {
  const rand = makeRand(4242);
  const planks = wallPlanks(rand);
  const floor = floorBoards(rand);
  const stones = chimneyStones(rand);
  const emberArt = embers(rand);
  const motes = dust(rand);

  return `<svg class="mdh-cabin-art" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
  <defs>
    <linearGradient id="cabFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3c2615"/><stop offset="1" stop-color="#2a190d"/></linearGradient>
    <linearGradient id="cabBeam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a190d"/><stop offset="1" stop-color="#3a2514"/></linearGradient>
    <linearGradient id="cabWood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5230"/><stop offset="1" stop-color="#4a301a"/></linearGradient>
    <linearGradient id="cabTable" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6b4a2c"/><stop offset="1" stop-color="#8a6238"/></linearGradient>
    <radialGradient id="cabBrass" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#e2bd6a"/><stop offset=".6" stop-color="#a47c36"/><stop offset="1" stop-color="#6b5530"/></radialGradient>
    <linearGradient id="cabPortSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27406a"/><stop offset=".55" stop-color="#9c6a70"/><stop offset="1" stop-color="#f0a259"/></linearGradient>
    <linearGradient id="cabPortSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a5a6a"/><stop offset="1" stop-color="#0f2a38"/></linearGradient>
    <linearGradient id="cabPicSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#27406a"/><stop offset="1" stop-color="#f2a65a"/></linearGradient>
    <linearGradient id="cabFirebox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#140a06"/><stop offset="1" stop-color="#3a1a0c"/></linearGradient>
    <radialGradient id="cabFlameA" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#ff9a2e"/><stop offset="1" stop-color="#e2381a"/></radialGradient>
    <radialGradient id="cabFlameB" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#ffd25a"/><stop offset="1" stop-color="#ff8a22"/></radialGradient>
    <radialGradient id="cabFlameC" cx=".5" cy="1" r="1"><stop offset="0" stop-color="#fff3c0"/><stop offset="1" stop-color="#ffd65c"/></radialGradient>
    <radialGradient id="cabHalo" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#ff9a40" stop-opacity=".75"/><stop offset="1" stop-color="#ff7a20" stop-opacity="0"/></radialGradient>
    <radialGradient id="cabRoomGlow" cx=".5" cy=".78" r=".75"><stop offset="0" stop-color="#ff9a44" stop-opacity=".42"/><stop offset=".5" stop-color="#ff7a2a" stop-opacity=".14"/><stop offset="1" stop-color="#ff7a2a" stop-opacity="0"/></radialGradient>
    <radialGradient id="cabVignette" cx=".5" cy=".5" r=".75"><stop offset=".55" stop-color="#0a0503" stop-opacity="0"/><stop offset="1" stop-color="#0a0503" stop-opacity=".78"/></radialGradient>
    <radialGradient id="cabRug" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#8a4a38"/><stop offset="1" stop-color="#4f2a22"/></radialGradient>
  </defs>

  <rect width="1600" height="900" fill="#1a0f08"/>
  ${planks}
  <rect x="0" y="0" width="1600" height="64" fill="url(#cabBeam)"/>
  <rect x="0" y="58" width="1600" height="6" fill="#120a05" fill-opacity=".7"/>
  <rect x="0" y="0" width="38" height="732" fill="#2a190d"/><rect x="1562" y="0" width="38" height="732" fill="#2a190d"/>
  ${floor}

  <!-- vigia (janela redonda) -->
  ${porthole()}

  <!-- peixes secos, rede e lamparina de teto -->
  ${sway('fish', driedFish())}
  ${sway('net', netArt())}
  ${sway('lantern', hangingLantern())}

  <!-- lareira -->
  <rect x="590" y="60" width="420" height="672" fill="#5d564b"/>
  ${stones}
  <path d="M652 732 L652 598 Q652 520 800 520 Q948 520 948 598 L948 732 Z" fill="none" stroke="#4d473e" stroke-width="30"/>
  <path d="M652 732 L652 598 Q652 520 800 520 Q948 520 948 598 L948 732 Z" fill="none" stroke="#9a9182" stroke-width="22" stroke-dasharray="36 5"/>
  <path d="M666 732 L666 598 Q666 534 800 534 Q934 534 934 598 L934 732 Z" fill="url(#cabFirebox)"/>
  <path d="M740 620 Q760 580 800 590 Q840 580 862 620" stroke="#000" stroke-opacity=".35" stroke-width="14" fill="none" stroke-linecap="round"/>
  <ellipse class="flick" cx="800" cy="690" rx="250" ry="170" fill="url(#cabHalo)"/>
  <rect x="624" y="728" width="352" height="26" rx="3" fill="#8e8678" stroke="#3b362f" stroke-width="3"/>
  <rect x="624" y="728" width="352" height="5" fill="#b3aa98" fill-opacity=".6"/>
  <ellipse cx="800" cy="718" rx="112" ry="14" fill="#ff6a2a" fill-opacity=".75"/>
  <g transform="rotate(-9 800 706)"><rect x="716" y="692" width="170" height="28" rx="14" fill="#4a2c17" stroke="#1e1209" stroke-width="2"/><circle cx="886" cy="706" r="12" fill="#a8693a"/></g>
  <g transform="rotate(11 800 706)"><rect x="716" y="696" width="170" height="26" rx="13" fill="#5a3720" stroke="#1e1209" stroke-width="2"/><circle cx="716" cy="709" r="11" fill="#a8693a"/></g>
  <ellipse cx="800" cy="716" rx="70" ry="9" fill="#ff5a1a" fill-opacity=".65"/>
  <g class="flame f1" style="--ox:800px;--oy:714px"><path d="M736 714 C730 668 768 646 780 590 C790 628 812 636 822 600 C852 642 872 672 866 714 Z" fill="url(#cabFlameA)"/></g>
  <g class="flame f2" style="--ox:800px;--oy:714px"><path d="M760 714 C756 678 786 662 796 628 C806 652 826 664 836 692 C842 704 840 710 838 714 Z" fill="url(#cabFlameB)"/></g>
  <g class="flame f3" style="--ox:800px;--oy:714px"><path d="M782 714 C780 692 796 684 800 664 C808 680 822 692 820 714 Z" fill="url(#cabFlameC)"/></g>
  <g class="flame f2" style="--ox:742px;--oy:714px"><path d="M722 714 C720 692 734 684 740 664 C750 684 760 696 756 714 Z" fill="url(#cabFlameA)" fill-opacity=".9"/></g>
  <g class="flame f1" style="--ox:872px;--oy:714px"><path d="M850 714 C850 694 866 686 872 668 C882 688 890 698 886 714 Z" fill="url(#cabFlameB)" fill-opacity=".9"/></g>
  ${emberArt}
  <rect x="558" y="455" width="484" height="36" rx="4" fill="url(#cabWood)" stroke="#1e1209" stroke-width="3"/>
  <rect x="558" y="455" width="484" height="6" fill="#a37a48" fill-opacity=".7"/>
  <path d="M590 491 L628 491 L616 520 L598 520 Z M972 491 L1010 491 L1002 520 L984 520 Z" fill="#3a2514" stroke="#1e1209" stroke-width="2"/>
  <!-- navio na garrafa, bússola e vela apagada sobre a lareira -->
  <rect x="624" y="420" width="76" height="34" rx="16" fill="#8fc4b0" fill-opacity=".55" stroke="#2b1d12" stroke-width="2.5"/>
  <path d="M640 446 L684 446 L679 452 L645 452 Z" fill="#3a2514"/><path d="M662 444 L662 428 L678 442 Z M659 444 L659 432 L648 442 Z" fill="#efe3c4"/>
  <rect x="696" y="428" width="9" height="18" fill="#c9a66a" stroke="#2b1d12" stroke-width="1.5"/>
  <circle cx="940" cy="437" r="17" fill="#b8893c" stroke="#2b1d12" stroke-width="2.5"/><circle cx="940" cy="437" r="12" fill="#efe3c4"/><path d="M940 428 L944 437 L940 446 L936 437 Z" fill="#a23a2a"/>
  <rect x="982" y="418" width="14" height="36" rx="2" fill="#e6d8b0" stroke="#2b1d12" stroke-width="2"/><path d="M989 418 q-2 -7 0 -10" stroke="#2b1d12" stroke-width="2" fill="none"/>
  ${sway('picture', pictureFrame())}

  <!-- mesa com o caderno do avô e a cadeira de balanço -->
  <ellipse cx="800" cy="830" rx="330" ry="56" fill="url(#cabRug)" stroke="#2a1a10" stroke-width="3"/>
  <ellipse cx="800" cy="830" rx="270" ry="40" fill="none" stroke="#e6c27a" stroke-opacity=".5" stroke-width="3" stroke-dasharray="14 8"/>
  <ellipse cx="1245" cy="856" rx="170" ry="16" fill="#000" fill-opacity=".3"/>
  ${tableAndDiary()}
  ${sway('chair', rockingChair())}

  <!-- luz do fogo sobre a sala, grãos de poeira e sombra nas bordas -->
  <rect class="flick roomglow" width="1600" height="900" fill="url(#cabRoomGlow)"/>
  ${motes}
  <rect width="1600" height="900" fill="url(#cabVignette)"/>
</svg>`;
}

const STYLE = `
.mdh-cabin { position: fixed; inset: 0; z-index: 18; background: #120a06; opacity: 0; pointer-events: none; transition: opacity ${FADE_MS}ms ease; overflow: hidden; font-family: Georgia, 'Times New Roman', serif; }
.mdh-cabin[hidden] { display: none; }
.mdh-cabin.on { opacity: 1; pointer-events: auto; }
.mdh-cabin svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; }
.mdh-cabin .title { position: absolute; top: 26px; left: 0; right: 0; text-align: center; font-style: italic; letter-spacing: .08em; font-size: clamp(16px, 2.2vw, 26px); color: #f3dfb6; text-shadow: 0 2px 8px rgba(0,0,0,.85); opacity: 0; }
.mdh-cabin.on .title { animation: mdh-cabin-title 4.6s ease .7s both; }
.mdh-cabin .sway { transform-origin: var(--ox) var(--oy); animation: mdh-cabin-sway var(--dur, 6s) ease-in-out var(--delay, 0s) infinite alternate; }
.mdh-cabin .flame { transform-origin: var(--ox) var(--oy); }
.mdh-cabin .f1 { animation: mdh-cabin-flame 1.15s ease-in-out infinite; }
.mdh-cabin .f2 { animation: mdh-cabin-flame 0.85s ease-in-out -0.3s infinite; }
.mdh-cabin .f3 { animation: mdh-cabin-flame 0.65s ease-in-out -0.5s infinite; }
.mdh-cabin .ember { opacity: 0; animation: mdh-cabin-ember var(--t) linear var(--d) infinite; }
.mdh-cabin .mote { opacity: 0; animation: mdh-cabin-mote var(--t) linear var(--d) infinite; }
.mdh-cabin .flick { animation: mdh-cabin-flick 1.7s ease-in-out infinite; }
.mdh-cabin .roomglow { animation-duration: 2.3s; }
@keyframes mdh-cabin-sway { from { transform: rotate(calc(var(--amp, 2deg) * -1)); } to { transform: rotate(var(--amp, 2deg)); } }
@keyframes mdh-cabin-flame {
  0%, 100% { transform: scale(1, 1) skewX(0deg); }
  25% { transform: scale(0.95, 1.1) skewX(3deg); }
  50% { transform: scale(1.05, 0.93) skewX(-2.5deg); }
  75% { transform: scale(0.98, 1.07) skewX(2deg); }
}
@keyframes mdh-cabin-ember {
  0% { opacity: 0; transform: translate(0, 0) scale(1); }
  12% { opacity: 1; }
  70% { opacity: 0.8; }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.3); }
}
@keyframes mdh-cabin-mote {
  0% { opacity: 0; transform: translate(0, 0); }
  20% { opacity: 0.45; }
  80% { opacity: 0.3; }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)); }
}
@keyframes mdh-cabin-flick { 0%, 100% { opacity: 1; } 18% { opacity: 0.82; } 37% { opacity: 0.96; } 58% { opacity: 0.78; } 81% { opacity: 0.93; } }
@keyframes mdh-cabin-title { 0% { opacity: 0; transform: translateY(-6px); } 18% { opacity: 1; transform: none; } 78% { opacity: 1; } 100% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .mdh-cabin *, .mdh-cabin.on .title { animation: none !important; } .mdh-cabin.on .title { opacity: 1; } }
`;

export class CabinScene {
  constructor({ title = 'Cabana do avô' } = {}) {
    this.style = document.createElement('style');
    this.style.textContent = STYLE;
    document.head.appendChild(this.style);

    this.root = document.createElement('div');
    this.root.className = 'mdh-cabin';
    this.root.hidden = true;
    this.root.innerHTML = `${cabinInteriorSvg()}<div class="title"></div>`;
    this.root.querySelector('.title').textContent = title;
    document.body.appendChild(this.root);

    this._open = false;
    this._timer = null;
  }

  get isOpen() {
    return this._open;
  }

  /** Mostra a cena (fade-in). */
  open() {
    clearTimeout(this._timer);
    this._open = true;
    this.root.hidden = false;
    void this.root.offsetWidth; // para a transição de opacidade rodar
    this.root.classList.add('on');
  }

  /** Esconde a cena (fade-out). */
  close() {
    if (!this._open) return;
    this._open = false;
    this.root.classList.remove('on');
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.root.hidden = true;
    }, FADE_MS + 50);
  }

  dispose() {
    clearTimeout(this._timer);
    this.root.remove();
    this.style.remove();
  }
}

export default CabinScene;