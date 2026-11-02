// src/data/story.js

/**
 * História e progressão do jogo (textos e metas num lugar só).
 *
 * Etapas da campanha (por enquanto):
 *   1. PRIMEIRA BOIA: pescar FISH_GOAL peixes (1 do tutorial/treino + 2 por conta própria).
 *      Achados (bota, remo...) não contam.
 *   2. No último peixe aparece o BILHETE DO AVÔ (cena abaixo); a bússola acorda
 *      e passa a apontar para a ILHA DA LANTERNA (ponto liberado pela flag 'note-found').
 *   3. A ilha em si e o caminho (garrafas, naufrágio) vêm nas próximas sprints.
 *
 * Uso: import { FISH_GOAL, POINTS, SCENES, OBJECTIVES } from './data/story.js';
 */

/** Quantos peixes (de verdade) liberam o próximo ponto. */
export const FISH_GOAL = 3;

/**
 * Pontos de interesse do mar (aros). `position` = [x, y, z]; `beacon` = luz
 * distante (só a Ilha da Lanterna). `active: false` = só aparece depois de liberado.
 */
export const POINTS = [
  { id: 'primeira-boia', name: 'Primeira Boia', position: [100, 0, 110], active: true },
  { id: 'ilha-lanterna', name: 'Ilha da Lanterna', position: [280, 0, -100], radius: 22, beacon: true, active: false },
];

const YOU = 'Você';

/** Cenas de diálogo (caixa embaixo). `speaker` padrão = `name`. */
export const SCENES = {
  // último peixe da meta: um anzol antigo com um bilhete amarrado
  note: {
    name: 'Bilhete',
    lines: [
      { speaker: YOU, text: 'Tem algo preso na boca dele... um anzol. Velho, enferrujado. E um pedaço de pano encerado amarrado na linha.' },
      { speaker: YOU, text: 'Essa letra. Eu conheço esse jeito de fazer o "g". É do vovô.' },
      { text: '"Se está lendo isto, aprendeu a esperar. Já é metade do caminho."' },
      { text: '"Pesque só o que a casa come. Nunca o que o mar guarda. Quem esquecer isso, não volta."' },
      { text: '"A luz que nunca apaga fica onde o mar escurece. Siga a bússola. E não conte pra ninguém. Ainda."' },
      { speaker: YOU, text: 'A agulha da bússola girou. Ela quer ir mais longe.' },
    ],
  },

  // chegada à ilha (provisório até a Sprint 6)
  islandPlaceholder: {
    name: 'Ilha da Lanterna',
    lines: [
      { speaker: YOU, text: 'A luz está bem aqui. Mas a ilha ainda não aparece... o mar muda de cor neste ponto.' },
      { speaker: YOU, text: 'Preciso me preparar para o que vem. (Fim da demonstração por enquanto: a travessia continua nas próximas etapas.)' },
    ],
  },
};

/**
 * Textos do cartão de objetivo (HUD). Recebem { n, goal, fishKey }:
 * n = peixes pescados, fishKey = nome da tecla de pescar.
 */
export const OBJECTIVES = {
  goFishing: () => ({ title: 'Objetivo', text: 'Vá para a área de pesca inicial.' }),
  backFishing: ({ n, goal }) => ({ title: 'Peixes', text: `Volte à Primeira Boia e continue pescando (${n}/${goal}).` }),
  fish: ({ n, goal, fishKey }) => ({
    title: 'Primeira Boia',
    text: n === 0 ? `Pare o barco e pesque (${fishKey}).` : `Continue pescando (${fishKey}): peixes ${n}/${goal}.`,
  }),
  goIsland: () => ({ title: 'Ilha da Lanterna', text: 'Siga a bússola até a luz que nunca apaga.' }),
  islandHere: () => ({ title: 'Ilha da Lanterna', text: 'A luz está aqui. A travessia continua em breve.' }),
};

export default { FISH_GOAL, POINTS, SCENES, OBJECTIVES };