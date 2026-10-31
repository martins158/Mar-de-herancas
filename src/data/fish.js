// src/data/fish.js

/**
 * Peixes (e achados) que podem ser pescados.
 * É AQUI que se mexe em raridade, peso, força e arte. Nada de peixe fica no código.
 *
 * Como a raridade funciona:
 *   chance de uma espécie ∝ TIERS[tier].weight × (species.weight ?? 1)
 *   e quem lança com MAIS força favorece as faixas mais altas (tier.index).
 *   A pesca só sorteia espécies cujo `spots` contém o ponto onde o jogador está.
 *
 * Campos de cada espécie:
 *   id        identificador (usado pelo tutorial, diário e save)
 *   name      nome mostrado
 *   tier      'comum' | 'incomum' | 'raro' | 'lendario' | 'achado'
 *   kg        [mín, máx] sorteado ao pescar
 *   strength  força da briga (0,6 fraco ... 2,6 monstro): mexe no recolher
 *   weight    multiplicador de chance dentro da faixa (opcional, padrão 1)
 *   spots     onde aparece ('primeira-boia', 'ilha-lanterna'...)
 *   color     cor do peixe 3D que salta para o barco (hex)
 *   art       parâmetros do desenho no estilo bestiário (ver ui/FishIcon.js)
 *   lore      frase do diário/coleção
 *   junk      true = achado (não conta como peixe)
 */

export const TIERS = {
  achado: { label: 'Achado', weight: 4, index: 0 },
  comum: { label: 'Comum', weight: 60, index: 1 },
  incomum: { label: 'Incomum', weight: 26, index: 2 },
  raro: { label: 'Raro', weight: 10, index: 3 },
  lendario: { label: 'Lendário', weight: 3, index: 4 },
};

const ink = (o) => o; // só para deixar o objeto de arte legível

