// src/data/dialogues.js

/**
 * Diálogos do porto.
 * Todos os textos do jogo ficam aqui: para reescrever uma fala, é só editar
 * este arquivo (não precisa mexer em mais nada).
 *
 * Formato de cada personagem:
 *   {
 *     name:   'Nome mostrado na caixa',
 *     lines:  [ { text, speaker? }, ... ],   // speaker padrão = name; use YOU para o jogador
 *     repeat: [ ... ],                       // opcional: falas quando o jogador volta a conversar
 *     action: { label: 'Zarpar' },           // opcional: botão no fim da conversa
 *   }
 *
 * Uso:
 *   const data = getDialogue('pai', gameState.talkedTo);
 *   dialogue.open({ name: data.name, lines: data.lines, action: data.action });
 */

export const YOU = 'Você';

const DIALOGUES = {
  // ---------------------------------------------------------------- MÃE
  mae: {
    name: 'Mãe',
    lines: [
      { text: 'Já de pé? Nem o galo levantou ainda.' },
      { text: 'Fiz café. Passei duas vezes no coador, o pó anda rendendo pouco... mas rende.' },
      { text: 'Eu não dormi. Essa casa estala a noite inteira. Antes eu achava que era vento.' },
      { text: 'Sabe que ainda faço comida pra três? Quando vejo, já tá no fogo. Aí a gente come devagar, pra não sobrar.' },
      { speaker: YOU, text: 'A senhora ainda guarda a rede do pai, não guarda?' },
      { text: 'Guardo. Dobrada, no baú, com cânfora. Não é pra usar. É pra... sei lá. Pra não ter que decidir.' },
      { text: 'Seu pai não fala. Passa a tarde olhando o barco. Eu fiquei com raiva dele um tempo, sabe? Agora só tenho pena. E isso é pior.' },
      { text: 'Eu não vou te pedir pra ficar. Já pedi coisa demais pra esse mar e ele nunca me respondeu.' },
      { text: 'Vai falar com ele. E, filho... o que você achar lá fora, conta pra mim. Mesmo que seja ruim. Aqui a gente se acostumou a não contar nada.' },
    ],
    repeat: [
      { text: 'Vai, meu filho. Ele tá lá no fim do cais. Faz tempo que ensaia o que vai te dizer.' },
    ],
  },

  // ----------------------------------------------------- SEU ANSELMO
  anselmo: {
    name: 'Seu Anselmo',
    lines: [
      { text: 'Quarenta e dois anos de rede, rapaz. Sabe o que eu puxei ontem? Alga, uma bota e um pedaço de remo que nem era nosso.' },
      { text: 'A bota era número quarenta. Do meu irmão era quarenta. Besteira de velho, eu sei.' },
      { text: 'Olha aqueles cascos ali, apodrecendo. Ninguém afundou barco nenhum. A gente foi deixando o porto afundar devagarinho. Dói menos assim.' },
      { speaker: YOU, text: 'O senhor nunca pensou em ir embora?' },
      { text: 'Toda manhã. Aí olho o céu e penso: pra onde vai um homem que só sabe ler nuvem? Na cidade ninguém paga por isso.' },
      { text: 'Seu pai era o melhor desse cais. Quando ele voltava, o porto parava pra ver a vela entrar. A criançada corria pra ajudar com o peixe.' },
      { text: 'Cuidado quando ele contar essa história. Ele conta como se a culpa fosse dele. Não foi. Ou não foi só.' },
      { text: 'Ah, uma coisa. Meu pai falava de uma ilha que acendia de noite, lá pro lado onde o mar escurece. Eu nunca vi. Também nunca fui procurar, né?' },
      { text: 'Vai com Deus. Eu seguro as pontas por aqui. Ainda sei fazer isso.' },
    ],
    repeat: [
      { text: 'A maré anda baixa de tudo, rapaz. Menos de saudade.' },
    ],
  },

  // -------------------------------------------------- DONA IRACEMA
  iracema: {
    name: 'Dona Iracema',
    lines: [
      { text: 'Naquele dia o céu tava limpo. Limpíssimo. Ele riu e disse que ia e voltava pro almoço.' },
      { text: 'Depois foi meu menino atrás do pai. Hoje eu tenho dois barcos que ninguém compra e duas cadeiras que ninguém tem coragem de tirar da mesa.' },
      { text: 'Toda casa daqui tem uma cadeira dessas. A gente não fala. Passa o pão por cima do vazio e segue.' },
      { speaker: YOU, text: 'A senhora acende aquele lampião todo fim de tarde, não é?' },
      { text: 'Todo. Sei que ninguém volta por causa dele. Mas se eu apagar... aí acabou, entende? E eu ainda não aprendi a deixar acabar.' },
      { text: 'Meu marido falava de uma luz, lá longe, onde nem tem farol. Dizia que era a única que nunca apagava. Eu achava conversa de pescador.' },
      { text: 'Agora fico me perguntando se ele não foi atrás dela.' },
      { speaker: YOU, text: 'Eu vou trazer de volta o que for possível.' },
      { text: 'Não traga ninguém, filho. Nem nada. Traga você. É só o que esse porto ainda não perdeu.' },
    ],
    repeat: [
      { text: 'O lampião vai estar aceso. Pra você também.' },
    ],
  },

  // ---------------------------------------------------------------- PAI
  pai: {
    name: 'Pai',
    lines: [
      { text: 'Veio. Achei que ia ficar na cama até o sol esquentar as tábuas.' },
      { text: 'Olha esse barco. Eu mesmo pintei o casco, dois invernos atrás. Aguentou melhor que eu.' },
      { speaker: YOU, text: 'Pai... o que aconteceu de verdade?' },
      { text: 'Eu falhei, filho. É pouca palavra, mas não achei outra.' },
      { text: 'Trinta anos a gente alimentou essa cidade. Um dia o mar fechou a porta e nenhum de nós soube bater.' },
      { text: 'Passei meses atrás de culpado. Clima, governo, barco grande. Não mudou nada. O cais continuou vazio, e eu continuei sendo o homem que não trouxe nada pra casa.' },
      { text: 'Não te chamei pra pedir perdão. Te chamei pra entregar o que sobrou: um barco e uma bússola.' },
      { text: 'Era do seu avô. Ela não aponta o norte. Aponta pro lugar onde ele pescava, a Primeira Boia, no mar aberto, pro sudeste. Ele jurava que a água ali era mais escura. Mais viva.' },
      { text: 'Pesca lá. Pesca de verdade, até a bússola entender que você sabe o que faz. Meu pai era teimoso: só mostrava o resto pra quem provasse o básico.' },
      { text: 'Eu não consigo mais ir. Não são os joelhos. É que o mar me conhece pelo que perdi. Em você ele ainda não achou nada.' },
      { speaker: YOU, text: 'E se eu também não achar nada?' },
      { text: 'Aí você achou o mar. Já é mais do que esse porto te deu. E volta, tá? Sua mãe vai deixar a luz acesa.' },
      { text: 'Vai. Antes que eu mude de ideia e te peça pra ficar.' },
    ],
    repeat: [
      { text: 'O barco está pronto. Eu é que nunca estive.' },
    ],
    action: { label: 'Zarpar' },
  },
};

