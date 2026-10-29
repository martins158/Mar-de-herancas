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
      { text: 'Você levantou antes do sol de novo. Seu pai fazia isso... até o dia em que parou de ter pra onde ir.' },
      { text: 'Eu também não dormi. A casa fica grande demais de madrugada, filho. Cada tábua estala como se lembrasse de alguém.' },
      { text: 'Lembra do cheiro que vinha da cozinha? Peixe na brasa, pão, café. Hoje a maresia entra pelas frestas e só traz cheiro de coisa parada.' },
      { speaker: YOU, text: 'A senhora ainda guarda a rede dele, não guarda?' },
      { text: 'Guardo. Dobrada, no baú. Não pra usar. Pra não ter que decidir que acabou.' },
      { text: 'Seu pai não diz, mas eu vejo. Ele passa horas olhando o barco como quem olha um amigo que o traiu... e que ele ainda ama.' },
      { text: 'Eu não vou te pedir pra ficar. Já pedi demais a esse mar, e ele nunca respondeu.' },
      { text: 'Vai falar com ele, filho. E depois vai. Mas me promete uma coisa: o que quer que você encontre lá fora, não deixa te ensinar a calar como a gente aprendeu.' },
    ],
    repeat: [
      { text: 'Vai, meu filho. Ele está lá no fim do cais, esperando você ter coragem. Os dois estão.' },
    ],
  },

  // ----------------------------------------------------- SEU ANSELMO
  anselmo: {
    name: 'Seu Anselmo',
    lines: [
      { text: 'Quarenta e dois anos jogando rede nessa água. Sabe o que eu puxei ontem? Alga, uma bota e um pedaço de remo que nem era nosso.' },
      { text: 'O mar começou a devolver o lixo da gente, rapaz. É assim que ele diz que cansou de nós.' },
      { text: 'Olha aqueles cascos ali, apodrecendo de pé. Ninguém afunda um barco desses. A gente deixa o porto ir afundando ele devagar, porque dói menos.' },
      { speaker: YOU, text: 'O senhor nunca pensou em ir embora?' },
      { text: 'Pensei toda manhã. Mas pra onde vai um homem que só sabe ler o céu? Na cidade, ninguém paga por isso.' },
      { text: 'Todo mundo aqui herdou um mar. Ninguém herdou o peixe. É essa a nossa herança: o nome do ofício e a dívida do que ele já foi.' },
      { text: 'Seu pai foi o melhor que esse cais já viu. Quando ele voltava de uma saída, o porto inteiro parava pra olhar a vela. Não deixe ele te contar essa história de outro jeito.' },
      { text: 'Homem que perdeu o ofício e não perdeu o orgulho é o mais difícil de abraçar. Vai lá. Eu seguro as pontas por aqui. Ainda sei fazer isso.' },
    ],
    repeat: [
      { text: 'A maré anda baixa de tudo, rapaz. Menos de saudade.' },
    ],
  },

  // -------------------------------------------------- DONA IRACEMA
  iracema: {
    name: 'Dona Iracema',
    lines: [
      { text: 'O céu estava limpo no dia em que meu marido saiu. Limpíssimo. O mar não avisa, meu filho. Ele só leva.' },
      { text: 'Depois foi meu menino, tentando achar o pai. Hoje eu tenho dois barcos que ninguém tem coragem de vender e duas cadeiras vazias que ninguém tem coragem de tirar da mesa.' },
      { text: 'Cada casa desse cais tem uma cadeira assim. A gente não conversa sobre isso. Passa o pão por cima do vazio e segue.' },
      { speaker: YOU, text: 'A senhora acende aquele lampião todo fim de tarde, não é?' },
      { text: 'Todo fim de tarde. Eu sei que ninguém vai voltar por ele. Mas se eu apagar, aí de fato terminou. E eu ainda não aprendi a deixar terminar.' },
      { text: 'Chamam isso de herança: os barcos, as dívidas, o silêncio. É tudo o que se passa de pai pra filho neste lugar.' },
      { speaker: YOU, text: 'Eu vou trazer de volta o que for possível.' },
      { text: 'Não traga ninguém, meu filho. Nem nada. Traga só você. É a única coisa que esse porto ainda não perdeu.' },
    ],
    repeat: [
      { text: 'O lampião vai estar aceso. Pra você também.' },
    ],
  },

  // ---------------------------------------------------------------- PAI
  pai: {
    name: 'Pai',
    lines: [
      { text: 'Você veio. Achei que ia ficar na cama até o sol esquentar as tábuas.' },
      { text: 'Olha esse barco. Fui eu que pintei o casco, faz dois invernos. Ele aguentou melhor do que eu.' },
      { speaker: YOU, text: 'Pai... o que aconteceu de verdade?' },
      { text: 'Eu falhei, filho. É uma palavra pequena demais. A gente alimentou uma cidade por trinta anos, e um dia o mar fechou a porta e nenhum de nós soube bater.' },
      { text: 'Eu passei meses procurando de quem era a culpa. Do clima, do governo, dos grandes barcos. No fim, a culpa não fazia diferença: o cais continuava vazio, e eu continuava sendo o homem que não trouxe nada pra casa.' },
      { text: 'Não te chamei aqui pra pedir perdão. Te chamei pra entregar o que sobrou: um barco, uma bússola e três lugares.' },
      { text: 'Seu avô deixou três boias no mar, do tempo em que ele ainda dava. Contava que embaixo da luz de cada uma ficou guardado algo que a família não quis que o porto soubesse.' },
      { text: 'Essa bússola não aponta o norte. Aponta pro que a gente deixou lá fora. Ela vai te levar até a mais próxima, depois até a seguinte.' },
      { text: 'Eu não consigo mais ir. Não são os joelhos. É que o mar me conhece pelo que perdi. Em você ele ainda não encontrou nada.' },
      { speaker: YOU, text: 'E se eu também não encontrar nada?' },
      { text: 'Então terá encontrado o mar. Já é mais do que esse porto te deu. E volta. Sua mãe vai deixar a luz acesa.' },
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
      { text: 'Sua mãe te abraçou antes de você vir, não foi? Eu vi pela janela. Ela abraça como quem despede, mesmo quando ninguém vai embora.' },
    ],
  },
  anselmo: {
    lines: [
      { text: 'E o Anselmo deve ter te falado de mim com aquela voz de quem conta um velório. Ele exagera. Só um pouco.' },
    ],
  },
  iracema: {
    lines: [
      { text: 'A Iracema te deu aquele conselho de não trazer ninguém, não deu? Ela diz isso a todos. É o único jeito dela de pedir que a gente volte.' },
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