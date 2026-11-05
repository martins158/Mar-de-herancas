// src/data/story.js

/**
 * História e progressão do jogo (textos e metas num lugar só).
 *
 * Etapas da campanha (por enquanto):
 *   1. PRIMEIRA BOIA: pescar FISH_GOAL peixes (1 do tutorial/treino + 2 por conta própria).
 *      Achados (bota, remo...) não contam.
 *   2. No último peixe aparece o BILHETE DO AVÔ (cena abaixo); a bússola acorda
 *      e passa a apontar para a ILHA DA LANTERNA (ponto liberado pela flag 'note-found').
 *   3. NAUFRÁGIO E RESGATE: depois do bilhete aparece o Esperança II à deriva (luz de
 *      socorro vermelha). A bússola aponta para ele; ficar quase parado dentro do aro
 *      por RESCUE.holdTime s resgata o Capitão Dutra (flag 'dutra-rescued'): cena longa
 *      (o avô, o pacto, a ilha), Dutra passa a viajar no barco e a bússola volta para a ilha.
 *   4. A ilha em si (Sprint 6) vem depois.
 *
 * Uso: import { FISH_GOAL, POINTS, RESCUE, SCENES, OBJECTIVES } from './data/story.js';
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
  // o naufrágio (world/Shipwreck.js desenha o casco no centro do aro)
  { id: 'esperanca-ii', name: 'Esperança II', position: [250, 0, 30], radius: 14, active: false },
];

/** Regra do resgate (systems/RescueSystem.js): segundos parado dentro do aro e velocidade máxima (u/s) que ainda conta como parado. */
export const RESCUE = { holdTime: 3.5, maxSpeed: 1.3 };

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

  // resgate do Capitão Dutra (RASCUNHO do texto: o Matheus aprova ou muda; ver o handoff)
  rescue: {
    name: 'Capitão Dutra',
    lines: [
      { speaker: YOU, text: 'Alguém acena do alto do mastro quebrado, enrolado num cobertor. Eu puxo o velho para dentro do barco antes que a onda o leve.' },
      { text: 'Água... só um gole.' },
      { speaker: YOU, text: 'Dou o cantil. Ele bebe devagar, como quem aprendeu a não desperdiçar nada.' },
      { text: 'Esse remendo cruzado na sua vela. Eu conheço a mão que fez. Você é neto do Tobias, não é?' },
      { speaker: YOU, text: 'Era meu avô. O senhor o conheceu?' },
      { text: 'Fomos cinco barcos, rapaz. Eu sou Dutra, capitão do Esperança II. Era. Éramos dois a bordo. O Nilo não aguentou a terceira noite.' },
      { text: 'Seu avô nos juntou numa quinta-feira. Cinco juramentos: pescar só o que a casa come, e nunca contar onde fica a ilha. Nem pra mulher, nem pra filho.' },
      { speaker: YOU, text: 'A garrafa do pacto. Então é tudo verdade.' },
      { text: 'A ilha é o berçário. Todo peixe que já chegou ao nosso porto nasceu lá. Seu avô descobriu e escondeu, para ninguém esvaziar o que dá de comer ao mar inteiro.' },
      { text: 'Funcionou por trinta anos. Aí o porto passou fome, e eu fui o primeiro a lançar rede lá dentro. O resto você viu: o mar cobrou.' },
      { speaker: YOU, text: 'E o Raimundo? E o menino, o Davi?' },
      { text: 'Raimundo era dos cinco. Guardou o segredo até o fim, e o fim o levou. O menino... numa noite vi um barquinho passar rumo à luz. Pequeno demais para o mar aberto. Eu não tive força nem para gritar.' },
      { speaker: YOU, text: 'Dona Iracema acende o lampião todas as noites.' },
      { text: 'Então a luz dela e a da ilha se olham uma à outra, de longe. Que coisa.' },
      { text: 'Me leve até lá. Devo isso ao seu avô. Depois o que fazer com o que você sabe, calar ou contar, é com você. Eu já escolhi uma vez, e custou caro.' },
      { speaker: YOU, text: 'A agulha da bússola gira de novo. Dutra se encolhe no banco, e o barco segue com um passageiro a mais e uma decisão mais pesada.' },
    ],
  },

  // chegada à ilha com o Dutra a bordo (provisório até a Sprint 6)
  islandDutra: {
    name: 'Ilha da Lanterna',
    lines: [
      { speaker: 'Capitão Dutra', text: 'É aqui. Faz muito tempo que não vejo essa luz de perto.' },
      { speaker: YOU, text: 'A luz está bem aqui. Mas a ilha ainda não aparece... o mar muda de cor neste ponto.' },
      { speaker: YOU, text: 'Preciso me preparar para o que vem. (Fim da demonstração por enquanto: a ilha vem na próxima etapa.)' },
    ],
  },

  // chegada à ilha sem o Dutra (não acontece mais pelo fluxo normal; mantida por compatibilidade)
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
  goWreck: () => ({ title: 'Luz de socorro', text: 'Uma luz vermelha pisca ao longe: alguém pede ajuda. Siga a bússola.' }),
  wreckHere: () => ({ title: 'Esperança II', text: 'Reduza e fique parado perto dos destroços para puxar o náufrago.' }),
  goIsland: () => ({ title: 'Ilha da Lanterna', text: 'Siga a bússola até a luz que nunca apaga.' }),
  goIslandDutra: () => ({ title: 'Ilha da Lanterna', text: 'O Capitão Dutra está a bordo. Siga a bússola até a luz que nunca apaga.' }),
  islandHere: () => ({ title: 'Ilha da Lanterna', text: 'A luz está aqui. A travessia continua em breve.' }),
};

export default { FISH_GOAL, POINTS, RESCUE, SCENES, OBJECTIVES };