/** Falas extras do pai conforme com quem o jogador já conversou. */
const FATHER_EXTRAS = {
  mae: {
    lines: [
      { text: 'Sua mãe te passou café, né? Ela passa duas vezes no coador quando tá nervosa. Fingi que não vi.' },
    ],
  },
  anselmo: {
    lines: [
      { text: 'E o Anselmo deve ter falado de mim com voz de velório. Ele exagera. Só um pouco.' },
    ],
  },
  iracema: {
    lines: [
      { text: 'A Iracema te pediu pra não trazer ninguém, não pediu? Ela diz isso pra todos. É o jeito dela de pedir que a gente volte.' },
    ],
  },
};

/**
 * Devolve { name, lines, action } para o personagem.
 * @param {string} id        id do personagem ('mae', 'anselmo', 'iracema', 'pai')
 * @param {Set<string>} talked ids com quem o jogador já conversou (GameState.talkedTo)
 */
export function getDialogue(id, talked = new Set()) {
  const data = DIALOGUES[id];
  if (!data) return null;

  // já conversou antes: fala curta (o pai sempre repete a conversa inteira, pois leva ao botão)
  if (talked.has(id) && data.repeat && !data.action) {
    return { name: data.name, lines: data.repeat, action: null };
  }

  let lines = data.lines;
  if (id === 'pai') {
    lines = [...data.lines];
    // comentários do pai sobre quem o jogador já visitou entram depois de "Olha esse barco..."
    const extras = Object.entries(FATHER_EXTRAS)
      .filter(([who]) => talked.has(who))
      .flatMap(([, extra]) => extra.lines);
    lines.splice(2, 0, ...extras);
  }

  return { name: data.name, lines, action: data.action ?? null };
}

export default DIALOGUES;