// src/data/story.js

/**
 * História e progressão do jogo (textos e metas num lugar só).
 *
 * Etapas da campanha (por enquanto):
 *   1. PRIMEIRA BOIA: pescar FISH_GOAL peixes (1 do tutorial/treino + 2 por conta própria).
 *      Achados (bota, remo...) não contam.
 *   2. No último peixe aparece o BILHETE DO AVÔ (cena abaixo); a bússola acorda
 *      e passa a apontar para o próximo ponto (o naufrágio, liberado pela flag 'note-found').
 *      Só o ponto ATUAL tem aro e luz: o das outras etapas fica apagado (ver applyStage no main.js).
 *   3. NAUFRÁGIO E RESGATE: depois do bilhete aparece o Esperança II à deriva (luz de
 *      socorro vermelha). A bússola aponta para ele; ficar quase parado dentro do aro
 *      por RESCUE.holdTime s resgata o Capitão Dutra (flag 'dutra-rescued'): cena longa
 *      (o avô, o pacto, a ilha), Dutra passa a viajar no barco e a bússola passa para a ilha
 *      (a ilha, o aro e a luz dela só aparecem agora).
 *   4. A ILHA DA LANTERNA (Sprint 6): chegar ao aro abre a cena de chegada (flag 'island-reached');
 *      a cabana do avô (flag 'cabin-read') tem o diário e o segredo; a água da ilha tem os
 *      peixes lendários (pescar aqui marca a flag 'island-fished'; ainda sem efeito: pesa no final).
 *
 * O mar não é aberto 100%: SEA_BOUNDS é uma parede invisível (systems/SeaBounds.js) e,
 * perto dela, o jogo mostra SEA_MESSAGES.wrongWay.
 *
 * Uso: import { FISH_GOAL, POINTS, RESCUE, SEA_BOUNDS, SEA_MESSAGES, SCENES, OBJECTIVES } from './data/story.js';
 */

/** Quantos peixes (de verdade) liberam o próximo ponto. */
export const FISH_GOAL = 3;

/**
 * Pontos de interesse do mar (aros). `position` = [x, y, z]; `beacon` = luz
 * distante (só a Ilha da Lanterna). `active: false` = só aparece depois de liberado.
 */
export const POINTS = [
  { id: 'primeira-boia', name: 'Primeira Boia', position: [100, 0, 110], active: true },
  { id: 'ilha-lanterna', name: 'Ilha da Lanterna', position: [280, 0, -100], radius: 34, beacon: true, active: false },
  // o naufrágio (world/Shipwreck.js desenha o casco no centro do aro)
  { id: 'esperanca-ii', name: 'Esperança II', position: [250, 0, 30], radius: 14, active: false },
];

/** Regra do resgate (systems/RescueSystem.js): segundos parado dentro do aro e velocidade máxima (u/s) que ainda conta como parado. */
export const RESCUE = { holdTime: 3.5, maxSpeed: 1.3 };

/**
 * Limites do mar (parede invisível): retângulo no plano XZ. minX = -51 é o centro da ilha do porto,
 * então não dá para ir para trás dela. O main.js ainda aumenta isto, se preciso, para caberem
 * todos os pontos e itens. `warn` = a que distância (u) da parede o aviso aparece.
 */
export const SEA_BOUNDS = { minX: -51, maxX: 335, minZ: -170, maxZ: 170, warn: 14 };

