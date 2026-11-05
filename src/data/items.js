// src/data/items.js

/**
 * Itens que o mar "devolve": garrafas com mensagem (marcador "?") e relíquias
 * boiando (marcador "!"). Todos os textos ficam aqui. As garrafas contam o PACTO
 * do avô em pedaços; as relíquias são colecionáveis com uma ou duas linhas de história.
 *
 * Campos:
 *   id        identificador (salvo no GameState.collected)
 *   kind      'bottle' | 'relic'
 *   name      nome no diário
 *   position  [x, z] no mar
 *   after     (opcional) flag da história que libera o item ('note-found')
 *   lean      (opcional, uso futuro) 'tell' | 'silence': peso na escolha do final
 *   art       desenho do item (ui/ItemIcon.js): { shape: 'bottle'|'buoy'|'mug'|'watch'|'hook'|'patch', ...cores }
 *   garrafa:  author, intro, message[] (falas do autor), outro
 *   relíquia: intro (opcional), text (descrição)
 */

import { YOU } from './dialogues.js';

export const SEA_ITEMS = [
  // ------------------------------------------------ antes do bilhete do avô
  {
    id: 'garrafa-raimundo', kind: 'bottle', name: 'Carta de Raimundo', position: [40, 62], lean: 'tell',
    art: { shape: 'bottle', glass: '#6b9a74', seal: 'wax', sealColor: '#a23a2a' },
    author: 'Raimundo',
    intro: 'Uma garrafa lacrada com cera. Dentro, uma folha de caderno dobrada em quatro.',
    message: [
      '"Iracema, se isto chegar até você: a luz existe. Eu não menti. Só não podia contar. Fiz uma promessa."',
      '"Não apague o lampião. Eu enxergo ele daqui. — Raimundo"',
    ],
    outro: 'Dona Iracema vai querer saber disso. Se eu tiver coragem de contar.',
  },
  {
    id: 'garrafa-davi', kind: 'bottle', name: 'Carta de Davi', position: [150, 170], lean: 'tell',
    art: { shape: 'bottle', glass: '#7fa6b8', seal: 'cork', paper: '#f6f0dc', scribble: true },
    author: 'Davi',
    intro: 'A letra é de criança, cheia de rasuras. A data foi riscada.',
    message: [
      '"Pai, achei seu caderno. Vou até a luz buscar o senhor. A mãe não precisa saber."',
      '"Se eu demorar, não fique bravo. — Davi"',
    ],
    outro: 'O menino de Dona Iracema. Ele chegou até aqui.',
  },
  {
    id: 'reliquia-boia', kind: 'relic', name: 'Boia de cortiça', position: [-30, 70],
    art: { shape: 'buoy' },
    text: 'Cortiça gasta pelo sal, com duas letras queimadas a ferro: T.B. Ainda flutua, teimosa.',
  },
  {
    id: 'reliquia-caneca', kind: 'relic', name: 'Caneca esmaltada', position: [60, -60],
    art: { shape: 'mug' },
    text: 'Esmalte lascado e um resto de café seco no fundo. Alguém bebeu ali há pouco, ou há muito tempo. O mar não conta.',
  },

  // ------------------------------------------------- depois do bilhete (rota)
  {
    id: 'garrafa-tobias', kind: 'bottle', name: 'O pacto', position: [166, 40], after: 'note-found', lean: 'silence',
    art: { shape: 'bottle', glass: '#4f7a5a', seal: 'wax', sealColor: '#7a2d1c', mark: true, paper: '#eadcb6' },
    author: 'Tobias',
    intro: 'O lacre tem a mesma marca do bilhete do vovô.',
    message: [
      '"Quinta-feira. Cinco barcos, cinco juramentos: pescar só o que a casa come. E ninguém conta onde fica a ilha. Nem pra mulher, nem pra filho."',
      '"Se um dia eu falhar com isso, que o mar me cobre. — T. Barbosa"',
    ],
    outro: 'Cinco barcos. O vovô, e quem mais?',
  },
  {
    id: 'reliquia-relogio', kind: 'relic', name: 'Relógio de bolso', position: [190, 8], after: 'note-found',
    art: { shape: 'watch' },
    text: 'Parado às 4h12. Na tampa, um nome riscado que não dá mais pra ler.',
  },
  {
    id: 'garrafa-dutra', kind: 'bottle', name: 'Carta de Dutra', position: [212, -22], after: 'note-found', lean: 'tell',
    art: { shape: 'bottle', glass: '#8fb0a0', seal: 'cork', paper: '#e6d6aa', torn: true },
    author: 'Dutra',
    intro: 'Papel de carta de navegação, rasgado nas bordas. A tinta ainda não desbotou.',
    message: [
      '"A quem encontrar: o Esperança II está à deriva, a leste do cabo. Dois de nós sobraram."',
      '"Quebramos o pacto por fome e o mar cobrou. Perdoem. — Dutra"',
    ],
    outro: 'À deriva, a leste. Tem gente viva lá.',
  },
  {
    id: 'reliquia-anzol', kind: 'relic', name: 'Anzol de ouro', position: [236, -40], after: 'note-found',
    art: { shape: 'hook' },
    text: 'Ouro de verdade, gasto de tanto uso. Quem pesca com ouro não pesca por fome.',
  },
  {
    id: 'reliquia-retalho', kind: 'relic', name: 'Retalho de vela', position: [200, -60], after: 'note-found',
    art: { shape: 'patch' },
    intro: 'Esse remendo cruzado... eu conheço esse ponto.',
    text: 'É igual ao remendo da vela do seu barco. Mesmo ponto. Mesma mão.',
  },
  {
    id: 'garrafa-norte', kind: 'bottle', name: 'Carta do Porto do Norte', position: [250, -70], after: 'note-found', lean: 'tell',
    art: { shape: 'bottle', glass: '#a8b8a0', seal: 'tar', paper: '#d8cfb4', ink: '#222222' },
    author: 'Uma mãe do Norte',
    intro: 'Escrita com carvão, num pedaço de saco de farinha.',
    message: [
      '"Aqui no Porto do Norte o mar também fechou. Dizem que vocês guardaram alguma coisa."',
      '"Se for verdade, dividam. Pelo amor de Deus."',
    ],
    outro: 'Não era só o nosso porto. Quantos mais?',
  },
];

export const ITEMS_BY_ID = Object.fromEntries(SEA_ITEMS.map((i) => [i.id, i]));

/** Cena de diálogo (caixa embaixo) de um item. Hoje sem uso no main.js: garrafas usam BottleScene e relíquias ItemCard. */
export function itemScene(item) {
  if (item.kind === 'bottle') {
    return {
      name: 'Garrafa',
      lines: [
        { speaker: YOU, text: item.intro },
        ...item.message.map((text) => ({ speaker: item.author, text })),
        { speaker: YOU, text: item.outro },
      ],
    };
  }
  return {
    name: 'Relíquia',
    lines: [
      { speaker: YOU, text: item.intro ?? 'Algo boia por aqui. Eu puxo para dentro do barco.' },
      { speaker: item.name, text: item.text },
    ],
  };
}

/** Texto para o diário. */
export function itemJournalText(item) {
  return item.kind === 'bottle' ? item.message.join('\n\n') : item.text;
}

export default SEA_ITEMS;