export const FISH = [
  // ---------------------------------------------------------- COMUNS
  { id: 'sardinha', name: 'Sardinha', tier: 'comum', kg: [0.1, 0.4], strength: 0.7, spots: ['primeira-boia'], color: 0xc4d3dc,
    art: ink({ h: 11, length: 118, tail: 'fork', dorsal: 'single', pattern: 'horizontal', base: '#7f98a8', belly: '#eef0e6', accent: '#2f4a5e' }),
    lore: 'Prata miúda. Seu Anselmo diz que dá pra ler a maré pela pressa dela.' },
  { id: 'tainha', name: 'Tainha', tier: 'comum', kg: [0.8, 2.2], strength: 0.9, spots: ['primeira-boia'], color: 0xaebdc4,
    art: ink({ h: 15, length: 134, tail: 'fork', dorsal: 'double', pattern: 'horizontal', base: '#8ea0a4', belly: '#efece0', accent: '#44585c' }),
    lore: 'Pulava no cais de manhã, antes. Hoje só em quem sabe esperar.' },
  { id: 'pescada', name: 'Pescada-amarela', tier: 'comum', kg: [1, 3], strength: 0.9, weight: 0.8, spots: ['primeira-boia'], color: 0xd9c27a,
    art: ink({ h: 16, length: 138, tail: 'round', dorsal: 'long', pattern: 'none', base: '#d6b95e', belly: '#f3ecd2', accent: '#8a6a22' }),
    lore: 'Dourada de barriga cheia. Dona Iracema fazia caldo com ela aos domingos.' },
  { id: 'corvina', name: 'Corvina', tier: 'comum', kg: [1.5, 4], strength: 1.0, weight: 0.8, spots: ['primeira-boia'], color: 0x9aa4a8,
    art: ink({ h: 19, length: 140, tail: 'round', dorsal: 'long', pattern: 'scales', base: '#8a949a', belly: '#e9e6dc', accent: '#3d474d' }),
    lore: 'Ronca quando é tirada da água, como se reclamasse do incômodo.' },

  // ------------------------------------------------------- INCOMUNS
  { id: 'robalo', name: 'Robalo', tier: 'incomum', kg: [1.5, 4.5], strength: 1.1, spots: ['primeira-boia'], color: 0x8fa6a0,
    art: ink({ h: 19, length: 148, tail: 'fork', dorsal: 'double', pattern: 'horizontal', base: '#7d9a8e', belly: '#ece9d8', accent: '#2c4a40' }),
    lore: 'Desconfiado e teimoso. O pai dizia que robalo é peixe que escolhe quem pega.' },
  { id: 'cavala', name: 'Cavala', tier: 'incomum', kg: [1.5, 4], strength: 1.15, spots: ['primeira-boia'], color: 0x5d8aa0,
    art: ink({ h: 16, length: 150, tail: 'lunate', dorsal: 'double', pattern: 'vertical', base: '#4f86a0', belly: '#e9efe9', accent: '#1d3f56' }),
    lore: 'Rápida e de rabo afiado. Briga como quem tem pressa de voltar pro fundo.' },
  { id: 'garoupa', name: 'Garoupa', tier: 'incomum', kg: [3, 9], strength: 1.25, weight: 0.8, spots: ['primeira-boia'], color: 0x8a7a5a,
    art: ink({ h: 26, length: 140, tail: 'round', dorsal: 'long', pattern: 'spots', base: '#8f7b58', belly: '#e6dcc0', accent: '#4a3a22' }),
    lore: 'Mora no escuro das pedras. Quem pega uma, conta por anos.' },

  // ----------------------------------------------------------- RAROS
  { id: 'dourado', name: 'Dourado', tier: 'raro', kg: [3, 8], strength: 1.3, spots: ['primeira-boia'], color: 0xe0b73c,
    art: ink({ h: 22, length: 150, tail: 'lunate', dorsal: 'sail', pattern: 'none', base: '#d8a82c', belly: '#f4e7b0', accent: '#7a5410' }),
    lore: 'Brilha como moeda e foge como dívida. O avô só tinha pescado dois.' },
  { id: 'atum', name: 'Atum', tier: 'raro', kg: [12, 35], strength: 1.6, weight: 0.8, spots: ['primeira-boia'], color: 0x4f6f8f,
    art: ink({ h: 27, length: 156, tail: 'lunate', dorsal: 'double', pattern: 'none', base: '#34506e', belly: '#dfe4e6', accent: '#16273a' }),
    lore: 'Uma força que não é de peixe de porto. Parece que veio de outro mar.' },

  // ------------------------------------------- LENDÁRIOS (Ilha da Lanterna)
  { id: 'dourado-velho', name: 'Dourado Velho', tier: 'lendario', kg: [18, 30], strength: 2.0, spots: ['ilha-lanterna'], color: 0xf0c040,
    art: ink({ h: 28, length: 160, tail: 'lunate', dorsal: 'sail', pattern: 'scales', base: '#e0aa24', belly: '#f8ecb8', accent: '#6a4608', halo: true }),
    lore: 'Dizem que é o mesmo que o avô quase pescou. Tem cicatriz de anzol antigo.' },
  { id: 'lampreia-rainha', name: 'Lampreia-Rainha', tier: 'lendario', kg: [6, 12], strength: 2.1, spots: ['ilha-lanterna'], color: 0x7ad0c0,
    art: ink({ h: 11, length: 166, tail: 'round', dorsal: 'long', pattern: 'spots', base: '#5fb8a8', belly: '#e0f2e8', accent: '#1d5a52', halo: true }),
    lore: 'Acende por dentro, igual à lanterna da ilha. Ninguém explica.' },
  { id: 'baleia-fantasma', name: 'Baleia-Fantasma', tier: 'lendario', kg: [400, 900], strength: 2.6, weight: 0.4, spots: ['ilha-lanterna'], color: 0xcfd8e8,
    art: ink({ h: 32, length: 160, tail: 'lunate', dorsal: 'single', pattern: 'horizontal', base: '#b9c6dc', belly: '#f3f5fa', accent: '#4a5a7a', halo: true }),
    lore: 'Mais lenda que peixe. Quem a vê, jura que ela olha de volta.' },

  // ---------------------------------------------- ACHADOS (não são peixes)
  { id: 'bota-velha', name: 'Bota velha (nº 40)', tier: 'achado', junk: true, kg: [0.4, 0.6], strength: 0.3, weight: 0.4, spots: ['primeira-boia'], color: 0x5a4636,
    art: { junk: 'boot' }, lore: 'Seu Anselmo vai querer saber. Era número quarenta.' },
  { id: 'remo-quebrado', name: 'Pedaço de remo', tier: 'achado', junk: true, kg: [1, 2], strength: 0.3, weight: 0.4, spots: ['primeira-boia'], color: 0x7a5a38,
    art: { junk: 'oar' }, lore: 'Tem iniciais entalhadas, gastas demais pra ler.' },
  { id: 'lata', name: 'Lata enferrujada', tier: 'achado', junk: true, kg: [0.2, 0.4], strength: 0.2, weight: 0.4, spots: ['primeira-boia'], color: 0x8a5a3a,
    art: { junk: 'can' }, lore: 'O mar devolve o que a gente joga fora. Educadamente.' },
  { id: 'alga', name: 'Alga embolada', tier: 'achado', junk: true, kg: [0.3, 0.8], strength: 0.2, weight: 0.4, spots: ['primeira-boia'], color: 0x4a6a3a,
    art: { junk: 'weed' }, lore: 'Pesada de água e de nada.' },
];

export const FISH_BY_ID = Object.fromEntries(FISH.map((f) => [f.id, f]));

export const getFish = (id) => FISH_BY_ID[id] ?? null;

/** Espécies (e achados) que aparecem num ponto de pesca. */
export const fishForSpot = (spotId) => FISH.filter((f) => f.spots.includes(spotId));

export default FISH;