/** Avisos do mar. */
export const SEA_MESSAGES = {
  wrongWay: 'Rumo errado: não há nada por aqui. Volte e siga a bússola.',
};

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

  // resgate do Capitão Dutra (RASCUNHO em tom grave: o Matheus aprova ou muda; ver o handoff).
  // Falas sem `speaker` são do Dutra; as do jogador usam YOU. Frases curtas, pouca metáfora, silêncio.
  rescue: {
    name: 'Capitão Dutra',
    lines: [
      { speaker: YOU, text: 'Há um vulto preso ao mastro quebrado, enrolado num cobertor. Não acena. Eu o puxo para dentro do barco antes que a próxima onda venha.' },
      { text: 'Água.' },
      { speaker: YOU, text: 'Dou o cantil. Ele bebe sem pressa, como quem aprendeu quanto custa cada gole.' },
      { text: 'Esse remendo na sua vela. Conheço a mão que fez. Você é neto do Tobias.' },
      { speaker: YOU, text: 'Era meu avô. O senhor o conhecia?' },
      { text: 'Fui um dos cinco que ele juntou. Dutra, capitão do Esperança II. Saímos em dois. O Nilo não passou da terceira noite. Fiquei sozinho com ele, e depois sem ele.' },
      { text: 'Foi numa quinta-feira. Cinco barcos, cinco juramentos. Pescar só o que a casa come. Nunca contar onde fica a ilha. Nem pra mulher. Nem pra filho.' },
      { speaker: YOU, text: 'A garrafa do pacto. Então é verdade.' },
      { text: 'A ilha é o berçário. Todo peixe que chegou ao nosso porto nasceu lá. Seu avô descobriu e escondeu. Não por avareza. Porque sabia que, se soubessem, esvaziavam.' },
      { text: 'O pacto aguentou trinta anos. Depois o porto passou fome. Fui eu o primeiro a lançar rede lá dentro.' },
      { text: 'Disse a mim mesmo que era só uma vez. É o que todo mundo diz.' },
      { speaker: YOU, text: 'E o Raimundo? E o Davi?' },
      { text: 'Raimundo era um dos cinco. Calou até o fim. O fim veio do mesmo jeito.' },
      { text: 'O menino... uma noite vi um barquinho passando rumo à luz. Pequeno demais para aquele mar. Eu vi. E não gritei.' },
      { speaker: YOU, text: 'Fico sem palavra. Dona Iracema acende o lampião toda noite. Ela ainda espera.' },
      { text: 'Então ela acende uma luz para um mar que não devolve. E foi a gente que ensinou esse porto a esperar calado.' },
      { speaker: YOU, text: 'Eu só quero trazer alguma coisa de volta para o porto.' },
      { text: 'Foi o que eu quis também. Cuidado com o que o querer faz da gente. Me leve até lá. Devo isso ao seu avô. Calar ou contar é seu. Eu escolhi uma vez, e ainda estou pagando.' },
      { speaker: YOU, text: 'A agulha da bússola gira de novo. Dutra se encolhe no banco e não diz mais nada. O barco segue mais pesado do que veio.' },
    ],
  },

  // chegada à ilha com o Dutra a bordo (RASCUNHO em tom grave). O Dutra fica no barco: papel provisório.
  islandDutra: {
    name: 'Ilha da Lanterna',
    lines: [
      { speaker: YOU, text: 'A luz sobe de uma torre baixa, de pedra escura. Embaixo, uma praia estreita, um cais curto e uma cabana. Nenhum outro barco. Ninguém.' },
      { speaker: 'Capitão Dutra', text: 'Faz muito tempo que não vejo isso de perto.' },
      { speaker: YOU, text: 'Ele não olha para a ilha. Olha para as próprias mãos.' },
      { speaker: 'Capitão Dutra', text: 'Não é a ilha que pesa, rapaz. É o que eu tirei dela.' },
      { speaker: YOU, text: 'O mar em volta está parado. Parado demais, como se prendesse o fôlego.' },
      { speaker: 'Capitão Dutra', text: 'Aqui ele se acalma sozinho. Seu avô dizia que era respeito. Nunca soube de quem.' },
      { speaker: YOU, text: 'Eu vim pelo porto. Agora que estou aqui, não sei se quero saber o que ele deixou naquela cabana.' },
      { speaker: 'Capitão Dutra', text: 'Vá. Eu espero no barco. Já fiz minha parte aqui, e foi a pior.' },
    ],
  },

  // a cabana do avô: o diário e o segredo (RASCUNHO em tom grave; o Matheus aprova ou muda).
  // Fala sem `speaker` = o diário do avô (nome da cena); as do jogador usam YOU.
  cabin: {
    name: 'Diário do avô',
    lines: [
      { speaker: YOU, text: 'A porta cede sem resistência. Dentro, uma mesa, um catre, uma lamparina apagada. E um caderno de capa de lona, aberto, como se ele tivesse acabado de sair.' },
      { speaker: YOU, text: 'Reconheço o "g" antes de ler qualquer palavra.' },
      { text: '"Achei a ilha por erro, numa noite sem lua. A luz já estava acesa. Não havia ninguém. Não perguntei quem a acende. Tive medo da resposta."' },
      { text: '"Todo peixe do nosso porto nasce nesta água. Contei por três anos antes de acreditar. O que a rede leva daqui, o mar não repõe."' },
      { text: '"Por isso o pacto. Não é segredo por vergonha. É segredo porque quem sabe, quer. E quem quer, leva."' },
      { text: '"Escrevi a regra: só o que a casa come. Nenhum peixe a mais, nem para vender, nem para salvar um vizinho. Sei o que isso custa. Carrego sozinho."' },
      { text: '"Se você leu até aqui, o mar deixou você chegar. Não sei se é um convite ou um aviso."' },
      { text: '"Não vou dizer o que fazer. Só peço que decida sabendo o preço."' },
      { speaker: YOU, text: 'Fecho o caderno. Calar custa o porto. Contar custa a ilha. Eu só queria ajudar. Agora preciso saber o que ajudar quer dizer.' },
      { speaker: YOU, text: 'Lá fora a água está parada, cheia do que o porto nunca viu. O pacto diz para não lançar a linha aqui. Ninguém vai me impedir.' },
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
  islandHere: () => ({ title: 'Ilha da Lanterna', text: 'A luz está aqui.' }),
  cabin: ({ interactKey }) => ({ title: 'Ilha da Lanterna', text: `Há uma cabana na praia. Chegue perto do cais e pressione ${interactKey}.` }),
  islandFish: ({ fishKey }) => ({ title: 'Ilha da Lanterna', text: `A água daqui tem peixes que o porto nunca viu. O pacto diz para não pescar aqui (${fishKey}).` }),
};

export default { FISH_GOAL, POINTS, RESCUE, SEA_BOUNDS, SEA_MESSAGES, SCENES, OBJECTIVES };